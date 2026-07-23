"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createPerson,
  type CreatePersonState,
} from "@/app/people/actions";

const initialState: CreatePersonState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

export function PersonForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPerson,
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
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          aria-describedby="person-form-message"
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="notes"
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
          {pending ? "Adding…" : "Add person"}
        </button>

        <p
          id="person-form-message"
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
