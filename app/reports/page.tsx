import Link from "next/link";

export default function ReportsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-black">
        ← Dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold">Monthly reports</h1>

      <p className="mt-2 text-zinc-600">
        Review new debts, payments, and remaining balances by month.
      </p>
    </main>
  );
}