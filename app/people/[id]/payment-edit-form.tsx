"use client";

import { useActionState } from "react";
import {
  updatePayment,
  type EditRecordState,
} from "@/app/people/[id]/actions";

const initialState: EditRecordState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

type PaymentEditFormProps = {
  paymentId: string;
  debtId: string;
  personId: string;
  amount: string;
  maximumAmount: string;
  paidAt: string;
  notes: string;
};

export function PaymentEditForm({
  paymentId,
  debtId,
  personId,
  amount,
  maximumAmount,
  paidAt,
  notes,
}: PaymentEditFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePayment,
    initialState,
  );
  const fieldPrefix = `edit-payment-${paymentId}`;
  const messageId = `${fieldPrefix}-message`;

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-zinc-500">
        Edit payment
      </summary>

      <form
        action={formAction}
        className="mt-3 grid gap-3 rounded-lg bg-zinc-50 p-4"
      >
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="debtId" value={debtId} />
        <input type="hidden" name="paymentId" value={paymentId} />

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor={`${fieldPrefix}-amount`}
              className="text-xs font-medium"
            >
              Amount
            </label>
            <input
              id={`${fieldPrefix}-amount`}
              name="amount"
              type="number"
              required
              min="0.01"
              max={maximumAmount}
              step="0.01"
              inputMode="decimal"
              defaultValue={amount}
              aria-describedby={messageId}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-date`}
              className="text-xs font-medium"
            >
              Payment date
            </label>
            <input
              id={`${fieldPrefix}-date`}
              name="paidAt"
              type="date"
              required
              defaultValue={paidAt}
              aria-describedby={messageId}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-notes`}
              className="text-xs font-medium"
            >
              Notes <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id={`${fieldPrefix}-notes`}
              name="notes"
              type="text"
              maxLength={500}
              defaultValue={notes}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-700 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save payment"}
          </button>
          <p
            id={messageId}
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
    </details>
  );
}
