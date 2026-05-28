import Link from "next/link";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
      <div className="mx-auto text-4xl">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-950">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
      {actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={actionOnClick}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
