"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", shortLabel: "Home", href: "/" },
  { label: "Transactions", shortLabel: "Transaksi", href: "/transactions" },
  { label: "Wallets", shortLabel: "Wallet", href: "/wallets" },
  { label: "Savings", shortLabel: "Savings", href: "/savings" },
  { label: "Budget", shortLabel: "Budget", href: "/budgets" },
  { label: "Hutang Piutang", shortLabel: "Debt", href: "/debts" },
  { label: "Settings", shortLabel: "Settings", href: "/settings" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-zinc-200 bg-white px-4 py-5 lg:block">
      <Link
        href="/"
        className="flex items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-zinc-50 active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
          F
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            Finnnance Tracker
          </p>
          <p className="text-xs text-zinc-500">Private workspace</p>
        </div>
      </Link>

      <nav className="mt-8 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex items-center rounded-xl bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
                  : "flex items-center rounded-xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-4 right-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-zinc-950">Workspace</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Semua fitur keuangan dapat dibuka langsung dari navigasi ini.
        </p>
      </div>
    </aside>
  );
}

export function AppMobileMenuButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-95 lg:hidden"
      >
        <span className="space-y-1.5" aria-hidden="true">
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-zinc-950/40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-3 top-3 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-zinc-200 bg-white p-3 shadow-xl">
            <div className="flex items-center justify-between gap-3 px-1 py-1">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Finnnance Tracker
                </p>
                <p className="text-xs text-zinc-500">Navigation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  X
                </span>
              </button>
            </div>

            <nav className="mt-3 space-y-1" aria-label="Mobile menu">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={
                      active
                        ? "flex items-center rounded-lg bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
                        : "flex items-center rounded-lg px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AppMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 overflow-x-auto border-t border-zinc-200 bg-white/95 px-2 py-2 shadow-[0_-4px_18px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex min-w-max gap-1">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "min-w-[72px] rounded-xl bg-blue-50 px-3 py-2.5 text-center text-xs font-semibold text-blue-700"
                  : "min-w-[72px] rounded-xl px-3 py-2.5 text-center text-xs font-medium text-zinc-600 transition active:bg-zinc-100"
              }
            >
              {item.shortLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
