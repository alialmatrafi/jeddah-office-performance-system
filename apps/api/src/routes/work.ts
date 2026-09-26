import { Router } from 'express';
import type { Request, Response } from 'express';
import { UserRole } from '@jeddah/shared';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { auditSnapshot } from '../lib/audit.js';
import { dateOnly, dateOnlySchema, endOfDay, endOfMonth, isDateOnly, startOfMonth, startOfWeek, toDateOnly } from '../lib/dates.js';
import { parseInput } from '../middleware/validation.js';
import { requireRoles } from '../middleware/auth.js';
import { toWorkView } from '../lib/serializers.js';
import { AppError } from '../middleware/error.js';

const router = Router();

const countSchema = z.number().int().nonnegative().max(1_000_000);
const workDateSchema = z
  .string()
  .regex(dateOnlySchema, 'workDate must use YYYY-MM-DD')
  .refine(isDateOnly, 'workDate must be a valid calendar date');
const shipmentEntrySchema = z.object({
  distributorId: z.string().min(1),
  districtId: z.string().min(1),
  entryCount: countSchema,
});
const workInputSchema = z
  .object({
    workDate: workDateSchema,
    excellentMail: countSchema,
    officialMail: countSchema,
    registeredMail: countSchema,
    governmentDocs: countSchema,
    parcels: countSchema,
    shipmentEntries: z.array(shipmentEntrySchema).max(1_000).default([]),
  })
  .superRefine((value, context) => {
    const entryKeys = new Set<string>();
    (value.shipmentEntries ?? []).forEach((entry, index) => {
      const entryKey = `${entry.distributorId}:${entry.districtId}`;
      if (entryKeys.has(entryKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shipmentEntries', index],
          message: 'Each distributor and district pair may appear only once per daily work',
        });
      }
      entryKeys.add(entryKey);
    });
  });
const listQuerySchema = z.object({
  date: workDateSchema.optional(),
  from: workDateSchema.optional(),
  to: workDateSchema.optional(),
  processorId: z.string().min(1).optional(),
});

type RangeKind = 'daily' | 'weekly' | 'monthly';
type WorkListQuery = z.infer<typeof listQuerySchema>;

function resolveRange(kind: RangeKind, query: WorkListQuery) {
  const now = new Date();
  const today = dateOnly(now);
  let from = query.from ?? today;
  let to = query.to ?? today;

  if (kind === 'weekly') {
    if (!query.from && !query.to) {
      from = dateOnly(startOfWeek(now));
      to = dateOnly(new Date(startOfWeek(now).getTime() + 6 * 86_400_000));
    }
  }

  if (kind === 'monthly' && !query.from && !query.to) {
    from = dateOnly(startOfMonth(now));
    to = dateOnly(endOfMonth(now));
  }

  if (query.date) {
    from = query.date;
    to = query.date;
  }

  const fromDate = toDateOnly(from);
  const toDate = toDateOnly(to);
  if (fromDate.getTime() > toDate.getTime()) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'from must be before or equal to to');
  }
  return { from, to, fromDate, toDate: endOfDay(to) };
}

function getProcessorFilter(query: WorkListQuery, requestUser: NonNullable<Express.Request['user']>) {
  if (requestUser.role === UserRole.PROCESSOR) {
    if (query.processorId && query.processorId !== requestUser.id) {
      throw new AppError(403, 'FORBIDDEN', 'Processors can only view their own work');
    }
    return requestUser.id;
  }
  return query.processorId;
}

async function listWorks(kind: RangeKind, request: Request, response: Response) {
  const query = parseInput(listQuerySchema, request.query);
  if (!request.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
  }
  const range = resolveRange(kind, query);
  const processorId = getProcessorFilter(query, request.user);
  const works = await prisma.dailyWork.findMany({
    where: {
      workDate: { gte: range.fromDate, lte: range.toDate },
      ...(processorId ? { processorId } : {}),
    },
    include: {
      processor: { select: { name: true, username: true } },
      shipmentEntries: {
        include: {
          distributor: { select: { name: true } },
          district: { select: { name: true } },
        },
        orderBy: { district: { name: 'asc' } },
      },
    },
    orderBy: [{ workDate: 'desc' }, { processor: { name: 'asc' } }],
  });
  response.json({
    data: works.map(toWorkView),
    range: { from: range.from, to: range.to },
  });
}

