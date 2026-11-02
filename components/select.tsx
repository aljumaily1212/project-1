"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode, type Ref, type SelectHTMLAttributes } from "react";
import { Select as RadixSelect } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const EMPTY = "__empty__";
const toRadix = (v: string) => (v === "" ? EMPTY : v);

type Option = { value: string; label: ReactNode; disabled?: boolean };

function optionsOf(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child) || child.type !== "option") return [];
    const { value, children: label, disabled } = child.props;
    return [{ value: String(value ?? ""), label, disabled }];
  });
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
};

export function Select({ invalid, className, children, value, onChange, disabled, ref, "aria-label": ariaLabel, ...rest }: SelectProps) {
  const { locale } = useT();
  const native = useRef<HTMLSelectElement | null>(null);
  const options = optionsOf(children);
  const [own, setOwn] = useState<string | null>(null);
  useEffect(() => {
    const el = native.current;
    if (!el) return;
    const sync = () => setOwn(el.value);
    const frame = requestAnimationFrame(sync);
    el.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("change", sync);
    };
  }, []);

  const current = value !== undefined ? String(value) : (own ?? options[0]?.value ?? "");
  const chosen = options.find((o) => o.value === current);

  function pick(v: string) {
    const el = native.current;
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(el, v === EMPTY ? "" : v);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setRefs(el: HTMLSelectElement | null) {
    native.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }

  return (
    <div className={cn("relative w-full", className)}>
      <RadixSelect.Root value={toRadix(current)} onValueChange={pick} disabled={disabled} dir={locale === "ar" ? "rtl" : "ltr"}>
        <RadixSelect.Trigger
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className={cn(
            "group flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-start text-sm shadow-xs transition-colors outline-none",
            "hover:border-brand-300 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "data-[state=open]:border-brand-400 data-[state=open]:ring-3 data-[state=open]:ring-brand-100",
            "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            "dark:bg-input/30 dark:hover:bg-input/50",
          )}
        >
          <span className={cn("truncate", (!chosen || current === "") && "text-muted-foreground")}>{chosen?.label ?? ""}</span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className={cn(
              "z-[60] max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            )}
          >
            <RadixSelect.Viewport>
              {options.map((o) => (
                <RadixSelect.Item
                  key={o.value}
                  value={toRadix(o.value)}
                  disabled={o.disabled}
                  className={cn(
                    "relative flex cursor-pointer items-center rounded-lg py-2 ps-3 pe-9 text-sm outline-none select-none",
                    "data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-800 data-[state=checked]:font-semibold",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    o.value === "" && "text-muted-foreground",
                  )}
                >
                  <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute end-3 inline-flex items-center text-brand-600">
                    <Check className="size-4" aria-hidden />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      <select
        ref={setRefs}
        {...rest}
        value={value}
        onChange={onChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0"
      >
        {children}
      </select>
    </div>
  );
}
