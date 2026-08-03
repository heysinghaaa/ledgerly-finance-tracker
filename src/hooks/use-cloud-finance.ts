"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  loadOrCreateCloudFinanceState,
  saveCloudFinanceState,
} from "@/lib/cloud-finance-service";
import {
  getInitialFinanceState,
  getStoredFinanceState,
  persistFinanceState,
} from "@/lib/finance-service";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase-client";
import type { FinanceState } from "@/lib/types";

export type SyncStatus = "local" | "loading" | "syncing" | "saved" | "error";

export function useCloudFinance() {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<FinanceState>(() => getInitialFinanceState());
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!configured);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [migratedLocalData, setMigratedLocalData] = useState(false);
  const hydrationId = useRef(0);

  const hydrateSession = useCallback(async (nextSession: Session | null) => {
    const requestId = ++hydrationId.current;
    setSession(nextSession);
    setMigratedLocalData(false);
    setSyncError("");

    if (!nextSession) {
      setState(getInitialFinanceState());
      setCloudReady(false);
      setSyncStatus("local");
      setAuthReady(true);
      return;
    }

    setCloudReady(false);
    setSyncStatus("loading");

    try {
      const cachedUserState = getStoredFinanceState(nextSession.user.id);
      const result = await loadOrCreateCloudFinanceState(
        nextSession.user.id,
        cachedUserState ?? getInitialFinanceState(),
      );

      if (requestId !== hydrationId.current) {
        return;
      }

      setState(result.state);
      persistFinanceState(result.state, nextSession.user.id);
      setLastSyncedAt(result.updatedAt);
      setMigratedLocalData(result.migrated);
      setCloudReady(true);
      setSyncStatus("saved");
    } catch (error) {
      if (requestId !== hydrationId.current) {
        return;
      }

      const cachedUserState = getStoredFinanceState(nextSession.user.id);
      if (cachedUserState) {
        setState(cachedUserState);
      }
      setCloudReady(Boolean(cachedUserState));
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Cloud data could not be loaded.");
    } finally {
      if (requestId === hydrationId.current) {
        setAuthReady(true);
      }
    }
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    let active = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      if (error) {
        setAuthReady(true);
        setSyncStatus("error");
        setSyncError(error.message);
        return;
      }

      void hydrateSession(data.session);
    });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        void hydrateSession(nextSession);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [hydrateSession]);

  useEffect(() => {
    if (session && !cloudReady) {
      return;
    }

    persistFinanceState(state, session?.user.id);

    if (!session || !cloudReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSyncStatus("syncing");
      setSyncError("");
      void saveCloudFinanceState(session.user.id, state)
        .then((updatedAt) => {
          setLastSyncedAt(updatedAt);
          setSyncStatus("saved");
        })
        .catch((error: unknown) => {
          setSyncStatus("error");
          setSyncError(error instanceof Error ? error.message : "Changes could not be synced.");
        });
    }, 850);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, session, state]);

  return {
    state,
    setState,
    session,
    authReady,
    configured,
    syncStatus,
    syncError,
    lastSyncedAt,
    migratedLocalData,
  };
}
