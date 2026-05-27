"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppLockButton } from "@/components/AppLockButton";
import type { DashboardData } from "@/lib/dashboard";
import { TransactionType } from "@/lib/prisma-enums";
import { formatRupiah } from "@/lib/money";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type DashboardOwnerOption = {
  id: string;
  name: string;
};

type DashboardWidget = {
  id: string;
  title: string;
  type:
    | "summary"
    | "top_categories"
    | "wallet_balances"
    | "budget_progress"
    | "recent_transactions"
    | "ai_insight";
  visible: boolean;
  order: number;
  size: "medium" | "large";
};

type WalletBalanceView = {
  id: string;
  name: string;
  typeLabel: string;
  ownerName: string;
  currentBalance: number;
};

type BudgetItemView = {
  id: string;
  userName: string;
  categoryName: string;
  amount: number;
  spent: number;
  remaining: number;
  progress: number;
  status: "SAFE" | "WARNING" | "DANGER" | "OVERBUDGET";
};

type BudgetView = {
  budgetableIncome: number;
  availableToBudget: number;
  status: "SAFE" | "OVERPLANNED" | "UNDERFUNDED";
  totalBudget: number;
  spent: number;
  unbudgetedSpent: number;
  fundingShortfall: number;
  usedPercentage: number;
  remaining: number;
  items: BudgetItemView[];
};

type RecentTransactionView = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  userName: string;
  walletName: string;
  transferToWalletName: string | null;
  categoryName: string | null;
  budgetCategoryName: string | null;
  transactionDate: string;
};

type DashboardAiInsight = DashboardData["aiInsight"];

type AiInsightRequest = {
  periodLabel: string;
  summary: {
    income: number;
    expense: number;
    totalBalance: number;
    netCashflow: number;
    transactionCount: number;
  };
  budget: {
    budgetableIncome: number;
    availableToBudget: number;
    totalBudget: number;
    spent: number;
    unbudgetedSpent: number;
    fundingShortfall: number;
    remaining: number;
    status: DashboardData["budget"]["status"];
    usedPercentage: number;
  };
  topCategories: DashboardData["topCategories"];
  recentTransactions: Array<{
    type: TransactionType;
    amount: number;
    description: string;
    categoryName: string | null;
    budgetCategoryName: string | null;
    walletName: string;
  }>;
};

const defaultWidgets: DashboardWidget[] = [
  {
    id: "monthly_snapshot",
    title: "Monthly Snapshot",
    type: "summary",
    visible: true,
    order: 1,
    size: "large",
  },
  {
    id: "top_categories",
    title: "Top Categories",
    type: "top_categories",
    visible: true,
    order: 2,
    size: "medium",
  },
  {
    id: "wallet_balances",
    title: "Wallet Balances",
    type: "wallet_balances",
    visible: true,
    order: 3,
    size: "medium",
  },
  {
    id: "budget_progress",
    title: "Budget Progress",
    type: "budget_progress",
    visible: true,
    order: 4,
    size: "medium",
  },
  {
    id: "recent_transactions",
    title: "Recent Transactions",
    type: "recent_transactions",
    visible: true,
    order: 5,
    size: "medium",
  },
  {
    id: "ai_insight",
    title: "AI Insight",
    type: "ai_insight",
    visible: true,
    order: 6,
    size: "medium",
  },
];

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Transactions", href: "/transactions" },
  { label: "Wallets", href: "/wallets" },
  { label: "Savings", href: "/savings" },
  { label: "Budget", href: "/budgets" },
  { label: "AI Assistant", href: "/" },
  { label: "Settings", href: "/settings" },
];

function getInitialWidgets() {
  if (typeof window === "undefined") {
    return defaultWidgets;
  }

  const savedWidgets = window.localStorage.getItem("dashboard_widgets");

  if (!savedWidgets) {
    return defaultWidgets;
  }

  try {
    const parsed = JSON.parse(savedWidgets) as DashboardWidget[];

    return defaultWidgets.map((widget) => ({
      ...widget,
      visible:
        parsed.find((savedWidget) => savedWidget.id === widget.id)?.visible ??
        widget.visible,
    }));
  } catch {
    window.localStorage.removeItem("dashboard_widgets");
    return defaultWidgets;
  }
}

