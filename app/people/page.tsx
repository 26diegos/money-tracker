import Link from "next/link";
import { formatMoney, getTotalOutstanding } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PersonForm } from "./person-form";

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      debts: {
        select: {
          amount: true,
          payments: {
            select: {
              amount: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-black">
        ← Dashboard
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">People</h1>
          <p className="mt-2 text-zinc-600">
            People who currently owe you money.
          </p>
        </div>
      </div>

      <PersonForm />

      {people.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-zinc-300 p-10 text-center">
          <p className="font-medium">No people yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add someone when they owe you money.
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4">
          {people.map((person) => {
            const outstanding = getTotalOutstanding(person.debts);

            return (
              <li
                key={person.id}
                className="rounded-xl border border-zinc-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/people/${person.id}`}
                      className="font-semibold hover:underline"
                    >
                      {person.name}
                    </Link>
                    {person.notes ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                        {person.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold">
                      {formatMoney(outstanding)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {outstanding.greaterThan(0) ? "Outstanding" : "Settled"}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
