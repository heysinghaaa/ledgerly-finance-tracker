"use client";

import { useRef, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";

export type AsyncStatus = "idle" | "loading" | "refreshing" | "empty" | "success" | "error" | "offline" | "forbidden";

export interface AsyncStateProps {
  status: AsyncStatus;
  children: ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  error?: ReactNode | ((error: unknown) => ReactNode);
  offline?: ReactNode;
  forbidden?: ReactNode;
  refreshingIndicator?: ReactNode;
  errorValue?: unknown;
  onRetry?: () => void | Promise<void>;
  preserveContentWhileRefreshing?: boolean;
  className?: string;
}

const stateCopy = {
  empty: ["Nothing here yet", "Create a record to start filling this workspace."],
  error: ["This data could not be loaded", "Try the request again. Your existing records are unchanged."],
  offline: ["You appear to be offline", "Reconnect and retry when your connection is available."],
  forbidden: ["This workspace is unavailable", "You do not have permission to view this content."],
} as const;

function DefaultLoading() {
  return (
    <Box className="elsecase-loading" role="presentation">
      {[0, 1, 2, 3].map((item) => <Skeleton height={54} key={item} variant="rounded" />)}
    </Box>
  );
}

function DefaultState({ kind, retrying, onRetry }: { kind: keyof typeof stateCopy; retrying: boolean; onRetry?: () => void }) {
  const [title, description] = stateCopy[kind];
  return (
    <Alert
      action={onRetry ? <Button color="inherit" disabled={retrying} onClick={onRetry}>{retrying ? "Retrying…" : "Try again"}</Button> : undefined}
      className={`elsecase-state ${kind}`}
      severity={kind === "error" || kind === "offline" ? "error" : "info"}
      variant="outlined"
    >
      <Typography component="strong">{title}</Typography>
      <Typography component="p">{description}</Typography>
    </Alert>
  );
}

export function AsyncState({
  status,
  children,
  loading,
  empty,
  error: errorContent,
  offline,
  forbidden,
  refreshingIndicator,
  errorValue,
  onRetry,
  preserveContentWhileRefreshing = true,
  className = "",
}: AsyncStateProps) {
  const [retrying, setRetrying] = useState(false);
  const retryInFlight = useRef(false);

  const handleRetry = async () => {
    if (!onRetry || retryInFlight.current) return;
    retryInFlight.current = true;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      retryInFlight.current = false;
      setRetrying(false);
    }
  };

  if (status === "idle" || status === "success") {
    return <Box className={className} data-slot="async-state" data-status={status}>{children}</Box>;
  }

  if (status === "refreshing" && preserveContentWhileRefreshing) {
    return (
      <Box aria-busy="true" className={`elsecase-refreshing ${className}`} data-slot="async-state" data-status={status}>
        {children}
        <Box aria-live="polite" className="elsecase-refresh-indicator" role="status">
          {refreshingIndicator ?? "Refreshing content"}
        </Box>
      </Box>
    );
  }

  if (status === "loading" || status === "refreshing") {
    return <Box aria-busy="true" aria-live="polite" className={className} data-slot="async-state" data-status={status} role="status">{loading ?? <DefaultLoading />}</Box>;
  }

  let content: ReactNode;
  if (status === "empty") content = empty ?? <DefaultState kind="empty" retrying={retrying} />;
  else if (status === "offline") content = offline ?? <DefaultState kind="offline" retrying={retrying} onRetry={() => void handleRetry()} />;
  else if (status === "forbidden") content = forbidden ?? <DefaultState kind="forbidden" retrying={retrying} />;
  else content = (typeof errorContent === "function" ? errorContent(errorValue) : errorContent) ?? <DefaultState kind="error" retrying={retrying} onRetry={onRetry ? () => void handleRetry() : undefined} />;

  return (
    <Box
      aria-atomic="true"
      aria-busy={retrying || undefined}
      aria-live={status === "empty" ? "polite" : "assertive"}
      className={className}
      data-slot="async-state"
      data-status={status}
      role={status === "empty" ? "status" : "alert"}
    >
      {content}
    </Box>
  );
}
