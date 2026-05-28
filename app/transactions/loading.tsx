import { AppPageShell } from "@/components/AppPageShell";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-200 ${className}`} />
  );
}

function SkeletonRow() {
  return (
    <div className="space-y-3 border-b border-zinc-200 px-4 py-4">
      <div className="flex items-center gap-4">
        <SkeletonCard className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonCard className="h-4 w-2/3" />
          <SkeletonCard className="h-3 w-1/3" />
        </div>
        <SkeletonCard className="h-4 w-20" />
      </div>
    </div>
  );
}

export default function TransactionsLoading() {
  return (
    <AppPageShell title="Transactions" user={{ name: "Loading..." }}>
      <div className="space-y-6">
        {/* Form skeleton */}
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
          <SkeletonCard className="h-10 w-full" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonCard className="h-10" />
            <SkeletonCard className="h-10" />
          </div>
          <SkeletonCard className="h-10 w-32" />
        </div>

        {/* Transaction list skeleton */}
        <div className="rounded-lg border border-zinc-200 bg-white">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
