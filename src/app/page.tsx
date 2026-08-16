"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LedgerlyBrand } from "@/components/ledgerly-logo";

const demoTasks = [
  "Create an invoice",
  "Mark it paid",
  "Watch dashboard totals update",
  "Export the invoice as PDF",
];

export default function DemoEntryPage() {
  const router = useRouter();

  return (
    <Box component="main" className="demo-entry">
      <Box component="header" className="demo-entry-header">
        <LedgerlyBrand subtitle="Freelancer finance workspace" />
        <Typography component="span">Portfolio demo</Typography>
      </Box>

      <Box component="section" className="demo-entry-content" aria-labelledby="demo-title">
        <Box className="demo-entry-copy">
          <Typography component="span" className="eyebrow">Demo workspace</Typography>
          <Typography component="h1" id="demo-title">See a freelance business come into focus.</Typography>
          <Typography component="p">
            Work with realistic clients, invoices, and expenses. Your changes stay in this browser and can be reset at any time.
          </Typography>
          <Button
            className="primary-button demo-entry-cta"
            endIcon={<ArrowRight size={17} />}
            onClick={() => router.push("/dashboard")}
            variant="contained"
          >
            Try demo workspace
          </Button>
          <Typography component="small">No account or setup required.</Typography>
        </Box>

        <Box component="aside" className="demo-entry-tasks" aria-label="Demo task checklist">
          <Typography component="span">A four-minute walkthrough</Typography>
          <Typography component="h2">Try the complete invoice loop</Typography>
          <Box component="ol">
            {demoTasks.map((task, index) => (
              <Box component="li" key={task}>
                <CheckCircle2 size={18} aria-hidden="true" />
                <Typography component="span"><b>{index + 1}.</b> {task}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box component="footer" className="demo-entry-footer">
        <Typography component="span">Ledgerly · A focused finance workspace for independent work.</Typography>
      </Box>
    </Box>
  );
}