export function DashboardView({
  user,
  data,
  selectedMonth,
  selectedYear,
  selectedOwner,
  ownerOptions,
  canViewCombined,
}: {
  user: CurrentUser;
  data: DashboardData;
  selectedMonth: string;
  selectedYear: string;
  selectedOwner: string;
  ownerOptions: DashboardOwnerOption[];
  canViewCombined: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [widgets, setWidgets] = useState(getInitialWidgets);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<DashboardAiInsight>(
    data.aiInsight,
  );
  const [aiInsightLoading, setAiInsightLoading] = useState(true);
  const [aiInsightError, setAiInsightError] = useState<string | null>(null);

  const aiInsightRequest = useMemo<AiInsightRequest>(
    () => ({
      periodLabel: data.periodLabel,
      summary: data.summary,
      budget: {
        budgetableIncome: data.budget.budgetableIncome,
        availableToBudget: data.budget.availableToBudget,
        totalBudget: data.budget.totalBudget,
        spent: data.budget.spent,
        unbudgetedSpent: data.budget.unbudgetedSpent,
        fundingShortfall: data.budget.fundingShortfall,
        remaining: data.budget.remaining,
        status: data.budget.status,
        usedPercentage: data.budget.usedPercentage,
      },
      topCategories: data.topCategories.slice(0, 5),
      recentTransactions: data.recentTransactions.slice(0, 5).map((item) => ({
        type: item.type,
        amount: item.amount,
        description: item.description,
        categoryName: item.categoryName,
        budgetCategoryName: item.budgetCategoryName,
        walletName: item.walletName,
      })),
    }),
    [data],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAiInsight() {
      setAiInsightLoading(true);
      setAiInsightError(null);

      try {
        const response = await fetch("/api/ai/insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiInsightRequest),
          signal: controller.signal,
          cache: "no-store",
        });

        const result = (await response.json()) as {
          insight?: DashboardAiInsight;
          error?: string;
          warning?: string;
        };

        if (!response.ok || !result.insight) {
          throw new Error(result.error || "Failed to load AI insight.");
        }

        setAiInsight(result.insight);
        setAiInsightError(result.warning || null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setAiInsightError(
          error instanceof Error ? error.message : "Failed to load AI insight.",
        );
        setAiInsight(data.aiInsight);
      } finally {
        if (!controller.signal.aborted) {
          setAiInsightLoading(false);
        }
      }
    }

    loadAiInsight();

    return () => {
      controller.abort();
    };
  }, [aiInsightRequest, data.aiInsight]);

  const visibleWidgets = useMemo(
    () =>
      widgets
        .filter((widget) => widget.visible)
        .sort((first, second) => first.order - second.order),
    [widgets],
  );

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;

      return {
        value: String(month).padStart(2, "0"),
        label: new Intl.DateTimeFormat("id-ID", {
          month: "long",
        }).format(new Date(2000, index, 1)),
      };
    });
  }, []);

  const updateMonthYear = (nextMonth: string, nextYear: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.set("month", nextMonth);
    nextParams.set("year", nextYear);

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const updateOwner = (nextOwner: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextOwner === user.id) {
      nextParams.delete("owner");
    } else {
      nextParams.set("owner", nextOwner);
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const updateWidgetVisibility = (widgetId: string, visible: boolean) => {
    const nextWidgets = widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, visible } : widget,
    );

    setWidgets(nextWidgets);
    window.localStorage.setItem(
      "dashboard_widgets",
      JSON.stringify(nextWidgets),
    );
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <DesktopSidebar />

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-100/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm text-zinc-500">Dashboard</p>
              <h1 className="text-xl font-semibold text-zinc-950">
                Hi, {user.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm">
                <span className="hidden whitespace-nowrap text-zinc-400 xl:inline">
                  User
                </span>
                <select
                  value={selectedOwner}
                  onChange={(event) => updateOwner(event.target.value)}
                  className="max-w-36 min-w-0 bg-transparent text-sm font-medium text-zinc-700 outline-none"
                >
                  {ownerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.id === user.id ? `Saya - ${option.name}` : option.name}
                    </option>
                  ))}
                  {canViewCombined ? (
                    <option value="all">Gabungan</option>
                  ) : null}
                </select>
              </label>
              <label className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm sm:flex">
                <span className="whitespace-nowrap text-zinc-400">Bulan</span>
                <select
                  value={selectedMonth}
                  onChange={(event) =>
                    updateMonthYear(event.target.value, selectedYear)
                  }
                  className="min-w-0 bg-transparent text-sm font-medium text-zinc-700 outline-none"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm sm:flex">
                <span className="whitespace-nowrap text-zinc-400">Tahun</span>
                <input
                  value={selectedYear}
                  onChange={(event) =>
                    updateMonthYear(selectedMonth, event.target.value)
                  }
                  type="number"
                  inputMode="numeric"
                  className="w-24 bg-transparent text-sm font-medium text-zinc-700 outline-none"
                />
              </label>
              <div className="hidden rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm sm:block">
                {data.periodLabel}
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                Customize
              </button>
              <AppLockButton />
              <UserButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
          <section className="mt-5">
            {visibleWidgets
              .filter((widget) => widget.type === "summary")
              .map((widget) => (
                <WidgetSlot
                  key={widget.id}
                  widget={widget}
                  data={data}
                  aiInsight={aiInsight}
                  aiInsightLoading={aiInsightLoading}
                  aiInsightError={aiInsightError}
                />
              ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-5 lg:grid-cols-2">
              {visibleWidgets
                .filter(
                  (widget) =>
                    widget.type !== "recent_transactions" &&
                    widget.type !== "ai_insight" &&
                    widget.type !== "summary",
                )
                .map((widget) => (
                  <WidgetSlot
                    key={widget.id}
                    widget={widget}
                    data={data}
                    aiInsight={aiInsight}
                    aiInsightLoading={aiInsightLoading}
                    aiInsightError={aiInsightError}
                  />
                ))}
            </div>

            <aside className="space-y-5">
              {visibleWidgets
                .filter(
                  (widget) =>
                    widget.type === "recent_transactions" ||
                    widget.type === "ai_insight",
                )
                .map((widget) => (
                  <WidgetSlot
                    key={widget.id}
                    widget={widget}
                    data={data}
                    aiInsight={aiInsight}
                    aiInsightLoading={aiInsightLoading}
                    aiInsightError={aiInsightError}
                  />
                ))}
            </aside>
          </section>
        </main>
      </div>

      <MobileNav />

      {isCustomizeOpen ? (
        <CustomizeDashboardModal
          widgets={widgets}
          onClose={() => setIsCustomizeOpen(false)}
          onChange={updateWidgetVisibility}
        />
      ) : null}
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-zinc-200 bg-white px-4 py-5 lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          F
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            Finnnance Tracker
          </p>
          <p className="text-xs text-zinc-500">Private workspace</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={
              item.label === "Dashboard"
                ? "flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                : "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950"
            }
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-zinc-950">Next</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Split bills and deeper analytics are next on the roadmap.
        </p>
      </div>
    </aside>
  );
}

function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-zinc-200 bg-white px-2 py-2 lg:hidden">
      {navItems.slice(0, 4).map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-lg px-2 py-2 text-center text-xs font-medium text-zinc-600"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function WidgetSlot({
  widget,
  data,
  aiInsight,
  aiInsightLoading,
  aiInsightError,
}: {
  widget: DashboardWidget;
  data: DashboardData;
  aiInsight: DashboardAiInsight;
  aiInsightLoading: boolean;
  aiInsightError: string | null;
}) {
  const className =
    widget.size === "large"
      ? "w-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      : "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm";

  if (widget.type === "summary") {
    return (
      <section className={className}>
        <WidgetHeader
          title="Monthly Snapshot"
          subtitle="Salary-first overview"
        />
        <MonthlySnapshot data={data} />
      </section>
    );
  }

  if (widget.type === "top_categories") {
    return (
      <section className={className}>
        <WidgetHeader title="Top Categories" subtitle="Expense breakdown" />
        <TopCategories categories={data.topCategories} />
      </section>
    );
  }

  if (widget.type === "wallet_balances") {
    return (
      <section className={className}>
        <WidgetHeader title="Wallet Balances" subtitle="All active wallets" />
        <WalletBalances wallets={data.wallets} />
      </section>
    );
  }

  if (widget.type === "budget_progress") {
    return (
      <section className={className}>
        <WidgetHeader title="Budget Progress" subtitle="This month" />
        <BudgetProgress budget={data.budget} />
      </section>
    );
  }

  if (widget.type === "recent_transactions") {
    return (
      <section className={className}>
        <WidgetHeader title="Recent Transactions" subtitle="Latest activity" />
        <RecentTransactions transactions={data.recentTransactions} />
      </section>
    );
  }

  return (
    <section className={className}>
      <WidgetHeader title="AI Insight" subtitle="OpenRouter-powered summary" />
      <AIInsight
        insight={aiInsight}
        isLoading={aiInsightLoading}
        error={aiInsightError}
      />
    </section>
  );
}

function WidgetHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      </div>
      <span className="text-sm text-zinc-400">...</span>
    </div>
  );
}

function SummaryMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "red";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-700";

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-normal text-zinc-950">
            {value}
          </p>
        </div>
        <span
          className={`rounded-lg px-2 py-1 text-xs font-semibold ${toneClass}`}
        >
          {detail}
        </span>
      </div>
    </article>
  );
}

function MonthlySnapshot({ data }: { data: DashboardData }) {
  const isHealthy = data.summary.netCashflow >= 0;
  const budgetTone = data.budget.status === "SAFE" ? "green" : "red";

  const metrics = [
    {
      label: "Income",
      value: formatRupiah(data.summary.income),
      detail: "Bulan ini",
      tone: "green" as const,
    },
    {
      label: "Expense",
      value: formatRupiah(data.summary.expense),
      detail: "Bulan ini",
      tone: "red" as const,
    },
    {
      label: "Total Saldo",
      value: formatRupiah(data.summary.totalBalance),
      detail: `${data.wallets.length} wallet aktif`,
      tone: "blue" as const,
    },
    {
      label: "Savings",
      value: formatRupiah(data.savings.currentBalance),
      detail: "Reserved money",
      tone: "blue" as const,
    },
    {
      label: "Budgetable Income",
      value: formatRupiah(data.budget.budgetableIncome),
      detail: "Budget period",
      tone: "green" as const,
    },
    {
      label: "Budget Used",
      value: `${data.budget.usedPercentage}%`,
      detail: "Budget bulan ini",
      tone: isHealthy ? ("green" as const) : ("red" as const),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              Net cashflow bulan ini
            </p>
            <p
              className={`mt-2 text-3xl font-bold tracking-tight ${
                isHealthy ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatRupiah(data.summary.netCashflow)}
            </p>
          </div>
          <span
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              isHealthy
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isHealthy ? "Surplus" : "Deficit"}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {isHealthy
            ? "Income bulan ini masih menutup pengeluaran, jadi lebih mudah untuk menjaga budget tetap aman."
            : "Pengeluaran bulan ini melewati income. Periksa transaksi besar dan budget yang paling cepat habis."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <SummaryMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-zinc-700">Budget status</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              budgetTone === "green"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {data.budget.status === "UNDERFUNDED"
              ? "Underfunded"
              : data.budget.status === "OVERPLANNED"
                ? "Overplanned"
                : "Safe"}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${
              budgetTone === "green" ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, data.budget.usedPercentage)}%` }}
          />
        </div>
        <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
          <span>
            {formatRupiah(data.budget.budgetableIncome)} budgetable income
          </span>
          <span>{formatRupiah(data.budget.totalBudget)} budget set</span>
          <span>
            {formatRupiah(data.budget.availableToBudget)} available to budget
          </span>
        </div>
        {data.budget.fundingShortfall > 0 ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            Funding shortfall: {formatRupiah(data.budget.fundingShortfall)}.
            Sebagian savings atau budget aktif belum ditopang saldo wallet.
          </p>
        ) : null}
        <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
          <span>{formatRupiah(data.savings.addedThisMonth)} added savings</span>
          <span>{formatRupiah(data.savings.usedThisMonth)} used savings</span>
          <span>
            {formatRupiah(data.savings.adjustmentThisMonth)} adjustments
          </span>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        {data.summary.transactionCount} transaksi bulan ini •{" "}
        {data.wallets.length} wallet aktif
      </p>
    </div>
  );
}

