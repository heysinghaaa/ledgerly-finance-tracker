# Ledgerly

Ledgerly is a polished personal invoice and expense tracker built with Next.js, React, TypeScript, and Supabase.

## Live Demo

[Open Ledgerly](https://ledgerly-finance-tracker.vercel.app/)

## Features

- Dashboard for paid income, tracked expenses, unpaid invoices, and monthly balance.
- Invoice workspace with status filters, editable client details, line items, tax, discount, and print-ready preview.
- Expense workspace with category filters, payment methods, notes, and editable records.
- Client CRM with billing profiles, linked invoice history, and revenue/outstanding summaries.
- Dedicated analytics for cash flow, revenue, expense categories, invoice status, collections, and top clients.
- Unified transaction view with date, type, amount, search, sorting, and pagination controls.
- Filter-aware CSV exports and real PDF invoice downloads.
- Reusable date ranges and success, error, warning, and information notifications.
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

The schema is idempotent and preserves existing `finance_states` rows. It adds normalized `clients`, `invoices`, and `expenses` tables, migrates existing JSON records, and keeps the legacy state document synchronized for backwards compatibility and offline-first hydration. Run the latest schema before deploying this version so indexed server-side filtering and invoice-to-client foreign keys are active.

Only the public anon key belongs in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never expose a service-role key in this application. Database access is restricted by the policies in `supabase/schema.sql`.

## Scripts

```bash
npm run lint
npm run build
npm start
```
