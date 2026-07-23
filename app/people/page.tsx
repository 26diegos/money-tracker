import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PersonForm } from "./person-form";

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    orderBy: {
      createdAt: "desc",
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
          {people.map((person) => (
            <li
              key={person.id}
              className="rounded-xl border border-zinc-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{person.name}</p>
                  {person.notes ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                      {person.notes}
                    </p>
                  ) : null}
                </div>
                <time
                  dateTime={person.createdAt.toISOString()}
                  className="shrink-0 text-sm text-zinc-500"
                >
                  {person.createdAt.toLocaleDateString()}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
