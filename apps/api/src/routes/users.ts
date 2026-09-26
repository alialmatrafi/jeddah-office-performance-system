import { Prisma } from '@prisma/client';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@jeddah/shared';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { auditSnapshot } from '../lib/audit.js';
import { parseInput } from '../middleware/validation.js';
import { requireRoles } from '../middleware/auth.js';
import { toUserView } from '../lib/serializers.js';
import { AppError } from '../middleware/error.js';

const router = Router();

const idParams = z.object({ id: z.string().min(1) });
const listQuery = z.object({
  role: z.enum([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PROCESSOR]).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]).optional(),
});
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(120),
  role: z.enum([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PROCESSOR]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]).default(UserStatus.ACTIVE),
});
const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/).optional(),
    password: z.string().min(8).max(120).optional(),
    role: z.enum([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PROCESSOR]).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  });

router.get(
  '/processors',
  requireRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_request, response) => {
    const users = await prisma.user.findMany({
      where: { role: UserRole.PROCESSOR, status: UserStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
    response.json({ data: users.map(toUserView) });
  }),
);

router.use(requireRoles(UserRole.ADMIN));

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseInput(listQuery, request.query);
    const users = await prisma.user.findMany({
      where: {
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    response.json({ data: users.map(toUserView) });
  }),
);

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const input = parseInput(createSchema, request.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const actorId = request.user?.id;
    if (!actorId) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name,
          username: input.username,
          passwordHash,
          role: input.role,
          status: input.status,
        },
      });
      await tx.auditLog.create({
        data: {
          user: { connect: { id: actorId } },
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: created.id,
          after: auditSnapshot({
            id: created.id,
            name: created.name,
            username: created.username,
            role: created.role,
            status: created.status,
          }),
        },
      });
      return created;
    });
    response.status(201).json({ data: toUserView(user) });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(updateSchema, request.body);
    const actorId = request.user?.id;
    if (!actorId) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'The user was not found');
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.username !== undefined) data.username = input.username;
    if (input.password !== undefined) data.passwordHash = await bcrypt.hash(input.password, 12);
    if (input.role !== undefined) data.role = input.role;
    if (input.status !== undefined) data.status = input.status;

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          user: { connect: { id: actorId } },
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: id,
          before: auditSnapshot({
            name: existing.name,
            username: existing.username,
            role: existing.role,
            status: existing.status,
          }),
          after: auditSnapshot({
            name: updated.name,
            username: updated.username,
            role: updated.role,
            status: updated.status,
          }),
        },
      });
      return updated;
    });
    response.json({ data: toUserView(user) });
  }),
);

export { router as usersRouter };
