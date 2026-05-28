import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { AppLockButton } from "@/components/AppLockButton";
import { AppMobileNav, AppSidebar } from "@/components/AppNavigation";

export function AppPageShell({
  title,
  user,
  children,
  fill = false,
}: {
  title: string;
  user: { name: string };
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <div
      className={
        fill
          ? "flex h-screen overflow-hidden bg-zinc-100 text-zinc-950"
          : "min-h-screen bg-zinc-100 text-zinc-950"
      }
    >
      <AppSidebar />

      <div
        className={
          fill
            ? "flex min-h-0 flex-1 flex-col lg:pl-60"
            : "min-h-screen lg:pl-60"
        }
      >
        <header className="sticky top-0 z-20 shrink-0 border-b border-zinc-200 bg-zinc-100/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm text-zinc-500">Finnnance Tracker</p>
              <h1 className="text-xl font-semibold text-zinc-950">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-medium text-zinc-600 sm:inline">
                {user.name}
              </span>
              <AppLockButton />
              <UserButton />
            </div>
          </div>
        </header>

        <main
          className={
            fill
              ? "mx-auto flex min-h-0 w-full max-w-7xl flex-1 overflow-hidden px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-5"
              : "mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-8"
          }
        >
          {children}
        </main>
      </div>

      <AppMobileNav />
    </div>
  );
}
