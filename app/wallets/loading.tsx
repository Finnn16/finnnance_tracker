import { AppPageShell } from "@/components/AppPageShell";

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-200 ${className}`} />
  );
}

export default function WalletsLoading() {
  return (
    <AppPageShell title="Wallets" user={{ name: "Loading..." }}>
      <div className="space-y-6">
        {/* Add wallet button skeleton */}
        <SkeletonCard className="h-10 w-40" />

        {/* Wallet cards skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <SkeletonCard className="h-6 w-32" />
                <SkeletonCard className="h-5 w-16" />
              </div>
              <SkeletonCard className="h-8 w-48" />
              <div className="space-y-2 pt-2">
                <SkeletonCard className="h-4 w-3/4" />
                <SkeletonCard className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
