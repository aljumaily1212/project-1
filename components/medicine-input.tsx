"use client";

import { useId, useState, type Ref } from "react";
import type { CatalogMedicine } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/common";

const BADGE: Record<CatalogMedicine["availability"], string> = {
  available: "bg-emerald-100 text-emerald-800",
  low: "bg-amber-100 text-amber-800",
  out: "bg-red-100 text-red-800",
  expired: "bg-red-100 text-red-800",
};

export function AvailabilityBadge({ availability }: { availability: CatalogMedicine["availability"] }) {
  const { t } = useT();
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[availability]}`}>{t(`catalog.${availability}`)}</span>;
}

// A medicine name box with suggestions from the pharmacy's stock.
// Typing filters the list; arrows move, Enter picks, Escape closes. Any other name can still be typed by hand.
// It's an ARIA "combobox", so screen readers announce the suggestions.
export function MedicineInput({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  catalog,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  name: string;
  inputRef: Ref<HTMLInputElement>;
  catalog: CatalogMedicine[];
  invalid?: boolean;
}) {
  const { t } = useT();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = value.trim().toLowerCase();
  // Names starting with what was typed come first, then names that contain it anywhere.
  const matches = query
    ? [...catalog.filter((m) => m.name.toLowerCase().startsWith(query)), ...catalog.filter((m) => !m.name.toLowerCase().startsWith(query) && m.name.toLowerCase().includes(query))].slice(0, 6)
    : [];
  const exact = catalog.find((m) => m.name.toLowerCase() === query);
  const showList = open && matches.length > 0 && !exact;

  function pick(medicine: CatalogMedicine) {
    onChange(medicine.name);
    setOpen(false);
  }

  return (
    <div className="relative space-y-1">
      <Input
        ref={inputRef}
        name={name}
        dir="ltr"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        invalid={invalid}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        // A short wait, so a click on a suggestion lands before the list closes.
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
          onBlur();
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            // Picks the suggestion instead of submitting the whole visit form.
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-11 z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {matches.map((m, index) => (
            <li
              key={m.name}
              role="option"
              aria-selected={index === active}
              data-suggestion={m.name}
              // mousedown, not click: it fires before the box loses focus.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m);
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${index === active ? "bg-brand-50" : ""}`}
            >
              <span dir="ltr">{m.name}</span>
              <AvailabilityBadge availability={m.availability} />
            </li>
          ))}
        </ul>
      )}
      {/* Under the box: is the chosen name on our shelves? */}
      {exact ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-500" data-availability={exact.availability}>
          {t("catalog.inPharmacy")} <AvailabilityBadge availability={exact.availability} />
        </div>
      ) : (
        query.length >= 3 && !showList && <p className="text-xs text-slate-500">{t("catalog.notInPharmacy")}</p>
      )}
    </div>
  );
}
