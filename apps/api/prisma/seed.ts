import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { requireEnvironment } from '../src/config.js';

void dotenv.config();
void dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

async function seedUser(
  name: string,
  username: string,
  password: string,
  role: UserRole,
): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { username },
    update: { name, passwordHash, role, status: UserStatus.ACTIVE },
    create: { name, username, passwordHash, role, status: UserStatus.ACTIVE },
  });
}

async function main(): Promise<void> {
  await seedUser(
    requireEnvironment('SEED_ADMIN_NAME'),
    requireEnvironment('SEED_ADMIN_USERNAME'),
    requireEnvironment('SEED_ADMIN_PASSWORD'),
    UserRole.ADMIN,
  );
  await seedUser(
    requireEnvironment('SEED_SUPERVISOR_NAME'),
    requireEnvironment('SEED_SUPERVISOR_USERNAME'),
    requireEnvironment('SEED_SUPERVISOR_PASSWORD'),
    UserRole.SUPERVISOR,
  );
  await seedUser(
    requireEnvironment('SEED_PROCESSOR_NAME'),
    requireEnvironment('SEED_PROCESSOR_USERNAME'),
    requireEnvironment('SEED_PROCESSOR_PASSWORD'),
    UserRole.PROCESSOR,
  );

  const districts = ['حي السلامة', 'حي الروضة', 'حي النزهة', 'حي الحمراء'];
  for (const name of districts) {
    await prisma.district.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const distributors = ['مؤسسة النور للتوزيع', 'شركة Jeddah Express', 'مكتب بادر'];
  for (const name of distributors) {
    await prisma.distributor.upsert({
      where: { name },
      update: { status: 'ACTIVE' },
      create: { name, status: 'ACTIVE' },
    });
  }

  console.log('Seed completed');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
