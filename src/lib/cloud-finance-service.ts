import type { FinanceState } from "./types";
import { getSupabaseBrowserClient } from "./supabase-client";

type StoredFinanceState = {
  state: unknown;
  updated_at: string;
};

function isFinanceState(value: unknown): value is FinanceState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FinanceState>;
  return Array.isArray(candidate.invoices) && Array.isArray(candidate.expenses);
}

export async function loadOrCreateCloudFinanceState(
  userId: string,
  localState: FinanceState,
) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("finance_states")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle<StoredFinanceState>();

  if (error) {
    throw error;
  }

  if (data) {
    if (!isFinanceState(data.state)) {
      throw new Error("The saved cloud data is not a valid Ledgerly state.");
    }

    return {
      state: data.state,
      migrated: false,
      updatedAt: data.updated_at,
    };
  }

  const updatedAt = await saveCloudFinanceState(userId, localState);
  return {
    state: localState,
    migrated: true,
    updatedAt,
  };
}

export async function saveCloudFinanceState(userId: string, state: FinanceState) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("finance_states")
    .upsert({ user_id: userId, state }, { onConflict: "user_id" })
    .select("updated_at")
    .single<{ updated_at: string }>();

  if (error) {
    throw error;
  }

  return data.updated_at;
}
