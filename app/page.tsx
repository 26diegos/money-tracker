import Link from "next/link";

export default function HomePage() {
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
        <SummaryCard label="Total outstanding" value="$0.00" />
        <SummaryCard label="Paid this month" value="$0.00" />
        <SummaryCard label="People owing money" value="0" />
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