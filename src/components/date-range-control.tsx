"use client";

import { CalendarDays } from "lucide-react";
import { AppSelect } from "@/components/app-select";
import { AppInput } from "@/components/app-input";
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
      <AppSelect ariaLabel="Date range" value={value.preset} onChange={setPreset} icon={<CalendarDays size={15} />} options={Object.entries(labels).map(([preset, label]) => ({ value: preset as DateRangePreset, label }))} />
      {value.preset === "custom" && <div className="custom-dates"><label><span>From</span><AppInput ariaLabel="Start date" type="date" max={value.to} value={value.from} onInput={(event) => onChange({ ...value, from: event.currentTarget.value })} /></label><span>to</span><label><span>To</span><AppInput ariaLabel="End date" type="date" min={value.from} value={value.to} onInput={(event) => onChange({ ...value, to: event.currentTarget.value })} /></label></div>}
    </div>
  );
}
