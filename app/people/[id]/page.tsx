import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DebtForm } from "./debt-form";

function formatAmount(amount: Prisma.Decimal) {
  return `$${amount.toFixed(2)}`;
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
      },
    },
  });

  if (!person) {
    notFound();
  }

  const total = person.debts.reduce(
    (sum, debt) => sum.plus(debt.amount),
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
          <p className="text-sm text-zinc-500">Total owed</p>
          <p className="mt-1 text-2xl font-semibold">{formatAmount(total)}</p>
        </div>
      </div>

      <DebtForm personId={person.id} />

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Debts</h2>

        {person.debts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-10 text-center">
            <p className="font-medium">No debts yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add the first amount owed by this person.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4">
            {person.debts.map((debt) => (
              <li
                key={debt.id}
                className="rounded-xl border border-zinc-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{debt.description}</p>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
