"use client";

import { useActionState } from "react";
import {
  createInstallmentPlan,
  type InstallmentActionState,
} from "@/app/people/[id]/actions";

const initialState: InstallmentActionState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

type InstallmentPlanFormProps = {
  personId: string;
  debtId: string;
  firstDueAt: string;
};

export function InstallmentPlanForm({
  personId,
  debtId,
  firstDueAt,
}: InstallmentPlanFormProps) {
  const [state, formAction, pending] = useActionState(
    createInstallmentPlan,
    initialState,
  );
  const fieldPrefix = `installment-plan-${debtId}`;
  const messageId = `${fieldPrefix}-message`;

  return (
    <details className="mt-5 border-t border-zinc-200 pt-5">
      <summary className="cursor-pointer text-sm font-medium text-zinc-600">
        Set up monthly installments
      </summary>

      <form action={formAction} className="mt-4 grid gap-4">
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="debtId" value={debtId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldPrefix}-count`}
              className="text-sm font-medium"
            >
              Number of installments
            </label>
            <input
              id={`${fieldPrefix}-count`}
              name="installmentCount"
              type="number"
              required
              min="2"
              max="60"
              step="1"
              defaultValue="3"
              aria-describedby={messageId}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldPrefix}-first-date`}
              className="text-sm font-medium"
            >
              First due date
            </label>
            <input
              id={`${fieldPrefix}-first-date`}
              name="firstDueAt"
              type="date"
              required
              defaultValue={firstDueAt}
              aria-describedby={messageId}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          The debt total will be divided equally. Any rounding cents are added
          to the final installment.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create installment plan"}
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
