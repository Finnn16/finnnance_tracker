"use client";

import { useMemo, useState } from "react";

import { SensitiveAmount } from "@/components/PrivacyMode";
import {
  dashboardSimpleCardConfigs,
  dashboardSimpleCardGroups,
  type DashboardSimpleCardConfig,
  type DashboardSimpleCardGroup,
} from "@/lib/dashboard-simple-card-library";
import type { DashboardData } from "@/lib/dashboard";
import { TransactionType } from "@/lib/prisma-enums";
import { formatRupiah } from "@/lib/money";

type SimpleCardTone = "neutral" | "green" | "blue" | "amber" | "red";

type SimpleCardView = {
  id: string;
  title: string;
  group: DashboardSimpleCardGroup;
  value: string;
  legend: string;
  badge?: string;
  tone: SimpleCardTone;
  available: boolean;
};

const storageKey = "dashboard_simple_cards_v1";

function getDefaultVisibleIds() {
  return dashboardSimpleCardConfigs
    .filter((card) => card.defaultVisible && card.available)
    .map((card) => card.id);
}

function getInitialVisibleIds() {
  if (typeof window === "undefined") {
    return getDefaultVisibleIds();
  }

  const savedValue = window.localStorage.getItem(storageKey);

  if (!savedValue) {
    return getDefaultVisibleIds();
  }

  try {
    const parsed = JSON.parse(savedValue) as string[];
    const availableIds = new Set(
      dashboardSimpleCardConfigs
        .filter((card) => card.available)
        .map((card) => card.id),
    );

    return parsed.filter((id) => availableIds.has(id));
  } catch {
    window.localStorage.removeItem(storageKey);
    return getDefaultVisibleIds();
  }
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value)}%`;
}

function getDaysLeftInMonth() {
  const now = new Date();
  const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return Math.max(lastDate.getDate() - now.getDate() + 1, 1);
}

function getElapsedDaysInMonth() {
  return Math.max(new Date().getDate(), 1);
}

function isSensitiveValue(value: string) {
  return value.includes("Rp") || value.includes("+") || value.includes("-");
}

function joinNames(names: string[]) {
  if (names.length === 0) {
    return "-";
  }

  return names.slice(0, 3).join(", ");
}

function findRecentTransaction(
  data: DashboardData,
  type: TransactionType,
) {
  return data.recentTransactions.find((transaction) => transaction.type === type);
}

function buildCard(
  config: DashboardSimpleCardConfig,
  data: DashboardData,
): SimpleCardView {
  const largestWallet = [...data.wallets].sort(
    (left, right) => right.currentBalance - left.currentBalance,
  )[0];
  const lowestWallet = [...data.wallets].sort(
    (left, right) => left.currentBalance - right.currentBalance,
  )[0];
  const latestIncome = findRecentTransaction(data, TransactionType.INCOME);
  const latestExpense = findRecentTransaction(data, TransactionType.EXPENSE);
  const largestBudget = [...data.budget.items].sort(
    (left, right) => right.amount - left.amount,
  )[0];
  const mostUsedBudget = [...data.budget.items].sort(
    (left, right) => right.progress - left.progress,
  )[0];
  const almostEmptyCategories = data.budget.items
    .filter((item) => item.progress >= 80 && item.progress <= 100)
    .map((item) => item.categoryName);
  const overbudgetCategories = data.budget.items
    .filter((item) => item.remaining < 0)
    .map((item) => item.categoryName);
  const paidEarly = data.budget.items.reduce(
    (total, item) => total + ("paidEarlyAmount" in item ? item.paidEarlyAmount : 0),
    0,
  );
  const netSavings =
    data.savings.addedThisMonth - data.savings.usedThisMonth;
  const savingsRatio =
    data.summary.income > 0
      ? (data.savings.addedThisMonth / data.summary.income) * 100
      : 0;
  const protectedRatio =
    data.coverage.totalWalletBalance > 0
      ? (data.coverage.remainingActiveBudget /
          data.coverage.totalWalletBalance) *
        100
      : 0;
  const safeToLend = Math.max(data.coverage.displayFreeCash, 0);
  const daysLeft = getDaysLeftInMonth();
  const averageDailyExpense = data.summary.expense / getElapsedDaysInMonth();
  const dailySafeSpend = safeToLend / daysLeft;
  const topCategory = data.topCategories[0];

  const base = {
    id: config.id,
    title: config.title,
    group: config.group,
    legend: config.description,
    available: config.available,
  };

  if (!config.available) {
    return {
      ...base,
      value: "Soon",
      badge: "Coming soon",
      tone: "neutral",
    };
  }

  switch (config.id) {
    case "free_cash":
      return {
        ...base,
        value: formatRupiah(data.coverage.displayFreeCash),
        badge:
          data.coverage.cashCoverageStatus === "COVERED"
            ? "Aman"
            : "Perlu perhatian",
        tone:
          data.coverage.cashCoverageStatus === "COVERED" ? "green" : "red",
      };
    case "spendable_balance":
      return {
        ...base,
        value: formatRupiah(data.coverage.totalWalletBalance),
        badge: "Savings terpisah",
        tone: "blue",
      };
    case "largest_wallet":
      return {
        ...base,
        value: largestWallet
          ? `${largestWallet.name} - ${formatRupiah(largestWallet.currentBalance)}`
          : "-",
        badge: "Wallet",
        tone: "blue",
      };
    case "lowest_wallet":
      return {
        ...base,
        value: lowestWallet
          ? `${lowestWallet.name} - ${formatRupiah(lowestWallet.currentBalance)}`
          : "-",
        badge: "Wallet",
        tone: "blue",
      };
    case "calendar_income":
      return {
        ...base,
        value: formatRupiah(data.summary.income),
        badge: data.budgetPeriodLabel,
        tone: "green",
      };
    case "calendar_expense":
      return {
        ...base,
        value: formatRupiah(data.summary.expense),
        badge: data.budgetPeriodLabel,
        tone: "red",
      };
    case "calendar_net_cashflow":
      return {
        ...base,
        value: formatRupiah(data.summary.netCashflow),
        badge: data.summary.netCashflow >= 0 ? "Surplus" : "Minus",
        tone: data.summary.netCashflow >= 0 ? "green" : "red",
      };
    case "calendar_cashflow_status":
      return {
        ...base,
        value:
          data.summary.netCashflow >= 0
            ? `Surplus ${formatRupiah(data.summary.netCashflow)}`
            : `Minus ${formatRupiah(Math.abs(data.summary.netCashflow))}`,
        badge: "Kalender",
        tone: data.summary.netCashflow >= 0 ? "green" : "red",
      };
    case "latest_income":
      return {
        ...base,
        value: latestIncome
          ? `${latestIncome.description} - ${formatRupiah(latestIncome.amount)}`
          : "-",
        badge: "Income",
        tone: "green",
      };
    case "latest_expense":
      return {
        ...base,
        value: latestExpense
          ? `${latestExpense.description} - ${formatRupiah(latestExpense.amount)}`
          : "-",
        badge: "Expense",
        tone: "red",
      };
    case "budget_income":
      return {
        ...base,
        value: formatRupiah(data.budget.readyToBudget),
        badge: data.budgetPeriodLabel,
        tone: "green",
      };
    case "budget_total":
      return {
        ...base,
        value: formatRupiah(data.budget.budgetSet),
        badge: data.budgetPeriodLabel,
        tone: data.budget.budgetPlanStatus === "SAFE" ? "blue" : "red",
      };
    case "budget_spent":
      return {
        ...base,
        value: formatRupiah(data.budget.spent),
        badge: `${data.budget.usedPercentage}% used`,
        tone:
          data.budget.usedPercentage >= 90
            ? "red"
            : data.budget.usedPercentage >= 70
              ? "amber"
              : "green",
      };
    case "budget_remaining":
      return {
        ...base,
        value: formatRupiah(data.budget.remaining),
        badge: "Sisa",
        tone: data.budget.remaining >= 0 ? "green" : "red",
      };
    case "available_budget_funds":
      return {
        ...base,
        value: formatRupiah(data.budget.readyToBudget - data.budget.budgetSet),
        badge: "Belum dialokasi",
        tone:
          data.budget.readyToBudget - data.budget.budgetSet >= 0
            ? "green"
            : "red",
      };
    case "budget_usage":
      return {
        ...base,
        value: `${data.budget.usedPercentage}%`,
        badge: formatRupiah(data.budget.spent),
        tone:
          data.budget.usedPercentage >= 90
            ? "red"
            : data.budget.usedPercentage >= 70
              ? "amber"
              : "green",
      };
    case "budget_plan_status":
      return {
        ...base,
        value:
          data.budget.budgetPlanStatus === "SAFE" ? "Aman" : "Overplanned",
        badge:
          data.budget.budgetPlanGap > 0
            ? formatRupiah(data.budget.budgetPlanGap)
            : "Sesuai dana",
        tone: data.budget.budgetPlanStatus === "SAFE" ? "green" : "red",
      };
    case "overplanned_amount":
      return {
        ...base,
        value: formatRupiah(data.budget.budgetPlanGap),
        badge: data.budget.budgetPlanGap > 0 ? "Gap" : "Aman",
        tone: data.budget.budgetPlanGap > 0 ? "red" : "green",
      };
    case "largest_budget_category":
      return {
        ...base,
        value: largestBudget
          ? `${largestBudget.categoryName} - ${formatRupiah(largestBudget.amount)}`
          : "-",
        badge: "Budget",
        tone: "blue",
      };
    case "most_used_budget_category":
      return {
        ...base,
        value: mostUsedBudget
          ? `${mostUsedBudget.categoryName} - ${mostUsedBudget.progress}%`
          : "-",
        badge: "Usage",
        tone:
          mostUsedBudget && mostUsedBudget.progress >= 90
            ? "red"
            : "amber",
      };
    case "almost_empty_categories":
      return {
        ...base,
        value: joinNames(almostEmptyCategories),
        badge: `${almostEmptyCategories.length} kategori`,
        tone: almostEmptyCategories.length > 0 ? "amber" : "green",
      };
    case "overbudget_categories":
      return {
        ...base,
        value: joinNames(overbudgetCategories),
        badge: `${overbudgetCategories.length} kategori`,
        tone: overbudgetCategories.length > 0 ? "red" : "green",
      };
    case "paid_early":
      return {
        ...base,
        value: formatRupiah(paidEarly),
        badge: data.budgetPeriodLabel,
        tone: paidEarly > 0 ? "blue" : "neutral",
      };
    case "locked_savings":
      return {
        ...base,
        value: formatRupiah(data.savings.currentBalance),
        badge: "Terkunci",
        tone: "blue",
      };
    case "savings_added":
      return {
        ...base,
        value: formatRupiah(data.savings.addedThisMonth),
        badge: "Bulan ini",
        tone: "green",
      };
    case "savings_used":
      return {
        ...base,
        value: formatRupiah(data.savings.usedThisMonth),
        badge: "Bulan ini",
        tone: data.savings.usedThisMonth > 0 ? "amber" : "green",
      };
    case "net_savings_movement":
      return {
        ...base,
        value: `${netSavings >= 0 ? "+" : "-"}${formatRupiah(Math.abs(netSavings))}`,
        badge: "Net",
        tone: netSavings >= 0 ? "green" : "red",
      };
    case "savings_ratio":
      return {
        ...base,
        value: formatPercent(savingsRatio),
        badge: "Income",
        tone: savingsRatio > 0 ? "green" : "neutral",
      };
    case "savings_status":
      return {
        ...base,
        value:
          data.savings.usedThisMonth > data.savings.addedThisMonth
            ? "Terpakai"
            : data.savings.addedThisMonth > 0
              ? "Bertambah"
              : "Aman",
        badge: "Savings",
        tone:
          data.savings.usedThisMonth > data.savings.addedThisMonth
            ? "amber"
            : "green",
      };
    case "protected_money":
      return {
        ...base,
        value: formatRupiah(data.coverage.remainingActiveBudget),
        badge: "Sisa budget",
        tone: "blue",
      };
    case "cash_coverage_gap":
      return {
        ...base,
        value: formatRupiah(data.coverage.cashCoverageGap),
        badge:
          data.coverage.cashCoverageGap > 0 ? "Perlu perhatian" : "Covered",
        tone: data.coverage.cashCoverageGap > 0 ? "red" : "green",
      };
    case "cash_coverage_status":
      return {
        ...base,
        value:
          data.coverage.cashCoverageStatus === "COVERED"
            ? "Covered"
            : "Ada Gap",
        badge:
          data.coverage.cashCoverageGap > 0
            ? formatRupiah(data.coverage.cashCoverageGap)
            : "Aman",
        tone:
          data.coverage.cashCoverageStatus === "COVERED" ? "green" : "red",
      };
    case "remaining_active_budget":
      return {
        ...base,
        value: formatRupiah(data.coverage.remainingActiveBudget),
        badge: "Aktif",
        tone: "blue",
      };
    case "protected_money_ratio":
      return {
        ...base,
        value: formatPercent(protectedRatio),
        badge: protectedRatio > 100 ? "Ada gap" : "Covered",
        tone: protectedRatio > 100 ? "red" : "green",
      };
    case "unbudgeted_expense":
      return {
        ...base,
        value: formatRupiah(data.budget.unbudgetedSpent),
        badge: "Unbudgeted",
        tone: data.budget.unbudgetedSpent > 0 ? "amber" : "green",
      };
    case "unbudgeted_impact":
      return {
        ...base,
        value: formatRupiah(
          Math.min(data.budget.unbudgetedSpent, data.coverage.cashCoverageGap),
        ),
        badge: "Impact",
        tone: data.budget.unbudgetedSpent > 0 ? "amber" : "green",
      };
    case "unbudgeted_status":
      return {
        ...base,
        value:
          data.budget.unbudgetedSpent >= 500000
            ? "Tinggi"
            : data.budget.unbudgetedSpent > 0
              ? "Perlu Perhatian"
              : "Aman",
        badge: formatRupiah(data.budget.unbudgetedSpent),
        tone:
          data.budget.unbudgetedSpent >= 500000
            ? "red"
            : data.budget.unbudgetedSpent > 0
              ? "amber"
              : "green",
      };
    case "active_receivable":
      return {
        ...base,
        value: formatRupiah(data.debt.totalActiveReceivable),
        badge: "Piutang",
        tone: data.debt.totalActiveReceivable > 0 ? "green" : "neutral",
      };
    case "active_payable":
      return {
        ...base,
        value: formatRupiah(data.debt.totalActivePayable),
        badge: "Hutang",
        tone: data.debt.totalActivePayable > 0 ? "red" : "green",
      };
    case "net_debt_position":
      return {
        ...base,
        value: formatRupiah(data.debt.netDebtPosition),
        badge: data.debt.netDebtPosition >= 0 ? "Net plus" : "Net minus",
        tone: data.debt.netDebtPosition >= 0 ? "green" : "red",
      };
    case "debt_status":
      return {
        ...base,
        value:
          data.debt.totalActivePayable > data.debt.totalActiveReceivable
            ? "Ada Hutang"
            : data.debt.totalActiveReceivable > 0
              ? "Ada Piutang"
              : "Aman",
        badge: `${data.debt.activeCount} aktif`,
        tone:
          data.debt.totalActivePayable > data.debt.totalActiveReceivable
            ? "red"
            : data.debt.totalActiveReceivable > 0
              ? "blue"
              : "green",
      };
    case "safe_to_lend":
    case "spending_room":
      return {
        ...base,
        value: formatRupiah(safeToLend),
        badge: "Estimasi",
        tone: safeToLend > 0 ? "green" : "red",
      };
    case "top_expense_category":
      return {
        ...base,
        value: topCategory
          ? `${topCategory.name} - ${formatRupiah(topCategory.amount)}`
          : "-",
        badge: topCategory ? `${topCategory.percentage}%` : "Expense",
        tone: "amber",
      };
    case "average_daily_expense":
      return {
        ...base,
        value: formatRupiah(averageDailyExpense),
        badge: "Per hari",
        tone: "blue",
      };
    case "daily_safe_spend":
      return {
        ...base,
        value: formatRupiah(dailySafeSpend),
        badge: `${daysLeft} hari`,
        tone: dailySafeSpend > 0 ? "green" : "red",
      };
    case "days_left_budget_period":
      return {
        ...base,
        value: `${daysLeft} hari`,
        badge: data.budgetPeriodLabel,
        tone: "blue",
      };
    case "finbot_summary":
      return {
        ...base,
        value: data.aiInsight.title,
        legend: data.aiInsight.message,
        badge: "FinBot",
        tone:
          data.aiInsight.tone === "warning"
            ? "red"
            : data.aiInsight.tone === "positive"
              ? "green"
              : "blue",
      };
    case "finbot_warning":
      return {
        ...base,
        value:
          data.coverage.cashCoverageGap > 0
            ? `Gap ${formatRupiah(data.coverage.cashCoverageGap)}`
            : data.budget.unbudgetedSpent > 0
              ? `Unbudgeted ${formatRupiah(data.budget.unbudgetedSpent)}`
              : "Tidak ada warning utama",
        badge: "Warning",
        tone:
          data.coverage.cashCoverageGap > 0 ||
          data.budget.unbudgetedSpent > 0
            ? "amber"
            : "green",
      };
    case "finbot_suggestion":
      return {
        ...base,
        value:
          data.coverage.cashCoverageGap > 0
            ? "Tahan spending fleksibel dulu"
            : data.budget.usedPercentage >= 90
              ? "Cek envelope yang hampir habis"
              : "Lanjutkan tracking rutin",
        badge: "Suggestion",
        tone:
          data.coverage.cashCoverageGap > 0 ||
          data.budget.usedPercentage >= 90
            ? "amber"
            : "green",
      };
    case "insight_of_month":
      return {
        ...base,
        value: topCategory
          ? `${topCategory.name} dominan`
          : data.aiInsight.title,
        legend: topCategory
          ? `${topCategory.percentage}% expense bulan ini terkonsentrasi di ${topCategory.name}.`
          : data.aiInsight.message,
        badge: "Insight",
        tone: "blue",
      };
    default:
      return {
        ...base,
        value: "Soon",
        badge: "Coming soon",
        tone: "neutral",
      };
  }
}

function getToneClass(tone: SimpleCardTone) {
  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "blue") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (tone === "red") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function SimpleCard({ card }: { card: SimpleCardView }) {
  const sensitive = card.available && isSensitiveValue(card.value);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold text-zinc-950">
          {card.title}
        </p>
        {card.badge ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getToneClass(card.tone)}`}
          >
            {card.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 min-h-7 break-words text-xl font-bold tracking-normal text-zinc-950">
        {sensitive ? <SensitiveAmount>{card.value}</SensitiveAmount> : card.value}
      </p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
        {card.legend}
      </p>
    </article>
  );
}

