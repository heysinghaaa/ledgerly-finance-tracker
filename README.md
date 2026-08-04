# Ledgerly

Ledgerly is a polished personal invoice and expense tracker built with Next.js, React, TypeScript, and Supabase.

## Live Demo

[Open Ledgerly](https://ledgerly-finance-tracker.vercel.app/)

## Features

- Dashboard for paid income, tracked expenses, unpaid invoices, and monthly balance.
- Invoice workspace with status filters, editable client details, line items, tax, discount, and print-ready preview.
- Expense workspace with category filters, payment methods, notes, and editable records.
- Local-first persistence so the demo remains useful without an account or network connection.
- Passwordless Supabase email authentication.
- Per-user Postgres storage protected by row-level security (RLS).
- Debounced cloud sync with visible loading, saving, saved, and error states.
- Automatic first-login migration from localStorage to the user's cloud workspace.
- Separate anonymous and per-user browser caches to prevent cross-account data mixing.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Enable Supabase sync

1. Create a Supabase project.
2. Open the SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and add the project's public URL and anon key.
4. In Supabase Auth URL configuration, add the local and deployed Ledgerly URLs as allowed redirect URLs.
5. Restart the development server after changing environment variables.

Only the public anon key belongs in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never expose a service-role key in this application. Database access is restricted by the policies in `supabase/schema.sql`.

## Scripts

```bash
npm run lint
npm run build
npm start
```
