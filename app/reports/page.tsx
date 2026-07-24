import Link from "next/link";
import { Prisma } from "@/src/generated/prisma/client";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

function getMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedMonth(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const match = rawValue?.match(monthPattern);

  if (!match) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month } = await searchParams;
  const monthStart = getSelectedMonth(month);
  const nextMonthStart = shiftMonth(monthStart, 1);
  const previousMonth = shiftMonth(monthStart, -1);
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const people = await prisma.person.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      debts: {
        where: {
          incurredAt: {
            lt: nextMonthStart,
          },
        },
        select: {
          amount: true,
          incurredAt: true,
          payments: {
            where: {
              paidAt: {
                lt: nextMonthStart,
              },
            },
            select: {
              amount: true,
              paidAt: true,
            },
          },
        },
      },
    },
  });

  const rows = people
    .map((person) => {
      const newDebts = person.debts.reduce(
        (total, debt) =>
          debt.incurredAt >= monthStart
            ? total.plus(debt.amount)
            : total,
        new Prisma.Decimal(0),
      );
      const payments = person.debts.reduce(
        (personTotal, debt) =>
          debt.payments.reduce(
            (debtTotal, payment) =>
              payment.paidAt >= monthStart
                ? debtTotal.plus(payment.amount)
                : debtTotal,
            personTotal,
          ),
        new Prisma.Decimal(0),
      );
      const outstanding = person.debts.reduce(
        (personTotal, debt) => {
          const paidByMonthEnd = debt.payments.reduce(
            (total, payment) => total.plus(payment.amount),
            new Prisma.Decimal(0),
          );

          return personTotal.plus(debt.amount.minus(paidByMonthEnd));
        },
        new Prisma.Decimal(0),
      );

      return {
        id: person.id,
        name: person.name,
        newDebts,
        payments,
        outstanding,
      };
    })
    .filter(
      (row) =>
        row.newDebts.greaterThan(0) ||
        row.payments.greaterThan(0) ||
        row.outstanding.greaterThan(0),
    );

  const totals = rows.reduce(
    (result, row) => ({
      newDebts: result.newDebts.plus(row.newDebts),
      payments: result.payments.plus(row.payments),
      outstanding: result.outstanding.plus(row.outstanding),
    }),
    {
      newDebts: new Prisma.Decimal(0),
      payments: new Prisma.Decimal(0),
      outstanding: new Prisma.Decimal(0),
    },
  );

  const monthLabel = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const canGoForward = monthStart < currentMonth;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-black">
        ← Dashboard
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Monthly reports</h1>
          <p className="mt-2 text-zinc-600">
            Review new debts, payments, and remaining balances by month.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/reports?month=${getMonthValue(previousMonth)}`}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium"
          >
            ← Previous
          </Link>
          {canGoForward ? (
            <Link
              href={`/reports?month=${getMonthValue(nextMonthStart)}`}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium"
            >
              Next →
            </Link>
          ) : null}
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold">{monthLabel}</h2>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="New debts" value={formatMoney(totals.newDebts)} />
        <SummaryCard label="Payments" value={formatMoney(totals.payments)} />
        <SummaryCard
          label="Outstanding at month end"
          value={formatMoney(totals.outstanding)}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">By person</h2>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-10 text-center">
            <p className="font-medium">No activity for this month</p>
            <p className="mt-1 text-sm text-zinc-500">
              There are no debts, payments, or outstanding balances to report.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-zinc-200 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Link
                    href={`/people/${row.id}`}
                    className="font-semibold hover:underline"
                  >
                    {row.name}
                  </Link>

                  <dl className="grid grid-cols-3 gap-6 text-right text-sm">
                    <div>
                      <dt className="text-zinc-500">New debts</dt>
                      <dd className="mt-1 font-medium">
                        {formatMoney(row.newDebts)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Payments</dt>
                      <dd className="mt-1 font-medium">
                        {formatMoney(row.payments)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Outstanding</dt>
                      <dd className="mt-1 font-medium">
                        {formatMoney(row.outstanding)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-zinc-200 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
