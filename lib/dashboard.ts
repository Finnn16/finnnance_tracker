import {
  DebtStatus,
  DebtType,
  TransactionDetailStatus,
  TransactionType,
  WalletType,
} from "@/lib/prisma-enums";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  BUDGET_TIME_ZONE,
  budgetMonthRange,
  calculateBudgetPeriodSummary,
  monthInputValue,
  normalizeMonthStart,
} from "@/lib/budgets";
import { prisma } from "@/lib/prisma";
import { calculateSavingsSummary } from "@/lib/savings";
import { getWalletTypeLabel } from "@/lib/wallets";

function startOfMonth(date: Date) {
  return normalizeMonthStart(date)!;
}

function startOfNextMonth(date: Date) {
  return budgetMonthRange(date)!.lt;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameMonthStart(left: Date | null | undefined, right: Date) {
  if (!left) {
    return false;
  }

  return monthInputValue(left) === monthInputValue(right);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: BUDGET_TIME_ZONE,
  }).format(date);
}

function formatMonthRange(start: Date, end: Date) {
  const endDate = new Date(end.getTime() - 1);

  const monthName = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: BUDGET_TIME_ZONE,
  }).format(start);

  return `${formatShortDate(start)} - ${formatShortDate(endDate)} (${monthName})`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: BUDGET_TIME_ZONE,
  }).format(date);
}

function parseMonthKey(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value);

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

  return { year, monthIndex: month - 1 };
}

type DashboardWalletRow = {
  id: string;
  name: string;
  type: WalletType;
  currentBalance: number;
  isDefault: boolean;
  lastBalanceCheckedAt: Date | null;
  lastMatchedAt: Date | null;
  user: {
    name: string;
  };
};

type DashboardBudgetRow = {
  id: string;
  amount: number;
  budgetCategoryId: string | null;
  user: {
    name: string;
  };
  budgetCategory?: {
    id: string;
    name: string;
  } | null;
};

type BudgetPlanStatus = "SAFE" | "OVERPLANNED";
type CashCoverageStatus = "COVERED" | "GAP";
type BudgetItemStatus = "SAFE" | "WARNING" | "DANGER" | "OVERBUDGET";

type DashboardBudgetItem = {
  id: string;
  userName: string;
  categoryName: string;
  amount: number;
  spent: number;
  paidEarlyAmount: number;
  remaining: number;
  progress: number;
  status: BudgetItemStatus;
};

type DashboardBudgetAdjustment = {
  id: string;
  budgetCategoryName: string;
  previousAmount: number;
  newAmount: number;
  amount: number;
  note: string | null;
  createdAt: Date;
};

type DashboardTransactionRow = {
  id: string;
  type: TransactionType;
  amount: number;
  transactionDate: Date;
  budgetMonth: Date | null;
  isPrepaid: boolean;
  detailStatus: TransactionDetailStatus;
  description: string;
  category?: {
    name: string;
  } | null;
  budgetCategory?: {
    id?: string;
    name: string;
  } | null;
  budgetCategoryId?: string | null;
  user: {
    name: string;
  };
  wallet: {
    name: string;
  };
  transferToWallet?: {
    name: string;
  } | null;
};

type DashboardPendingTransactionRow = DashboardTransactionRow & {
  wallet: {
    name: string;
  };
};

type BudgetTransactionRow = {
  type: TransactionType;
  amount: number;
  transactionDate: Date;
  budgetMonth: Date | null;
  budgetCategoryId: string | null;
  budgetCategory: {
    id: string;
    name: string;
  } | null;
};

type BudgetIncomeRow = {
  id: string;
  amount: number;
  budgetableAmount: number;
  transactionDate: Date;
};

type SavingsLedgerRow = {
  id: string;
  type: "ADD" | "WITHDRAW" | "ADJUSTMENT";
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
  sourceTransactionId: string | null;
  userId: string;
  user: {
    name: string;
    email: string;
  };
};

type DashboardDebtRow = {
  id: string;
  type: DebtType;
  amount: number;
  status: DebtStatus;
  dueDate: Date | null;
  personName: string;
  payments: {
    amount: number;
  }[];
};

