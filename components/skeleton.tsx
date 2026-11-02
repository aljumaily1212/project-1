export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} aria-hidden />;
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

export function TableSkeleton({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <Loading>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex gap-4 bg-slate-50 px-4 py-3">
          {Array.from({ length: cols }, (_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 border-t border-slate-100 px-4 py-4">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={`h-4 flex-1 ${c === cols - 1 ? "h-8" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function BoardSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <Loading>
      <div className="-mx-4 overflow-x-auto scrollbar-thin px-4 pb-2">
        <div className="grid min-w-[1000px] grid-cols-5 gap-3">
          {Array.from({ length: columns }, (_, c) => (
            <div key={c} className="space-y-2 rounded-xl bg-slate-100 p-3">
              <Skeleton className="mb-3 h-4 w-24" />
              {Array.from({ length: c % 2 ? 1 : 2 }, (_, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-7 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Loading>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Loading>
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    </Loading>
  );
}
