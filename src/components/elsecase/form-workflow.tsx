"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Children, isValidElement, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { FormProvider, useForm, type DefaultValues, type FieldErrors, type FieldPath, type FieldValues } from "react-hook-form";
import { z } from "zod";

export interface FormSubmissionResult {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  formError?: string;
}

export interface FormWorkflowProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  schema: z.ZodType<TOutput, TInput>;
  defaultValues: TInput;
  onSubmit: (values: TOutput) => Promise<FormSubmissionResult>;
  children: ReactNode;
  mode?: "single" | "multi-step";
  successBehavior?: "message" | "reset" | "preserve";
  submitLabel?: string;
}

export interface FormWorkflowStepProps {
  title: string;
  children: ReactNode;
  description?: string;
  fields?: string[];
}

function errorEntries(errors: FieldErrors): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  const visit = (value: unknown, path: string) => {
    if (!value || typeof value !== "object") return;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.message === "string") {
      entries.push([path, candidate.message]);
      return;
    }
    Object.entries(candidate).forEach(([key, child]) => {
      if (!["ref", "type", "types"].includes(key)) visit(child, path ? `${path}.${key}` : key);
    });
  };
  Object.entries(errors).forEach(([key, value]) => visit(value, key));
  return entries;
}

export function FormWorkflowStep({ title, description, children }: FormWorkflowStepProps) {
  return (
    <Box component="fieldset" className="form-workflow-step">
      <Typography component="legend">{title}</Typography>
      {description ? <Typography component="p">{description}</Typography> : null}
      {children}
    </Box>
  );
}

function stepFields(step: ReactNode) {
  return isValidElement<FormWorkflowStepProps>(step) ? step.props.fields ?? [] : [];
}

export function FormWorkflow<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  schema,
  defaultValues,
  onSubmit,
  children,
  mode = "single",
  successBehavior = "message",
  submitLabel = "Save changes",
}: FormWorkflowProps<TInput, TOutput>) {
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver<TInput, unknown, TOutput>(schema),
    defaultValues: defaultValues as DefaultValues<TInput>,
    shouldFocusError: false,
  });
  const steps = useMemo(() => Children.toArray(children), [children]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formError, setFormError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const multiStep = mode === "multi-step" && steps.length > 1;
  const entries = errorEntries(form.formState.errors);

  const focusSummary = useCallback(() => window.requestAnimationFrame(() => summaryRef.current?.focus()), []);

  const applyFailure = useCallback((result: FormSubmissionResult) => {
    Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => {
      form.setError(field as FieldPath<TInput>, { type: "server", message });
    });
    setFormError(result.formError ?? result.message ?? "The form could not be saved. Try again.");
    focusSummary();
  }, [focusSummary, form]);

  const submitValid = async (values: TOutput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setFormError(undefined);
    setSuccessMessage(undefined);
    try {
      const result = await onSubmit(values);
      if (!result.success) return applyFailure(result);
      setSuccessMessage(result.message ?? "Changes saved.");
      if (successBehavior === "reset") form.reset(defaultValues as DefaultValues<TInput>);
      else form.reset(form.getValues() as DefaultValues<TInput>, { keepValues: true });
    } catch {
      applyFailure({ success: false, formError: "The form could not be saved. Try again." });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const submitInvalid = (errors: FieldErrors<TInput>) => {
    if (multiStep) {
      const first = errorEntries(errors)[0]?.[0];
      const index = steps.findIndex((step) => stepFields(step).some((field) => first === field || first?.startsWith(`${field}.`)));
      if (index >= 0) setCurrentStep(index);
    }
    focusSummary();
  };

  const nextStep = async () => {
    const fields = stepFields(steps[currentStep]) as FieldPath<TInput>[];
    if (fields.length && !(await form.trigger(fields))) return focusSummary();
    setFormError(undefined);
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  return (
    <FormProvider {...form}>
      <Box
        component="form"
        className="form-workflow"
        data-mode={mode}
        data-slot="form-workflow"
        noValidate
        onChange={() => { setFormError(undefined); setSuccessMessage(undefined); }}
        onSubmit={(event) => void form.handleSubmit(submitValid, submitInvalid)(event)}
      >
        {multiStep ? (
          <Box className="form-workflow-progress" aria-label="Form progress">
            <Typography component="span">Step {currentStep + 1} of {steps.length}</Typography>
            <Box component="ol">
              {steps.map((_, index) => <Box component="li" className={index <= currentStep ? "active" : ""} key={index} />)}
            </Box>
          </Box>
        ) : null}

        {formError || entries.length ? (
          <Alert className="form-workflow-errors" ref={summaryRef} severity="error" tabIndex={-1}>
            <Typography component="strong">Check the form</Typography>
            {formError ? <Typography component="p">{formError}</Typography> : null}
            {entries.map(([field, message]) => (
              <Button key={field} onClick={() => form.setFocus(field as FieldPath<TInput>)}>{message}</Button>
            ))}
          </Alert>
        ) : null}

        {multiStep ? steps[currentStep] : children}

        {successMessage ? <Alert severity="success" role="status">{successMessage}</Alert> : null}

        <Box className="form-workflow-actions">
          {multiStep && currentStep > 0 ? <Button onClick={() => setCurrentStep((step) => step - 1)}>Previous step</Button> : <Box />}
          {multiStep && currentStep < steps.length - 1 ? (
            <Button onClick={() => void nextStep()} variant="contained">Continue</Button>
          ) : (
            <Button disabled={form.formState.isSubmitting || submitting} type="submit" variant="contained">
              {form.formState.isSubmitting || submitting ? "Saving…" : submitLabel}
            </Button>
          )}
        </Box>
      </Box>
    </FormProvider>
  );
}
