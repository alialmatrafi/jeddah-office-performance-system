import { Router } from 'express';
import {
  aggregatePerformance,
  PerformanceRecord,
  ReturnSummary,
  UserRole,
} from '@jeddah/shared';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { dateOnly, dateOnlySchema, endOfDay, endOfMonth, isDateOnly, startOfMonth, toDateOnly } from '../lib/dates.js';
import { parseInput } from '../middleware/validation.js';
import { getAuthenticatedUser, requireRoles } from '../middleware/auth.js';
import { toReturnView } from '../lib/serializers.js';
import { AppError } from '../middleware/error.js';

const router = Router();
const dateSchema = z
  .string()
  .regex(dateOnlySchema, 'date must use YYYY-MM-DD')
  .refine(isDateOnly, 'date must be a valid calendar date');
const performanceQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  processorId: z.string().min(1).optional(),
});
const returnsQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  processorId: z.string().min(1).optional(),
  distributorId: z.string().min(1).optional(),
});

const returnInclude = {
  distributor: { select: { name: true } },
  processor: { select: { name: true, username: true } },
} as const;

type PerformanceQuery = z.infer<typeof performanceQuerySchema>;

function getReportRange(fromValue?: string, toValue?: string) {
  const now = new Date();
  const from = fromValue ?? dateOnly(startOfMonth(now));
  const to = toValue ?? dateOnly(endOfMonth(now));
  const fromDate = toDateOnly(from);
  const toDate = endOfDay(to);
  if (fromDate.getTime() > toDate.getTime()) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'from must be before or equal to to');
  }
  return { from, to, fromDate, toDate };
}

function getReportProcessor(requestUser: NonNullable<Express.Request['user']>, processorId?: string) {
  if (requestUser.role === UserRole.PROCESSOR) {
    if (processorId && processorId !== requestUser.id) {
      throw new AppError(403, 'FORBIDDEN', 'Processors can only view their own performance');
    }
    return requestUser.id;
  }
  return processorId;
}

router.get(
  '/performance',
  asyncHandler(async (request, response) => {
    const query: PerformanceQuery = parseInput(performanceQuerySchema, request.query);
    const requestUser = getAuthenticatedUser(request);
    const range = getReportRange(query.from, query.to);
    const processorId = getReportProcessor(requestUser, query.processorId);
    const works = await prisma.dailyWork.findMany({
      where: {
        workDate: { gte: range.fromDate, lte: range.toDate },
        ...(processorId ? { processorId } : {}),
      },
      include: {
        processor: { select: { name: true, username: true } },
        shipmentEntries: { select: { entryCount: true, createdAt: true } },
      },
      orderBy: { workDate: 'asc' },
    });
    const records: PerformanceRecord[] = works.map((work) => {
      const operationTimes = [work.createdAt, ...work.shipmentEntries.map((entry) => entry.createdAt)];
      const firstOperation = new Date(Math.min(...operationTimes.map((time) => time.getTime())));
      const lastOperation = new Date(Math.max(...operationTimes.map((time) => time.getTime())));
      return {
        id: work.id,
        processorId: work.processorId,
        processorName: work.processor.name,
        processorUsername: work.processor.username,
        workDate: dateOnly(work.workDate),
        excellentMail: work.excellentMail,
        officialMail: work.officialMail,
        registeredMail: work.registeredMail,
        governmentDocs: work.governmentDocs,
        parcels: work.parcels,
        shipmentEntryCount: work.shipmentEntries.reduce(
          (total, entry) => total + entry.entryCount,
          0,
        ),
        firstOperationAt: firstOperation.toISOString(),
        lastOperationAt: lastOperation.toISOString(),
      };
    });
    const returnRows = await prisma.return.findMany({
      where: {
        createdAt: { gte: range.fromDate, lte: range.toDate },
        ...(processorId ? { processorId } : {}),
      },
      select: { processorId: true, quantity: true },
    });
    const returns: ReturnSummary[] = returnRows;
    response.json({ data: aggregatePerformance(records, returns, { from: range.from, to: range.to }) });
  }),
);

router.get(
  '/returns',
  requireRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (request, response) => {
    const query = parseInput(returnsQuerySchema, request.query);
    const from = query.from ? toDateOnly(query.from) : undefined;
    const to = query.to ? endOfDay(query.to) : undefined;
    if (from && to && from.getTime() > to.getTime()) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'from must be before or equal to to');
    }
    const records = await prisma.return.findMany({
      where: {
        ...(query.processorId ? { processorId: query.processorId } : {}),
        ...(query.distributorId ? { distributorId: query.distributorId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: returnInclude,
      orderBy: { createdAt: 'desc' },
    });
    response.json({ data: records.map(toReturnView) });
  }),
);

export { router as reportsRouter };
