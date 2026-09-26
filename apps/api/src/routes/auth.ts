import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserStatus } from '@jeddah/shared';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { parseInput } from '../middleware/validation.js';
import { authenticate, createToken, getAuthenticatedUser } from '../middleware/auth.js';
import { toUserView } from '../lib/serializers.js';
import { AppError } from '../middleware/error.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (request, response) => {
    const input = parseInput(loginSchema, request.body);
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Username or password is incorrect');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Username or password is incorrect');
    }

    const safeUser = toUserView(user);
    const token = createToken({
      id: safeUser.id,
      name: safeUser.name,
      username: safeUser.username,
      role: safeUser.role,
      status: safeUser.status,
    });
    response.json({ data: { token, user: safeUser } });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (request, response) => {
    const user = getAuthenticatedUser(request);
    const current = await prisma.user.findUnique({ where: { id: user.id } });
    if (!current) {
      throw new AppError(404, 'NOT_FOUND', 'The current user was not found');
    }
    response.json({ data: toUserView(current) });
  }),
);

export { router as authRouter };
