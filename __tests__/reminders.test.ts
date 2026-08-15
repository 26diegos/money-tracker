import { describe, expect, it } from "vitest";
import { Prisma } from "@/src/generated/prisma/client";
import { buildPaymentReminder } from "@/lib/reminders";

const decimal = (value: string) => new Prisma.Decimal(value);
const localDate = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour);

describe("payment reminders", () => {
  it("includes unpaid installments due today and earlier", () => {
    const reminder = buildPaymentReminder(
      "Alejandra",
      [
        {
          description: "Flight",
          installments: [
            {
              sequence: 1,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 7, 26),
              paymentId: null,
            },
            {
              sequence: 2,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 7, 27),
              paymentId: null,
            },
            {
              sequence: 3,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 8, 27),
              paymentId: null,
            },
          ],
        },
      ],
      decimal("300.00"),
      localDate(2026, 7, 27, 8),
    );

    expect(reminder.items).toHaveLength(2);
    expect(reminder.items.map((item) => item.dueLabel)).toEqual([
      "Past due since Jul 26, 2026",
      "Due today",
    ]);
    expect(reminder.totalDueNow.toFixed(2)).toBe("200.00");
    expect(reminder.message).toContain("Total due now: $200.00");
    expect(reminder.message).toContain(
      "Flight — Installment 2 of 3: $100.00 (due today)",
    );
    expect(reminder.message).toContain(
      "Flight — Installment 1 of 3: $100.00 (past due since Jul 26, 2026)",
    );
  });

  it("excludes paid and future installments", () => {
    const reminder = buildPaymentReminder(
      "Alejandra",
      [
        {
          description: "Flight",
          installments: [
            {
              sequence: 1,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 7, 26),
              paymentId: "payment-1",
            },
            {
              sequence: 2,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 8, 27),
              paymentId: null,
            },
          ],
        },
      ],
      decimal("100.00"),
      localDate(2026, 7, 27),
    );

    expect(reminder.items).toEqual([]);
    expect(reminder.message).toContain(
      "Your current outstanding balance is $100.00.",
    );
    expect(reminder.message).toContain(
      "Nothing is scheduled for payment today.",
    );
  });

  it("reports a settled balance without asking for payment", () => {
    const reminder = buildPaymentReminder(
      "Alejandra",
      [],
      decimal("0.00"),
      localDate(2026, 7, 27),
    );

    expect(reminder.message).toContain("Your balance is fully paid.");
    expect(reminder.totalDueNow.isZero()).toBe(true);
  });
});
