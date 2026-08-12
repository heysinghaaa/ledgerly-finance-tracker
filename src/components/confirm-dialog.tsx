"use client";

import { AlertTriangle, X } from "lucide-react";

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
  if (!open) return null;
  return (
    <div className="modal-backdrop dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <span className="dialog-icon"><AlertTriangle size={20} /></span>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={17} /></button>
        </div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="danger-button" type="button" onClick={onConfirm}>{confirmLabel}</button></div>
      </section>
    </div>
  );
}
