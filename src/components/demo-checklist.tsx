"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { Check, Circle, Download, FilePlus2, LayoutDashboard, ReceiptText } from "lucide-react";
import type { DemoProgress } from "@/hooks/use-demo-progress";
import type { Invoice } from "@/lib/types";

export function DemoChecklist({
  progress,
  invoices,
  onCreateInvoice,
  onOpenInvoice,
}: {
  progress: DemoProgress;
  invoices: Invoice[];
  onCreateInvoice: () => void;
  onOpenInvoice: (invoiceId: string) => void;
}) {
  const demoInvoice = invoices.find((invoice) => invoice.id === progress.invoiceId);
  const paid = demoInvoice?.status === "paid";
  const tasks = [
    { label: "Create an invoice", complete: Boolean(demoInvoice), icon: FilePlus2 },
    { label: "Mark it paid", complete: Boolean(paid), icon: ReceiptText },
    { label: "Watch dashboard totals update", complete: progress.dashboardViewedAfterPayment, icon: LayoutDashboard },
    { label: "Export the invoice as PDF", complete: progress.invoiceExported, icon: Download },
  ];
  const completed = tasks.filter((task) => task.complete).length;

  return (
    <Box component="article" className="panel demo-checklist" aria-labelledby="demo-checklist-title">
      <Box className="panel-heading">
        <Box>
          <Typography component="h2" id="demo-checklist-title">Demo walkthrough</Typography>
          <Typography component="p">Complete the invoice loop with live workspace data.</Typography>
        </Box>
        <Typography component="span" className="checklist-progress">{completed} / {tasks.length}</Typography>
      </Box>
      <Box component="ol" className="checklist-list">
        {tasks.map(({ label, complete, icon: Icon }) => (
          <Box component="li" className={complete ? "complete" : ""} key={label}>
            <Box component="span" className="checklist-state">
              {complete ? <Check size={14} /> : <Circle size={14} />}
            </Box>
            <Icon size={17} aria-hidden="true" />
            <Typography component="span">{label}</Typography>
          </Box>
        ))}
      </Box>
      {!demoInvoice ? (
        <ButtonBase className="primary-button" onClick={onCreateInvoice}>Create walkthrough invoice</ButtonBase>
      ) : (
        <ButtonBase className="secondary-button" onClick={() => onOpenInvoice(demoInvoice.id)}>
          {progress.invoiceExported ? "Review completed invoice" : paid ? "Open invoice to export" : "Open invoice to continue"}
        </ButtonBase>
      )}
    </Box>
  );
}
