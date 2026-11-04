"use client";

import { useSyncExternalStore } from "react";
import { api, type WalkInRequest } from "./api";

// When the internet drops at reception, check-ins and walk-ins wait here, in this browser,
// and are sent in the same order as soon as the connection is back.
// Each item's id is also its request key: if a send reaches the server but the answer is lost,
// the next try sends the same key, and the server knows it already did it.

const KEY = "alrahma.outbox";

export type OutboxItem =
  | { id: string; type: "checkIn"; appointmentId: number; emergency: boolean; label: string }
  | { id: string; type: "walkIn"; body: Omit<WalkInRequest, "idempotency_key">; label: string };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readRaw() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

const read = (): OutboxItem[] => JSON.parse(readRaw());

function save(items: OutboxItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

export function queue(item: OutboxItem) {
  save([...read(), item]);
}

let sending = false;

// Sends waiting actions one by one. Stops at the first failure and keeps the rest for later.
export async function flush() {
  if (sending || !navigator.onLine) return 0;
  sending = true;
  let sent = 0;
  try {
    for (const item of read()) {
      if (item.type === "checkIn") await api.checkIn(item.appointmentId, item.emergency, item.id);
      else await api.addWalkIn({ ...item.body, idempotency_key: item.id });
      save(read().filter((x) => x.id !== item.id));
      sent++;
    }
  } catch {
    // Still offline or the server refused. The item stays in the outbox.
  } finally {
    sending = false;
  }
  return sent;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function useOutbox(): OutboxItem[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  return JSON.parse(raw);
}
