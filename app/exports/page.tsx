import Link from "next/link";

const csvExports = [
  {
    format: "people-csv",
    title: "People",
    description: "Names, notes, and record timestamps.",
  },
  {
    format: "debts-csv",
    title: "Debts",
    description: "Amounts owed, descriptions, dates, and person details.",
  },
  {
    format: "payments-csv",
    title: "Payments",
    description: "Payment history with related people, debts, and installments.",
  },
  {
    format: "installments-csv",
    title: "Installments",
    description: "Due dates, amounts, sequence numbers, and payment status.",
  },
] as const;

export default function ExportsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-black">
        ← Dashboard
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold">Export your data</h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Download a private backup or spreadsheet-friendly copies of your
          records. Downloads stay on your device.
        </p>
      </header>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-zinc-400">Recommended backup</p>
        <h2 className="mt-2 text-2xl font-semibold">Complete JSON backup</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-300">
          Includes people, debts, payments, installments, IDs, and timestamps
          in one versioned file. Keep it somewhere private.
        </p>
        <a
          href="/exports/download?format=backup-json"
          className="mt-6 inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100"
        >
          Download complete backup
        </a>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">CSV exports</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Use these files in Excel, Numbers, Google Sheets, or another
          spreadsheet app.
        </p>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {csvExports.map((item) => (
            <li
              key={item.format}
              className="flex flex-col rounded-xl border border-zinc-200 p-5"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 grow text-sm text-zinc-600">
                {item.description}
              </p>
              <a
                href={`/exports/download?format=${item.format}`}
                className="mt-5 w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Download CSV
              </a>
            </li>
          ))}
        </ul>
      </section>

      <aside className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        These files contain personal financial information. Store them
        privately and avoid committing them to Git.
      </aside>
    </main>
  );
}
