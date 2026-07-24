import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DebtForm } from "./debt-form";
import { DebtEditForm } from "./debt-edit-form";
import { PaymentForm } from "./payment-form";
import { PaymentEditForm } from "./payment-edit-form";
import { PersonEditForm } from "./person-edit-form";

function formatAmount(amount: Prisma.Decimal) {
  return `$${amount.toFixed(2)}`;
}

function getDebtStatus(paid: Prisma.Decimal, remaining: Prisma.Decimal) {
  if (remaining.isZero()) {
    return "Paid";
  }

  if (paid.greaterThan(0)) {
    return "Partially paid";
  }

  return "Unpaid";
}

function formatDateInput(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      debts: {
        orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
        include: {
          payments: {
            orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          },
        },
      },
    },
  });

  if (!person) {
    notFound();
  }

  const debts = person.debts.map((debt) => {
    const paid = debt.payments.reduce(
      (sum, payment) => sum.plus(payment.amount),
      new Prisma.Decimal(0),
    );
    const remaining = debt.amount.minus(paid);

    return {
      ...debt,
      paid,
      remaining,
      status: getDebtStatus(paid, remaining),
    };
  });

  const totalOutstanding = debts.reduce(
    (sum, debt) => sum.plus(debt.remaining),
    new Prisma.Decimal(0),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/people"
        className="text-sm text-zinc-500 hover:text-black"
      >
        ← People
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{person.name}</h1>
          {person.notes ? (
            <p className="mt-2 whitespace-pre-wrap text-zinc-600">
              {person.notes}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 px-5 py-4 text-right">
          <p className="text-sm text-zinc-500">Total outstanding</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatAmount(totalOutstanding)}
          </p>
        </div>
      </div>

      <PersonEditForm
        personId={person.id}
        name={person.name}
        notes={person.notes ?? ""}
      />

      <DebtForm personId={person.id} />

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Debts</h2>

        {debts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-10 text-center">
            <p className="font-medium">No debts yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add the first amount owed by this person.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4">
            {debts.map((debt) => (
              <li
                key={debt.id}
                className="rounded-xl border border-zinc-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{debt.description}</p>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {debt.status}
                      </span>
                    </div>
                    {debt.notes ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                        {debt.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold">
                      {formatAmount(debt.amount)}
                    </p>
                    <time
                      dateTime={debt.incurredAt.toISOString()}
                      className="mt-1 block text-sm text-zinc-500"
                    >
                      {debt.incurredAt.toLocaleDateString()}
                    </time>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-4 text-sm">
                  <div>
                    <dt className="text-zinc-500">Paid</dt>
                    <dd className="mt-1 font-medium">
                      {formatAmount(debt.paid)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Remaining</dt>
                    <dd className="mt-1 font-medium">
                      {formatAmount(debt.remaining)}
                    </dd>
                  </div>
                </dl>

                <DebtEditForm
                  personId={person.id}
                  debtId={debt.id}
                  description={debt.description}
                  amount={debt.amount.toFixed(2)}
                  incurredAt={formatDateInput(debt.incurredAt)}
                  notes={debt.notes ?? ""}
                />

                {debt.remaining.greaterThan(0) ? (
                  <PaymentForm
                    personId={person.id}
                    debtId={debt.id}
                    remaining={debt.remaining.toFixed(2)}
                  />
                ) : null}

                {debt.payments.length > 0 ? (
                  <div className="mt-5 border-t border-zinc-200 pt-5">
                    <h3 className="text-sm font-semibold">Payment history</h3>
                    <ul className="mt-3 grid gap-2">
                      {debt.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="grid gap-2 text-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">
                                {formatAmount(payment.amount)}
                              </p>
                              {payment.notes ? (
                                <p className="text-zinc-500">{payment.notes}</p>
                              ) : null}
                            </div>
                            <time
                              dateTime={payment.paidAt.toISOString()}
                              className="shrink-0 text-zinc-500"
                            >
                              {payment.paidAt.toLocaleDateString()}
                            </time>
                          </div>

                          <PaymentEditForm
                            personId={person.id}
                            debtId={debt.id}
                            paymentId={payment.id}
                            amount={payment.amount.toFixed(2)}
                            maximumAmount={debt.remaining
                              .plus(payment.amount)
                              .toFixed(2)}
                            paidAt={formatDateInput(payment.paidAt)}
                            notes={payment.notes ?? ""}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
