import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const districts = await prisma.district.findMany({ orderBy: { name: 'asc' } });
    response.json({ data: districts });
  }),
);

export { router as districtsRouter };
