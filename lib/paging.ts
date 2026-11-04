"use client";

import { useState } from "react";
import type { Page, PageQuery } from "./api";
import { useLoad } from "./useLoad";

// The most a server sends in one answer. Asking for more still gets this many.
export const MAX_PAGE = 200;

// A long list shown in parts: the first `pageSize` items, then "show more" adds the next part.
// It always asks from the start for everything shown so far (limit grows, offset stays 0). That way,
// when new entries arrive at the top while the list is open, nothing is skipped or shown twice,
// and the every-few-seconds refresh keeps working the same way.
export function usePaged<T>(fetchPage: (q: PageQuery) => Promise<Page<T>>, key = "", options: { pageSize?: number; every?: number } = {}) {
  const pageSize = options.pageSize ?? 50;
  const [open, setOpen] = useState({ key, pages: 1 });
  // A new filter or search starts again from the first part.
  const pages = open.key === key ? open.pages : 1;
  const limit = Math.min(pageSize * pages, MAX_PAGE * 10);
  const load = useLoad(() => fetchPage({ limit, offset: 0 }), `${key}|${pages}`, { every: options.every, keepPrevious: true });
  const data = load.state.status === "success" ? load.state.data : null;
  return {
    ...load,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    hasMore: !!data && data.items.length < data.total,
    // The old part stays on screen while the bigger one loads.
    loadingMore: !!data && load.updatedAt === null,
    more: () => setOpen({ key, pages: pages + 1 }),
  };
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
