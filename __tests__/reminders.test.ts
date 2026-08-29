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
    expect(reminder.message).toContain(
      "Total due by Jul 27, 2026: $200.00",
    );
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
      "Nothing is scheduled for payment by Jul 27, 2026.",
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

  it("forecasts all unpaid installments due through a future date", () => {
    const reminder = buildPaymentReminder(
      "Alejandra",
      [
        {
          description: "Flight",
          installments: [
            {
              sequence: 1,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 7, 1),
              paymentId: null,
            },
            {
              sequence: 2,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 8, 1),
              paymentId: null,
            },
            {
              sequence: 3,
              amount: decimal("100.00"),
              dueAt: localDate(2026, 9, 1),
              paymentId: null,
            },
          ],
        },
        {
          description: "Hotel",
          installments: [
            {
              sequence: 1,
              amount: decimal("75.00"),
              dueAt: localDate(2026, 8, 15),
              paymentId: null,
            },
          ],
        },
      ],
      decimal("375.00"),
      localDate(2026, 7, 27),
      localDate(2026, 8, 15),
    );

    expect(reminder.items).toHaveLength(3);
    expect(reminder.totalDueNow.toFixed(2)).toBe("100.00");
    expect(reminder.totalScheduled.toFixed(2)).toBe("175.00");
    expect(reminder.totalDueByDate.toFixed(2)).toBe("275.00");
    expect(reminder.remainingAfterForecast.toFixed(2)).toBe("100.00");
    expect(reminder.items.map((item) => item.dueLabel)).toEqual([
      "Past due since Jul 1, 2026",
      "Due Aug 1, 2026",
      "Due Aug 15, 2026",
    ]);
    expect(reminder.message).toContain(
      "Total due by Aug 15, 2026: $275.00",
    );
    expect(reminder.message).not.toContain("Installment 3 of 3");
  });
});
