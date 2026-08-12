import { getSupabaseBrowserClient } from "./supabase-client";
import type { DateRange, ExpenseCategory, InvoiceStatus, TransactionType } from "./types";

export type CloudListFilters = {
  search?: string;
  range?: DateRange;
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
};

export type InvoiceCloudFilters = CloudListFilters & {
  status?: InvoiceStatus;
  clientId?: string;
  minAmount?: number;
  maxAmount?: number;
};

export type ExpenseCloudFilters = CloudListFilters & {
  category?: ExpenseCategory;
  minAmount?: number;
  maxAmount?: number;
};

export type TransactionCloudFilters = CloudListFilters & {
  type?: TransactionType;
};

function pageRange(page: number, pageSize: number) {
  const from = Math.max(0, page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function safeSearch(value: string) {
  return value.trim().replace(/[,%()]/g, " ").slice(0, 120);
}

// These query helpers back authenticated, larger datasets. The application keeps
// its local-first state for instant optimistic UI and offline use, then uses the
// normalized tables for indexed filtering/pagination when the migration is live.
export async function queryCloudInvoices(filters: InvoiceCloudFilters) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { from, to } = pageRange(filters.page, filters.pageSize);
  let query = client.from("invoices").select("*", { count: "exact" });
  if (filters.search) {
    const search = safeSearch(filters.search);
    query = query.or(`invoice_number.ilike.%${search}%,client_snapshot->>name.ilike.%${search}%,client_snapshot->>company.ilike.%${search}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.range) query = query.gte("issue_date", filters.range.from).lte("issue_date", filters.range.to);
  if (filters.minAmount !== undefined) query = query.gte("total", filters.minAmount);
  if (filters.maxAmount !== undefined) query = query.lte("total", filters.maxAmount);
  const sort = filters.sort ?? { column: "issue_date", ascending: false };
  return query.order(sort.column, { ascending: sort.ascending }).range(from, to);
}

export async function queryCloudExpenses(filters: ExpenseCloudFilters) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { from, to } = pageRange(filters.page, filters.pageSize);
  let query = client.from("expenses").select("*", { count: "exact" });
  if (filters.search) {
    const search = safeSearch(filters.search);
    query = query.or(`merchant.ilike.%${search}%,note.ilike.%${search}%`);
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.range) query = query.gte("spent_on", filters.range.from).lte("spent_on", filters.range.to);
  if (filters.minAmount !== undefined) query = query.gte("amount", filters.minAmount);
  if (filters.maxAmount !== undefined) query = query.lte("amount", filters.maxAmount);
  const sort = filters.sort ?? { column: "spent_on", ascending: false };
  return query.order(sort.column, { ascending: sort.ascending }).range(from, to);
}

export async function queryCloudClients(filters: CloudListFilters) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { from, to } = pageRange(filters.page, filters.pageSize);
  let query = client.from("clients").select("*", { count: "exact" });
  if (filters.search) {
    const search = safeSearch(filters.search);
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (filters.range) query = query.gte("created_at", filters.range.from).lte("created_at", `${filters.range.to}T23:59:59.999Z`);
  const sort = filters.sort ?? { column: "created_at", ascending: false };
  return query.order(sort.column, { ascending: sort.ascending }).range(from, to);
}
