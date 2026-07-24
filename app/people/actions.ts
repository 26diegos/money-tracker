"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CreatePersonState = {
  status: "idle" | "error" | "success";
  message: string;
  submissionId: number;
};

export async function createPerson(
  previousState: CreatePersonState,
  formData: FormData,
): Promise<CreatePersonState> {
  const name = formData.get("name");
  const notes = formData.get("notes");

  if (typeof name !== "string" || !name.trim()) {
    return {
      status: "error",
      message: "Enter a name.",
      submissionId: previousState.submissionId,
    };
  }

  const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

  await prisma.person.create({
    data: {
      name: name.trim(),
      notes: trimmedNotes || null,
    },
  });

  revalidatePath("/people");
  revalidatePath("/");

  return {
    status: "success",
    message: "Person added.",
    submissionId: previousState.submissionId + 1,
  };
}
