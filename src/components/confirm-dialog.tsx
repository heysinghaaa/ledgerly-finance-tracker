"use client";

import { AlertTriangle, X } from "lucide-react";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="confirm-title" aria-describedby="confirm-description" slotProps={{ paper: { className: "confirm-dialog", role: "alertdialog" } }}>
        <div className="dialog-heading">
          <span className="dialog-icon"><AlertTriangle size={20} /></span>
          <IconButton className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={17} /></IconButton>
        </div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        <div className="dialog-actions"><ButtonBase className="secondary-button" onClick={onClose}>Cancel</ButtonBase><ButtonBase className="danger-button" onClick={onConfirm}>{confirmLabel}</ButtonBase></div>
    </Dialog>
  );
}
