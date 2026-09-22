"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The form vocabulary the Familles and Articles screens are built from.
 *
 * One place, because the two forms show the same shapes — a titled section, a
 * labelled control, a required marker — and a second copy of them is how two
 * screens in the same module start looking like two different products.
 */

/** A titled block inside a form. Matches the section headings in the mockups. */
export function FormSection({
  title,
  children,
  columns = 2,
}: {
  title: string;
  children: ReactNode;
  /** Fields per row from `sm` up. One column stays one column on a phone. */
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h3 className="text-[13px] font-bold text-slate-800">{title}</h3>
      </div>
      <div className={cn("grid gap-3.5 p-4 sm:p-5", grid)}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
        {/* The mockups mark a required field with an asterisk, so it stays an
            asterisk — and it is red, which is the only part a scanning eye
            actually registers. */}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const base =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none transition " +
  "placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";

const ok = "border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10";
const ko = "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10";

export function TextInput({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(base, invalid ? ko : ok, className)} {...props} />;
}

/** Right-aligned and tabular, because a column of prices is read by shape. */
export function NumberInput({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cn(base, invalid ? ko : ok, "text-right tabular-nums", className)}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(base, invalid ? ko : ok, "cursor-pointer pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextArea({
  invalid,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={3}
      className={cn(
        base.replace("h-10", "min-h-[76px] py-2"),
        invalid ? ko : ok,
        className,
      )}
      {...props}
    />
  );
}

/** The modal's action bar. Cancel on the left, the commit on the right. */
export function FormActions({
  onCancel,
  submitLabel,
  submitting,
  disabled,
  onSubmit,
  extra,
}: {
  onCancel: () => void;
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  onSubmit: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">{extra}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-slate-200 px-4 py-2 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || disabled}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

/** Inline error/success strip, shown inside a form rather than as a toast. */
export function Banner({
  type,
  children,
}: {
  type: "ok" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-[12px]",
        type === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {children}
    </div>
  );
}
