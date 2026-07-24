"use client";

import { useActionState } from "react";
import {
  markInstallmentPaid,
  type InstallmentActionState,
} from "@/app/people/[id]/actions";

const initialState: InstallmentActionState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

type MarkInstallmentPaidFormProps = {
  personId: string;
  debtId: string;
  installmentId: string;
};

export function MarkInstallmentPaidForm({
  personId,
  debtId,
  installmentId,
}: MarkInstallmentPaidFormProps) {
  const [state, formAction, pending] = useActionState(
    markInstallmentPaid,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="debtId" value={debtId} />
      <input type="hidden" name="installmentId" value={installmentId} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark as paid"}
      </button>
      <p
        aria-live="polite"
        className={
          state.status === "error"
            ? "mt-1 text-xs text-red-600"
            : "mt-1 text-xs text-zinc-600"
        }
      >
        {state.message}
      </p>
    </form>
  );
}
