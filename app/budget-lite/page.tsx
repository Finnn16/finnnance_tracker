import { UserButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";

import { BudgetLiteMonthPicker } from "@/app/budget-lite/BudgetLiteMonthPicker";
import { AppLockButton } from "@/components/AppLockButton";
import { SensitiveAmount } from "@/components/PrivacyMode";
import {
  BUDGET_TIME_ZONE,
  monthInputValue,
  normalizeMonthStart,
} from "@/lib/budgets";
import { getDashboardData } from "@/lib/dashboard";
import { formatRupiah } from "@/lib/money";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Budget Lite - Finnnance Tracker",
  appleWebApp: {
    capable: true,
    title: "Budget Lite",
    statusBarStyle: "black-translucent",
  },
};

function getJakartaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUDGET_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function parseMonthKey(value?: string | null) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || "");

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}

function addMonths(monthKey: string, offset: number) {
  const parsed = parseMonthKey(monthKey)!;
  const monthIndex = parsed.year * 12 + (parsed.month - 1) + offset;
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;

  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const monthStart = normalizeMonthStart(monthKey);

  if (!monthStart) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: BUDGET_TIME_ZONE,
  }).format(monthStart);
}

function getMonthOptions(selectedMonthKey: string, currentMonthKey: string) {
  const values = new Set<string>();

  for (let offset = -12; offset <= 3; offset += 1) {
    values.add(addMonths(currentMonthKey, offset));
  }

  values.add(selectedMonthKey);

  return [...values].sort().reverse().map((value) => ({
    value,
    label: formatMonthLabel(value),
  }));
}

function getDailyBudgetInfo(
  date: Date,
  selectedMonthKey: string,
  remaining: number,
) {
  const currentMonthKey = monthInputValue(date);
  const selected = parseMonthKey(selectedMonthKey)!;
  const current = getJakartaDateParts(date);
  const daysInMonth = new Date(
    Date.UTC(selected.year, selected.month, 0),
  ).getUTCDate();
  const isCurrentMonth = selectedMonthKey === currentMonthKey;
  const dayCount = isCurrentMonth
    ? Math.max(1, daysInMonth - current.day + 1)
    : daysInMonth;

  return {
    dayCount,
    dayLabel: isCurrentMonth ? "days left" : "days in month",
    dailyAmount: Math.floor(Math.max(remaining, 0) / dayCount),
  };
}

function getSelectedMonthKey(rawMonth: string | undefined, currentMonth: string) {
  return parseMonthKey(rawMonth) ? rawMonth! : currentMonth;
}

function getRedirectPath(selectedMonthKey: string, currentMonthKey: string) {
  return selectedMonthKey === currentMonthKey
    ? "/budget-lite"
    : `/budget-lite?month=${encodeURIComponent(selectedMonthKey)}`;
}

function getTone(progress: number, remaining: number) {
  if (remaining < 0 || progress >= 100) {
    return {
      label: "Over budget",
      panel: "border-red-200 bg-red-50 text-red-900",
      bar: "bg-red-500",
      text: "text-red-700",
    };
  }

  if (progress >= 85) {
    return {
      label: "Tight",
      panel: "border-amber-200 bg-amber-50 text-amber-900",
      bar: "bg-amber-500",
      text: "text-amber-700",
    };
  }

  return {
    label: "On track",
    panel: "border-emerald-200 bg-emerald-50 text-emerald-900",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  };
}

