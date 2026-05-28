import { AppPageShell } from "@/components/AppPageShell";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-200 ${className}`} />
  );
}

function SkeletonBudgetRow() {
  return (
    <div className="space-y-3 border-b border-zinc-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <SkeletonCard className="h-5 w-40" />
        <SkeletonCard className="h-5 w-24" />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-300">
        <div className="h-full w-1/3 bg-zinc-400"></div>
      </div>
      <SkeletonCard className="h-4 w-32" />
    </div>
  );
}

export default function BudgetsLoading() {
  return (
    <AppPageShell title="Budget" user={{ name: "Loading..." }}>
      <div className="space-y-6">
        {/* Header info skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SkeletonCard className="h-20 rounded-lg" />
          <SkeletonCard className="h-20 rounded-lg" />
          <SkeletonCard className="h-20 rounded-lg" />
        </div>

        {/* Budget list skeleton */}
        <div className="rounded-lg border border-zinc-200 bg-white">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBudgetRow key={i} />
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
