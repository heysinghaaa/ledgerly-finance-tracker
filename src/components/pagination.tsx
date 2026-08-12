"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import IconButton from "@mui/material/IconButton";

export function Pagination({ page, pageCount, total, pageSize, onPageChange }: { page: number; pageCount: number; total: number; pageSize: number; onPageChange: (page: number) => void }) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <span>{start}–{end} of {total}</span>
      <div><IconButton disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></IconButton><strong>Page {page} of {pageCount}</strong><IconButton disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page"><ChevronRight size={15} /></IconButton></div>
    </div>
  );
}
