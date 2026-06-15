"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppLockButton } from "@/components/AppLockButton";
import { AppMobileNav, AppSidebar } from "@/components/AppNavigation";
import { DashboardSimpleCards } from "@/components/DashboardSimpleCards";
import { SensitiveAmount } from "@/components/PrivacyMode";
import type { DashboardData } from "@/lib/dashboard";
import { formatDisplayTitle } from "@/lib/display-text";
import { TransactionDetailStatus, TransactionType } from "@/lib/prisma-enums";
import {
  formatAmountInput,
  formatRupiah,
  normalizeAmountInput,
  parseIntegerAmount,
} from "@/lib/money";

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
    | "debt_summary"
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
  isDefault: boolean;
  lastBalanceCheckedAt: string | null;
  lastMatchedAt: string | null;
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

type BudgetAdjustmentView = {
  id: string;
  categoryName: string;
  previousAmount: number;
  newAmount: number;
  amount: number;
  note: string | null;
  createdAt: string;
};

type BudgetView = {
  budgetableIncome: number;
  readyToBudget: number;
  availableToBudget: number;
  status: "SAFE" | "OVERPLANNED";
  budgetSet: number;
  budgetPlanGap: number;
  budgetPlanStatus: "SAFE" | "OVERPLANNED";
  totalBudget: number;
  spent: number;
  budgetSpent: number;
  unbudgetedSpent: number;
  remainingActiveBudget: number;
  fundingShortfall: number;
  incomeReceivedBeforePeriod: number;
  incomeReceivedBeforePeriodDate: string | null;
  usedPercentage: number;
  remaining: number;
  adjustments: BudgetAdjustmentView[];
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
  detailStatus: DashboardData["recentTransactions"][number]["detailStatus"];
};

type DashboardAiInsight = DashboardData["aiInsight"];

type CoverageView = DashboardData["coverage"];

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
    readyToBudget: number;
    availableToBudget: number;
    totalBudget: number;
    spent: number;
    unbudgetedSpent: number;
    remainingActiveBudget: number;
    budgetPlanGap: number;
    budgetPlanStatus: DashboardData["budget"]["budgetPlanStatus"];
    remaining: number;
    usedPercentage: number;
    incomeReceivedBeforePeriod: number;
    incomeReceivedBeforePeriodDate: string | null;
  };
  coverage: CoverageView;
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

