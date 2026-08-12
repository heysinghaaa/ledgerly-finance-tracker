"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { getDateRange } from "@/lib/finance-service";
import type { DateRange, DateRangePreset } from "@/lib/types";

const labels: Record<DateRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  year: "This year",
  custom: "Custom range",
};

export function DateRangeControl({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const setPreset = (preset: DateRangePreset) => {
    if (preset === "custom") onChange({ ...value, preset });
    else onChange(getDateRange(preset));
  };

  return (
    <div className="date-range-control">
      <label className="select-control date-preset"><CalendarDays size={15} /><select aria-label="Date range" value={value.preset} onChange={(event) => setPreset(event.target.value as DateRangePreset)}>{Object.entries(labels).map(([preset, label]) => <option key={preset} value={preset}>{label}</option>)}</select><ChevronDown size={14} /></label>
      {value.preset === "custom" && <div className="custom-dates"><label><span>From</span><input aria-label="Start date" type="date" max={value.to} value={value.from} onInput={(event) => onChange({ ...value, from: event.currentTarget.value })} /></label><span>to</span><label><span>To</span><input aria-label="End date" type="date" min={value.from} value={value.to} onInput={(event) => onChange({ ...value, to: event.currentTarget.value })} /></label></div>}
    </div>
  );
}
