import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { MuiProvider } from "@/components/mui-provider";
import { NotificationProvider } from "@/components/notifications";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ledgerly | Personal Invoice & Expense Tracker",
  description:
    "A polished personal finance tracker for invoices, expenses, dashboard summaries, and print-ready invoice previews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("ledgerly-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";document.documentElement.dataset.theme=d;document.documentElement.style.colorScheme=d}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <MuiProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </MuiProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
