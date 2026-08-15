import { Prisma } from "@/src/generated/prisma/client";
import { formatMoney } from "@/lib/money";

type ReminderInstallment = {
  sequence: number;
  amount: Prisma.Decimal;
  dueAt: Date;
  paymentId: string | null;
};

type ReminderDebt = {
  description: string;
  installments: ReminderInstallment[];
};

export type PaymentReminderItem = {
  description: string;
  installmentLabel: string;
  amount: string;
  dueLabel: string;
  isOverdue: boolean;
};

export type PaymentReminder = {
  items: PaymentReminderItem[];
  totalDueNow: Prisma.Decimal;
  message: string;
};

export function buildPaymentReminder(
  personName: string,
  debts: ReminderDebt[],
  totalOutstanding: Prisma.Decimal,
  referenceDate: Date,
): PaymentReminder {
  const todayStart = new Date(referenceDate);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const dueInstallments = debts
    .flatMap((debt) =>
      debt.installments
        .filter(
          (installment) =>
            !installment.paymentId && installment.dueAt < tomorrowStart,
        )
        .map((installment) => ({
          description: debt.description,
          installment,
          installmentCount: debt.installments.length,
        })),
    )
    .sort(
      (first, second) =>
        first.installment.dueAt.getTime() -
          second.installment.dueAt.getTime() ||
        first.description.localeCompare(second.description),
    );

  const items = dueInstallments.map(
    ({ description, installment, installmentCount }) => {
      const isOverdue = installment.dueAt < todayStart;

      return {
        description,
        installmentLabel: `Installment ${installment.sequence} of ${installmentCount}`,
        amount: formatMoney(installment.amount),
        dueLabel: isOverdue
          ? `Past due since ${formatReminderDate(installment.dueAt)}`
          : "Due today",
        isOverdue,
      };
    },
  );

  const totalDueNow = dueInstallments.reduce(
    (total, { installment }) => total.plus(installment.amount),
    new Prisma.Decimal(0),
  );
  const greeting = `Hi ${personName},`;

  if (items.length === 0) {
    const balanceMessage = totalOutstanding.isZero()
      ? "Your balance is fully paid. Nothing is due today."
      : `Your current outstanding balance is ${formatMoney(totalOutstanding)}. Nothing is scheduled for payment today.`;

    return {
      items,
      totalDueNow,
      message: `${greeting}\n\n${balanceMessage}\n\nThank you!`,
    };
  }

  const details = items
    .map((item) => {
      const dueContext = item.isOverdue
        ? item.dueLabel.replace(/^Past/, "past")
        : "due today";

      return `• ${item.description} — ${item.installmentLabel}: ${item.amount} (${dueContext})`;
    })
    .join("\n");

  return {
    items,
    totalDueNow,
    message: [
      greeting,
      "",
      "Here’s your payment reminder:",
      details,
      "",
      `Total due now: ${formatMoney(totalDueNow)}`,
      `Total outstanding balance: ${formatMoney(totalOutstanding)}`,
      "",
      "Thank you!",
    ].join("\n"),
  };
}

function formatReminderDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
