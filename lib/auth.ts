"use client";

import { useSyncExternalStore } from "react";
import type { Role, User } from "./api/types";

const KEY = "alrahma.session";

export interface Session {
  token: string;
  refreshToken?: string;
  user: User;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function readSession(): Session | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}

export function getRefreshToken(): string | null {
  return readSession()?.refreshToken ?? null;
}

export function updateTokens(token: string, refreshToken: string) {
  const session = readSession();
  if (session) saveSession({ ...session, token, refreshToken });
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  emit();
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
  }
  // Copies of data kept for offline use (public/sw.js) belong to this person: they go on sign-out.
  if (typeof caches !== "undefined") caches.delete("alrahma-api").catch(() => undefined);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSession(): { session: Session | null; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, readRaw, () => undefined);
  if (raw === undefined) return { session: null, ready: false };
  if (raw === null) return { session: null, ready: true };
  try {
    return { session: JSON.parse(raw) as Session, ready: true };
  } catch {
    return { session: null, ready: true };
  }
}

export function canUseDashboard(role: Role) {
  return role !== "patient";
}

export function homeFor(role: Role) {
  return role === "patient" ? "/account" : `/${role}`;
}

export function useIsStaff(): boolean {
  const { session } = useSession();
  return !!session && canUseDashboard(session.user.role);
}

export function useIsPatient(): boolean {
  const { session } = useSession();
  return session?.user.role === "patient";
}
