"use client";

import { useState } from "react";
import type { Page, PageQuery } from "./api";
import { useLoad } from "./useLoad";

// The most a server sends in one answer. Asking for more still gets this many.
export const MAX_PAGE = 200;

// How many rows one page shows.
export const PAGE_SIZE = 20;

// A long list shown one page at a time, with numbered pages under it (see Pager in components/common).
// Only the open page is asked from the server (limit + offset), so a list stays light even with thousands
// of rows, on weak computers too. The every-few-seconds refresh reloads the same page.
// A new filter or search (a new key) goes back to page 1.
export function usePaged<T>(fetchPage: (q: PageQuery) => Promise<Page<T>>, key = "", options: { pageSize?: number; every?: number } = {}) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const [open, setOpen] = useState({ key, page: 1 });
  const page = open.key === key ? open.page : 1;
  const load = useLoad(() => fetchPage({ limit: pageSize, offset: (page - 1) * pageSize }), `${key}|${page}`, {
    every: options.every,
    keepPrevious: true,
  });
  const data = load.state.status === "success" ? load.state.data : null;
  const total = data?.total ?? 0;
  return {
    ...load,
    items: data?.items ?? [],
    total,
    page,
    pageSize,
    // The old page stays on screen while the new one loads.
    loadingPage: !!data && load.updatedAt === null,
    setPage: (n: number) => setOpen({ key, page: Math.max(1, Math.min(n, Math.ceil(total / pageSize) || 1)) }),
  };
}

// The same pages for a list that is already fully in the browser (for example the staff accounts).
export function pageSlice<T>(list: T[], page: number, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return { items: list.slice((current - 1) * pageSize, current * pageSize), page: current, total: list.length, pageSize };
}

// Everything, part by part, for an Excel export: the screen shows a part, the file gets it all.
export async function fetchAll<T>(fetchPage: (q: PageQuery) => Promise<Page<T>>): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += MAX_PAGE) {
    const page = await fetchPage({ limit: MAX_PAGE, offset });
    all.push(...page.items);
    if (page.items.length === 0 || all.length >= page.total) return all;
  }
}