export default async function BudgetLitePage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const now = new Date();
  const currentMonthKey = monthInputValue(now);
  const resolvedSearchParams = (await searchParams) || {};
  const selectedMonthKey = getSelectedMonthKey(
    resolvedSearchParams.month,
    currentMonthKey,
  );
  const user = await requireUnlockedAppUser(
    getRedirectPath(selectedMonthKey, currentMonthKey),
  );
  const data = await measureServerOperation("page /budget-lite.data", () =>
    getDashboardData(selectedMonthKey, user.id),
  );
  const { dailyAmount, dayCount, dayLabel } = getDailyBudgetInfo(
    now,
    selectedMonthKey,
    data.budget.remaining,
  );
  const monthOptions = getMonthOptions(selectedMonthKey, currentMonthKey);
  const tone = getTone(data.budget.usedPercentage, data.budget.remaining);
  const watchedItems = [...data.budget.items]
    .sort((left, right) => {
      const statusRank = {
        OVERBUDGET: 4,
        DANGER: 3,
        WARNING: 2,
        SAFE: 1,
      };

      return (
        statusRank[right.status] - statusRank[left.status] ||
        right.progress - left.progress
      );
    })
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-4 sm:max-w-lg sm:px-6">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-normal text-emerald-300">
              Finnnance
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Budget Lite</h1>
          </div>
          <div className="flex items-center gap-2 [&_button]:border-zinc-700 [&_button]:bg-zinc-900 [&_button]:text-zinc-100 [&_button:hover]:bg-zinc-800">
            <AppLockButton />
            <UserButton />
          </div>
        </header>

        <BudgetLiteMonthPicker
          options={monthOptions}
          selectedMonth={selectedMonthKey}
        />

        <section className={`mt-5 rounded-lg border p-4 ${tone.panel}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium opacity-75">Remaining</p>
              <p className="mt-1 text-3xl font-bold tracking-normal">
                <SensitiveAmount>
                  {formatRupiah(data.budget.remaining)}
                </SensitiveAmount>
              </p>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
              {tone.label}
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/70">
            <div
              className={`h-full rounded-full ${tone.bar}`}
              style={{ width: `${Math.min(100, data.budget.usedPercentage)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm font-medium">
            <span>{data.budget.usedPercentage}% used</span>
            <span>
              <SensitiveAmount>{formatRupiah(data.budget.spent)}</SensitiveAmount>{" "}
              spent
            </span>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Per day</p>
            <p className="mt-2 text-xl font-bold text-white">
              <SensitiveAmount>{formatRupiah(dailyAmount)}</SensitiveAmount>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {dayCount} {dayLabel}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Budget</p>
            <p className="mt-2 text-xl font-bold text-white">
              <SensitiveAmount>
                {formatRupiah(data.budget.totalBudget)}
              </SensitiveAmount>
            </p>
            <p className="mt-1 text-xs text-zinc-500">{data.periodLabel}</p>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-100">Watchlist</h2>
            <Link
              href="/budgets"
              className="text-sm font-semibold text-emerald-300"
            >
              Details
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {watchedItems.length > 0 ? (
              watchedItems.map((item) => (
                <div key={item.id} className="rounded-lg bg-zinc-950 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.categoryName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.progress}% used
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-right text-sm font-bold ${
                        item.remaining < 0 ? "text-red-300" : "text-zinc-100"
                      }`}
                    >
                      <SensitiveAmount>
                        {formatRupiah(Math.abs(item.remaining))}
                      </SensitiveAmount>
                      <span className="block text-xs font-medium text-zinc-500">
                        {item.remaining < 0 ? "over" : "left"}
                      </span>
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={
                        item.status === "OVERBUDGET"
                          ? "h-full rounded-full bg-red-500"
                          : item.status === "DANGER"
                            ? "h-full rounded-full bg-amber-500"
                            : item.status === "WARNING"
                              ? "h-full rounded-full bg-blue-500"
                              : "h-full rounded-full bg-emerald-500"
                      }
                      style={{ width: `${Math.min(100, item.progress)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-zinc-950 p-3 text-sm text-zinc-400">
                No budget has been set for this month.
              </p>
            )}
          </div>
        </section>

        <footer className="mt-auto flex items-center justify-between gap-3 py-4 text-sm text-zinc-400">
          <span>{user.name}</span>
          <Link href="/" className="font-semibold text-zinc-100">
            Open dashboard
          </Link>
        </footer>
      </div>
    </main>
  );
}
