"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/src/generated/prisma/client";
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

const amountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

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

  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath("/reports");

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

      if (paymentAmount.greaterThan(remaining)) {
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

  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath("/reports");

  return {
    status: "success",
    message: "Payment added.",
    submissionId: previousState.submissionId + 1,
  };
}
