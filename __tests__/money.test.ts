import { describe, expect, it } from "vitest";
import { Prisma } from "@/src/generated/prisma/client";
import {
  canApplyPayment,
  debtAmountCoversPaid,
  formatMoney,
  getDebtOutstanding,
  getDebtPaid,
  getTotalOutstanding,
} from "@/lib/money";

const decimal = (value: string | number) => new Prisma.Decimal(value);

describe("debt balances", () => {
  it("calculates an unpaid debt", () => {
    const debt = {
      amount: decimal("125.50"),
      payments: [],
    };

    expect(getDebtPaid(debt).toFixed(2)).toBe("0.00");
    expect(getDebtOutstanding(debt).toFixed(2)).toBe("125.50");
  });

  it("calculates partial and full payments exactly", () => {
    const partialDebt = {
      amount: decimal("100.00"),
      payments: [{ amount: decimal("33.33") }, { amount: decimal("16.67") }],
    };
    const paidDebt = {
      amount: decimal("20.00"),
      payments: [{ amount: decimal("7.70") }, { amount: decimal("12.30") }],
    };

    expect(getDebtPaid(partialDebt).toFixed(2)).toBe("50.00");
    expect(getDebtOutstanding(partialDebt).toFixed(2)).toBe("50.00");
    expect(getDebtOutstanding(paidDebt).toFixed(2)).toBe("0.00");
  });

  it("totals outstanding balances across debts", () => {
    const total = getTotalOutstanding([
      {
        amount: decimal("100.00"),
        payments: [{ amount: decimal("25.00") }],
      },
      {
        amount: decimal("40.00"),
        payments: [{ amount: decimal("40.00") }],
      },
      {
        amount: decimal("12.34"),
        payments: [],
      },
    ]);

    expect(total.toFixed(2)).toBe("87.34");
  });
});

describe("financial guards", () => {
  it("accepts a positive payment up to the remaining balance", () => {
    expect(canApplyPayment(decimal("0.01"), decimal("10.00"))).toBe(true);
    expect(canApplyPayment(decimal("10.00"), decimal("10.00"))).toBe(true);
  });

  it("rejects zero, negative, and excessive payments", () => {
    expect(canApplyPayment(decimal("0.00"), decimal("10.00"))).toBe(false);
    expect(canApplyPayment(decimal("-1.00"), decimal("10.00"))).toBe(false);
    expect(canApplyPayment(decimal("10.01"), decimal("10.00"))).toBe(false);
  });

  it("prevents a debt from being reduced below its paid amount", () => {
    expect(debtAmountCoversPaid(decimal("50.00"), decimal("50.00"))).toBe(
      true,
    );
    expect(debtAmountCoversPaid(decimal("49.99"), decimal("50.00"))).toBe(
      false,
    );
  });
});

describe("money formatting", () => {
  it("always renders two decimal places", () => {
    expect(formatMoney(decimal("12"))).toBe("$12.00");
    expect(formatMoney(decimal("12.3"))).toBe("$12.30");
  });

  it("groups thousands for dashboard readability", () => {
    expect(formatMoney(decimal("12345.67"))).toBe("$12,345.67");
  });
});
