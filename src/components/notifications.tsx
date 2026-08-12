"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import IconButton from "@mui/material/IconButton";

export type NotificationTone = "success" | "error" | "warning" | "info";

type Notification = {
  id: string;
  tone: NotificationTone;
  title: string;
  message?: string;
};

type NotificationInput = Omit<Notification, "id">;

type NotificationContextValue = {
  notify: (notification: NotificationInput) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((items) => items.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((notification: NotificationInput) => {
    const id = `notice-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    setNotifications((items) => [...items.slice(-3), { ...notification, id }]);
    window.setTimeout(() => dismiss(id), notification.tone === "error" ? 6000 : 3600);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <section className="notification-stack" aria-label="Notifications" aria-live="polite">
        {notifications.map((notification) => {
          const Icon = icons[notification.tone];
          return (
            <article className={`notification ${notification.tone}`} key={notification.id} role={notification.tone === "error" ? "alert" : "status"}>
              <span className="notification-icon"><Icon size={18} /></span>
              <span className="notification-copy"><strong>{notification.title}</strong>{notification.message && <small>{notification.message}</small>}</span>
              <IconButton onClick={() => dismiss(notification.id)} aria-label="Dismiss notification"><X size={15} /></IconButton>
            </article>
          );
        })}
      </section>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
