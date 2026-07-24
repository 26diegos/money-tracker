import { Prisma } from "@/src/generated/prisma/client";

type PaymentAmount = {
  amount: Prisma.Decimal;
};

type DebtAmounts = {
  amount: Prisma.Decimal;
  payments: PaymentAmount[];
};

export function getDebtPaid(debt: DebtAmounts) {
  return debt.payments.reduce(
    (total, payment) => total.plus(payment.amount),
    new Prisma.Decimal(0),
  );
}

export function getDebtOutstanding(debt: DebtAmounts) {
  return debt.amount.minus(getDebtPaid(debt));
}

export function getTotalOutstanding(debts: DebtAmounts[]) {
  return debts.reduce(
    (total, debt) => total.plus(getDebtOutstanding(debt)),
    new Prisma.Decimal(0),
  );
}

export function formatMoney(amount: Prisma.Decimal) {
  const [whole, fraction] = amount.toFixed(2).split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `$${groupedWhole}.${fraction}`;
}

export function canApplyPayment(
  paymentAmount: Prisma.Decimal,
  remaining: Prisma.Decimal,
) {
  return (
    paymentAmount.greaterThan(0) &&
    paymentAmount.lessThanOrEqualTo(remaining)
  );
}

export function debtAmountCoversPaid(
  debtAmount: Prisma.Decimal,
  paid: Prisma.Decimal,
) {
  return debtAmount.greaterThanOrEqualTo(paid);
}
