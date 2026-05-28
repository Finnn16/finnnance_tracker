import { AppPageShell } from "@/components/AppPageShell";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-200 ${className}`} />
  );
}

function SkeletonHistoryRow() {
  return (
    <div className="space-y-2 border-b border-zinc-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <SkeletonCard className="h-4 w-32" />
        <SkeletonCard className="h-4 w-20" />
      </div>
      <SkeletonCard className="h-3 w-24" />
    </div>
  );
}

export default function SavingsLoading() {
  return (
    <AppPageShell title="Savings" user={{ name: "Loading..." }}>
      <div className="space-y-6">
        {/* Summary card skeleton */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <SkeletonCard className="h-5 w-32" />
          <SkeletonCard className="mt-4 h-10 w-48" />
          <div className="mt-4 space-y-2">
            <SkeletonCard className="h-4 w-40" />
            <SkeletonCard className="h-4 w-40" />
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex gap-3">
          <SkeletonCard className="h-10 w-32" />
          <SkeletonCard className="h-10 w-32" />
        </div>

        {/* History list skeleton */}
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <SkeletonCard className="h-5 w-40" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonHistoryRow key={i} />
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
