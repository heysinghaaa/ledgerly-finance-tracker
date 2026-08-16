"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ledgerly-demo-progress";

export type DemoProgress = {
  invoiceId: string | null;
  dashboardViewedAfterPayment: boolean;
  invoiceExported: boolean;
};

const emptyProgress: DemoProgress = {
  invoiceId: null,
  dashboardViewedAfterPayment: false,
  invoiceExported: false,
};

function loadProgress(): DemoProgress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...emptyProgress, ...JSON.parse(stored) } : emptyProgress;
  } catch {
    return emptyProgress;
  }
}

export function useDemoProgress() {
  const [progress, setProgress] = useState<DemoProgress>(loadProgress);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const markInvoiceCreated = useCallback((invoiceId: string) => {
    setProgress({ invoiceId, dashboardViewedAfterPayment: false, invoiceExported: false });
  }, []);

  const markDashboardViewed = useCallback(() => {
    setProgress((current) => current.dashboardViewedAfterPayment ? current : { ...current, dashboardViewedAfterPayment: true });
  }, []);

  const markInvoiceExported = useCallback((invoiceId: string) => {
    setProgress((current) => current.invoiceId === invoiceId ? { ...current, invoiceExported: true } : current);
  }, []);

  const resetProgress = useCallback(() => setProgress(emptyProgress), []);

  return { progress, markInvoiceCreated, markDashboardViewed, markInvoiceExported, resetProgress };
}
