"use client";

import { useActionState } from "react";
import {
  deleteDebt,
  deletePayment,
  deletePerson,
  type DeleteRecordState,
} from "@/app/people/[id]/actions";

const initialState: DeleteRecordState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

type DeleteRecordFormProps = {
  kind: "person" | "debt" | "payment";
  personId: string;
  debtId?: string;
  paymentId?: string;
  label: string;
  confirmation: string;
  className?: string;
};

const actions = {
  person: deletePerson,
  debt: deleteDebt,
  payment: deletePayment,
};

export function DeleteRecordForm({
  kind,
  personId,
  debtId,
  paymentId,
  label,
  confirmation,
  className,
}: DeleteRecordFormProps) {
  const [state, formAction, pending] = useActionState(
    actions[kind],
    initialState,
  );

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="personId" value={personId} />
      {debtId ? <input type="hidden" name="debtId" value={debtId} /> : null}
      {paymentId ? (
        <input type="hidden" name="paymentId" value={paymentId} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Deleting…" : label}
        </button>
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "text-xs text-red-600"
              : "text-xs text-zinc-600"
          }
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
