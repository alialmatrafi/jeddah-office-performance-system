import { Router } from 'express';
import { UserRole } from '@jeddah/shared';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { parseInput } from '../middleware/validation.js';
import { requireRoles } from '../middleware/auth.js';

const router = Router();
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  action: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
  userId: z.string().min(1).optional(),
});

router.use(requireRoles(UserRole.ADMIN, UserRole.SUPERVISOR));

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseInput(querySchema, request.query);
    const where = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    response.json({
      data: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        userName: item.user.name,
        username: item.user.username,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        before: item.before,
        after: item.after,
        createdAt: item.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    });
  }),
);

export { router as auditLogsRouter };
