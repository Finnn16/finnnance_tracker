import { AppPageShell } from "@/components/AppPageShell";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-200 ${className}`} />
  );
}

export default function DashboardLoading() {
  return (
    <AppPageShell title="Dashboard" user={{ name: "Loading..." }}>
      <div className="space-y-6">
        {/* Monthly Snapshot */}
        <SkeletonCard className="h-48 w-full" />

        {/* Two-column grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonCard className="h-56" />
          <SkeletonCard className="h-56" />
        </div>

        {/* Three-column grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>

        {/* Wide card */}
        <SkeletonCard className="h-64 w-full" />
      </div>
    </AppPageShell>
  );
}
