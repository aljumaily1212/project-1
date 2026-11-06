"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { API_URL } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { useOnline } from "@/lib/offline";

// Starts the offline helper (public/sw.js). Only on the built site: during development it would keep
// old copies of the pages being edited.
export function ServiceWorkerSetup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`/sw.js?api=${encodeURIComponent(new URL(API_URL).origin)}`).catch((err) => console.error("Service worker:", err));
  }, []);
  return null;
}

// A bar at the bottom of every page while the internet is gone, and a short "back online" after it returns.
export function OfflineBar() {
  const { t } = useT();
  const online = useOnline();
  const [back, setBack] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onOnline = () => {
      setBack(true);
      clearTimeout(timer);
      timer = setTimeout(() => setBack(false), 4000);
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      clearTimeout(timer);
    };
  }, []);

  if (online && !back) return null;
  return (
    <div
      role="status"
      data-offline-bar={online ? "back" : "offline"}
      className={`fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-medium shadow-lg print:hidden ${
        online ? "bg-emerald-600 text-white" : "bg-amber-500 text-amber-950"
      }`}
    >
      {online ? <Wifi className="size-4 shrink-0" aria-hidden /> : <CloudOff className="size-4 shrink-0" aria-hidden />}
      {online ? t("offline.back") : t("offline.bar")}
    </div>
  );
}
