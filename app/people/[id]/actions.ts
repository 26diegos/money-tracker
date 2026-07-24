"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/src/generated/prisma/client";
import { buildInstallmentSchedule } from "@/lib/installments";
import { canApplyPayment, debtAmountCoversPaid } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type CreateDebtState = {
  status: "idle" | "error" | "success";
  message: string;
  submissionId: number;
};

export type CreatePaymentState = {
  status: "idle" | "error" | "success";
  message: string;
  submissionId: number;
};

export type EditRecordState = {
  status: "idle" | "error" | "success";
  message: string;
  submissionId: number;
};

export type DeleteRecordState = {
  status: "idle" | "error" | "success";
  message: string;
  submissionId: number;
};

export type InstallmentActionState = {
  status: "idle" | "error" | "success";
  message: string;
  submissionId: number;
};

const amountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !datePattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T12:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function revalidateMoneyPages(personId: string) {
  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath("/reports");
}

export async function createDebt(
  previousState: CreateDebtState,
  formData: FormData,
): Promise<CreateDebtState> {
  const personId = formData.get("personId");
  const description = formData.get("description");
  const amount = formData.get("amount");
  const notes = formData.get("notes");

  if (typeof personId !== "string" || !personId) {
    return {
      status: "error",
      message: "Person is required.",
      submissionId: previousState.submissionId,
    };
  }

  if (typeof description !== "string" || !description.trim()) {
    return {
      status: "error",
      message: "Enter a description.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedAmount = typeof amount === "string" ? amount.trim() : "";

  if (!amountPattern.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
    return {
      status: "error",
      message: "Enter a positive amount with up to two decimal places.",
      submissionId: previousState.submissionId,
    };
  }

  const personExists = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true },
  });

  if (!personExists) {
    return {
      status: "error",
      message: "Person was not found.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

  await prisma.debt.create({
    data: {
      personId,
      description: description.trim(),
      amount: trimmedAmount,
      notes: trimmedNotes || null,
    },
  });

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Debt added.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function createPayment(
  previousState: CreatePaymentState,
  formData: FormData,
): Promise<CreatePaymentState> {
  const personId = formData.get("personId");
  const debtId = formData.get("debtId");
  const amount = formData.get("amount");
  const notes = formData.get("notes");

  if (
    typeof personId !== "string" ||
    !personId ||
    typeof debtId !== "string" ||
    !debtId
  ) {
    return {
      status: "error",
      message: "Debt is required.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedAmount = typeof amount === "string" ? amount.trim() : "";

  if (!amountPattern.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
    return {
      status: "error",
      message: "Enter a positive amount with up to two decimal places.",
      submissionId: previousState.submissionId,
    };
  }

  const paymentAmount = new Prisma.Decimal(trimmedAmount);
  const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

  const result = await prisma.$transaction(
    async (transaction) => {
      const debt = await transaction.debt.findFirst({
        where: {
          id: debtId,
          personId,
        },
        include: {
          payments: {
            select: {
              amount: true,
            },
          },
        },
      });

      if (!debt) {
        return { status: "not-found" } as const;
      }

      const paid = debt.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0),
      );
      const remaining = debt.amount.minus(paid);

      if (!canApplyPayment(paymentAmount, remaining)) {
        return {
          status: "overpayment",
          remaining: remaining.toFixed(2),
        } as const;
      }

      await transaction.payment.create({
        data: {
          debtId,
          amount: paymentAmount,
          notes: trimmedNotes || null,
        },
      });

      return { status: "created" } as const;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (result.status === "not-found") {
    return {
      status: "error",
      message: "Debt was not found for this person.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "overpayment") {
    return {
      status: "error",
      message: `Payment cannot exceed the $${result.remaining} remaining balance.`,
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Payment added.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function updatePerson(
  previousState: EditRecordState,
  formData: FormData,
): Promise<EditRecordState> {
  const personId = formData.get("personId");
  const name = formData.get("name");
  const notes = formData.get("notes");

  if (typeof personId !== "string" || !personId) {
    return {
      status: "error",
      message: "Person is required.",
      submissionId: previousState.submissionId,
    };
  }

  if (typeof name !== "string" || !name.trim()) {
    return {
      status: "error",
      message: "Enter a name.",
      submissionId: previousState.submissionId,
    };
  }

  if (name.trim().length > 100) {
    return {
      status: "error",
      message: "Name must be 100 characters or fewer.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

  if (trimmedNotes.length > 500) {
    return {
      status: "error",
      message: "Notes must be 500 characters or fewer.",
      submissionId: previousState.submissionId,
    };
  }

  const result = await prisma.person.updateMany({
    where: { id: personId },
    data: {
      name: name.trim(),
      notes: trimmedNotes || null,
    },
  });

  if (result.count === 0) {
    return {
      status: "error",
      message: "Person was not found.",
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Person updated.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function updateDebt(
  previousState: EditRecordState,
  formData: FormData,
): Promise<EditRecordState> {
  const personId = formData.get("personId");
  const debtId = formData.get("debtId");
  const description = formData.get("description");
  const amount = formData.get("amount");
  const incurredAt = parseDate(formData.get("incurredAt"));
  const notes = formData.get("notes");

  if (
    typeof personId !== "string" ||
    !personId ||
    typeof debtId !== "string" ||
    !debtId
  ) {
    return {
      status: "error",
      message: "Debt is required.",
      submissionId: previousState.submissionId,
    };
  }

  if (typeof description !== "string" || !description.trim()) {
    return {
      status: "error",
      message: "Enter a description.",
      submissionId: previousState.submissionId,
    };
  }

  if (description.trim().length > 120) {
    return {
      status: "error",
      message: "Description must be 120 characters or fewer.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedAmount = typeof amount === "string" ? amount.trim() : "";

  if (!amountPattern.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
    return {
      status: "error",
      message: "Enter a positive amount with up to two decimal places.",
      submissionId: previousState.submissionId,
    };
  }

  if (!incurredAt) {
    return {
      status: "error",
      message: "Enter a valid debt date.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

  if (trimmedNotes.length > 500) {
    return {
      status: "error",
      message: "Notes must be 500 characters or fewer.",
      submissionId: previousState.submissionId,
    };
  }

  const debtAmount = new Prisma.Decimal(trimmedAmount);
  const result = await prisma.$transaction(
    async (transaction) => {
      const debt = await transaction.debt.findFirst({
        where: {
          id: debtId,
          personId,
        },
        select: {
          amount: true,
          payments: {
            select: {
              amount: true,
            },
          },
          installments: {
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

      if (!debt) {
        return { status: "not-found" } as const;
      }

      const paid = debt.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0),
      );

      if (
        debt.installments.length > 0 &&
        !debtAmount.equals(debt.amount)
      ) {
        return { status: "scheduled-amount" } as const;
      }

      if (!debtAmountCoversPaid(debtAmount, paid)) {
        return {
          status: "below-paid",
          paid: paid.toFixed(2),
        } as const;
      }

      await transaction.debt.update({
        where: { id: debtId },
        data: {
          description: description.trim(),
          amount: debtAmount,
          incurredAt,
          notes: trimmedNotes || null,
        },
      });

      return { status: "updated" } as const;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (result.status === "not-found") {
    return {
      status: "error",
      message: "Debt was not found for this person.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "below-paid") {
    return {
      status: "error",
      message: `Debt cannot be less than the $${result.paid} already paid.`,
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "scheduled-amount") {
    return {
      status: "error",
      message: "The amount cannot change after installments are scheduled.",
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Debt updated.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function updatePayment(
  previousState: EditRecordState,
  formData: FormData,
): Promise<EditRecordState> {
  const personId = formData.get("personId");
  const debtId = formData.get("debtId");
  const paymentId = formData.get("paymentId");
  const amount = formData.get("amount");
  const paidAt = parseDate(formData.get("paidAt"));
  const notes = formData.get("notes");

  if (
    typeof personId !== "string" ||
    !personId ||
    typeof debtId !== "string" ||
    !debtId ||
    typeof paymentId !== "string" ||
    !paymentId
  ) {
    return {
      status: "error",
      message: "Payment is required.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedAmount = typeof amount === "string" ? amount.trim() : "";

  if (!amountPattern.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
    return {
      status: "error",
      message: "Enter a positive amount with up to two decimal places.",
      submissionId: previousState.submissionId,
    };
  }

  if (!paidAt) {
    return {
      status: "error",
      message: "Enter a valid payment date.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

  if (trimmedNotes.length > 500) {
    return {
      status: "error",
      message: "Notes must be 500 characters or fewer.",
      submissionId: previousState.submissionId,
    };
  }

  const paymentAmount = new Prisma.Decimal(trimmedAmount);
  const result = await prisma.$transaction(
    async (transaction) => {
      const debt = await transaction.debt.findFirst({
        where: {
          id: debtId,
          personId,
          payments: {
            some: {
              id: paymentId,
            },
          },
        },
        select: {
          amount: true,
          payments: {
            select: {
              id: true,
              amount: true,
            },
          },
          installments: {
            where: {
              paymentId,
            },
            select: {
              amount: true,
            },
            take: 1,
          },
        },
      });

      if (!debt) {
        return { status: "not-found" } as const;
      }

      const otherPayments = debt.payments.reduce(
        (total, payment) =>
          payment.id === paymentId ? total : total.plus(payment.amount),
        new Prisma.Decimal(0),
      );
      const maximumPayment = debt.amount.minus(otherPayments);

      const linkedInstallment = debt.installments[0];

      if (
        linkedInstallment &&
        !paymentAmount.equals(linkedInstallment.amount)
      ) {
        return {
          status: "installment-amount",
          amount: linkedInstallment.amount.toFixed(2),
        } as const;
      }

      if (!canApplyPayment(paymentAmount, maximumPayment)) {
        return {
          status: "overpayment",
          maximum: maximumPayment.toFixed(2),
        } as const;
      }

      await transaction.payment.update({
        where: { id: paymentId },
        data: {
          amount: paymentAmount,
          paidAt,
          notes: trimmedNotes || null,
        },
      });

      return { status: "updated" } as const;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (result.status === "not-found") {
    return {
      status: "error",
      message: "Payment was not found for this debt.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "overpayment") {
    return {
      status: "error",
      message: `Payment cannot exceed $${result.maximum}.`,
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "installment-amount") {
    return {
      status: "error",
      message: `This installment payment must remain $${result.amount}.`,
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Payment updated.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function deletePayment(
  previousState: DeleteRecordState,
  formData: FormData,
): Promise<DeleteRecordState> {
  const personId = formData.get("personId");
  const debtId = formData.get("debtId");
  const paymentId = formData.get("paymentId");

  if (
    typeof personId !== "string" ||
    !personId ||
    typeof debtId !== "string" ||
    !debtId ||
    typeof paymentId !== "string" ||
    !paymentId
  ) {
    return {
      status: "error",
      message: "Payment is required.",
      submissionId: previousState.submissionId,
    };
  }

  const result = await prisma.payment.deleteMany({
    where: {
      id: paymentId,
      debt: {
        id: debtId,
        personId,
      },
    },
  });

  if (result.count === 0) {
    return {
      status: "error",
      message: "Payment was not found for this debt.",
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Payment deleted.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function deleteDebt(
  previousState: DeleteRecordState,
  formData: FormData,
): Promise<DeleteRecordState> {
  const personId = formData.get("personId");
  const debtId = formData.get("debtId");

  if (
    typeof personId !== "string" ||
    !personId ||
    typeof debtId !== "string" ||
    !debtId
  ) {
    return {
      status: "error",
      message: "Debt is required.",
      submissionId: previousState.submissionId,
    };
  }

  const result = await prisma.debt.deleteMany({
    where: {
      id: debtId,
      personId,
    },
  });

  if (result.count === 0) {
    return {
      status: "error",
      message: "Debt was not found for this person.",
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Debt and its payments deleted.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function deletePerson(
  previousState: DeleteRecordState,
  formData: FormData,
): Promise<DeleteRecordState> {
  const personId = formData.get("personId");

  if (typeof personId !== "string" || !personId) {
    return {
      status: "error",
      message: "Person is required.",
      submissionId: previousState.submissionId,
    };
  }

  const result = await prisma.person.deleteMany({
    where: {
      id: personId,
    },
  });

  if (result.count === 0) {
    return {
      status: "error",
      message: "Person was not found.",
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);
  redirect("/people");
}

export async function createInstallmentPlan(
  previousState: InstallmentActionState,
  formData: FormData,
): Promise<InstallmentActionState> {
  const personId = formData.get("personId");
  const debtId = formData.get("debtId");
  const installmentCountValue = formData.get("installmentCount");
  const firstDueAt = parseDate(formData.get("firstDueAt"));

  if (
    typeof personId !== "string" ||
    !personId ||
    typeof debtId !== "string" ||
    !debtId
  ) {
    return {
      status: "error",
      message: "Debt is required.",
      submissionId: previousState.submissionId,
    };
  }

  const installmentCount =
    typeof installmentCountValue === "string" &&
    /^\d+$/.test(installmentCountValue)
      ? Number(installmentCountValue)
      : 0;

  if (installmentCount < 2 || installmentCount > 60) {
    return {
      status: "error",
      message: "Choose between 2 and 60 monthly installments.",
      submissionId: previousState.submissionId,
    };
  }

  if (!firstDueAt) {
    return {
      status: "error",
      message: "Enter a valid first due date.",
      submissionId: previousState.submissionId,
    };
  }

  const result = await prisma.$transaction(
    async (transaction) => {
      const debt = await transaction.debt.findFirst({
        where: {
          id: debtId,
          personId,
        },
        select: {
          amount: true,
          payments: {
            select: {
              id: true,
            },
            take: 1,
          },
          installments: {
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

      if (!debt) {
        return { status: "not-found" } as const;
      }

      if (debt.installments.length > 0) {
        return { status: "already-scheduled" } as const;
      }

      if (debt.payments.length > 0) {
        return { status: "already-paid" } as const;
      }

      let schedule;

      try {
        schedule = buildInstallmentSchedule(
          debt.amount,
          installmentCount,
          firstDueAt,
        );
      } catch (error) {
        if (error instanceof RangeError) {
          return { status: "amount-too-small" } as const;
        }

        throw error;
      }

      await transaction.installment.createMany({
        data: schedule.map((installment) => ({
          debtId,
          ...installment,
        })),
      });

      return { status: "created" } as const;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (result.status === "not-found") {
    return {
      status: "error",
      message: "Debt was not found for this person.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "already-scheduled") {
    return {
      status: "error",
      message: "This debt already has an installment plan.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "already-paid") {
    return {
      status: "error",
      message: "Installments can only be scheduled before payments begin.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "amount-too-small") {
    return {
      status: "error",
      message: "Each installment must be at least $0.01.",
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Installment plan created.",
    submissionId: previousState.submissionId + 1,
  };
}

export async function markInstallmentPaid(
  previousState: InstallmentActionState,
  formData: FormData,
): Promise<InstallmentActionState> {
  const personId = formData.get("personId");
  const debtId = formData.get("debtId");
  const installmentId = formData.get("installmentId");

  if (
    typeof personId !== "string" ||
    !personId ||
    typeof debtId !== "string" ||
    !debtId ||
    typeof installmentId !== "string" ||
    !installmentId
  ) {
    return {
      status: "error",
      message: "Installment is required.",
      submissionId: previousState.submissionId,
    };
  }

  const result = await prisma.$transaction(
    async (transaction) => {
      const installment = await transaction.installment.findFirst({
        where: {
          id: installmentId,
          debt: {
            id: debtId,
            personId,
          },
        },
        select: {
          amount: true,
          sequence: true,
          paymentId: true,
          debt: {
            select: {
              amount: true,
              installments: {
                select: {
                  id: true,
                },
              },
              payments: {
                select: {
                  amount: true,
                },
              },
            },
          },
        },
      });

      if (!installment) {
        return { status: "not-found" } as const;
      }

      if (installment.paymentId) {
        return { status: "already-paid" } as const;
      }

      const paid = installment.debt.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0),
      );
      const remaining = installment.debt.amount.minus(paid);

      if (!canApplyPayment(installment.amount, remaining)) {
        return {
          status: "overpayment",
          remaining: remaining.toFixed(2),
        } as const;
      }

      const payment = await transaction.payment.create({
        data: {
          debtId,
          amount: installment.amount,
          notes: `Installment ${installment.sequence} of ${installment.debt.installments.length}`,
        },
        select: {
          id: true,
        },
      });

      await transaction.installment.update({
        where: {
          id: installmentId,
        },
        data: {
          paymentId: payment.id,
        },
      });

      return { status: "paid" } as const;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (result.status === "not-found") {
    return {
      status: "error",
      message: "Installment was not found for this debt.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "already-paid") {
    return {
      status: "error",
      message: "This installment is already paid.",
      submissionId: previousState.submissionId,
    };
  }

  if (result.status === "overpayment") {
    return {
      status: "error",
      message: `Only $${result.remaining} remains on this debt.`,
      submissionId: previousState.submissionId,
    };
  }

  revalidateMoneyPages(personId);

  return {
    status: "success",
    message: "Installment marked as paid.",
    submissionId: previousState.submissionId + 1,
  };
}
