import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@/src/generated/prisma/client";
import { getInstallmentStatus } from "@/lib/installments";
import { prisma } from "@/lib/prisma";
import { DebtForm } from "./debt-form";
import { DebtEditForm } from "./debt-edit-form";
import { DeleteRecordForm } from "./delete-record-form";
import { InstallmentPlanForm } from "./installment-plan-form";
import { MarkInstallmentPaidForm } from "./mark-installment-paid-form";
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
            include: {
              installment: {
                select: {
                  id: true,
                },
              },
            },
          },
          installments: {
            orderBy: {
              sequence: "asc",
            },
            include: {
              payment: {
                select: {
                  id: true,
                },
              },
            },
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
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
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
                  amountLocked={debt.installments.length > 0}
                />

                <DeleteRecordForm
                  kind="debt"
                  personId={person.id}
                  debtId={debt.id}
                  label="Delete debt"
                  confirmation={`Delete "${debt.description}", its ${debt.installments.length} installment${debt.installments.length === 1 ? "" : "s"}, and its ${debt.payments.length} payment${debt.payments.length === 1 ? "" : "s"}? This cannot be undone.`}
                  className="mt-3"
                />

                {debt.installments.length === 0 &&
                debt.payments.length === 0 ? (
                  <InstallmentPlanForm
                    personId={person.id}
                    debtId={debt.id}
                    firstDueAt={formatDateInput(now)}
                  />
                ) : null}

                {debt.installments.length > 0 ? (
                  <section className="mt-5 border-t border-zinc-200 pt-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        Monthly installments
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {debt.installments.length} total
                      </p>
                    </div>

                    <ol className="mt-3 grid gap-2">
                      {debt.installments.map((installment) => {
                        const status = getInstallmentStatus(
                          installment.dueAt,
                          Boolean(installment.payment),
                          now,
                        );

                        return (
                          <li
                            key={installment.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 p-4"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">
                                  Installment {installment.sequence}
                                </p>
                                <span
                                  className={
                                    status === "Overdue"
                                      ? "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                                      : status === "Due this month"
                                        ? "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
                                        : "rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700"
                                  }
                                >
                                  {status}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-600">
                                {formatAmount(installment.amount)} due{" "}
                                <time
                                  dateTime={installment.dueAt.toISOString()}
                                >
                                  {installment.dueAt.toLocaleDateString()}
                                </time>
                              </p>
                            </div>

                            {!installment.payment ? (
                              <MarkInstallmentPaidForm
                                personId={person.id}
                                debtId={debt.id}
                                installmentId={installment.id}
                              />
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ) : null}

                {debt.remaining.greaterThan(0) &&
                debt.installments.length === 0 ? (
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
                            amountLocked={Boolean(payment.installment)}
                          />

                          <DeleteRecordForm
                            kind="payment"
                            personId={person.id}
                            debtId={debt.id}
                            paymentId={payment.id}
                            label="Delete payment"
                            confirmation={`Delete this ${formatAmount(payment.amount)} payment? This cannot be undone.`}
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

      <section className="mt-12 rounded-xl border border-red-200 p-5">
        <h2 className="font-semibold text-red-800">Danger zone</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Deleting this person also deletes all {debts.length} debt
          {debts.length === 1 ? "" : "s"} and their payment history.
        </p>
        <DeleteRecordForm
          kind="person"
          personId={person.id}
          label="Delete person"
          confirmation={`Delete ${person.name}, all ${debts.length} debt${debts.length === 1 ? "" : "s"}, and every related payment? This cannot be undone.`}
          className="mt-4"
        />
      </section>
    </main>
  );
}
