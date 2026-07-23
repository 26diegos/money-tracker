"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createDebt,
  type CreateDebtState,
} from "@/app/people/[id]/actions";

const initialState: CreateDebtState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

export function DebtForm({ personId }: { personId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createDebt,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status, state.submissionId]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-10 grid gap-4 rounded-xl border border-zinc-200 p-6"
    >
      <input type="hidden" name="personId" value={personId} />

      <div>
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          maxLength={120}
          aria-describedby="debt-form-message"
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="amount" className="text-sm font-medium">
          Amount
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          required
          min="0.01"
          max="9999999999.99"
          step="0.01"
          inputMode="decimal"
          aria-describedby="debt-form-message"
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="debt-notes" className="text-sm font-medium">
          Notes <span className="text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="debt-notes"
          name="notes"
          rows={3}
          maxLength={500}
          className="mt-2 w-full resize-y rounded-md border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add debt"}
        </button>

        <p
          id="debt-form-message"
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
