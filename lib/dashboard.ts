import { TransactionType } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getWalletTypeLabel } from "@/lib/wallets";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatMonthRange(start: Date, end: Date) {
  const endDate = new Date(end.getTime() - 1);

  return `${formatShortDate(start)} - ${formatShortDate(endDate)}`;
}

export async function getDashboardData() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);
  const chartStart = startOfDay(new Date(now));
  chartStart.setDate(chartStart.getDate() - 6);
  const activityStart = chartStart < monthStart ? chartStart : monthStart;

  const [wallets, activityTransactions, recent, budgets] = await Promise.all([
    prisma.wallet.findMany({
      include: { user: { select: { name: true } } },
      orderBy: [
        { user: { name: "asc" } },
        { isDefault: "desc" },
        { name: "asc" },
      ],
    }),
    prisma.transaction.findMany({
      where: {
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
      where: { month: monthStart },
      include: {
        user: { select: { name: true } },
        budgetCategory: { select: { id: true, name: true } },
      },
      orderBy: [{ user: { name: "asc" } }, { budgetCategory: { name: "asc" } }],
    }),
  ]);

  const monthTransactions = activityTransactions.filter(
    (transaction) => transaction.transactionDate >= monthStart,
  );
  const chartTransactions = activityTransactions.filter(
    (transaction) => transaction.transactionDate >= chartStart,
  );

  const income = monthTransactions
    .filter((transaction) => transaction.type === TransactionType.INCOME)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expense = monthTransactions
    .filter((transaction) => transaction.type === TransactionType.EXPENSE)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalBalance = wallets.reduce(
    (total, wallet) => total + wallet.currentBalance,
    0,
  );
  const totalBudget = budgets.reduce(
    (total, budget) => total + budget.amount,
    0,
  );
  const budgetSpent = new Map<string, number>();

  for (const transaction of monthTransactions) {
    if (
      transaction.type !== TransactionType.EXPENSE ||
      !transaction.budgetCategory?.id
    ) {
      continue;
    }

    budgetSpent.set(
      transaction.budgetCategory.id,
      (budgetSpent.get(transaction.budgetCategory.id) || 0) +
        transaction.amount,
    );
  }
  const assignedBudgetExpense = budgets.reduce(
    (total, budget) =>
      total +
      (budget.budgetCategoryId
        ? budgetSpent.get(budget.budgetCategoryId) || 0
        : 0),
    0,
  );

  const categoryTotals = new Map<string, number>();

  for (const transaction of monthTransactions) {
    if (transaction.type !== TransactionType.EXPENSE) {
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

  const chartDays = Array.from({ length: 7 }, (_, index) => {
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
                "Income and wallet balances are readable. Keep transactions updated for better insight.",
              tone: "positive" as const,
            };

  return {
    periodLabel: formatMonthRange(monthStart, nextMonthStart),
    summary: {
      totalBalance,
      income,
      expense,
      netCashflow: income - expense,
      transactionCount: monthTransactions.length,
    },
    budget: {
      totalBudget,
      spent: assignedBudgetExpense,
      usedPercentage:
        totalBudget > 0
          ? Math.min(
              100,
              Math.round((assignedBudgetExpense / totalBudget) * 100),
            )
          : 0,
      remaining: totalBudget - assignedBudgetExpense,
      items: budgets.map((budget) => ({
        id: budget.id,
        userName: budget.user.name,
        categoryName: budget.budgetCategory?.name ?? "Unassigned",
        amount: budget.amount,
        spent: budget.budgetCategoryId
          ? budgetSpent.get(budget.budgetCategoryId) || 0
          : 0,
      })),
    },
    cashflow: chartDays.map((day) => ({
      label: day.label,
      income: day.income,
      expense: day.expense,
    })),
    topCategories,
    wallets: wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      typeLabel: getWalletTypeLabel(wallet.type),
      ownerName: wallet.user.name,
      currentBalance: wallet.currentBalance,
      isDefault: wallet.isDefault,
    })),
    recentTransactions: recent.map((transaction) => ({
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
    })),
    aiInsight,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
