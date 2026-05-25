"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppLockButton } from "@/components/AppLockButton";
import { DashboardData } from "@/lib/dashboard";
import { TransactionType } from "@/lib/prisma-enums";
import { formatRupiah } from "@/lib/money";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type DashboardWidget = {
  id: string;
  title: string;
  type:
    | "chart"
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
};

type BudgetView = {
  totalBudget: number;
  spent: number;
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

const defaultWidgets: DashboardWidget[] = [
  {
    id: "cashflow",
    title: "Cashflow Trend",
    type: "chart",
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
}: {
  user: CurrentUser;
  data: DashboardData;
}) {
  const [widgets, setWidgets] = useState(getInitialWidgets);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const visibleWidgets = useMemo(
    () =>
      widgets
        .filter((widget) => widget.visible)
        .sort((first, second) => first.order - second.order),
    [widgets],
  );

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

            <div className="flex items-center gap-2">
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryMetricCard
              label="Total Saldo"
              value={formatRupiah(data.summary.totalBalance)}
              detail={`${data.wallets.length} wallet aktif`}
              tone="blue"
            />
            <SummaryMetricCard
              label="Income"
              value={formatRupiah(data.summary.income)}
              detail="Bulan ini"
              tone="green"
            />
            <SummaryMetricCard
              label="Expense"
              value={formatRupiah(data.summary.expense)}
              detail="Bulan ini"
              tone="red"
            />
            <SummaryMetricCard
              label="Net Cashflow"
              value={formatRupiah(data.summary.netCashflow)}
              detail={`${data.summary.transactionCount} transaksi`}
              tone={data.summary.netCashflow >= 0 ? "green" : "red"}
            />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-5 lg:grid-cols-2">
              {visibleWidgets
                .filter(
                  (widget) =>
                    widget.type !== "recent_transactions" &&
                    widget.type !== "ai_insight",
                )
                .map((widget) => (
                  <WidgetSlot key={widget.id} widget={widget} data={data} />
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
                  <WidgetSlot key={widget.id} widget={widget} data={data} />
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
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 border-t border-zinc-200 bg-white px-2 py-2 lg:hidden">
      {navItems.slice(0, 3).map((item) => (
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

function WidgetSlot({
  widget,
  data,
}: {
  widget: DashboardWidget;
  data: DashboardData;
}) {
  const className =
    widget.size === "large"
      ? "lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      : "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm";

  if (widget.type === "chart") {
    return (
      <section className={className}>
        <WidgetHeader title="Cashflow Trend" subtitle="Last 7 days" />
        <CashflowChart data={data.cashflow} />
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
      <WidgetHeader title="AI Insight" subtitle="Smart summary" />
      <AIInsight insight={data.aiInsight} />
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

function CashflowChart({ data }: { data: DashboardData["cashflow"] }) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((day) => [day.income, day.expense]),
  );

  return (
    <div className="h-72">
      <div className="flex h-60 items-end gap-3 border-b border-zinc-200">
        {data.map((day) => (
          <div key={day.label} className="flex flex-1 flex-col items-center">
            <div className="flex h-52 w-full items-end justify-center gap-1">
              <div
                className="w-3 rounded-t bg-blue-500"
                style={{
                  height: `${Math.max(6, (day.income / maxValue) * 100)}%`,
                }}
              />
              <div
                className="w-3 rounded-t bg-red-300"
                style={{
                  height: `${Math.max(6, (day.expense / maxValue) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs font-medium text-zinc-500">
              {day.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Income
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-300" />
          Expense
        </span>
      </div>
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
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700">Spending usage</span>
        <span className="font-semibold text-zinc-950">{usage}%</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
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
      <p className="mt-4 text-sm leading-6 text-zinc-500">
        {formatRupiah(budget.spent)} used from{" "}
        {formatRupiah(budget.totalBudget)}. Remaining budget:{" "}
        {formatRupiah(budget.remaining)}.
      </p>
      <div className="mt-4 space-y-2">
        {budget.items.map((item: BudgetItemView) => (
          <div
            key={item.id}
            className="rounded-lg bg-zinc-50 px-3 py-3 text-sm text-zinc-600"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-zinc-700">
                {item.categoryName}
              </span>
              <span className="font-semibold text-zinc-950">
                {formatRupiah(item.amount)}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {item.userName} - {formatRupiah(item.spent)} used
            </p>
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

function AIInsight({ insight }: { insight: DashboardData["aiInsight"] }) {
  const toneClass =
    insight.tone === "warning"
      ? "border-red-200 bg-red-50"
      : insight.tone === "positive"
        ? "border-emerald-200 bg-emerald-50"
        : "border-blue-200 bg-blue-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-sm font-semibold text-zinc-950">{insight.title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{insight.message}</p>
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
