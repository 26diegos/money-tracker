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
  isDueNow: boolean;
};

export type PaymentReminder = {
  items: PaymentReminderItem[];
  totalDueNow: Prisma.Decimal;
  totalScheduled: Prisma.Decimal;
  totalDueByDate: Prisma.Decimal;
  remainingAfterForecast: Prisma.Decimal;
  selectedDateLabel: string;
  selectedDateValue: string;
  message: string;
};

export function buildPaymentReminder(
  personName: string,
  debts: ReminderDebt[],
  totalOutstanding: Prisma.Decimal,
  referenceDate: Date,
  selectedDate = referenceDate,
): PaymentReminder {
  const todayStart = new Date(referenceDate);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const selectedDateStart = new Date(selectedDate);
  selectedDateStart.setHours(0, 0, 0, 0);

  const selectedDateEnd = new Date(selectedDateStart);
  selectedDateEnd.setDate(selectedDateEnd.getDate() + 1);

  const dueInstallments = debts
    .flatMap((debt) =>
      debt.installments
        .filter(
          (installment) =>
            !installment.paymentId && installment.dueAt < selectedDateEnd,
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
      const isDueNow = installment.dueAt < tomorrowStart;

      return {
        description,
        installmentLabel: `Installment ${installment.sequence} of ${installmentCount}`,
        amount: formatMoney(installment.amount),
        dueLabel: isOverdue
          ? `Past due since ${formatReminderDate(installment.dueAt)}`
          : isDueNow
            ? "Due today"
            : `Due ${formatReminderDate(installment.dueAt)}`,
        isOverdue,
        isDueNow,
      };
    },
  );

  const totalDueNow = dueInstallments.reduce(
    (total, { installment }) =>
      installment.dueAt < tomorrowStart
        ? total.plus(installment.amount)
        : total,
    new Prisma.Decimal(0),
  );
  const totalDueByDate = dueInstallments.reduce(
    (total, { installment }) => total.plus(installment.amount),
    new Prisma.Decimal(0),
  );
  const totalScheduled = totalDueByDate.minus(totalDueNow);
  const remainingAfterForecast = Prisma.Decimal.max(
    totalOutstanding.minus(totalDueByDate),
    new Prisma.Decimal(0),
  );
  const selectedDateLabel = formatReminderDate(selectedDateStart);
  const selectedDateValue = formatDateInput(selectedDateStart);
  const greeting = `Hi ${personName},`;

  if (items.length === 0) {
    const balanceMessage = totalOutstanding.isZero()
      ? `Your balance is fully paid. Nothing is due by ${selectedDateLabel}.`
      : `Your current outstanding balance is ${formatMoney(totalOutstanding)}. Nothing is scheduled for payment by ${selectedDateLabel}.`;

    return {
      items,
      totalDueNow,
      totalScheduled,
      totalDueByDate,
      remainingAfterForecast,
      selectedDateLabel,
      selectedDateValue,
      message: `${greeting}\n\n${balanceMessage}\n\nThank you!`,
    };
  }

  const details = items
    .map((item) => {
      const dueContext = item.isOverdue
        ? item.dueLabel.replace(/^Past/, "past")
        : item.isDueNow
          ? "due today"
          : item.dueLabel.replace(/^Due/, "due");

      return `• ${item.description} — ${item.installmentLabel}: ${item.amount} (${dueContext})`;
    })
    .join("\n");

  return {
    items,
    totalDueNow,
    totalScheduled,
    totalDueByDate,
    remainingAfterForecast,
    selectedDateLabel,
    selectedDateValue,
    message: [
      greeting,
      "",
      `Here’s what is due by ${selectedDateLabel}:`,
      details,
      "",
      `Total due by ${selectedDateLabel}: ${formatMoney(totalDueByDate)}`,
      `Total outstanding balance: ${formatMoney(totalOutstanding)}`,
      "",
      "Thank you!",
    ].join("\n"),
  };
}

function formatDateInput(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatReminderDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
