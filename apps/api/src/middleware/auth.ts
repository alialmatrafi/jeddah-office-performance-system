import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { UserRole, UserStatus } from '@jeddah/shared';
import { z } from 'zod';
import { getConfig } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from './error.js';
import { asyncHandler } from '../lib/http.js';
import type { AuthUser } from '../lib/auth-types.js';

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PROCESSOR]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]),
});

export function createToken(user: AuthUser): string {
  const config = getConfig();
  return jwt.sign(
    { sub: user.id, role: user.role, status: user.status },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

export const authenticate = asyncHandler(
  async (request: Request, _response: Response, next: NextFunction) => {
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    let decoded: unknown;
    try {
      decoded = jwt.verify(token, getConfig().jwtSecret);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired');
    }

    let payload: z.infer<typeof tokenPayloadSchema>;
    try {
      payload = tokenPayloadSchema.parse(decoded);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppError(401, 'ACCOUNT_INACTIVE', 'The account is inactive');
    }

    request.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
    };
    next();
  },
);

export function requireRoles(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const user = request.user;
    if (!user) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'));
      return;
    }
    if (!roles.includes(user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));
      return;
    }
    next();
  };
}

export function getAuthenticatedUser(request: Request): AuthUser {
  if (!request.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
  }
  return request.user;
}
