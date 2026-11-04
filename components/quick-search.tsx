"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, UserRound } from "lucide-react";
import { api, type PatientSummary } from "@/lib/api";
import { useT, type MessageKey } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";

type Result = { kind: "page"; href: string; label: string } | { kind: "patient"; href: string; patient: PatientSummary };

// Ctrl+K (or Cmd+K on a Mac) opens a search box over any staff page.
// It finds the pages of this role, and, for roles that can open files, patients by name or phone.
export function QuickSearch({ nav, patientsHref }: { nav: { href: string; label: MessageKey }[]; patientsHref: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // The shortcut works anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("quickSearch.open")}
        title={t("quickSearch.shortcut")}
        data-quick-search-button
        className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      >
        <Search className="size-4" aria-hidden />
      </button>
      {open && (
        <SearchDialog
          nav={nav}
          patientsHref={patientsHref}
          onClose={() => setOpen(false)}
          onGo={(href) => {
            setOpen(false);
            router.push(href);
          }}
        />
      )}
    </>
  );
}

// The dialog itself. It's only built while open, so its searches stop when it closes.
function SearchDialog({ nav, patientsHref, onClose, onGo }: {
  nav: { href: string; label: MessageKey }[];
  patientsHref: string | null;
  onClose: () => void;
  onGo: (href: string) => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);
  // Waits until typing stops for a moment, then asks for patients.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const patients = useLoad(() => (patientsHref && search.length >= 2 ? api.searchPatients(search, { limit: 6 }).then((page) => page.items) : Promise.resolve([])), search, { keepPrevious: true });

  const q = query.trim().toLowerCase();
  const pages: Result[] = nav.filter((item) => !q || t(item.label).toLowerCase().includes(q)).map((item) => ({ kind: "page", href: item.href, label: t(item.label) }));
  const found: Result[] =
    patientsHref && patients.state.status === "success" && search.length >= 2
      ? patients.state.data.slice(0, 6).map((p) => ({ kind: "patient", href: `${patientsHref}?patient=${p.id}`, patient: p }))
      : [];
  const results = [...pages, ...found];
  const safeActive = Math.min(active, Math.max(results.length - 1, 0));

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActive((safeActive + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((safeActive - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[safeActive]) {
      e.preventDefault();
      onGo(results[safeActive].href);
    }
  }

  return (
    // The dark backdrop closes the dialog when clicked.
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("quickSearch.open")}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        data-quick-search
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4">
          <Search className="size-4 text-slate-400" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={patientsHref ? t("quickSearch.placeholderPatients") : t("quickSearch.placeholder")}
            aria-label={t("quickSearch.open")}
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
          {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">{t("quickSearch.nothing")}</li>}
          {results.map((r, index) => (
            <li
              key={r.href}
              role="option"
              aria-selected={index === safeActive}
              data-result={r.kind}
              onMouseEnter={() => setActive(index)}
              onMouseDown={() => onGo(r.href)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${index === safeActive ? "bg-brand-50" : ""}`}
            >
              {r.kind === "page" ? (
                <>
                  <FileText className="size-4 text-slate-400" aria-hidden />
                  <span>{r.label}</span>
                </>
              ) : (
                <>
                  <UserRound className="size-4 text-slate-400" aria-hidden />
                  <span className="flex-1">{r.patient.name}</span>
                  <span className="text-xs text-slate-500" dir="ltr">
                    {r.patient.phone}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
