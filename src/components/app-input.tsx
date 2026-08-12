"use client";

import type { ChangeEventHandler, HTMLInputTypeAttribute, InputEventHandler } from "react";
import InputBase from "@mui/material/InputBase";

export function AppInput({
  ariaLabel,
  autoComplete,
  autoFocus,
  className = "",
  disabled,
  id,
  max,
  min,
  onChange,
  onInput,
  placeholder,
  readOnly,
  required,
  step,
  type = "text",
  value,
}: {
  ariaLabel?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  max?: number | string;
  min?: number | string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onInput?: InputEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  step?: number | string;
  type?: HTMLInputTypeAttribute;
  value: number | string;
}) {
  return (
    <InputBase
      aria-label={ariaLabel}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      className={`app-input ${className}`.trim()}
      disabled={disabled}
      fullWidth
      id={id}
      inputProps={{ max, min, onInput, step }}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      required={required}
      type={type}
      value={value}
    />
  );
}

export function AppTextarea({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  value: string;
}) {
  return (
    <InputBase
      aria-label={ariaLabel}
      className="app-input app-textarea"
      fullWidth
      minRows={3}
      multiline
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}
