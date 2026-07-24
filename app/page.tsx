import Link from "next/link";
import { Prisma } from "@/src/generated/prisma/client";
import { getMonthBounds } from "@/lib/installments";
import { formatMoney, getDebtOutstanding } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const now = new Date();
  const { monthStart, nextMonthStart } = getMonthBounds(now);

  const [debts, paymentsThisMonth, unpaidInstallments] = await Promise.all([
    prisma.debt.findMany({
      select: {
        personId: true,
        amount: true,
        payments: {
          select: {
            amount: true,
          },
        },
      },
    }),
    prisma.payment.aggregate({
      where: {
        paidAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.installment.findMany({
      where: {
        paymentId: null,
        dueAt: {
          lt: nextMonthStart,
        },
      },
      orderBy: {
        dueAt: "asc",
      },
      select: {
        amount: true,
        dueAt: true,
        debt: {
          select: {
            person: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalOutstanding = debts.reduce(
    (total, debt) => total.plus(getDebtOutstanding(debt)),
    new Prisma.Decimal(0),
  );
  const peopleOwing = new Set(
    debts
      .filter((debt) => getDebtOutstanding(debt).greaterThan(0))
      .map((debt) => debt.personId),
  ).size;
  const paidThisMonth =
    paymentsThisMonth._sum.amount ?? new Prisma.Decimal(0);
  const installmentsByPerson = Array.from(
    unpaidInstallments
      .reduce((people, installment) => {
        const person = installment.debt.person;
        const existing = people.get(person.id) ?? {
          id: person.id,
          name: person.name,
          overdue: new Prisma.Decimal(0),
          dueThisMonth: new Prisma.Decimal(0),
        };

        if (installment.dueAt < monthStart) {
          existing.overdue = existing.overdue.plus(installment.amount);
        } else {
          existing.dueThisMonth = existing.dueThisMonth.plus(
            installment.amount,
          );
        }

        people.set(person.id, existing);
        return people;
      }, new Map<string, { id: string; name: string; overdue: Prisma.Decimal; dueThisMonth: Prisma.Decimal }>())
      .values(),
  ).sort((a, b) => {
    const overdueComparison = b.overdue.comparedTo(a.overdue);
    return overdueComparison !== 0
      ? overdueComparison
      : a.name.localeCompare(b.name);
  });
  const dueThisMonth = installmentsByPerson.reduce(
    (total, person) => total.plus(person.dueThisMonth),
    new Prisma.Decimal(0),
  );
  const overdue = installmentsByPerson.reduce(
    (total, person) => total.plus(person.overdue),
    new Prisma.Decimal(0),
  );
  const peopleDueThisMonth = installmentsByPerson.filter((person) =>
    person.dueThisMonth.greaterThan(0),
  ).length;
  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header className="mb-12">
        <p className="mb-2 text-sm font-medium text-zinc-500">
          Personal money tracker
        </p>

        <h1 className="text-4xl font-bold tracking-tight">
          Who owes me money?
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          Track debts, register payments, and review balances by month.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total outstanding"
          value={formatMoney(totalOutstanding)}
        />
        <SummaryCard
          label="Paid this month"
          value={formatMoney(paidThisMonth)}
        />
        <SummaryCard label="People owing money" value={String(peopleOwing)} />
      </section>

      <section className="mt-10 flex gap-3">
        <Link
          href="/people"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          View people
        </Link>

        <Link
          href="/reports"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Monthly reports
        </Link>
      </section>

      <section className="mt-12 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900">
        <div className="grid gap-px bg-zinc-200 lg:grid-cols-[1fr_280px]">
          <div className="bg-zinc-950 p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-zinc-400">
                  {monthLabel}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  To collect this month
                </h2>
                <p className="mt-2 max-w-xl text-sm text-zinc-400">
                  Expected installment payments that need your attention.
                </p>
              </div>

              <div className="min-w-44 lg:text-right">
                <p className="text-4xl font-semibold tracking-tight">
                  {formatMoney(dueThisMonth)}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {peopleDueThisMonth === 1
                    ? "From 1 person"
                    : `From ${peopleDueThisMonth} people`}
                </p>
              </div>
            </div>
          </div>

          <div
            className={
              overdue.greaterThan(0)
                ? "bg-red-50 p-6 sm:p-8"
                : "bg-white p-6 sm:p-8"
            }
          >
            <p
              className={
                overdue.greaterThan(0)
                  ? "text-sm font-medium text-red-700"
                  : "text-sm font-medium text-zinc-500"
              }
            >
              Past due
            </p>
            <p
              className={
                overdue.greaterThan(0)
                  ? "mt-2 text-3xl font-semibold text-red-800"
                  : "mt-2 text-3xl font-semibold text-zinc-900"
              }
            >
              {formatMoney(overdue)}
            </p>
            <p
              className={
                overdue.greaterThan(0)
                  ? "mt-2 text-sm text-red-700"
                  : "mt-2 text-sm text-zinc-500"
              }
            >
              {overdue.greaterThan(0)
                ? "Unpaid from earlier months"
                : "Nothing overdue"}
            </p>
          </div>
        </div>

        {installmentsByPerson.length === 0 ? (
          <div className="bg-white p-10 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">
              ✓
            </div>
            <p className="mt-4 font-medium">You’re all caught up</p>
            <p className="mt-1 text-sm text-zinc-500">
              Upcoming installments will appear here in their due month.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 bg-white">
            {installmentsByPerson.map((person) => (
              <li
                key={person.id}
                className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-8"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                    {person.name.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/people/${person.id}`}
                      className="font-semibold hover:underline"
                    >
                      {person.name}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      Installment payment
                    </p>
                  </div>
                </div>

                <dl className="flex flex-wrap gap-5 text-sm sm:justify-end sm:text-right">
                  {person.overdue.greaterThan(0) ? (
                    <div>
                      <dt className="text-xs font-medium text-red-600">
                        Past due
                      </dt>
                      <dd className="mt-1 font-semibold text-red-700">
                        {formatMoney(person.overdue)}
                      </dd>
                    </div>
                  ) : null}
                  {person.dueThisMonth.greaterThan(0) ? (
                    <div>
                      <dt className="text-xs text-zinc-500">This month</dt>
                      <dd className="mt-1 font-semibold text-zinc-900">
                        {formatMoney(person.dueThisMonth)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <Link
                  href={`/people/${person.id}`}
                  className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Review and mark paid →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-zinc-200 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
