"use client";

import type { ReactNode } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { ChevronDown } from "lucide-react";

export interface AppSelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export function AppSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  icon,
  compact = false,
  fullWidth = false,
}: {
  ariaLabel: string;
  value: T;
  options: Array<AppSelectOption<T>>;
  onChange: (value: T) => void;
  icon?: ReactNode;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const handleChange = (event: SelectChangeEvent<T>) => onChange(event.target.value as T);

  return (
    <div className={`select-control mui-select-control${compact ? " compact" : ""}${fullWidth ? " full-width" : ""}`}>
      {icon && <span className="select-leading-icon">{icon}</span>}
      <Select<T>
        aria-label={ariaLabel}
        className="app-select"
        value={value}
        onChange={handleChange}
        variant="standard"
        disableUnderline
        IconComponent={ChevronDown}
        MenuProps={{
          anchorOrigin: { vertical: "bottom", horizontal: "left" },
          transformOrigin: { vertical: "top", horizontal: "left" },
          slotProps: { paper: { className: "app-select-menu" } },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
}
