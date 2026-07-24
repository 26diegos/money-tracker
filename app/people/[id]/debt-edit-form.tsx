"use client";

import { useActionState } from "react";
import {
  updateDebt,
  type EditRecordState,
} from "@/app/people/[id]/actions";

const initialState: EditRecordState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

type DebtEditFormProps = {
  debtId: string;
  personId: string;
  description: string;
  amount: string;
  incurredAt: string;
  notes: string;
  amountLocked?: boolean;
};

export function DebtEditForm({
  debtId,
  personId,
  description,
  amount,
  incurredAt,
  notes,
  amountLocked = false,
}: DebtEditFormProps) {
  const [state, formAction, pending] = useActionState(
    updateDebt,
    initialState,
  );
  const fieldPrefix = `edit-debt-${debtId}`;
  const messageId = `${fieldPrefix}-message`;

  return (
    <details className="mt-5 border-t border-zinc-200 pt-5">
      <summary className="cursor-pointer text-sm font-medium text-zinc-600">
        Edit debt
      </summary>

      <form action={formAction} className="mt-4 grid gap-4">
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="debtId" value={debtId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldPrefix}-description`}
              className="text-sm font-medium"
            >
              Description
            </label>
            <input
              id={`${fieldPrefix}-description`}
              name="description"
              type="text"
              required
              maxLength={120}
              defaultValue={description}
              aria-describedby={messageId}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-amount`}
              className="text-sm font-medium"
            >
              Amount
            </label>
            <input
              id={`${fieldPrefix}-amount`}
              name="amount"
              type="number"
              required
              min="0.01"
              max="9999999999.99"
              step="0.01"
              inputMode="decimal"
              defaultValue={amount}
              readOnly={amountLocked}
              aria-describedby={messageId}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 read-only:bg-zinc-100 read-only:text-zinc-500"
            />
            {amountLocked ? (
              <p className="mt-1 text-xs text-zinc-500">
                Remove the debt to replace an active installment schedule.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-date`}
              className="text-sm font-medium"
            >
              Debt date
            </label>
            <input
              id={`${fieldPrefix}-date`}
              name="incurredAt"
              type="date"
              required
              defaultValue={incurredAt}
              aria-describedby={messageId}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-notes`}
              className="text-sm font-medium"
            >
              Notes <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id={`${fieldPrefix}-notes`}
              name="notes"
              type="text"
              maxLength={500}
              defaultValue={notes}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save debt"}
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
    </details>
  );
}
