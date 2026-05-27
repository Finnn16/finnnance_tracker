import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { AppLockButton } from "@/components/AppLockButton";
import { SettingsClient } from "@/components/SettingsClient";
import { monthInputValue } from "@/lib/budgets";
import { getGlobalAllocationSummary } from "@/lib/global-allocation";
import { TransactionType, UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const user = await requireUnlockedAppUser("/budgets");
  const [
    users,
    budgetCategories,
    budgets,
    expenseTransactions,
    incomeTransactions,
  ] = await measureServerOperation("page /budgets.data", () => Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.budgetCategory.findMany({
      where: user.role === UserRole.ADMIN ? undefined : { userId: user.id },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { budgets: true, transactions: true } },
      },
      orderBy: [{ isHidden: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.budget.findMany({
      where: user.role === UserRole.ADMIN ? undefined : { userId: user.id },
      include: {
        user: { select: { name: true, email: true } },
        budgetCategory: { select: { id: true, name: true, isHidden: true } },
      },
      orderBy: [{ month: "desc" }, { budgetCategory: { name: "asc" } }],
    }),
    prisma.transaction.findMany({
      where: {
        type: TransactionType.EXPENSE,
        ...(user.role === UserRole.ADMIN ? {} : { userId: user.id }),
      },
      select: {
        userId: true,
        budgetCategoryId: true,
        budgetMonth: true,
        transactionDate: true,
        amount: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        type: TransactionType.INCOME,
        ...(user.role === UserRole.ADMIN ? {} : { userId: user.id }),
      },
      select: {
        userId: true,
        budgetMonth: true,
        transactionDate: true,
        budgetableAmount: true,
      },
    }),
  ]));

  const budgetStatsByKey = expenseTransactions.reduce<
    Record<string, { spent: number; paidEarlyAmount: number }>
  >((accumulator, transaction) => {
    if (!transaction.budgetCategoryId) {
      return accumulator;
    }

    const effectiveBudgetMonth = monthInputValue(
      new Date(transaction.budgetMonth || transaction.transactionDate),
    );
    const key = `${transaction.userId}|${effectiveBudgetMonth}|${transaction.budgetCategoryId}`;

    accumulator[key] ||= { spent: 0, paidEarlyAmount: 0 };
    accumulator[key].spent += transaction.amount;

    if (
      monthInputValue(new Date(transaction.transactionDate)) <
      effectiveBudgetMonth
    ) {
      accumulator[key].paidEarlyAmount += transaction.amount;
    }

    return accumulator;
  }, {});

  const unbudgetedSpentByPeriod = expenseTransactions.reduce<
    Record<string, number>
  >((accumulator, transaction) => {
    if (transaction.budgetCategoryId) {
      return accumulator;
    }

    const effectiveBudgetMonth = monthInputValue(
      new Date(transaction.budgetMonth || transaction.transactionDate),
    );
    const key = `${transaction.userId}|${effectiveBudgetMonth}`;
    accumulator[key] = (accumulator[key] || 0) + transaction.amount;

    return accumulator;
  }, {});

  const budgetableIncomeByPeriod = incomeTransactions.reduce<
    Record<string, number>
  >((accumulator, transaction) => {
    if (!transaction.budgetMonth) {
      return accumulator;
    }

    const effectiveBudgetMonth = monthInputValue(transaction.budgetMonth);
    const key = `${transaction.userId}|${effectiveBudgetMonth}`;

    accumulator[key] =
      (accumulator[key] || 0) + transaction.budgetableAmount;

    return accumulator;
  }, {});
  const fundingShortfallByUser = Object.fromEntries(
    await measureServerOperation("page /budgets.funding", () =>
      Promise.all(
        users.map(async (listedUser) => {
          const allocation = await getGlobalAllocationSummary(
            prisma,
            listedUser.id,
          );

          return [listedUser.id, allocation.shortfall] as const;
        }),
      ),
    ),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 bg-white shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <Link href="/" className="text-sm font-medium text-indigo-700">
                Back
              </Link>
              <h1 className="mt-1 text-2xl font-bold text-zinc-950">Budgets</h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-zinc-600 sm:inline">
                {user.name}
              </span>
              <AppLockButton />
              <UserButton />
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
          <SettingsClient
            view="budgets"
            initialCategories={[]}
            initialCategoryGroups={[]}
            initialBudgets={budgets.map((budget: (typeof budgets)[number]) => ({
              id: budget.id,
              userId: budget.userId,
              userName: budget.user.name,
              userEmail: budget.user.email,
              budgetCategoryId: budget.budgetCategoryId,
              budgetCategoryName: budget.budgetCategory?.name ?? "Unassigned",
              budgetCategoryHidden: budget.budgetCategory?.isHidden ?? false,
              month: budget.month.toISOString(),
              amount: budget.amount,
              spent:
                budgetStatsByKey[
                  `${budget.userId}|${monthInputValue(budget.month)}|${budget.budgetCategoryId}`
                ]?.spent || 0,
              paidEarlyAmount:
                budgetStatsByKey[
                  `${budget.userId}|${monthInputValue(budget.month)}|${budget.budgetCategoryId}`
                ]?.paidEarlyAmount || 0,
            }))}
            initialBudgetCategories={budgetCategories.map(
              (category: (typeof budgetCategories)[number]) => ({
                id: category.id,
                userId: category.userId,
                userName: category.user.name,
                userEmail: category.user.email,
                name: category.name,
                isHidden: category.isHidden,
                budgetCount: category._count.budgets,
                transactionCount: category._count.transactions,
              }),
            )}
            users={users}
            budgetableIncomeByPeriod={budgetableIncomeByPeriod}
            unbudgetedSpentByPeriod={unbudgetedSpentByPeriod}
            fundingShortfallByUser={fundingShortfallByUser}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </main>
      </div>
    </div>
  );
}