function TopCategories({
  categories,
}: {
  categories: DashboardData["topCategories"];
}) {
  if (categories.length === 0) {
    return <EmptyState text="No expense categories this month." />;
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.name}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-zinc-700">{category.name}</span>
            <span className="font-semibold text-zinc-950">
              {formatRupiah(category.amount)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${category.percentage}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {category.percentage}% of expense
          </p>
        </div>
      ))}
    </div>
  );
}

function WalletBalances({ wallets }: { wallets: WalletBalanceView[] }) {
  if (wallets.length === 0) {
    return <EmptyState text="No wallets yet." />;
  }

  return (
    <div className="space-y-3">
      {wallets.slice(0, 6).map((wallet: WalletBalanceView) => (
        <div
          key={wallet.id}
          className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-950">{wallet.name}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {wallet.ownerName} - {wallet.typeLabel}
            </p>
          </div>
          <p className="text-sm font-bold text-zinc-950">
            {formatRupiah(wallet.currentBalance)}
          </p>
        </div>
      ))}
    </div>
  );
}

function BudgetProgress({ budget }: { budget: BudgetView }) {
  const usage = budget.usedPercentage;
  const statusTone =
    budget.status !== "SAFE"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  if (budget.totalBudget <= 0) {
    return (
      <div>
        <p className="text-sm leading-6 text-zinc-500">
          No budget has been set for this month. Add one to track monthly
          spending pressure.
        </p>
        <Link
          href="/budgets"
          className="mt-4 inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Open Budgets
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">Budget usage</p>
          <p className="mt-1 text-xs text-zinc-500">
            Overall spending against the budget you planned this month.
          </p>
        </div>
        <div
          className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${statusTone}`}
        >
          {budget.status}
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-zinc-200">
        <div
          className={
            usage >= 90
              ? "h-full rounded-full bg-red-500"
              : usage >= 70
                ? "h-full rounded-full bg-amber-500"
                : "h-full rounded-full bg-emerald-500"
          }
          style={{ width: `${usage}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 sm:text-sm">
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
          <p className="text-zinc-500">Budgetable Income</p>
          <p className="mt-1 font-semibold text-zinc-950">
            {formatRupiah(budget.budgetableIncome)}
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
          <p className="text-zinc-500">Available to Budget</p>
          <p className="mt-1 font-semibold text-zinc-950">
            {formatRupiah(budget.availableToBudget)}
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
          <p className="text-zinc-500">Total Budget Set</p>
          <p className="mt-1 font-semibold text-zinc-950">
            {formatRupiah(budget.totalBudget)}
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
          <p className="text-zinc-500">Budgeted Spent</p>
          <p className="mt-1 font-semibold text-zinc-950">
            {formatRupiah(budget.spent)}
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
          <p className="text-zinc-500">Remaining Budget</p>
          <p className="mt-1 font-semibold text-zinc-950">
            {formatRupiah(budget.remaining)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
          <p className="text-amber-700">Unbudgeted Expense</p>
          <p className="mt-1 font-semibold text-amber-800">
            {formatRupiah(budget.unbudgetedSpent)}
          </p>
        </div>
        <div className="rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-200">
          <p className="text-red-700">Funding Shortfall</p>
          <p className="mt-1 font-semibold text-red-800">
            {formatRupiah(budget.fundingShortfall)}
          </p>
        </div>
      </div>
      <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
        {budget.items.map((item: BudgetItemView) => (
          <div
            key={item.id}
            className="rounded-xl bg-white px-3 py-3 text-sm ring-1 ring-zinc-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-950">
                  {item.categoryName}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{item.userName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-950">
                  {formatRupiah(item.amount)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.remaining >= 0
                    ? `${formatRupiah(item.remaining)} left`
                    : `${formatRupiah(Math.abs(item.remaining))} over`}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
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
                style={{
                  width: `${Math.min(item.progress, 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>{formatRupiah(item.spent)} spent</span>
              <span
                className={item.status === "OVERBUDGET" ? "text-red-700" : ""}
              >
                {item.progress}% used - {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentTransactions({
  transactions,
}: {
  transactions: RecentTransactionView[];
}) {
  if (transactions.length === 0) {
    return <EmptyState text="No recent transactions." />;
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction: RecentTransactionView) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {transaction.description}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {transaction.budgetCategoryName ||
                transaction.categoryName ||
                `${transaction.walletName} to ${transaction.transferToWalletName}`}
            </p>
          </div>
          <p
            className={
              transaction.type === TransactionType.INCOME
                ? "text-sm font-bold text-emerald-700"
                : transaction.type === TransactionType.EXPENSE
                  ? "text-sm font-bold text-red-700"
                  : "text-sm font-bold text-zinc-950"
            }
          >
            {transaction.type === TransactionType.EXPENSE
              ? `-${formatRupiah(transaction.amount)}`
              : formatRupiah(transaction.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}

function AIInsight({
  insight,
  isLoading,
  error,
}: {
  insight: DashboardAiInsight;
  isLoading: boolean;
  error: string | null;
}) {
  const toneClass =
    insight.tone === "warning"
      ? "border-red-200 bg-red-50"
      : insight.tone === "positive"
        ? "border-emerald-200 bg-emerald-50"
        : "border-blue-200 bg-blue-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      {isLoading ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Generating with OpenRouter
        </p>
      ) : null}
      <p className="text-sm font-semibold text-zinc-950">{insight.title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{insight.message}</p>
      {error ? <p className="mt-3 text-xs text-zinc-500">{error}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function CustomizeDashboardModal({
  widgets,
  onClose,
  onChange,
}: {
  widgets: DashboardWidget[];
  onClose: () => void;
  onChange: (widgetId: string, visible: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/30 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              Customize Dashboard
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choose which widgets stay visible.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {widgets.map((widget) => (
            <label
              key={widget.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-3 text-sm font-medium text-zinc-700"
            >
              {widget.title}
              <input
                type="checkbox"
                checked={widget.visible}
                onChange={(event) => onChange(widget.id, event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
