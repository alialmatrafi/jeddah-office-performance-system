import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { DistributorStatus, UserRole } from '@jeddah/shared';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { auditSnapshot } from '../lib/audit.js';
import { parseInput } from '../middleware/validation.js';
import { requireRoles } from '../middleware/auth.js';
import { toDistributorView } from '../lib/serializers.js';
import { AppError } from '../middleware/error.js';

const router = Router();

const idParams = z.object({ id: z.string().min(1) });
const listQuery = z.object({
  status: z.enum([DistributorStatus.ACTIVE, DistributorStatus.INACTIVE]).optional(),
});
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  status: z.enum([DistributorStatus.ACTIVE, DistributorStatus.INACTIVE]).default(DistributorStatus.ACTIVE),
});
const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    status: z.enum([DistributorStatus.ACTIVE, DistributorStatus.INACTIVE]).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  });

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseInput(listQuery, request.query);
    const user = request.user;
    if (!user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }
    const statusFilter = user.role === UserRole.PROCESSOR ? DistributorStatus.ACTIVE : query.status;
    const distributors = await prisma.distributor.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { name: 'asc' },
    });
    response.json({ data: distributors.map(toDistributorView) });
  }),
);

router.post(
  '/',
  requireRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (request, response) => {
    const input = parseInput(createSchema, request.body);
    const actorId = request.user?.id;
    if (!actorId) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }
    const distributor = await prisma.$transaction(async (tx) => {
      const created = await tx.distributor.create({ data: input });
      await tx.auditLog.create({
        data: {
          user: { connect: { id: actorId } },
          action: 'DISTRIBUTOR_CREATED',
          entityType: 'Distributor',
          entityId: created.id,
          after: auditSnapshot({ id: created.id, name: created.name, status: created.status }),
        },
      });
      return created;
    });
    response.status(201).json({ data: toDistributorView(distributor) });
  }),
);

router.patch(
  '/:id',
  requireRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(updateSchema, request.body);
    const actorId = request.user?.id;
    if (!actorId) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }
    const existing = await prisma.distributor.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'The distributor was not found');
    }
    const data: Prisma.DistributorUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.status !== undefined) data.status = input.status;
    const distributor = await prisma.$transaction(async (tx) => {
      const updated = await tx.distributor.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          user: { connect: { id: actorId } },
          action: 'DISTRIBUTOR_UPDATED',
          entityType: 'Distributor',
          entityId: id,
          before: auditSnapshot({ name: existing.name, status: existing.status }),
          after: auditSnapshot({ name: updated.name, status: updated.status }),
        },
      });
      return updated;
    });
    response.json({ data: toDistributorView(distributor) });
  }),
);

export { router as distributorsRouter };
