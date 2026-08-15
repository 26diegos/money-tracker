"use client";

import { useState } from "react";

export function CopyReminderButton({ message }: { message: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={copyReminder}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        {status === "copied" ? "Copied!" : "Copy reminder"}
      </button>
      <p
        aria-live="polite"
        className={
          status === "error"
            ? "text-sm text-red-600"
            : "text-sm text-zinc-600"
        }
      >
        {status === "copied"
          ? "Ready to paste into a message."
          : status === "error"
            ? "Couldn’t access the clipboard. Select and copy the text instead."
            : ""}
      </p>
    </div>
  );
}
