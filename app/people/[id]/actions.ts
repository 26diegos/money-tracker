"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CreateDebtState = {
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

  return {
    status: "success",
    message: "Debt added.",
    submissionId: previousState.submissionId + 1,
  };
}
