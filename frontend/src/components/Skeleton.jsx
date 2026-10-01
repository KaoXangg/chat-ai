import clsx from "clsx";

export function Skeleton({ className }) {
  return <div className={clsx("animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08]", className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 flex items-center gap-3 shadow-soft">
      <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-10" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-t border-edge-light dark:border-edge-dark">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function CardRowSkeleton() {
  return (
    <div className="rounded-2xl glass border border-edge-light dark:border-edge-dark p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
