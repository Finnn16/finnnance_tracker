import { AppPageShell } from "@/components/AppPageShell";
import { TransactionsClient } from "@/components/TransactionsClient";
import { monthInputValue } from "@/lib/budgets";
import { Prisma } from "@/lib/generated/prisma/client";
import { TransactionType, UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 35];
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 35;
const TRANSACTION_TABS = ["both", "income", "expense"] as const;

type TransactionTab = (typeof TRANSACTION_TABS)[number];

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPageSize(value: string | undefined) {
  const parsed = parsePositiveInteger(value, DEFAULT_PAGE_SIZE);

  return Math.min(parsed, MAX_PAGE_SIZE);
}

function getTransactionTab(value: string | undefined): TransactionTab {
  return TRANSACTION_TABS.includes(value as TransactionTab)
    ? (value as TransactionTab)
    : "both";
}

function getTransactionSearchWhere(
  userFilter: Prisma.TransactionWhereInput["userId"],
  query: string,
  tab: TransactionTab,
) {
  const where: Prisma.TransactionWhereInput =
    userFilter === undefined ? {} : { userId: userFilter };

  if (tab === "income") {
    where.type = TransactionType.INCOME;
  }

  if (tab === "expense") {
    where.type = TransactionType.EXPENSE;
  }

  if (!query) {
    return where;
  }

  const textFilter = { contains: query, mode: "insensitive" as const };
  const numericQuery = Number.parseInt(query.replace(/\D/g, ""), 10);

  where.OR = [
    { description: textFilter },
    { user: { is: { name: textFilter } } },
    { user: { is: { email: textFilter } } },
    { wallet: { is: { name: textFilter } } },
    { transferToWallet: { is: { name: textFilter } } },
    { category: { is: { name: textFilter } } },
    { budgetCategory: { is: { name: textFilter } } },
  ];

  if (Number.isFinite(numericQuery) && numericQuery > 0) {
    where.OR.push({ amount: numericQuery });
  }

  return where;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    tab?: string;
  }>;
}) {
  const user = await requireUnlockedAppUser("/transactions");
  const resolvedSearchParams = (await searchParams) || {};
  const requestedPage = parsePositiveInteger(resolvedSearchParams.page, 1);
  const pageSize = getPageSize(resolvedSearchParams.limit);
  const searchQuery = (resolvedSearchParams.q || "").trim().slice(0, 100);
  const selectedTab = getTransactionTab(resolvedSearchParams.tab);
  const transactionOwnerFilter =
    user.role === UserRole.ADMIN ? undefined : user.id;
  const transactionWhere = getTransactionSearchWhere(
    transactionOwnerFilter,
    searchQuery,
    selectedTab,
  );
  const totalTransactions = await measureServerOperation(
    "page /transactions.count",
    () => prisma.transaction.count({ where: transactionWhere }),
  );
  const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const [transactions, wallets, categories, budgetCategories, budgetExpenses] =
    await measureServerOperation("page /transactions.data", () =>
      Promise.all([
        prisma.transaction.findMany({
          include: {
            user: { select: { id: true, name: true, email: true } },
            wallet: { select: { id: true, name: true } },
            transferToWallet: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            budgetCategory: { select: { id: true, name: true } },
            savingLedgers: {
              where: { type: "ADD" },
              select: { note: true },
              take: 1,
            },
          },
          where: transactionWhere,
          orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        }),
        prisma.wallet.findMany({
          where: { userId: user.id },
          select: { id: true, name: true, isDefault: true },
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        }),
        prisma.category.findMany({
          where: { isSelectable: true, isHidden: false },
          select: { id: true, key: true, name: true, type: true, group: true },
          orderBy: [{ type: "asc" }, { group: "asc" }, { name: "asc" }],
        }),
        prisma.budgetCategory.findMany({
          where: { userId: user.id, isHidden: false },
          select: {
            id: true,
            name: true,
            budgets: { select: { month: true, amount: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
        prisma.transaction.findMany({
          where: {
            ...(user.role === UserRole.ADMIN ? {} : { userId: user.id }),
            type: TransactionType.EXPENSE,
            budgetCategoryId: { not: null },
          },
          select: {
            budgetCategoryId: true,
            budgetMonth: true,
            transactionDate: true,
            amount: true,
          },
        }),
      ]),
    );

  const spentByBudgetKey = budgetExpenses.reduce<Record<string, number>>(
    (accumulator, transaction) => {
      const period = monthInputValue(
        transaction.budgetMonth || transaction.transactionDate,
      );
      const key = `${transaction.budgetCategoryId}|${period}`;

      accumulator[key] = (accumulator[key] || 0) + transaction.amount;

      return accumulator;
    },
    {},
  );

  const transactionViews = transactions.map(
    (transaction: (typeof transactions)[number]) => ({
      id: transaction.id,
      userId: transaction.userId,
      userName: transaction.user.name,
      userEmail: transaction.user.email,
      walletId: transaction.walletId,
      walletName: transaction.wallet.name,
      transferToWalletId: transaction.transferToWalletId,
      transferToWalletName: transaction.transferToWallet?.name || null,
      categoryId: transaction.categoryId,
      categoryName: transaction.category?.name || null,
      budgetCategoryId: transaction.budgetCategoryId,
      budgetCategoryName: transaction.budgetCategory?.name || null,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      transactionDate: transaction.transactionDate.toISOString(),
      budgetMonth: transaction.budgetMonth?.toISOString() || null,
      isPrepaid: transaction.isPrepaid,
      isUnbudgetedExpense:
        transaction.type === TransactionType.EXPENSE &&
        transaction.budgetCategoryId === null,
      savingsAmount: transaction.savingsAmount || null,
      savingsNote: transaction.savingLedgers[0]?.note || null,
      budgetableAmount: transaction.budgetableAmount,
      canManage: user.id === transaction.userId,
    }),
  );

  return (
    <AppPageShell title="Transactions" user={user} fill>
      <TransactionsClient
        key={`${currentPage}-${pageSize}-${searchQuery}-${selectedTab}`}
        initialTransactions={transactionViews}
        pagination={{
          page: currentPage,
          pageSize,
          totalCount: totalTransactions,
          query: searchQuery,
          tab: selectedTab,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        wallets={wallets}
        categories={categories}
        budgetCategories={budgetCategories.map((category) => ({
          id: category.id,
          name: category.name,
          periods: category.budgets.map((budget) => {
            const month = monthInputValue(budget.month);

            return {
              month,
              amount: budget.amount,
              spent: spentByBudgetKey[`${category.id}|${month}`] || 0,
            };
          }),
        }))}
      />
    </AppPageShell>
  );
}
