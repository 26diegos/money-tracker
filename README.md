# Money Tracker

A small personal app for tracking people, debts, payments, and outstanding
balances.

## Local development

Install dependencies:

```bash
npm install
```

Start the local Prisma Postgres database in one terminal:

```bash
npx prisma dev
```

Copy the `DATABASE_URL` and `SHADOW_DATABASE_URL` printed by that command into
a local `.env` file. Environment files are ignored by Git.

Synchronize the prototype schema and generate Prisma Client:

```bash
npx prisma db push
npx prisma generate
```

Start Next.js in another terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Prisma migration note

The current local `prisma dev` shadow database fails during
`prisma migrate dev` with P1017. For this local prototype, use `prisma db push`
until that incompatibility is resolved. Do not use `db push` as a replacement
for reviewed migrations in production.
