"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { canUseDashboard, clearSession, homeFor, useSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { useT, type MessageKey } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/skeleton";
import { buttonClass } from "@/components/common";

const ROLE_LABEL = {
  reception: "nav.reception",
  doctor: "nav.doctor",
  pharmacy: "nav.pharmacy",
} as const satisfies Record<string, MessageKey>;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const { session, ready } = useSession();
  const home = session && canUseDashboard(session.user.role) ? homeFor(session.user.role) : null;
  const allowed = home === pathname;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (ready && !allowed) router.replace(home ?? "/login");
  }, [ready, allowed, home, router]);

  if (!ready || leaving || !allowed || !session || session.user.role === "patient") {
    return (
      <div className="flex min-h-screen">
        <Skeleton className="hidden h-screen w-60 rounded-none md:block" />
        <div className="flex-1 space-y-4 p-8">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  function logout() {
    setLeaving(true);
    void api.logout();
    clearSession();
    // A full reload clears any patient data left in the browser's memory.
    window.location.replace("/login");
  }

  const label = ROLE_LABEL[session.user.role];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-e">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:px-5">
          <Link href="/" className="text-lg">
            <Logo size={32} />
          </Link>
          {USE_MOCK && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              {t("app.mockBadge")}
            </span>
          )}
        </div>

        <nav className="flex gap-1 overflow-x-auto scrollbar-thin px-2 pb-2 md:flex-col md:px-3">
          <span className="whitespace-nowrap rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
            {t(label)}
          </span>
        </nav>

        <div className="mt-auto hidden border-t border-slate-200 px-5 py-4 md:block">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-slate-500">{t(label)}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button onClick={logout} className={buttonClass("danger")}>
              {t("nav.logout")}
            </button>
            <div className="flex gap-2">
              <ThemeToggle />
              <LanguageSwitch />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm md:hidden">
          <span className="text-slate-600">{session.user.name}</span>
          <ThemeToggle />
          <LanguageSwitch />
          <button onClick={logout} className="text-red-600">
            {t("nav.logout")}
          </button>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
