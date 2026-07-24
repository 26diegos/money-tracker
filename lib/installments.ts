import { Prisma } from "@/src/generated/prisma/client";

export type InstallmentStatus =
  | "Paid"
  | "Overdue"
  | "Due this month"
  | "Upcoming";

export function getMonthBounds(date: Date) {
  return {
    monthStart: new Date(date.getFullYear(), date.getMonth(), 1),
    nextMonthStart: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

export function addMonthsClamped(date: Date, offset: number) {
  const targetMonth = date.getUTCMonth() + offset;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0, 12),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      Math.min(date.getUTCDate(), lastDay),
      12,
    ),
  );
}

export function buildInstallmentSchedule(
  total: Prisma.Decimal,
  count: number,
  firstDueAt: Date,
) {
  if (!Number.isInteger(count) || count < 2 || count > 60) {
    throw new RangeError("Installment count must be between 2 and 60.");
  }

  const totalCents = total.times(100).toNumber();

  if (!Number.isInteger(totalCents) || totalCents < count) {
    throw new RangeError("Each installment must be at least $0.01.");
  }

  const regularCents = Math.floor(totalCents / count);
  const finalCents = totalCents - regularCents * (count - 1);

  return Array.from({ length: count }, (_, index) => ({
    sequence: index + 1,
    amount: new Prisma.Decimal(
      index === count - 1 ? finalCents : regularCents,
    ).dividedBy(100),
    dueAt: addMonthsClamped(firstDueAt, index),
  }));
}

export function getInstallmentStatus(
  dueAt: Date,
  isPaid: boolean,
  referenceDate: Date,
): InstallmentStatus {
  if (isPaid) {
    return "Paid";
  }

  const { monthStart, nextMonthStart } = getMonthBounds(referenceDate);

  if (dueAt < monthStart) {
    return "Overdue";
  }

  if (dueAt < nextMonthStart) {
    return "Due this month";
  }

  return "Upcoming";
}
