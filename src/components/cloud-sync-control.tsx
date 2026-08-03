"use client";

import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SyncStatus } from "@/hooks/use-cloud-finance";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type CloudSyncControlProps = {
  authReady: boolean;
  configured: boolean;
  lastSyncedAt: string | null;
  migratedLocalData: boolean;
  session: Session | null;
  syncError: string;
  syncStatus: SyncStatus;
};

const statusCopy: Record<SyncStatus, string> = {
  local: "Local only",
  loading: "Loading cloud data",
  syncing: "Saving changes",
  saved: "Cloud saved",
  error: "Sync needs attention",
};

export function CloudSyncControl({
  authReady,
  configured,
  lastSyncedAt,
  migratedLocalData,
  session,
  syncError,
  syncStatus,
}: CloudSyncControlProps) {
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    setSubmitting(true);
    setAuthMessage("");
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSubmitting(false);
    setAuthMessage(error ? error.message : "Check your email for the secure sign-in link.");
  };

  const handleSignOut = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    setSubmitting(true);
    const { error } = await client.auth.signOut();
    setSubmitting(false);
    setAuthMessage(error?.message ?? "Signed out. Your private cache is hidden until you sign in again.");
  };

  if (!configured) {
    return (
      <section className="sync-card" aria-label="Cloud sync">
        <div className="sync-heading">
          <span className="sync-dot local" />
          <strong>Local demo</strong>
        </div>
        <p>Add the public Supabase environment variables to enable secure per-user sync.</p>
      </section>
    );
  }

  if (!authReady) {
    return (
      <section className="sync-card" aria-label="Cloud sync">
        <div className="sync-heading">
          <span className="sync-dot loading" />
          <strong>Checking session</strong>
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="sync-card" aria-label="Cloud sync">
        <div className="sync-heading">
          <span className="sync-dot local" />
          <strong>Save across devices</strong>
        </div>
        <p>Sign in by email. Your current local data becomes your first cloud copy.</p>
        <form className="sync-form" onSubmit={handleSignIn}>
          <input
            aria-label="Email for magic link"
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <button disabled={submitting} type="submit">
            {submitting ? "Sending…" : "Email sign-in link"}
          </button>
        </form>
        {authMessage && <p className="sync-message">{authMessage}</p>}
      </section>
    );
  }

  return (
    <section className="sync-card" aria-label="Cloud sync">
      <div className="sync-heading">
        <span className={`sync-dot ${syncStatus}`} />
        <strong>{statusCopy[syncStatus]}</strong>
      </div>
      <p className="sync-email">{session.user.email}</p>
      {migratedLocalData && <p>Your local records were copied to your private cloud workspace.</p>}
      {lastSyncedAt && (
        <p>
          Last sync{" "}
          {new Intl.DateTimeFormat("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(lastSyncedAt))}
        </p>
      )}
      {syncError && <p className="sync-error">{syncError}</p>}
      <button className="sync-signout" disabled={submitting} onClick={handleSignOut} type="button">
        {submitting ? "Signing out…" : "Sign out"}
      </button>
      {authMessage && <p className="sync-message">{authMessage}</p>}
    </section>
  );
}
