"use client";

import { useActionState } from "react";
import {
  updatePerson,
  type EditRecordState,
} from "@/app/people/[id]/actions";

const initialState: EditRecordState = {
  status: "idle",
  message: "",
  submissionId: 0,
};

type PersonEditFormProps = {
  personId: string;
  name: string;
  notes: string;
};

export function PersonEditForm({
  personId,
  name,
  notes,
}: PersonEditFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePerson,
    initialState,
  );

  return (
    <details className="mt-5">
      <summary className="cursor-pointer text-sm font-medium text-zinc-600">
        Edit person
      </summary>

      <form
        action={formAction}
        className="mt-4 grid gap-4 rounded-xl border border-zinc-200 p-5"
      >
        <input type="hidden" name="personId" value={personId} />

        <div>
          <label htmlFor="edit-person-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="edit-person-name"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={name}
            aria-describedby="edit-person-message"
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="edit-person-notes" className="text-sm font-medium">
            Notes <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="edit-person-notes"
            name="notes"
            rows={3}
            maxLength={500}
            defaultValue={notes}
            className="mt-2 w-full resize-y rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save person"}
          </button>
          <p
            id="edit-person-message"
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
