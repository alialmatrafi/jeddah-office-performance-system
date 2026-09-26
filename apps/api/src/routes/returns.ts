import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { UserRole } from '@jeddah/shared';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { auditSnapshot } from '../lib/audit.js';
import { dateOnlySchema, endOfDay, isDateOnly, toDateOnly } from '../lib/dates.js';
import { parseInput } from '../middleware/validation.js';
import { getAuthenticatedUser, requireRoles } from '../middleware/auth.js';
import { toReturnView } from '../lib/serializers.js';
import { AppError } from '../middleware/error.js';

const router = Router();
const dateSchema = z
  .string()
  .regex(dateOnlySchema, 'date must use YYYY-MM-DD')
  .refine(isDateOnly, 'date must be a valid calendar date');
const quantitySchema = z.number().int().nonnegative().max(1_000_000);
const listQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  processorId: z.string().min(1).optional(),
  distributorId: z.string().min(1).optional(),
});
const returnInputSchema = z
  .object({
    distributorId: z.string().min(1),
    supervisorReceivedQuantity: quantitySchema,
    officeReissueQuantity: quantitySchema,
    note: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, context) => {
    if (value.supervisorReceivedQuantity + value.officeReissueQuantity === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supervisorReceivedQuantity'],
        message: 'At least one return case must have a quantity greater than zero',
      });
    }
  });
const idParamsSchema = z.object({ id: z.string().min(1) });

const returnInclude = {
  distributor: { select: { name: true } },
  processor: { select: { name: true, username: true } },
} satisfies Prisma.ReturnInclude;

function resolveReturnProcessor(requestUser: NonNullable<Express.Request['user']>, processorId?: string) {
  if (requestUser.role === UserRole.PROCESSOR) {
    if (processorId && processorId !== requestUser.id) {
      throw new AppError(403, 'FORBIDDEN', 'Processors can only view their own returns');
    }
    return requestUser.id;
  }
  return processorId;
}

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseInput(listQuerySchema, request.query);
    const requestUser = getAuthenticatedUser(request);
    const processorId = resolveReturnProcessor(requestUser, query.processorId);
    const from = query.from ? toDateOnly(query.from) : undefined;
    const to = query.to ? endOfDay(query.to) : undefined;
    if (from && to && from.getTime() > to.getTime()) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'from must be before or equal to to');
    }
    const records = await prisma.return.findMany({
      where: {
        ...(processorId ? { processorId } : {}),
        ...(query.distributorId ? { distributorId: query.distributorId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: returnInclude,
      orderBy: { createdAt: 'desc' },
    });
    response.json({ data: records.map(toReturnView) });
  }),
);

router.post(
  '/',
  requireRoles(UserRole.PROCESSOR),
  asyncHandler(async (request, response) => {
    const input = parseInput(returnInputSchema, request.body);
    const processorId = getAuthenticatedUser(request).id;
    const distributor = await prisma.distributor.findUnique({ where: { id: input.distributorId } });
    if (!distributor || distributor.status !== 'ACTIVE') {
      throw new AppError(400, 'INVALID_DISTRIBUTOR', 'The distributor must be active');
    }
    const quantity = input.supervisorReceivedQuantity + input.officeReissueQuantity;
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.return.create({
        data: {
          distributorId: input.distributorId,
          processorId,
          quantity,
          supervisorReceivedQuantity: input.supervisorReceivedQuantity,
          officeReissueQuantity: input.officeReissueQuantity,
          note: input.note ?? null,
        },
        include: returnInclude,
      });
      await tx.auditLog.create({
        data: {
          user: { connect: { id: processorId } },
          action: 'RETURN_CREATED',
          entityType: 'Return',
          entityId: created.id,
          after: auditSnapshot({
            distributorId: created.distributorId,
            processorId: created.processorId,
            quantity: created.quantity,
            supervisorReceivedQuantity: created.supervisorReceivedQuantity,
            officeReissueQuantity: created.officeReissueQuantity,
            note: created.note,
          }),
        },
      });
      return created;
    });
    response.status(201).json({ data: toReturnView(record) });
  }),
);

router.patch(
  '/:id',
  requireRoles(UserRole.PROCESSOR),
  asyncHandler(async (request, response) => {
    const { id } = parseInput(idParamsSchema, request.params);
    const input = parseInput(returnInputSchema, request.body);
    const processorId = getAuthenticatedUser(request).id;
    const existing = await prisma.return.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'The return record was not found');
    }
    if (existing.processorId !== processorId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only edit your own returns');
    }
    const distributor = await prisma.distributor.findUnique({ where: { id: input.distributorId } });
    if (!distributor || distributor.status !== 'ACTIVE') {
      throw new AppError(400, 'INVALID_DISTRIBUTOR', 'The distributor must be active');
    }
    const quantity = input.supervisorReceivedQuantity + input.officeReissueQuantity;
    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.return.update({
        where: { id },
        data: {
          distributorId: input.distributorId,
          quantity,
          supervisorReceivedQuantity: input.supervisorReceivedQuantity,
          officeReissueQuantity: input.officeReissueQuantity,
          note: input.note ?? null,
        },
        include: returnInclude,
      });
      await tx.auditLog.create({
        data: {
          user: { connect: { id: processorId } },
          action: 'RETURN_UPDATED',
          entityType: 'Return',
          entityId: updated.id,
          before: auditSnapshot({
            distributorId: existing.distributorId,
            quantity: existing.quantity,
            supervisorReceivedQuantity: existing.supervisorReceivedQuantity,
            officeReissueQuantity: existing.officeReissueQuantity,
            note: existing.note,
          }),
          after: auditSnapshot({
            distributorId: updated.distributorId,
            quantity: updated.quantity,
            supervisorReceivedQuantity: updated.supervisorReceivedQuantity,
            officeReissueQuantity: updated.officeReissueQuantity,
            note: updated.note,
          }),
        },
      });
      return updated;
    });
    response.json({ data: toReturnView(record) });
  }),
);

export { router as returnsRouter };