export function DashboardSimpleCards({ data }: { data: DashboardData }) {
  const [visibleIds, setVisibleIds] = useState(getInitialVisibleIds);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<DashboardSimpleCardGroup>(
    "Wallet & Saldo",
  );

  const cards = useMemo(
    () => dashboardSimpleCardConfigs.map((config) => buildCard(config, data)),
    [data],
  );
  const visibleCards = cards.filter((card) => visibleIds.includes(card.id));
  const selectedCount = visibleIds.length;

  const updateVisibleIds = (nextIds: string[]) => {
    setVisibleIds(nextIds);
    window.localStorage.setItem(storageKey, JSON.stringify(nextIds));
  };

  const toggleCard = (config: DashboardSimpleCardConfig) => {
    if (!config.available) {
      return;
    }

    const nextIds = visibleIds.includes(config.id)
      ? visibleIds.filter((id) => id !== config.id)
      : [...visibleIds, config.id];

    updateVisibleIds(nextIds);
  };

  const resetDefault = () => {
    updateVisibleIds(getDefaultVisibleIds());
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">
            Custom Simple Cards
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pilih data ringan yang ingin ditampilkan di dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="w-fit rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          Manage Cards
        </button>
      </div>

      {visibleCards.length === 0 ? (
        <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          Belum ada card dipilih.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCards.map((card) => (
            <SimpleCard key={card.id} card={card} />
          ))}
        </div>
      )}

      {isPickerOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-zinc-950/30 px-3 py-3 sm:items-center sm:justify-center">
          <section className="max-h-[90vh] w-full overflow-hidden rounded-2xl bg-white shadow-xl sm:max-w-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-4 py-4 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-zinc-950">
                  Customize Simple Cards
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedCount} card aktif. Card berlabel Soon belum punya data
                  backend.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700"
              >
                Close
              </button>
            </div>

            <div className="grid max-h-[calc(90vh-88px)] overflow-hidden sm:grid-cols-[220px_minmax(0,1fr)]">
              <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:border-b-0 sm:border-r sm:px-3">
                <div className="flex gap-2 sm:block sm:space-y-1">
                  {dashboardSimpleCardGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setActiveGroup(group)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition sm:w-full sm:text-left ${
                        activeGroup === group
                          ? "bg-white text-blue-700 shadow-sm ring-1 ring-zinc-200"
                          : "text-zinc-600 hover:bg-white"
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-auto px-4 py-4 sm:px-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-950">
                    {activeGroup}
                  </p>
                  <button
                    type="button"
                    onClick={resetDefault}
                    className="text-sm font-medium text-blue-700"
                  >
                    Reset default
                  </button>
                </div>

                <div className="space-y-2">
                  {dashboardSimpleCardConfigs
                    .filter((config) => config.group === activeGroup)
                    .map((config) => {
                      const checked = visibleIds.includes(config.id);

                      return (
                        <label
                          key={config.id}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-sm ${
                            config.available
                              ? "border-zinc-200"
                              : "border-zinc-100 bg-zinc-50 text-zinc-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!config.available}
                            onChange={() => toggleCard(config)}
                            className="mt-1 h-4 w-4 rounded border-zinc-300"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 font-semibold text-zinc-900">
                              {config.title}
                              {!config.available ? (
                                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] text-zinc-500">
                                  Soon
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-zinc-500">
                              {config.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
