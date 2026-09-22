"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { GRADIENT_BRAND } from "@/lib/inv/theme";

export interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Max width in px. */
  width?: number;
  onClose: () => void;
  /** Copy on the close button. "Annuler" suits a form; a read-only dialog
   *  should pass "Fermer". */
  closeLabel?: string;
  /** Sticky action bar pinned below the scrollable body. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Shared dialog.
 *
 * The backdrop is deliberately NOT click-to-close and Escape does not dismiss
 * either: these dialogs carry long, partially-filled documents — a bon de sortie
 * with a dozen lines keyed in — and a stray click outside must never discard
 * one. The ✕ button is the only way out.
 */
export default function Modal({
  open,
  title,
  subtitle,
  icon,
  width = 1400,
  onClose,
  closeLabel = "Annuler",
  footer,
  children,
}: ModalProps) {
  // Lock background scrolling while open, so the page behind the overlay does
  // not move under the pointer.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  // Portalled to <body> so the overlay escapes any ancestor stacking context
  // (a sticky filter bar, a transformed card) and `fixed inset-0` is measured
  // against the viewport.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Bottom sheet on a phone, centred dialog from sm up — the DEP pattern.
      // A centred box on a 360px screen wastes the top third and puts the
      // primary action out of thumb reach.
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      style={{ background: "rgba(15,23,42,.55)" }}
    >
      <div
        className="flex max-h-[95dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl"
        style={{ maxWidth: width }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 text-white"
          style={{ background: GRADIENT_BRAND }}
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {icon && (
              // The chip is decorative; on a phone the title needs the width.
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 sm:flex">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-bold leading-tight sm:text-[17px]">
                {title}
              </h2>
              {subtitle && <div className="mt-1">{subtitle}</div>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/40
              px-2.5 sm:px-4 py-1.5 sm:py-[7px] text-xs sm:text-sm font-medium
              transition-colors hover:bg-white/10"
          >
            <X size={14} />
            <span className="hidden sm:inline">{closeLabel}</span>
          </button>
        </div>

        {/* min-w-0 lets long content wrap instead of bursting past max-width. */}
        <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 text-slate-900">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-4 sm:px-5 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
