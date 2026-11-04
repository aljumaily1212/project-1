"use client";

import { useSyncExternalStore } from "react";
import { TEXT_SIZE_KEY } from "./boot";

// Bigger text for people who find the normal size hard to read. It's saved on this device only,
// like the theme. Every size in the app is in rem, so changing the root font size scales it all.
export const TEXT_SIZES = ["normal", "large", "larger"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

const listeners = new Set<() => void>();

function readTextSize(): TextSize {
  try {
    const v = localStorage.getItem(TEXT_SIZE_KEY);
    return v === "large" || v === "larger" ? v : "normal";
  } catch {
    return "normal";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyTextSize(size: TextSize) {
  if (size === "normal") delete document.documentElement.dataset.text;
  else document.documentElement.dataset.text = size;
}

export function setTextSize(size: TextSize) {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, size);
  } catch {
  }
  applyTextSize(size);
  listeners.forEach((l) => l());
}

export function useTextSize(): TextSize {
  return useSyncExternalStore(subscribe, readTextSize, () => "normal");
}