type ShortfallCause = {
  id: string;
  label: string;
  amount: number;
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
    size: "large",
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
    id: "debt_summary",
    title: "Hutang Piutang",
    type: "debt_summary",
    visible: true,
    order: 6,
    size: "medium",
  },
  {
    id: "ai_insight",
    title: "AI Insight",
    type: "ai_insight",
    visible: true,
    order: 7,
    size: "medium",
  },
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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getShortfallCauses(
  items: BudgetItemView[],
  shortfall: number,
): ShortfallCause[] {
  let remainingShortfall = shortfall;

  return items
    .map((item) => ({
      id: item.id,
      label: item.categoryName,
      amount: Math.max(item.remaining, 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((left, right) => right.amount - left.amount)
    .map((item) => {
      const amount = Math.min(item.amount, remainingShortfall);
      remainingShortfall -= amount;

      return { ...item, amount };
    })
    .filter((item) => item.amount > 0)
    .slice(0, 3);
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
        readyToBudget: data.budget.readyToBudget,
        availableToBudget: data.budget.availableToBudget,
        totalBudget: data.budget.totalBudget,
        spent: data.budget.spent,
        unbudgetedSpent: data.budget.unbudgetedSpent,
        remainingActiveBudget: data.budget.remainingActiveBudget,
        budgetPlanGap: data.budget.budgetPlanGap,
        budgetPlanStatus: data.budget.budgetPlanStatus,
        remaining: data.budget.remaining,
        usedPercentage: data.budget.usedPercentage,
        incomeReceivedBeforePeriod: data.budget.incomeReceivedBeforePeriod,
        incomeReceivedBeforePeriodDate:
          data.budget.incomeReceivedBeforePeriodDate,
      },
      coverage: data.coverage,
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
  const sideWidgetRank: Record<DashboardWidget["type"], number> = {
    summary: 99,
    top_categories: 99,
    wallet_balances: 99,
    budget_progress: 99,
    ai_insight: 1,
    debt_summary: 2,
    recent_transactions: 3,
  };
  const sideWidgetTypes = new Set<DashboardWidget["type"]>([
    "ai_insight",
    "debt_summary",
    "recent_transactions",
  ]);
  const mainWidgets = visibleWidgets.filter(
    (widget) => widget.type !== "summary" && !sideWidgetTypes.has(widget.type),
  );
  const sideWidgets = visibleWidgets
    .filter((widget) => sideWidgetTypes.has(widget.type))
    .sort(
      (first, second) =>
        sideWidgetRank[first.type] - sideWidgetRank[second.type],
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
      <AppSidebar />

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-100/90 backdrop-blur">
          <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
                      {option.id === user.id
                        ? `Saya - ${option.name}`
                        : option.name}
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

        <main className="w-full px-4 pb-24 pt-5 sm:px-6 lg:px-8">
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

          <section className="mt-5">
            <DashboardSimpleCards data={data} />
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <PendingReviewCard pendingReview={data.pendingReview} />
            <BalanceCheckCard wallets={data.wallets} />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-5 lg:grid-cols-2">
              {mainWidgets.map((widget) => (
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
              {sideWidgets.map((widget) => (
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

      <AppMobileNav />

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

function PendingReviewCard({
  pendingReview,
}: {
  pendingReview: DashboardData["pendingReview"];
}) {
  if (pendingReview.count === 0) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold text-emerald-900">
          Semua transaksi sudah rapi.
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          Saldo dan laporan sudah memakai transaksi yang lengkap.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            {pendingReview.count} transaksi belum lengkap
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Lengkapi agar budget dan laporan makin akurat.
          </p>
        </div>
        <Link
          href="/transactions"
          className="rounded-lg bg-zinc-950 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Review sekarang
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {pendingReview.items.slice(0, 4).map((transaction) => (
          <div
            key={transaction.id}
            className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100"
          >
            <p className="font-semibold">
              <SensitiveAmount>
                {formatRupiah(transaction.amount)}
              </SensitiveAmount>{" "}
              - {transaction.walletName}
            </p>
            <p className="mt-1 truncate text-amber-700">
              {formatDisplayTitle(transaction.description)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getRelativeDaysLabel(value: string | null) {
  if (!value) {
    return "Belum pernah cocok";
  }

  const checkedAt = new Date(value).getTime();
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - checkedAt) / (1000 * 60 * 60 * 24)),
  );

  if (diffDays === 0) {
    return "Cocok hari ini";
  }

  if (diffDays === 1) {
    return "Terakhir cocok kemarin";
  }

  return `Terakhir cocok ${diffDays} hari lalu`;
}

function BalanceCheckCard({ wallets }: { wallets: WalletBalanceView[] }) {
  const defaultWallet =
    wallets.find((wallet) => wallet.isDefault) || wallets[0] || null;
  const [walletId, setWalletId] = useState(defaultWallet?.id || "");
  const [realBalance, setRealBalance] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedWallet =
    wallets.find((wallet) => wallet.id === walletId) || defaultWallet;

  const submitCheckpoint = async (nextRealBalance: number | string) => {
    if (!selectedWallet) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/wallet-balance-checkpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          realBalance: nextRealBalance,
        }),
      });
      const result = (await response.json()) as {
        checkpoint?: {
          differenceAmount: number;
          status: "MATCHED" | "UNMATCHED";
        };
        error?: string;
      };

      if (!response.ok || !result.checkpoint) {
        setMessage(result.error || "Cek saldo gagal disimpan.");
        return;
      }

      const difference = result.checkpoint.differenceAmount;

      if (difference === 0) {
        setMessage(`Mantap, saldo ${selectedWallet.name} sudah cocok.`);
      } else if (difference < 0) {
        setMessage(
          `Saldo real lebih kecil ${formatRupiah(Math.abs(difference))}. Kemungkinan ada expense, transfer out, atau fee yang belum dicatat.`,
        );
      } else {
        setMessage(
          `Saldo real lebih besar ${formatRupiah(difference)}. Kemungkinan ada income, transfer in, cashback, atau refund yang belum dicatat.`,
        );
      }

      setRealBalance("");
    } catch {
      setMessage("Cek saldo gagal disimpan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedWallet) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm text-zinc-500">Belum ada wallet untuk dicek.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-950">
            Cek saldo wallet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Cocokkan saldo biar selisih tidak numpuk.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
            <select
              value={walletId}
              onChange={(event) => {
                setWalletId(event.target.value);
                setMessage(null);
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
            <input
              value={realBalance}
              onChange={(event) =>
                setRealBalance(normalizeAmountInput(event.target.value))
              }
              inputMode="numeric"
              placeholder="Saldo real"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
            <span>
              Saldo web:{" "}
              <strong className="text-zinc-950">
                <SensitiveAmount>
                  {formatRupiah(selectedWallet.currentBalance)}
                </SensitiveAmount>
              </strong>
            </span>
            <span>{getRelativeDaysLabel(selectedWallet.lastMatchedAt)}</span>
            <span>{selectedWallet.ownerName}</span>
          </div>
          {message ? (
            <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
              {message}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:w-56">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => submitCheckpoint(selectedWallet.currentBalance)}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Saldo Cocok
          </button>
          <button
            type="button"
            disabled={isSubmitting || parseIntegerAmount(realBalance) === null}
            onClick={() => submitCheckpoint(realBalance)}
            className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Simpan
          </button>
        </div>
      </div>
    </section>
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
      ? "w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2"
      : "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5";

  if (widget.type === "summary") {
    return (
      <section className={className}>
        <WidgetHeader
          title="Budget Period View"
          subtitle="Aman gak buat hidup bulan ini?"
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
        <BudgetProgress
          budget={data.budget}
          coverage={data.coverage}
          savingsBalance={data.savings.currentBalance}
        />
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

  if (widget.type === "debt_summary") {
    return (
      <section className={className}>
        <WidgetHeader title="Hutang Piutang" subtitle="Active debt position" />
        <DebtSummary debt={data.debt} />
      </section>
    );
  }

  return (
    <section className={className}>
      <WidgetHeader title="AI Insight" subtitle="Gemini-powered summary" />
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
    <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      </div>
      <span className="text-sm text-zinc-400">...</span>
    </div>
  );
}

function InfoHint({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-semibold text-zinc-500"
    >
      i
    </span>
  );
}

function BudgetPeriodMetric({
  label,
  value,
  detail,
  tone,
  href,
  sensitive = true,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "red" | "amber" | "zinc";
  href?: string;
  sensitive?: boolean;
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : tone === "red"
            ? "bg-red-50 text-red-700"
            : "bg-zinc-100 text-zinc-600";

  const card = (
    <article className="h-full rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-4">
      <div className="flex min-h-24 flex-col justify-between gap-3">
        <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
        <p className="text-lg font-bold tracking-normal text-zinc-950 sm:text-xl">
          {sensitive ? <SensitiveAmount>{value}</SensitiveAmount> : value}
        </p>
        <span
          className={`w-fit rounded-lg px-2 py-1 text-xs font-semibold ${toneClass}`}
        >
          {detail}
        </span>
      </div>
    </article>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`Open ${label}`}
        className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {card}
      </Link>
    );
  }

  return card;
}

function MonthlySnapshot({ data }: { data: DashboardData }) {
  const router = useRouter();
  const isBudgetPlanSafe = data.budget.budgetPlanStatus === "SAFE";
  const isCoverageSafe = data.coverage.cashCoverageStatus === "COVERED";
  const isMonthCovered = isBudgetPlanSafe && isCoverageSafe;
  const incomeTimingDate = data.budget.incomeReceivedBeforePeriodDate
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(data.budget.incomeReceivedBeforePeriodDate))
    : null;
  const hasCalendarTimingNote =
    data.summary.netCashflow < 0 &&
    data.budget.incomeReceivedBeforePeriod > 0;

  const budgetMetrics = [
    {
      label: "Dana Budget",
      value: formatRupiah(data.budget.readyToBudget),
      detail: data.budgetPeriodLabel,
      tone: "green" as const,
      href: "/budgets",
      sensitive: true,
    },
    {
      label: "Budget Dibuat",
      value: formatRupiah(data.budget.budgetSet),
      detail: isBudgetPlanSafe
        ? "Sesuai dana"
        : `${formatRupiah(data.budget.budgetPlanGap)} gap`,
      tone: isBudgetPlanSafe ? ("blue" as const) : ("red" as const),
      href: "/budgets",
      sensitive: true,
    },
    {
      label: "Budget Terpakai",
      value: formatRupiah(data.budget.spent),
      detail: `${data.budget.usedPercentage}% used`,
      tone:
        data.budget.usedPercentage >= 90
          ? ("red" as const)
          : data.budget.usedPercentage >= 70
            ? ("amber" as const)
            : ("green" as const),
      href: "/budgets",
      sensitive: true,
    },
    {
      label: "Uang Bebas",
      value: formatRupiah(data.coverage.displayFreeCash),
      detail: isCoverageSafe ? "Aman dipakai" : "Ditahan dulu",
      tone: isCoverageSafe ? ("green" as const) : ("red" as const),
      href: "/wallets",
      sensitive: true,
    },
    {
      label: "Cash Coverage",
      value: isCoverageSafe ? "Aman" : "Ada Gap",
      detail: isCoverageSafe
        ? "Covered"
        : formatRupiah(data.coverage.cashCoverageGap),
      tone: isCoverageSafe ? ("green" as const) : ("red" as const),
      href: undefined,
      sensitive: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Periode Budget
            </p>
            <h3 className="mt-1 text-2xl font-bold tracking-normal text-zinc-950 sm:text-3xl">
              {data.budgetPeriodLabel}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              {isMonthCovered
                ? "Bulan ini aman untuk hidup: budget plan sesuai dana, savings terpisah, dan sisa budget masih tertutup saldo operasional."
                : isBudgetPlanSafe
                  ? `Budget plan aman, tapi ada ${formatRupiah(data.coverage.cashCoverageGap)} sisa budget yang belum tertutup saldo operasional.`
                  : `Budget dibuat melebihi dana budget sebesar ${formatRupiah(data.budget.budgetPlanGap)}.`}
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${
              isMonthCovered
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isMonthCovered ? "Aman" : "Ada Gap"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {budgetMetrics.map((metric) => (
            <BudgetPeriodMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              tone={metric.tone}
              href={metric.href}
              sensitive={metric.sensitive}
            />
          ))}
        </div>

        {!isCoverageSafe ? (
          <FundingShortfallResolver
            budget={data.budget}
            savingsBalance={data.savings.currentBalance}
            onResolved={() => router.refresh()}
          />
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-950">
              Cashflow Kalender
              <InfoHint label="Cashflow kalender memakai tanggal transaksi. Budget period memakai alokasi bulan budget." />
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {hasCalendarTimingNote
                ? `Cashflow kalender ${data.budgetPeriodLabel} terlihat minus karena income budget periode ini sebesar ${formatRupiah(data.budget.incomeReceivedBeforePeriod)} sudah diterima${incomeTimingDate ? ` pada ${incomeTimingDate}` : " sebelum periode berjalan"}.`
                : "Cashflow kalender tetap dibaca sebagai insight kedua karena tanggal income bisa berbeda dari periode budget."}
            </p>
          </div>
          <p
            className={`text-xl font-bold tracking-normal ${
              data.summary.netCashflow < 0
                ? "text-red-700"
                : "text-emerald-700"
            }`}
          >
            <SensitiveAmount>
              {formatRupiah(data.summary.netCashflow)}
            </SensitiveAmount>
          </p>
        </div>

        <div className="mt-4 grid gap-3 text-xs text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
          <span className="rounded-lg bg-zinc-50 px-3 py-2">
            Income kalender
            <strong className="block text-sm text-emerald-700">
              <SensitiveAmount>
                {formatRupiah(data.summary.income)}
              </SensitiveAmount>
            </strong>
          </span>
          <span className="rounded-lg bg-zinc-50 px-3 py-2">
            Expense kalender
            <strong className="block text-sm text-red-700">
              <SensitiveAmount>
                {formatRupiah(data.summary.expense)}
              </SensitiveAmount>
            </strong>
          </span>
          <span className="rounded-lg bg-zinc-50 px-3 py-2">
            Transaksi
            <strong className="block text-sm text-zinc-950">
              {data.summary.transactionCount}
            </strong>
          </span>
          <span className="rounded-lg bg-zinc-50 px-3 py-2">
            Wallet aktif
            <strong className="block text-sm text-zinc-950">
              {data.wallets.length}
            </strong>
          </span>
        </div>
      </div>

      <div className="hidden">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                Rencana Budget
                <InfoHint label="Membandingkan budget yang dibuat dengan dana budget bulan ini. Tidak memakai saldo operasional." />
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isBudgetPlanSafe
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isBudgetPlanSafe ? "Aman" : "Overplanned"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-zinc-500">
              <span>
                Dana budget bulan ini{" "}
                <SensitiveAmount>
                  {formatRupiah(data.budget.readyToBudget)}
                </SensitiveAmount>
              </span>
              <span>
                Budget dibuat{" "}
                <SensitiveAmount>
                  {formatRupiah(data.budget.budgetSet)}
                </SensitiveAmount>
              </span>
              <span>
                Sisa dana budget{" "}
                <SensitiveAmount>
                  {formatRupiah(data.budget.readyToBudget - data.budget.budgetSet)}
                </SensitiveAmount>
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                Perlindungan Dana
                <InfoHint label="Mengecek apakah saldo operasional cukup menutup sisa budget aktif. Savings terpisah." />
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isCoverageSafe
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isCoverageSafe ? "Covered" : "Ada Gap"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-zinc-500">
              <span>
                Dana yang dilindungi{" "}
                <SensitiveAmount>
                  {formatRupiah(data.coverage.protectedMoney)}
                </SensitiveAmount>
              </span>
              <span>
                Saldo operasional{" "}
                <SensitiveAmount>
                  {formatRupiah(data.coverage.totalWalletBalance)}
                </SensitiveAmount>
              </span>
              <span>
                Gap{" "}
                <SensitiveAmount>
                  {formatRupiah(data.coverage.cashCoverageGap)}
                </SensitiveAmount>
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${
              isBudgetPlanSafe ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, data.budget.usedPercentage)}%` }}
          />
        </div>
        <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
          <span>
            <SensitiveAmount>
              {formatRupiah(data.summary.income)}
            </SensitiveAmount>{" "}
            income bulan ini
          </span>
          <span>
            <SensitiveAmount>
              {formatRupiah(data.summary.expense)}
            </SensitiveAmount>{" "}
            expense bulan ini
          </span>
          <span>
            <SensitiveAmount>
              {formatRupiah(data.summary.netCashflow)}
            </SensitiveAmount>{" "}
            net cashflow
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
          <span>
            <SensitiveAmount>
              {formatRupiah(data.savings.addedThisMonth)}
            </SensitiveAmount>{" "}
            added savings
          </span>
          <span>
            <SensitiveAmount>
              {formatRupiah(data.savings.usedThisMonth)}
            </SensitiveAmount>{" "}
            used savings
          </span>
          <span>
            <SensitiveAmount>
              {formatRupiah(data.savings.adjustmentThisMonth)}
            </SensitiveAmount>{" "}
            adjustments
          </span>
        </div>
      </div>

      <p className="hidden text-xs text-zinc-500">
        {data.summary.transactionCount} transaksi bulan ini •{" "}
        {data.wallets.length} wallet aktif
      </p>
    </div>
  );
}

function DebtSummary({ debt }: { debt: DashboardData["debt"] }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <MiniMetric
          label="Piutang"
          value={formatRupiah(debt.totalActiveReceivable)}
          tone="green"
        />
        <MiniMetric
          label="Hutang"
          value={formatRupiah(debt.totalActivePayable)}
          tone="red"
        />
        <MiniMetric
          label="Net"
          value={formatRupiah(debt.netDebtPosition)}
          tone={debt.netDebtPosition >= 0 ? "green" : "red"}
        />
      </div>

      {debt.upcomingDueDates.length === 0 ? (
        <EmptyState text="No active due dates." />
      ) : (
        <div className="space-y-2">
          {debt.upcomingDueDates.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-950">
                  {item.personName}
                </p>
                <p className="text-xs text-zinc-500">
                  {item.type === "RECEIVABLE" ? "Piutang" : "Hutang"} due{" "}
                  {item.dueDate
                    ? new Date(item.dueDate).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>
              <p className="shrink-0 font-bold text-zinc-950">
                <SensitiveAmount>
                  {formatRupiah(item.remainingAmount)}
                </SensitiveAmount>
              </p>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/debts"
        className="inline-flex w-full justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
      >
        Open Debt Module
      </Link>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p
        className={`mt-1.5 text-sm font-bold ${
          tone === "green" ? "text-emerald-700" : "text-red-700"
        }`}
      >
        <SensitiveAmount>{value}</SensitiveAmount>
      </p>
    </div>
  );
}

function FundingShortfallResolver({
  budget,
  savingsBalance,
  onResolved,
}: {
  budget: BudgetView;
  savingsBalance: number;
  onResolved: () => void;
}) {
  const reducibleItems = budget.items.filter((item) => item.remaining > 0);
  const firstEnvelope = reducibleItems[0];
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showCauses, setShowCauses] = useState(false);
  const [mode, setMode] = useState<"savings" | "envelope">("savings");
  const [amount, setAmount] = useState(() =>
    formatAmountInput(
      Math.max(
        0,
        Math.min(
          budget.fundingShortfall,
          savingsBalance > 0 ? savingsBalance : budget.fundingShortfall,
        ),
      ),
    ),
  );
  const [selectedBudgetId, setSelectedBudgetId] = useState(
    firstEnvelope?.id || "",
  );
  const [note, setNote] = useState("Cover cash coverage gap");
  const [date, setDate] = useState(todayInputValue());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parsedAmount = parseIntegerAmount(amount) || 0;
  const selectedEnvelope = reducibleItems.find(
    (item) => item.id === selectedBudgetId,
  );
  const shortfallCauses = getShortfallCauses(
    budget.items,
    budget.fundingShortfall,
  );

  if (isDismissed) {
    return null;
  }

  const submitResolve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError("Amount harus lebih besar dari 0.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        mode === "savings"
          ? await fetch("/api/savings/use", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                usageType: "RETURN_TO_AVAILABLE",
                amount,
                date,
                note,
              }),
            })
          : await fetch(`/api/settings/budgets/${selectedBudgetId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: selectedEnvelope
                  ? Math.max(
                      selectedEnvelope.spent,
                      selectedEnvelope.amount - parsedAmount,
                    )
                  : null,
                note,
              }),
            });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to resolve cash coverage gap.");
        return;
      }

      setIsOpen(false);
      onResolved();
    } catch {
      setError("Failed to resolve cash coverage gap. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="leading-5">
          <span className="font-semibold">
            Budget aktif melebihi saldo operasional sebesar{" "}
            <SensitiveAmount>
              {formatRupiah(budget.fundingShortfall)}
            </SensitiveAmount>
            .
          </span>{" "}
          Kurangi budget atau tambahkan income untuk bulan ini.
          <span className="ml-1">
            <InfoHint label="Selisih saat sisa budget aktif lebih besar dari saldo operasional setelah savings dipisahkan." />
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setShowCauses((current) => !current)}
            className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            Lihat penyebab
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(reducibleItems.length > 0 ? "envelope" : "savings");
              setIsOpen(true);
            }}
            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            Auto adjust
          </button>
        </div>
      </div>
      {showCauses ? (
        <div className="mt-3 rounded-md bg-white px-3 py-2 text-red-700 ring-1 ring-red-100">
          <p className="font-semibold">Penyebab terbesar:</p>
          {shortfallCauses.length > 0 ? (
            <div className="mt-2 space-y-1">
              {shortfallCauses.map((cause) => (
                <div
                  key={cause.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate">{cause.label}</span>
                  <span className="shrink-0 font-semibold">
                    kurang{" "}
                    <SensitiveAmount>{formatRupiah(cause.amount)}</SensitiveAmount>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-red-600">
              Belum ada envelope aktif yang bisa dikurangi.
            </p>
          )}
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/45 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-shortfall-title"
          onClick={() => setIsOpen(false)}
        >
          <form
            onSubmit={submitResolve}
            className="w-full max-w-lg rounded-2xl bg-white p-4 text-zinc-700 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h2
                  id="resolve-shortfall-title"
                  className="text-base font-semibold text-zinc-950"
                >
                  Resolve Perlindungan Dana
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Gap saat ini {formatRupiah(budget.fundingShortfall)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close resolver"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  X
                </span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("savings")}
                className={
                  mode === "savings"
                    ? "rounded-lg border border-blue-300 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700"
                    : "rounded-lg border border-zinc-200 px-2 py-2 text-xs font-medium text-zinc-600"
                }
              >
                Use savings
              </button>
              <button
                type="button"
                onClick={() => setMode("envelope")}
                disabled={reducibleItems.length === 0}
                className={
                  mode === "envelope"
                    ? "rounded-lg border border-blue-300 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50"
                    : "rounded-lg border border-zinc-200 px-2 py-2 text-xs font-medium text-zinc-600 disabled:opacity-50"
                }
              >
                Reduce envelope
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDismissed(true);
                  setIsOpen(false);
                }}
                className="rounded-lg border border-zinc-200 px-2 py-2 text-xs font-medium text-zinc-600"
              >
                Keep warning
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-zinc-700">
                Amount
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(normalizeAmountInput(event.target.value))
                  }
                  inputMode="numeric"
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </label>

              {mode === "savings" ? (
                <>
                  <label className="block text-xs font-medium text-zinc-700">
                    Date
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-700">
                    Note
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      maxLength={120}
                    />
                  </label>
                  <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                  Savings reserve akan dikurangi dan uangnya dianggap kembali
                    tersedia di saldo operasional.
                  </p>
                </>
              ) : (
                <>
                  <label className="block text-xs font-medium text-zinc-700">
                    Envelope
                    <select
                      value={selectedBudgetId}
                      onChange={(event) =>
                        setSelectedBudgetId(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    >
                      {reducibleItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.categoryName} - remaining{" "}
                          {formatRupiah(item.remaining)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-zinc-700">
                    Note
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      maxLength={120}
                    />
                  </label>
                  <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                    Envelope tidak bisa dikurangi di bawah amount yang sudah
                    terpakai.
                  </p>
                </>
              )}

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  parsedAmount <= 0 ||
                  (mode === "envelope" && !selectedBudgetId)
                }
                className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Resolving..." : "Apply"}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
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
              <SensitiveAmount>{formatRupiah(category.amount)}</SensitiveAmount>
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
          className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 sm:py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {wallet.name}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {wallet.ownerName} - {wallet.typeLabel}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold text-zinc-950">
            <SensitiveAmount>
              {formatRupiah(wallet.currentBalance)}
            </SensitiveAmount>
          </p>
        </div>
      ))}
    </div>
  );
}

function BudgetProgressMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-zinc-200">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-950">
        <SensitiveAmount>{value}</SensitiveAmount>
      </p>
    </div>
  );
}

function BudgetProgress({
  budget,
  coverage,
  savingsBalance,
}: {
  budget: BudgetView;
  coverage: CoverageView;
  savingsBalance: number;
}) {
  const router = useRouter();
  const usage = budget.usedPercentage;
  const statusTone =
    budget.budgetPlanStatus !== "SAFE"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const coverageTone =
    coverage.cashCoverageStatus === "GAP"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const planLabel =
    budget.budgetPlanStatus === "SAFE" ? "Rencana aman" : "Overplanned";

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
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              {planLabel}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatRupiah(budget.spent)} used from{" "}
              {formatRupiah(budget.budgetSet)} budget.
            </p>
          </div>
          <div
            className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${statusTone}`}
          >
            {usage}%
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
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm lg:grid-cols-4">
        <BudgetProgressMetric
          label="Dana Budget"
          value={formatRupiah(budget.readyToBudget)}
        />
        <BudgetProgressMetric
          label="Budget Dibuat"
          value={formatRupiah(budget.budgetSet)}
        />
        <BudgetProgressMetric
          label="Sisa Dana"
          value={formatRupiah(budget.readyToBudget - budget.budgetSet)}
        />
        <BudgetProgressMetric
          label="Sisa Aktif"
          value={formatRupiah(budget.remainingActiveBudget)}
        />
      </div>

      <div className={`rounded-xl border px-3 py-3 text-xs ${coverageTone}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">
            {coverage.cashCoverageStatus === "GAP"
              ? "Sisa budget belum tertutup"
              : "Budget terlindungi"}
          </p>
          <p className="font-semibold">
            <SensitiveAmount>
              {coverage.cashCoverageStatus === "GAP"
                ? formatRupiah(coverage.cashCoverageGap)
                : formatRupiah(coverage.displayFreeCash)}
            </SensitiveAmount>
          </p>
        </div>
        <p className="mt-2 leading-5">
          {coverage.cashCoverageStatus === "GAP"
            ? "Sebagian sisa budget aktif belum tertopang saldo operasional."
            : "Sisa budget aktif masih tertutup saldo operasional. Savings tetap terpisah."}
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">
            Detail coverage
          </summary>
          <div className="mt-2 grid gap-2 text-zinc-600 sm:grid-cols-4">
            <span>Saldo operasional {formatRupiah(coverage.totalWalletBalance)}</span>
            <span>Savings terpisah {formatRupiah(coverage.reservedSavings)}</span>
            <span>Sisa budget {formatRupiah(coverage.protectedMoney)}</span>
            <span>Unbudgeted {formatRupiah(budget.unbudgetedSpent)}</span>
          </div>
        </details>
        {coverage.cashCoverageGap > 0 ? (
          <FundingShortfallResolver
            budget={budget}
            savingsBalance={savingsBalance}
            onResolved={() => router.refresh()}
          />
        ) : null}
      </div>

      {budget.adjustments.length > 0 ? (
        <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-zinc-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Envelope History
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Riwayat reduce envelope bulan ini.
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-zinc-400">
              {budget.adjustments.length} recent
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {budget.adjustments.map((adjustment) => (
              <div
                key={adjustment.id}
                className="rounded-lg bg-zinc-50 px-3 py-2 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-800">
                      {adjustment.categoryName}
                    </p>
                    <p className="mt-1 text-zinc-500">
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        month: "short",
                      }).format(new Date(adjustment.createdAt))}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-red-700">
                    -
                    <SensitiveAmount>
                      {formatRupiah(adjustment.amount)}
                    </SensitiveAmount>
                  </p>
                </div>
                <p className="mt-2 text-zinc-500">
                  <SensitiveAmount>
                    {formatRupiah(adjustment.previousAmount)}
                  </SensitiveAmount>{" "}
                  to{" "}
                  <SensitiveAmount>
                    {formatRupiah(adjustment.newAmount)}
                  </SensitiveAmount>
                </p>
                {adjustment.note ? (
                  <p className="mt-1 text-zinc-500">{adjustment.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-950">Envelope list</p>
          <span className="text-xs text-zinc-500">
            {budget.items.length} budget(s)
          </span>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
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
                    <SensitiveAmount>
                      {formatRupiah(item.amount)}
                    </SensitiveAmount>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    <SensitiveAmount>
                      {item.remaining >= 0
                        ? formatRupiah(item.remaining)
                        : formatRupiah(Math.abs(item.remaining))}
                    </SensitiveAmount>{" "}
                    {item.remaining >= 0 ? "left" : "over"}
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
                <span>
                  <SensitiveAmount>{formatRupiah(item.spent)}</SensitiveAmount>{" "}
                  spent
                </span>
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
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-zinc-950">
                {formatDisplayTitle(transaction.description)}
              </p>
              {transaction.detailStatus ===
              TransactionDetailStatus.PENDING_DETAIL ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Pending
                </span>
              ) : null}
            </div>
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
            {transaction.type === TransactionType.EXPENSE ? (
              <>
                -
                <SensitiveAmount>
                  {formatRupiah(transaction.amount)}
                </SensitiveAmount>
              </>
            ) : (
              <SensitiveAmount>
                {formatRupiah(transaction.amount)}
              </SensitiveAmount>
            )}
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
    <div className={`rounded-2xl border p-3 sm:p-4 ${toneClass}`}>
      {isLoading ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Generating with Gemini
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
