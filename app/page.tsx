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

      <section className="mt-12">
        <div>
          <h2 className="text-2xl font-semibold">Payments to collect</h2>
          <p className="mt-2 text-zinc-600">
            Installments due this month and any unpaid amounts from earlier
            months.
          </p>
        </div>

        {installmentsByPerson.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-8 text-center">
            <p className="font-medium">No installments need attention</p>
            <p className="mt-1 text-sm text-zinc-500">
              Upcoming installments will appear here in their due month.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {installmentsByPerson.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 p-5"
              >
                <Link
                  href={`/people/${person.id}`}
                  className="font-semibold hover:underline"
                >
                  {person.name}
                </Link>

                <dl className="flex flex-wrap gap-6 text-right text-sm">
                  {person.overdue.greaterThan(0) ? (
                    <div>
                      <dt className="text-red-600">Overdue</dt>
                      <dd className="mt-1 font-semibold text-red-700">
                        {formatMoney(person.overdue)}
                      </dd>
                    </div>
                  ) : null}
                  {person.dueThisMonth.greaterThan(0) ? (
                    <div>
                      <dt className="text-zinc-500">Due this month</dt>
                      <dd className="mt-1 font-semibold">
                        {formatMoney(person.dueThisMonth)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
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
