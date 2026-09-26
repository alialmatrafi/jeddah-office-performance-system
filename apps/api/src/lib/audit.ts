import { Prisma } from '@prisma/client';

export function auditSnapshot(
  values: Record<string, string | number | boolean | null | undefined>,
): Prisma.InputJsonObject {
  const entries = Object.entries(values).filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined);
  return Object.fromEntries(entries);
}
