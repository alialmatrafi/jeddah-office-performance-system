export const dateOnlySchema = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): boolean {
  if (!dateOnlySchema.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && dateOnly(date) === value;
}

export function toDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date;
}

export function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

export function startOfWeek(value: Date): Date {
  const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = start.getUTCDay();
  const difference = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - difference);
  return start;
}

export function startOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function endOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
}
