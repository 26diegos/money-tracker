import { describe, expect, it } from "vitest";
import { Prisma } from "@/src/generated/prisma/client";
import {
  addMonthsClamped,
  buildInstallmentSchedule,
  getInstallmentStatus,
  getMonthBounds,
} from "@/lib/installments";

const decimal = (value: string | number) => new Prisma.Decimal(value);
const utcDate = (value: string) => new Date(`${value}T12:00:00.000Z`);
const localDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12);

describe("installment schedule amounts", () => {
  it("puts rounding cents into the final installment", () => {
    const schedule = buildInstallmentSchedule(
      decimal("100.00"),
      3,
      utcDate("2026-07-15"),
    );

    expect(schedule.map((item) => item.amount.toFixed(2))).toEqual([
      "33.33",
      "33.33",
      "33.34",
    ]);
    expect(
      schedule
        .reduce(
          (total, item) => total.plus(item.amount),
          decimal("0.00"),
        )
        .toFixed(2),
    ).toBe("100.00");
  });

  it("keeps exactly divisible installments equal", () => {
    const schedule = buildInstallmentSchedule(
      decimal("10.00"),
      4,
      utcDate("2026-07-15"),
    );

    expect(schedule.map((item) => item.amount.toFixed(2))).toEqual([
      "2.50",
      "2.50",
      "2.50",
      "2.50",
    ]);
  });

  it("requires between 2 and 60 installments", () => {
    expect(() =>
      buildInstallmentSchedule(decimal("100.00"), 1, utcDate("2026-07-15")),
    ).toThrow(RangeError);
    expect(() =>
      buildInstallmentSchedule(decimal("100.00"), 61, utcDate("2026-07-15")),
    ).toThrow(RangeError);
    expect(() =>
      buildInstallmentSchedule(decimal("100.00"), 2.5, utcDate("2026-07-15")),
    ).toThrow(RangeError);
  });

  it("requires every installment to be at least one cent", () => {
    expect(() =>
      buildInstallmentSchedule(decimal("0.01"), 2, utcDate("2026-07-15")),
    ).toThrow("Each installment must be at least $0.01.");
  });
});

describe("monthly due dates", () => {
  it("preserves the requested day when the month supports it", () => {
    const schedule = buildInstallmentSchedule(
      decimal("30.00"),
      3,
      utcDate("2026-06-30"),
    );

    expect(schedule.map((item) => item.dueAt.toISOString().slice(0, 10))).toEqual(
      ["2026-06-30", "2026-07-30", "2026-08-30"],
    );
  });

  it("clamps the 31st to each target month's final day", () => {
    const start = utcDate("2027-01-31");

    expect(addMonthsClamped(start, 1).toISOString().slice(0, 10)).toBe(
      "2027-02-28",
    );
    expect(addMonthsClamped(start, 2).toISOString().slice(0, 10)).toBe(
      "2027-03-31",
    );
    expect(addMonthsClamped(start, 3).toISOString().slice(0, 10)).toBe(
      "2027-04-30",
    );
  });

  it("handles leap-year February", () => {
    expect(
      addMonthsClamped(utcDate("2028-01-31"), 1).toISOString().slice(0, 10),
    ).toBe("2028-02-29");
  });

  it("crosses year boundaries", () => {
    expect(
      addMonthsClamped(utcDate("2026-12-31"), 1).toISOString().slice(0, 10),
    ).toBe("2027-01-31");
  });
});

describe("installment status", () => {
  const referenceDate = localDate(2026, 7, 24);

  it("classifies unpaid installments around the current month", () => {
    expect(
      getInstallmentStatus(localDate(2026, 6, 30), false, referenceDate),
    ).toBe("Overdue");
    expect(
      getInstallmentStatus(localDate(2026, 7, 1), false, referenceDate),
    ).toBe("Due this month");
    expect(
      getInstallmentStatus(localDate(2026, 7, 31), false, referenceDate),
    ).toBe("Due this month");
    expect(
      getInstallmentStatus(localDate(2026, 8, 1), false, referenceDate),
    ).toBe("Upcoming");
  });

  it("always classifies a linked installment as paid", () => {
    expect(
      getInstallmentStatus(localDate(2025, 1, 1), true, referenceDate),
    ).toBe("Paid");
  });

  it("computes month boundaries across December", () => {
    const { monthStart, nextMonthStart } = getMonthBounds(
      new Date(2026, 11, 15, 12),
    );

    expect(monthStart.getFullYear()).toBe(2026);
    expect(monthStart.getMonth()).toBe(11);
    expect(monthStart.getDate()).toBe(1);
    expect(nextMonthStart.getFullYear()).toBe(2027);
    expect(nextMonthStart.getMonth()).toBe(0);
    expect(nextMonthStart.getDate()).toBe(1);
  });
});
