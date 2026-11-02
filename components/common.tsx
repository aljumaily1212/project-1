"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { AppointmentStatus, Medicine } from "@/lib/api/types";
import { STATUS_COLOR } from "@/lib/display";
import { useT, type MessageKey } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button as UIButton, buttonVariants } from "@/components/ui/button";
import { Card as UICard } from "@/components/ui/card";
import { Input as UIInput } from "@/components/ui/input";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <UICard className={cn("block gap-0 p-6 shadow-sm", className)}>{children}</UICard>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT = { primary: "default", secondary: "outline", ghost: "ghost", danger: "destructive" } as const;

export function buttonClass(variant: ButtonVariant = "secondary", className = "", size: "sm" | "default" = "sm") {
  return cn(buttonVariants({ variant: VARIANT[variant], size }), className);
}

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <UIButton {...props} variant={VARIANT[variant]} disabled={disabled || loading} className={className}>
      {loading && (
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </UIButton>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {children}
      <FieldError error={error} fallback={hint} />
    </label>
  );
}

export function FieldError({ error, fallback }: { error?: string; fallback?: string }) {
  const { t } = useT();
  if (error) return <span className="block text-xs text-destructive">{t(error as MessageKey)}</span>;
  if (fallback) return <span className="block text-xs text-muted-foreground">{fallback}</span>;
  return null;
}

export function Input({ invalid, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <UIInput {...props} aria-invalid={invalid || undefined} className={className} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
        className,
      )}
    />
  );
}

export { Select } from "@/components/select";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <p className="font-medium text-red-800">{t("common.loadFailed")}</p>
      <p className="mt-1.5 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useT();
  return (
    <Badge variant="secondary" className={cn("h-auto border-transparent", STATUS_COLOR[status])}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export function MedicineList({ medicines }: { medicines: Medicine[] }) {
  const { t } = useT();
  return (
    <ul className="space-y-1 text-sm">
      {medicines.map((m, index) => (
        <li key={index}>{t("visit.medicineLine", { name: m.name, dose: m.dose, days: m.days })}</li>
      ))}
    </ul>
  );
}
