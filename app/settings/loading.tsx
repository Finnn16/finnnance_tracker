import { AppPageShell } from "@/components/AppPageShell";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-200 ${className}`} />
  );
}

export default function SettingsLoading() {
  return (
    <AppPageShell title="Settings" user={{ name: "Loading..." }}>
      <div className="space-y-6">
        {/* Info box skeleton */}
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <SkeletonCard className="h-5 w-48" />
          <SkeletonCard className="mt-2 h-4 w-full" />
          <SkeletonCard className="mt-2 h-4 w-3/4" />
        </div>

        {/* User select skeleton */}
        <div>
          <SkeletonCard className="h-5 w-32" />
          <SkeletonCard className="mt-2 h-10 w-full" />
        </div>

        {/* Budget overview cards skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SkeletonCard className="h-24 rounded-lg" />
          <SkeletonCard className="h-24 rounded-lg" />
          <SkeletonCard className="h-24 rounded-lg" />
        </div>

        {/* Budget form section skeleton */}
        <div className="space-y-4">
          <SkeletonCard className="h-6 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonCard className="h-4 w-40" />
                <SkeletonCard className="h-10 w-full" />
              </div>
            ))}
          </div>
          <SkeletonCard className="h-10 w-32" />
        </div>
      </div>
    </AppPageShell>
  );
}