router.post(
  '/',
  requireRoles(UserRole.PROCESSOR),
  asyncHandler(async (request, response) => {
    const input = parseInput(workInputSchema, request.body);
    const processorId = request.user?.id;
    if (!processorId) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    const workDate = toDateOnly(input.workDate);
    const shipmentEntries = input.shipmentEntries ?? [];
    const distributorIds = [...new Set(shipmentEntries.map((entry) => entry.distributorId))];
    const districtIds = [...new Set(shipmentEntries.map((entry) => entry.districtId))];
    if (distributorIds.length > 0 || districtIds.length > 0) {
      const [distributors, districts] = await prisma.$transaction([
        prisma.distributor.findMany({
          where: { id: { in: distributorIds }, status: 'ACTIVE' },
          select: { id: true },
        }),
        prisma.district.findMany({ where: { id: { in: districtIds } }, select: { id: true } }),
      ]);
      if (distributors.length !== distributorIds.length || districts.length !== districtIds.length) {
        throw new AppError(400, 'INVALID_SHIPMENT_REFERENCE', 'Every shipment reference must be active and valid');
      }
    }

    const work = await prisma.$transaction(async (tx) => {
      const existing = await tx.dailyWork.findUnique({
        where: { processor_workDate: { processorId, workDate } },
        select: {
          id: true,
          excellentMail: true,
          officialMail: true,
          registeredMail: true,
          governmentDocs: true,
          parcels: true,
        },
      });
      const saved = await tx.dailyWork.upsert({
        where: { processor_workDate: { processorId, workDate } },
        create: {
          processorId,
          workDate,
          excellentMail: input.excellentMail,
          officialMail: input.officialMail,
          registeredMail: input.registeredMail,
          governmentDocs: input.governmentDocs,
          parcels: input.parcels,
        },
        update: {
          excellentMail: input.excellentMail,
          officialMail: input.officialMail,
          registeredMail: input.registeredMail,
          governmentDocs: input.governmentDocs,
          parcels: input.parcels,
        },
      });
      await tx.shipmentEntry.deleteMany({ where: { dailyWorkId: saved.id } });
      if (shipmentEntries.length > 0) {
        await tx.shipmentEntry.createMany({
          data: shipmentEntries.map((entry) => ({
            dailyWorkId: saved.id,
            distributorId: entry.distributorId,
            districtId: entry.districtId,
            entryCount: entry.entryCount,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          user: { connect: { id: processorId } },
          action: existing ? 'DAILY_WORK_UPDATED' : 'DAILY_WORK_CREATED',
          entityType: 'DailyWork',
          entityId: saved.id,
          before: existing
            ? auditSnapshot({
                excellentMail: existing.excellentMail,
                officialMail: existing.officialMail,
                registeredMail: existing.registeredMail,
                governmentDocs: existing.governmentDocs,
                parcels: existing.parcels,
              })
            : undefined,
          after: auditSnapshot({
            workDate: input.workDate,
            excellentMail: saved.excellentMail,
            officialMail: saved.officialMail,
            registeredMail: saved.registeredMail,
            governmentDocs: saved.governmentDocs,
            parcels: saved.parcels,
            shipmentEntries: shipmentEntries.length,
          }),
        },
      });
      return tx.dailyWork.findUniqueOrThrow({
        where: { id: saved.id },
        include: {
          processor: { select: { name: true, username: true } },
          shipmentEntries: {
            include: {
              distributor: { select: { name: true } },
              district: { select: { name: true } },
            },
            orderBy: { district: { name: 'asc' } },
          },
        },
      });
    });
    response.status(200).json({ data: toWorkView(work) });
  }),
);

router.get(
  '/',
  asyncHandler(async (request, response) => {
    await listWorks('daily', request, response);
  }),
);

router.get(
  '/daily',
  asyncHandler(async (request, response) => {
    await listWorks('daily', request, response);
  }),
);

router.get(
  '/weekly',
  asyncHandler(async (request, response) => {
    await listWorks('weekly', request, response);
  }),
);

router.get(
  '/monthly',
  asyncHandler(async (request, response) => {
    await listWorks('monthly', request, response);
  }),
);

export { router as workRouter };
