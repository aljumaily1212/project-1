"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarClock, CalendarPlus, FileHeart, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, useSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/config";
import { useT, type MessageKey } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/skeleton";
import { buttonClass } from "@/components/common";

const NAV: { href: string; label: MessageKey; icon: typeof CalendarPlus }[] = [
  { href: "/account", label: "account.nav.book", icon: CalendarPlus },
  { href: "/account/appointments", label: "account.nav.appointments", icon: CalendarClock },
  { href: "/account/records", label: "account.nav.records", icon: FileHeart },
  { href: "/account/profile", label: "account.nav.profile", icon: UserRound },
];

const PUBLIC = ["/account/register"];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const { session, ready } = useSession();
  const isPublic = PUBLIC.includes(pathname);
  const allowed = session?.user.role === "patient";
  const [leaving, setLeaving] = useState(false);
  // Checks for new messages every 15 seconds. Hooks must run before any early return.
  const notifications = useLoad(
    () => (allowed && !isPublic ? api.myNotifications() : Promise.resolve([])),
    `${allowed}|${pathname}`,
    { every: 15000 },
  );
  const unread = notifications.state.status === "success" ? notifications.state.data.filter((n) => !n.read).length : 0;

  useEffect(() => {
    if (!isPublic && ready && !allowed) router.replace("/");
  }, [isPublic, ready, allowed, router]);

  if (isPublic) return children;

  if (!ready || !allowed || leaving) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function logout() {
    setLeaving(true);
    void api.logout();
    clearSession();
    // A full reload clears any patient data left in the browser's memory.
    window.location.replace("/");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg">
              <Logo size={32} />
            </Link>
            {USE_MOCK && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{t("app.mockBadge")}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/account/notifications"
              replace
              aria-label={t("notifications.title")}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Bell className="size-4" aria-hidden />
              {unread > 0 && (
                <span data-unread={unread} className="absolute -top-1.5 -end-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <LanguageSwitch />
            <button onClick={logout} className={buttonClass("danger")}>
              {t("nav.logout")}
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto scrollbar-thin px-4 pb-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                replace
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {t(label)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
