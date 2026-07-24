"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createPayment,
  type CreatePaymentState,
} from "@/app/people/[id]/actions";

const initialState: CreatePaymentState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

type PaymentFormProps = {
  debtId: string;
  personId: string;
  remaining: string;
};

export function PaymentForm({
  debtId,
  personId,
  remaining,
}: PaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPayment,
    initialState,
  );
  const amountId = `payment-amount-${debtId}`;
  const notesId = `payment-notes-${debtId}`;
  const messageId = `payment-message-${debtId}`;

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status, state.submissionId]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-5 grid gap-3 border-t border-zinc-200 pt-5"
    >
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="debtId" value={debtId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={amountId} className="text-sm font-medium">
            Payment amount
          </label>
          <input
            id={amountId}
            name="amount"
            type="number"
            required
            min="0.01"
            max={remaining}
            step="0.01"
            inputMode="decimal"
            aria-describedby={messageId}
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor={notesId} className="text-sm font-medium">
            Payment notes <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            id={notesId}
            name="notes"
            type="text"
            maxLength={500}
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add payment"}
        </button>

        <p
          id={messageId}
          aria-live="polite"
          className={
            state.status === "error"
              ? "text-sm text-red-600"
              : "text-sm text-zinc-600"
          }
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
