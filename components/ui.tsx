"use client";

import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import { errorText, useOnOpen } from "@/lib/hooks";

/* ---------- Icono (Material Icons) ---------- */

export function Icon({ name, className = "", size = 24 }: { name: string; className?: string; size?: number }) {
  return (
    <span className={`material-icons ${className}`} style={{ fontSize: size }} aria-hidden>
      {name}
    </span>
  );
}

/* ---------- Botones (mat-button, mat-flat-button, mat-stroked-button, mat-icon-button) ---------- */

type Color = "primary" | "accent" | "warn" | "default";
type Variant = "flat" | "stroked" | "basic";

const flatColors: Record<Color, string> = {
  primary: "glass glass-primary",
  accent: "glass glass-accent",
  warn: "glass glass-warn",
  default: "glass glass-clear",
};
const textColors: Record<Color, string> = {
  primary: "text-primary",
  accent: "text-accent",
  warn: "text-warn",
  default: "text-text",
};

export function Button({
  variant = "flat",
  color = "primary",
  icon,
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  color?: Color;
  icon?: string;
  loading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer disabled:cursor-default disabled:opacity-40 select-none";
  const style =
    variant === "flat"
      ? flatColors[color]
      : variant === "stroked"
        ? `glass glass-clear ${textColors[color]}`
        : `glass glass-ghost ${textColors[color]}`;
  return (
    <button type="button" className={`${base} ${style} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size={18} light={variant === "flat" && color !== "default"} /> : icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  color = "default",
  title,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; color?: Color }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`glass glass-ghost inline-flex items-center justify-center w-10 h-10 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-default ${color === "default" ? "text-text-2" : textColors[color]} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

/* ---------- Superficies ---------- */

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-[14px] shadow-z1 ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 pt-4 pb-2">
      <div className="flex items-start gap-4 flex-1 min-w-[200px]">
        {icon && (
          <div className="w-10 h-10 rounded-[12px] bg-primary-50 text-primary flex items-center justify-center shrink-0">
            <Icon name={icon} size={22} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-semibold tracking-[-0.022em]">{title}</div>
          {subtitle && <div className="text-sm text-text-2">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1 flex-wrap justify-end">{actions}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-7">
      <div>
        <h1 className="text-[28px] sm:text-[34px]">{title}</h1>
        {subtitle && <p className="text-text-2 mt-1 text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Formularios (mat-form-field outline) ---------- */

export function TextField({
  label,
  hint,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div className={`mat-field ${className}`}>
      <label>
        {label}
        {rest.required && " *"}
      </label>
      <input {...rest} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function TextArea({
  label,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div className={`mat-field ${className}`}>
      <label>
        {label}
        {rest.required && " *"}
      </label>
      <textarea rows={3} {...rest} />
    </div>
  );
}

export function SelectField({
  label,
  options,
  placeholder,
  className = "",
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className={`mat-field ${className}`}>
      <label>
        {label}
        {rest.required && " *"}
      </label>
      <select {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-[18px] h-[18px] accent-primary cursor-pointer"
      />
      <span>{label}</span>
    </label>
  );
}

/* ---------- Chips de estado ---------- */

const chipColors = {
  primary: "bg-primary-50 text-primary-dark",
  accent: "bg-accent-50 text-accent-dark",
  warn: "bg-warn-light text-warn-dark",
  success: "bg-success-light text-success-dark",
  caution: "bg-caution-light text-caution-dark",
  default: "bg-fill text-text-2",
};
export type ChipColor = keyof typeof chipColors;

export function Chip({ children, color = "default" }: { children: React.ReactNode; color?: ChipColor }) {
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap ${chipColors[color]}`}>
      {children}
    </span>
  );
}

/* ---------- Progreso ---------- */

export function Spinner({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <span
      className="inline-block rounded-full border-[3px] border-solid"
      style={{
        width: size,
        height: size,
        borderColor: light ? "rgba(255,255,255,.4)" : "var(--color-primary-light)",
        borderTopColor: light ? "#fff" : "var(--color-primary)",
        animation: "mat-spin .8s linear infinite",
      }}
      role="progressbar"
    />
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-warn-light/70 text-warn-dark px-4 py-3 my-3">
      <Icon name="error_outline" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button variant="basic" color="warn" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function Alert({ children, color = "caution", icon = "info" }: { children: React.ReactNode; color?: "caution" | "primary" | "warn"; icon?: string }) {
  const cls =
    color === "caution"
      ? "bg-caution-light/70 text-caution-dark"
      : color === "warn"
        ? "bg-warn-light/70 text-warn-dark"
        : "bg-primary-50 text-primary-dark";
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${cls}`}>
      <Icon name={icon} size={20} />
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

export function Empty({ icon = "inbox", text = "Sin resultados" }: { icon?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-text-disabled">
      <Icon name={icon} size={44} />
      <span className="text-text-2">{text}</span>
    </div>
  );
}

/* ---------- Tabla + paginador (mat-table / mat-paginator) ---------- */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="mat-table">{children}</table>
    </div>
  );
}

export function Paginator({
  page,
  size,
  total,
  onPage,
  onSize,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (p: number) => void;
  onSize?: (s: number) => void;
}) {
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const last = Math.max(0, Math.ceil(total / size) - 1);
  return (
    <div className="flex flex-wrap items-center justify-end gap-4 px-2 min-h-14 text-xs text-text-2">
      {onSize && (
        <label className="flex items-center gap-2">
          Elementos por página
          <select
            className="bg-transparent border-b border-divider py-1 outline-none text-text"
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <span>
        {from} – {to} de {total}
      </span>
      <div className="flex">
        <IconButton icon="first_page" title="Primera página" disabled={page === 0} onClick={() => onPage(0)} />
        <IconButton icon="chevron_left" title="Anterior" disabled={page === 0} onClick={() => onPage(page - 1)} />
        <IconButton icon="chevron_right" title="Siguiente" disabled={page >= last} onClick={() => onPage(page + 1)} />
        <IconButton icon="last_page" title="Última página" disabled={page >= last} onClick={() => onPage(last)} />
      </div>
    </div>
  );
}

/* ---------- Tabs (mat-tab-group) ---------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto p-0.5 mb-5 rounded-[10px] bg-fill" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`press flex items-center gap-2 h-8 px-4 justify-center text-sm font-medium cursor-pointer rounded-[8px] whitespace-nowrap ${
            value === t.value ? "bg-surface text-text shadow-z1" : "text-text-2 hover:text-text"
          }`}
        >
          {t.icon && <Icon name={t.icon} size={18} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Diálogo (mat-dialog) ---------- */

export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
  width = 520,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25 backdrop-blur-[2px]"
      style={{ animation: "scrim-in .2s ease-out" }}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal
        className="material-thick rounded-[20px] shadow-z24 w-full max-h-[90vh] flex flex-col"
        style={{ maxWidth: width, animation: "sheet-in .35s var(--ease-spring)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-[22px] font-semibold px-6 pt-6 pb-4">{title}</h2>
        <div className="px-6 overflow-y-auto flex-1">{children}</div>
        {actions && <div className="flex justify-end gap-2 px-6 pb-5 pt-3 mt-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Diálogo con formulario: maneja envío, carga y error. */
export function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel = "Guardar",
  submitColor = "primary",
  children,
  width,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitLabel?: string;
  submitColor?: Color;
  children: React.ReactNode;
  width?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = useId();

  useOnOpen(open, () => {
    setError(null);
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={title}
      onClose={busy ? () => {} : onClose}
      width={width}
      actions={
        <>
          <Button variant="basic" color="default" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} color={submitColor} loading={busy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4 pb-2">
        {children}
        {error && <ErrorBanner message={error} />}
      </form>
    </Dialog>
  );
}

/* ---------- Snackbar (MatSnackBar) ---------- */

type Snack = { id: number; text: string; error?: boolean };
const SnackContext = createContext<(text: string, error?: boolean) => void>(() => {});

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const show = useCallback((text: string, error = false) => {
    const id = Date.now();
    setSnack({ id, text, error });
    setTimeout(() => setSnack((s) => (s?.id === id ? null : s)), 4000);
  }, []);
  return (
    <SnackContext.Provider value={show}>
      {children}
      {snack && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-[568px]">
          <div
            className="flex items-center gap-4 rounded-2xl bg-[#323232]/95 backdrop-blur-xl text-white shadow-z8 px-4 py-3 text-sm"
            style={{ animation: "sheet-in .35s var(--ease-spring)" }}
          >
            <span className="flex-1">{snack.text}</span>
            <button
              className={`press font-medium cursor-pointer ${snack.error ? "text-warn-light" : "text-accent-light"}`}
              onClick={() => setSnack(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </SnackContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackContext);
}

/* ---------- Confirmación con acción asíncrona ---------- */

export function useAction() {
  const snack = useSnackbar();
  return useCallback(
    async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
      try {
        const r = await fn();
        if (ok) snack(ok);
        return r;
      } catch (e) {
          snack(errorText(e), true);
        return undefined;
      }
    },
    [snack],
  );
}

/* ---------- Estadísticas ---------- */

export function Stat({
  label,
  value,
  icon,
  color = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon?: string;
  color?: "primary" | "accent" | "warn" | "success";
}) {
  const c = {
    primary: "bg-primary-50 text-primary",
    accent: "bg-accent-50 text-accent-dark",
    warn: "bg-warn-light/70 text-warn-dark",
    success: "bg-success-light text-success-dark",
  }[color];
  return (
    <Card className="p-4 flex items-center gap-4">
      {icon && (
        <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${c}`}>
          <Icon name={icon} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-text-2">{label}</div>
        <div className="text-2xl font-semibold tracking-[-0.025em] tabular-nums truncate">{value}</div>
      </div>
    </Card>
  );
}
