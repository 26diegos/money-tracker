import { formatMoney } from "@/lib/money";
import type { PaymentReminder as PaymentReminderData } from "@/lib/reminders";
import { CopyReminderButton } from "./copy-reminder-button";

export function PaymentReminder({
  reminder,
}: {
  reminder: PaymentReminderData;
}) {
  const hasDueItems = reminder.items.length > 0;

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-zinc-200">
      <div className="flex flex-wrap items-start justify-between gap-5 bg-zinc-950 p-6 text-white sm:p-8">
        <div>
          <p className="text-sm font-medium text-zinc-400">Payment reminder</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {hasDueItems ? "Due now" : "Balance summary"}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-300">
            Review the details, then copy the prepared text into your preferred
            messaging app.
          </p>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-sm text-zinc-400">Due today or earlier</p>
          <p className="mt-1 text-3xl font-semibold">
            {formatMoney(reminder.totalDueNow)}
          </p>
        </div>
      </div>

      {hasDueItems ? (
        <ul className="divide-y divide-zinc-200 bg-white">
          {reminder.items.map((item, index) => (
            <li
              key={`${item.description}-${item.installmentLabel}-${index}`}
              className="flex flex-wrap items-start justify-between gap-3 p-5 sm:px-8"
            >
              <div>
                <p className="font-medium">{item.description}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {item.installmentLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{item.amount}</p>
                <p
                  className={
                    item.isOverdue
                      ? "mt-1 text-sm font-medium text-red-600"
                      : "mt-1 text-sm text-zinc-500"
                  }
                >
                  {item.dueLabel}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bg-white px-6 py-5 text-sm text-zinc-600 sm:px-8">
          No installment is scheduled for payment today or is currently past
          due.
        </p>
      )}

      <div className="border-t border-zinc-200 bg-zinc-50 p-6 sm:p-8">
        <label
          htmlFor="payment-reminder-message"
          className="text-sm font-medium"
        >
          Message preview
        </label>
        <textarea
          id="payment-reminder-message"
          readOnly
          value={reminder.message}
          rows={Math.min(12, Math.max(5, reminder.items.length + 7))}
          className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm leading-6"
        />
        <div className="mt-4">
          <CopyReminderButton message={reminder.message} />
        </div>
      </div>
    </section>
  );
}