export async function getDashboardData(
  selectedMonth?: string,
  selectedUserId?: string | null,
) {
  const now = new Date();
  const parsedMonth = parseMonthKey(selectedMonth);
  const monthStart = parsedMonth
    ? normalizeMonthStart(
        `${parsedMonth.year}-${String(parsedMonth.monthIndex + 1).padStart(2, "0")}`,
      )!
    : startOfMonth(now);
  const nextMonthStart = startOfNextMonth(monthStart);
  const chartStart = startOfDay(new Date(now));
  chartStart.setDate(chartStart.getDate() - 6);
  const activityStart = chartStart < monthStart ? chartStart : monthStart;
  const userScope = selectedUserId ? { userId: selectedUserId } : {};

  const [
    wallets,
    activityTransactions,
    recent,
    budgets,
    budgetTransactions,
    budgetIncomeTransactions,
    budgetableIncome,
    savingsLedgers,
    budgetAdjustments,
    debts,
    pendingTransactions,
    pendingCount,
  ] = (await Promise.all([
    prisma.wallet.findMany({
      where: userScope,
      include: { user: { select: { name: true } } },
      orderBy: [
        { user: { name: "asc" } },
        { isDefault: "desc" },
        { name: "asc" },
      ],
    }),
    prisma.transaction.findMany({
      where: {
        ...userScope,
        transactionDate: {
          gte: activityStart,
          lt: nextMonthStart,
        },
      },
      include: {
        user: { select: { name: true } },
        wallet: { select: { name: true } },
        transferToWallet: { select: { name: true } },
        category: { select: { name: true } },
        budgetCategory: { select: { id: true, name: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        ...userScope,
        transactionDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      include: {
        user: { select: { name: true } },
        wallet: { select: { name: true } },
        transferToWallet: { select: { name: true } },
        category: { select: { name: true } },
        budgetCategory: { select: { name: true } },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.budget.findMany({
      where: {
        ...userScope,
        month: { gte: monthStart, lt: nextMonthStart },
      },
      include: {
        user: { select: { name: true } },
        budgetCategory: { select: { id: true, name: true } },
      },
      orderBy: [{ user: { name: "asc" } }, { budgetCategory: { name: "asc" } }],
    }),
    prisma.transaction.findMany({
      where: {
        ...userScope,
        type: TransactionType.EXPENSE,
        detailStatus: { not: TransactionDetailStatus.PENDING_DETAIL },
        OR: [
          {
            budgetMonth: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
          {
            budgetMonth: null,
            transactionDate: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
        ],
      },
      include: {
        budgetCategory: { select: { id: true, name: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        ...userScope,
        type: TransactionType.INCOME,
        detailStatus: { not: TransactionDetailStatus.PENDING_DETAIL },
        budgetMonth: { gte: monthStart, lt: nextMonthStart },
      },
      select: {
        id: true,
        amount: true,
        budgetableAmount: true,
        transactionDate: true,
      },
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.transaction.aggregate({
      where: {
        ...userScope,
        type: TransactionType.INCOME,
        budgetMonth: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { budgetableAmount: true },
    }),
    prisma.savingLedger.findMany({
      where: userScope,
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.budgetAdjustment.findMany({
      where: {
        ...userScope,
        month: { gte: monthStart, lt: nextMonthStart },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.debt.findMany({
      where: userScope,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        dueDate: true,
        personName: true,
        payments: { select: { amount: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        ...userScope,
        detailStatus: TransactionDetailStatus.PENDING_DETAIL,
        needsReview: true,
      },
      include: {
        user: { select: { name: true } },
        wallet: { select: { name: true } },
        transferToWallet: { select: { name: true } },
        category: { select: { name: true } },
        budgetCategory: { select: { id: true, name: true } },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.transaction.count({
      where: {
        ...userScope,
        detailStatus: TransactionDetailStatus.PENDING_DETAIL,
        needsReview: true,
      },
    }),
  ])) as [
    DashboardWalletRow[],
    DashboardTransactionRow[],
    DashboardTransactionRow[],
    DashboardBudgetRow[],
    BudgetTransactionRow[],
    BudgetIncomeRow[],
    { _sum: { budgetableAmount: number | null } },
    SavingsLedgerRow[],
    DashboardBudgetAdjustment[],
    DashboardDebtRow[],
    DashboardPendingTransactionRow[],
    number,
  ];

  const monthTransactions = activityTransactions.filter(
    (transaction: DashboardTransactionRow) =>
      transaction.transactionDate >= monthStart,
  );
  const chartTransactions = activityTransactions.filter(
    (transaction: DashboardTransactionRow) =>
      transaction.transactionDate >= chartStart,
  );
  const incomeReceivedBeforePeriod = budgetIncomeTransactions
    .filter((transaction) => transaction.transactionDate < monthStart)
    .reduce((total, transaction) => total + transaction.budgetableAmount, 0);
  const firstIncomeReceivedBeforePeriod = budgetIncomeTransactions.find(
    (transaction) => transaction.transactionDate < monthStart,
  );

  const income = monthTransactions
    .filter(
      (transaction: DashboardTransactionRow) =>
        transaction.type === TransactionType.INCOME,
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expense = monthTransactions
    .filter(
      (transaction: DashboardTransactionRow) =>
        transaction.type === TransactionType.EXPENSE,
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
  const rawWalletBalance = wallets.reduce(
    (total, wallet) => total + wallet.currentBalance,
    0,
  );
  const savingsSummary = calculateSavingsSummary({
    ledgers: savingsLedgers,
    totalWalletBalance: rawWalletBalance,
    monthStart,
    nextMonthStart,
  });
  const reservedSavings = savingsSummary.currentBalance;
  const operationalBalance = Math.max(rawWalletBalance - reservedSavings, 0);
  const totalBudget = budgets.reduce(
    (total, budget) => total + budget.amount,
    0,
  );
  const budgetSpent = new Map<string, number>();
  const paidEarlyByBudget = new Map<string, number>();
  let budgetedSpent = 0;
  let unbudgetedSpent = 0;

  for (const transaction of budgetTransactions) {
    if (transaction.type !== TransactionType.EXPENSE) {
      continue;
    }

    const transactionBudgetMonth =
      transaction.budgetMonth ?? transaction.transactionDate;

    if (!sameMonthStart(transactionBudgetMonth, monthStart)) {
      continue;
    }

    if (!transaction.budgetCategory?.id) {
      unbudgetedSpent += transaction.amount;
      continue;
    }

    budgetedSpent += transaction.amount;
    budgetSpent.set(
      transaction.budgetCategory.id,
      (budgetSpent.get(transaction.budgetCategory.id) || 0) +
        transaction.amount,
    );

    if (transaction.transactionDate < monthStart) {
      paidEarlyByBudget.set(
        transaction.budgetCategory.id,
        (paidEarlyByBudget.get(transaction.budgetCategory.id) || 0) +
          transaction.amount,
      );
    }
  }
  const budgetSummary = calculateBudgetPeriodSummary({
    budgetableIncome: budgetableIncome._sum.budgetableAmount ?? 0,
    totalBudget,
    totalSpent: budgetedSpent,
    unbudgetedSpent,
  });
  const readyToBudget = budgetSummary.budgetableIncome;
  const budgetPlanGap = Math.max(totalBudget - readyToBudget, 0);
  const budgetPlanStatus: BudgetPlanStatus =
    budgetPlanGap > 0 ? "OVERPLANNED" : "SAFE";
  const remainingActiveBudget = budgets.reduce((total, budget) => {
    const spent = budget.budgetCategoryId
      ? budgetSpent.get(budget.budgetCategoryId) || 0
      : 0;

    return total + Math.max(budget.amount - spent, 0);
  }, 0);
  const protectedMoney = remainingActiveBudget;
  const freeCash = operationalBalance - protectedMoney;
  const displayFreeCash = Math.max(freeCash, 0);
  const cashCoverageGap = Math.max(protectedMoney - operationalBalance, 0);
  const cashCoverageStatus: CashCoverageStatus =
    cashCoverageGap > 0 ? "GAP" : "COVERED";

  const categoryTotals = new Map<string, number>();

  for (const transaction of monthTransactions) {
    if (
      transaction.type !== TransactionType.EXPENSE ||
      transaction.detailStatus === TransactionDetailStatus.PENDING_DETAIL
    ) {
      continue;
    }

    const categoryName = transaction.category?.name || "Uncategorized";
    categoryTotals.set(
      categoryName,
      (categoryTotals.get(categoryName) || 0) + transaction.amount,
    );
  }

  const topCategories = Array.from(categoryTotals.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: expense > 0 ? Math.round((amount / expense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const chartDays = Array.from({ length: 7 }, (_, index: number) => {
    const date = startOfDay(new Date(chartStart));
    date.setDate(chartStart.getDate() + index);

    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(
        date,
      ),
      income: 0,
      expense: 0,
    };
  });

  for (const transaction of chartTransactions) {
    const key = startOfDay(transaction.transactionDate)
      .toISOString()
      .slice(0, 10);
    const day = chartDays.find((item) => item.key === key);

    if (!day) {
      continue;
    }

    if (transaction.type === TransactionType.INCOME) {
      day.income += transaction.amount;
    }

    if (transaction.type === TransactionType.EXPENSE) {
      day.expense += transaction.amount;
    }
  }

  const topCategory = topCategories[0];
  let totalActiveReceivable = 0;
  let totalActivePayable = 0;

  const activeDebts = debts
    .filter(
      (debt) =>
        debt.status !== DebtStatus.PAID &&
        debt.status !== DebtStatus.CANCELLED,
    )
    .map((debt) => {
      const paidAmount = debt.payments.reduce(
        (total, payment) => total + payment.amount,
        0,
      );
      const remainingAmount = Math.max(0, debt.amount - paidAmount);

      if (debt.type === DebtType.RECEIVABLE) {
        totalActiveReceivable += remainingAmount;
      } else {
        totalActivePayable += remainingAmount;
      }

      return {
        id: debt.id,
        personName: debt.personName,
        type: debt.type,
        dueDate: debt.dueDate?.toISOString() || null,
        remainingAmount,
      };
    });
  const aiInsight =
    monthTransactions.length === 0
      ? {
          title: "Start with clean data",
          message:
            "Record your first income or expense so the dashboard can spot useful patterns.",
          tone: "neutral" as const,
        }
      : expense > income && income > 0
        ? {
            title: "Expense is above income",
            message:
              "This month is cashflow negative. Review the biggest category before adding a new budget.",
            tone: "warning" as const,
          }
        : topCategory
          ? {
              title: `${topCategory.name} leads spending`,
              message: `${topCategory.percentage}% of this month's expense is concentrated there.`,
              tone: "info" as const,
            }
          : {
              title: "Cashflow looks calm",
              message:
                "Income and operational balance are readable. Keep transactions updated for better insight.",
              tone: "positive" as const,
            };

  return {
    budgetPeriodLabel: formatMonthLabel(monthStart),
    periodLabel: formatMonthRange(monthStart, nextMonthStart),
    summary: {
      totalBalance: operationalBalance,
      income,
      expense,
      netCashflow: income - expense,
      transactionCount: monthTransactions.length,
    },
    savings: savingsSummary,
    wallet: {
      totalWalletBalance: operationalBalance,
    },
    coverage: {
      totalWalletBalance: operationalBalance,
      reservedSavings,
      remainingActiveBudget,
      protectedMoney,
      freeCash,
      displayFreeCash,
      cashCoverageGap,
      cashCoverageStatus,
    },
    budget: {
      budgetableIncome: budgetSummary.budgetableIncome,
      readyToBudget,
      availableToBudget: budgetSummary.availableToBudget,
      budgetSet: budgetSummary.totalBudget,
      budgetPlanGap,
      budgetPlanStatus,
      status: budgetPlanStatus,
      totalBudget: budgetSummary.totalBudget,
      spent: budgetSummary.totalSpent,
      budgetSpent: budgetSummary.totalSpent,
      unbudgetedSpent,
      remainingActiveBudget,
      fundingShortfall: cashCoverageGap,
      incomeReceivedBeforePeriod,
      incomeReceivedBeforePeriodDate:
        firstIncomeReceivedBeforePeriod?.transactionDate.toISOString() || null,
      usedPercentage:
        budgetSummary.totalBudget > 0
          ? Math.min(
              100,
              Math.round(
                (budgetSummary.totalSpent / budgetSummary.totalBudget) * 100,
              ),
            )
          : 0,
      remaining: budgetSummary.remainingBudget,
      adjustments: budgetAdjustments.map((adjustment) => ({
        id: adjustment.id,
        categoryName: adjustment.budgetCategoryName,
        previousAmount: adjustment.previousAmount,
        newAmount: adjustment.newAmount,
        amount: adjustment.amount,
        note: adjustment.note,
        createdAt: adjustment.createdAt.toISOString(),
      })),
      items: budgets.map<DashboardBudgetItem>((budget) => ({
        id: budget.id,
        userName: budget.user.name,
        categoryName: budget.budgetCategory?.name ?? "Unassigned",
        amount: budget.amount,
        spent: budget.budgetCategoryId
          ? budgetSpent.get(budget.budgetCategoryId) || 0
          : 0,
        paidEarlyAmount: budget.budgetCategoryId
          ? paidEarlyByBudget.get(budget.budgetCategoryId) || 0
          : 0,
        remaining:
          budget.amount -
          (budget.budgetCategoryId
            ? budgetSpent.get(budget.budgetCategoryId) || 0
            : 0),
        progress:
          budget.amount > 0
            ? Math.min(
                100,
                Math.round(
                  (((budget.budgetCategoryId
                    ? budgetSpent.get(budget.budgetCategoryId) || 0
                    : 0) as number) /
                    budget.amount) *
                    100,
                ),
              )
            : 0,
        status: (() => {
          const spent = budget.budgetCategoryId
            ? budgetSpent.get(budget.budgetCategoryId) || 0
            : 0;
          const progress =
            budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

          if (progress > 100) {
            return "OVERBUDGET" as BudgetItemStatus;
          }

          if (progress >= 90) {
            return "DANGER" as BudgetItemStatus;
          }

          if (progress >= 70) {
            return "WARNING" as BudgetItemStatus;
          }

          return "SAFE" as BudgetItemStatus;
        })(),
      })),
    },
    debt: {
      totalActiveReceivable,
      totalActivePayable,
      netDebtPosition: totalActiveReceivable - totalActivePayable,
      activeCount: activeDebts.length,
      upcomingDueDates: activeDebts
        .filter((debt) => debt.dueDate)
        .sort((left, right) => left.dueDate!.localeCompare(right.dueDate!))
        .slice(0, 5),
    },
    cashflow: chartDays.map((day) => ({
      label: day.label,
      income: day.income,
      expense: day.expense,
    })),
    topCategories,
    wallets: wallets.map((wallet: DashboardWalletRow) => ({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      typeLabel: getWalletTypeLabel(wallet.type),
      ownerName: wallet.user.name,
      currentBalance: wallet.currentBalance,
      isDefault: wallet.isDefault,
      lastBalanceCheckedAt: wallet.lastBalanceCheckedAt?.toISOString() || null,
      lastMatchedAt: wallet.lastMatchedAt?.toISOString() || null,
    })),
    pendingReview: {
      count: pendingCount,
      items: pendingTransactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        userName: transaction.user.name,
        walletName: transaction.wallet.name,
        transactionDate: transaction.transactionDate.toISOString(),
      })),
    },
    recentTransactions: recent.map((transaction: DashboardTransactionRow) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      userName: transaction.user.name,
      walletName: transaction.wallet.name,
      transferToWalletName: transaction.transferToWallet?.name || null,
      categoryName: transaction.category?.name || null,
      budgetCategoryName: transaction.budgetCategory?.name || null,
      transactionDate: transaction.transactionDate.toISOString(),
      budgetMonth: transaction.budgetMonth?.toISOString() || null,
      isPrepaid: transaction.isPrepaid,
      detailStatus: transaction.detailStatus,
    })),
    aiInsight,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
