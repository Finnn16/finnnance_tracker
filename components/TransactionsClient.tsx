"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  calculateBudgetableIncomeAmount,
  monthInputValue,
} from "@/lib/budgets";
import { SensitiveAmount } from "@/components/PrivacyMode";
import { formatDisplayTitle } from "@/lib/display-text";
import { TransactionType } from "@/lib/prisma-enums";
import {
  formatAmountInput,
  formatRupiah,
  parseIntegerAmount,
  normalizeAmountInput,
} from "@/lib/money";
import {
  getTransactionTypeLabel,
  transactionTypeOptions,
} from "@/lib/transactions";
import { useTransactionPreferences } from "@/hooks/useTransactionPreferences";
import { EmptyState } from "@/components/EmptyState";

type WalletOption = {
  id: string;
  name: string;
  isDefault: boolean;
};

type CategoryOption = {
  id: string;
  key: string;
  name: string;
  type: TransactionType;
  group: string;
};

type BudgetCategoryOption = {
  id: string;
  name: string;
  periods: Array<{
    month: string;
    amount: number;
    spent: number;
  }>;
};

type TransactionView = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  walletId: string;
  walletName: string;
  transferToWalletId: string | null;
  transferToWalletName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  budgetCategoryId: string | null;
  budgetCategoryName: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  budgetMonth: string | null;
  isPrepaid: boolean;
  isUnbudgetedExpense: boolean;
  savingsAmount: number | null;
  savingsNote: string | null;
  budgetableAmount: number;
  canManage: boolean;
};

type TransactionFormState = {
  type: TransactionType;
  amount: string;
  walletId: string;
  transferToWalletId: string;
  categoryGroup: string;
  categoryId: string;
  budgetCategoryId: string;
  description: string;
  transactionDate: string;
  budgetMonth: string;
  isUnbudgetedExpense: boolean;
  allocateToBudget: boolean;
  allocateSavings: boolean;
  savingsAmount: string;
  savingsNote: string;
  transferFeeEnabled: boolean;
  transferFeeMethod: string;
  transferFeeAmount: string;
};

type TransactionPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  query: string;
  tab: "both" | "income" | "expense";
  pageSizeOptions: number[];
};

const transactionHistoryTabs = [
  { label: "Both", value: "both" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
] as const;

const transferFeeOptions = [
  { label: "BI-FAST", value: "BI_FAST", amount: 2_500 },
  { label: "Internet", value: "INTERNET", amount: 6_500 },
] as const;

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatBudgetPeriod(value: string) {
  const date = new Date(`${value}-01T00:00:00`);

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getCategoryGroups(
  categories: CategoryOption[],
  type: TransactionType,
) {
  return Array.from(
    new Map(
      categories
        .filter((category) => category.type === type)
        .map((category) => [category.group, category.group]),
    ).values(),
  );
}

function getDefaultCategoryGroup(
  categories: CategoryOption[],
  type: TransactionType,
) {
  return getCategoryGroups(categories, type)[0] || "";
}

function getBudgetCategoryIdForMonth(
  budgetCategories: BudgetCategoryOption[],
  budgetCategoryId: string,
  budgetMonth: string,
) {
  return budgetCategories.some(
    (category) =>
      category.id === budgetCategoryId &&
      category.periods.some((period) => period.month === budgetMonth),
  )
    ? budgetCategoryId
    : "";
}

function createEmptyForm(
  wallets: WalletOption[],
  categories: CategoryOption[],
  preferences?: {
    lastWalletId?: string;
    lastCategoryId?: string;
    lastExpenseCategoryId?: string;
    lastTransactionType?: "INCOME" | "EXPENSE" | "TRANSFER";
  },
): TransactionFormState {
  const defaultWallet = preferences?.lastWalletId
    ? wallets.find((w) => w.id === preferences.lastWalletId)
    : wallets.find((wallet) => wallet.isDefault) || wallets[0];

  const transactionType =
    preferences?.lastTransactionType || TransactionType.EXPENSE;
  const transactionDate = todayInputValue();
  const defaultBudgetMonth = monthInputValue(new Date(transactionDate));

  const defaultCategoryGroup = getDefaultCategoryGroup(
    categories,
    transactionType,
  );
  const lastCategoryId =
    transactionType === TransactionType.EXPENSE
      ? preferences?.lastExpenseCategoryId
      : preferences?.lastCategoryId;
  const lastCategory = lastCategoryId
    ? categories.find((c) => c.id === lastCategoryId)
    : null;

  return {
    type: transactionType,
    amount: "",
    walletId: defaultWallet?.id || "",
    transferToWalletId: "",
    categoryGroup: lastCategory?.group || defaultCategoryGroup,
    categoryId: lastCategory?.id || "",
    budgetCategoryId: "",
    description: "",
    transactionDate,
    budgetMonth: defaultBudgetMonth,
    isUnbudgetedExpense: false,
    allocateToBudget: true,
    allocateSavings: false,
    savingsAmount: "",
    savingsNote: "",
    transferFeeEnabled: false,
    transferFeeMethod: "",
    transferFeeAmount: "",
  };
}

function transactionToForm(
  transaction: TransactionView,
  categories: CategoryOption[],
  budgetCategories: BudgetCategoryOption[],
): TransactionFormState {
  const categoryGroup =
    categories.find((category) => category.id === transaction.categoryId)
      ?.group || "";
  const budgetMonth =
    transaction.budgetMonth?.slice(0, 7) ||
    transaction.transactionDate.slice(0, 7);

  return {
    type: transaction.type,
    amount: formatAmountInput(String(transaction.amount)),
    walletId: transaction.walletId,
    transferToWalletId: transaction.transferToWalletId || "",
    categoryGroup,
    categoryId: transaction.categoryId || "",
    budgetCategoryId: getBudgetCategoryIdForMonth(
      budgetCategories,
      transaction.budgetCategoryId || "",
      budgetMonth,
    ),
    description: transaction.description,
    transactionDate: transaction.transactionDate.slice(0, 10),
    budgetMonth,
    isUnbudgetedExpense:
      transaction.type === TransactionType.EXPENSE &&
      transaction.isUnbudgetedExpense,
    allocateToBudget:
      transaction.type !== TransactionType.INCOME ||
      transaction.budgetMonth !== null,
    allocateSavings: (transaction.savingsAmount || 0) > 0,
    savingsAmount: transaction.savingsAmount
      ? String(transaction.savingsAmount)
      : "",
    savingsNote: transaction.savingsNote || "",
    transferFeeEnabled: false,
    transferFeeMethod: "",
    transferFeeAmount: "",
  };
}

function toPayload(form: TransactionFormState) {
  return {
    type: form.type,
    amount: form.amount,
    walletId: form.walletId,
    transferToWalletId: form.transferToWalletId || null,
    categoryId: form.categoryId || null,
    budgetCategoryId:
      form.type === TransactionType.EXPENSE && !form.isUnbudgetedExpense
        ? form.budgetCategoryId || null
        : null,
    isUnbudgetedExpense: form.isUnbudgetedExpense,
    description: form.description,
    transactionDate: form.transactionDate,
    budgetMonth:
      form.type === TransactionType.TRANSFER ||
      (form.type === TransactionType.INCOME && !form.allocateToBudget)
        ? null
        : form.budgetMonth,
    allocateToBudget: form.allocateToBudget,
    savingsAmount: form.allocateSavings ? form.savingsAmount : null,
    savingsNote: form.allocateSavings ? form.savingsNote || null : null,
    transferFeeEnabled: form.transferFeeEnabled,
    transferFeeMethod: form.transferFeeEnabled ? form.transferFeeMethod : null,
    transferFeeAmount: form.transferFeeAmount || null,
  };
}

function getSignedAmount(transaction: TransactionView) {
  if (transaction.type === TransactionType.INCOME) {
    return transaction.amount;
  }

  if (transaction.type === TransactionType.EXPENSE) {
    return -transaction.amount;
  }

  return 0;
}

export function TransactionsClient({
  initialTransactions,
  pagination,
  wallets,
  categories,
  budgetCategories,
}: {
  initialTransactions: TransactionView[];
  pagination: TransactionPagination;
  wallets: WalletOption[];
  categories: CategoryOption[];
  budgetCategories: BudgetCategoryOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const {
    preferences,
    isLoaded,
    saveWalletPreference,
    saveExpenseCategoryPreference,
  } = useTransactionPreferences();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [createForm, setCreateForm] = useState(() =>
    createEmptyForm(wallets, categories, isLoaded ? preferences : undefined),
  );
  const [editTransactionId, setEditTransactionId] = useState<string | null>(
    null,
  );
  const [editForm, setEditForm] = useState(() =>
    createEmptyForm(wallets, categories),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateTypePickerOpen, setIsCreateTypePickerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isMobilePaginationVisible, setIsMobilePaginationVisible] =
    useState(true);
  const [searchDraft, setSearchDraft] = useState(pagination.query);
  const [totalCount, setTotalCount] = useState(pagination.totalCount);
  const scrollIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const pageStart =
    totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const pageEnd = Math.min(
    totalCount,
    (pagination.page - 1) * pagination.pageSize + transactions.length,
  );
  const activeTabLabel =
    transactionHistoryTabs.find((tab) => tab.value === pagination.tab)?.label ||
    "Both";

  const handleTransactionScroll = useCallback(() => {
    setIsMobilePaginationVisible(false);

    if (scrollIdleTimeoutRef.current) {
      clearTimeout(scrollIdleTimeoutRef.current);
    }

    scrollIdleTimeoutRef.current = setTimeout(() => {
      setIsMobilePaginationVisible(true);
      scrollIdleTimeoutRef.current = null;
    }, 240);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleTransactionScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleTransactionScroll);

      if (scrollIdleTimeoutRef.current) {
        clearTimeout(scrollIdleTimeoutRef.current);
      }
    };
  }, [handleTransactionScroll]);

  const transactionMatchesActiveTab = (transaction: TransactionView) => {
    if (pagination.tab === "income") {
      return transaction.type === TransactionType.INCOME;
    }

    if (pagination.tab === "expense") {
      return transaction.type === TransactionType.EXPENSE;
    }

    return true;
  };

  const updateHistoryParams = (updates: {
    page?: number;
    pageSize?: number;
    query?: string;
    tab?: TransactionPagination["tab"];
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.page !== undefined) {
      if (updates.page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(updates.page));
      }
    }

    if (updates.pageSize !== undefined) {
      if (updates.pageSize === 10) {
        params.delete("limit");
      } else {
        params.set("limit", String(updates.pageSize));
      }
    }

    if (updates.query !== undefined) {
      const nextQuery = updates.query.trim();

      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }
    }

    if (updates.tab !== undefined) {
      if (updates.tab === "both") {
        params.delete("tab");
      } else {
        params.set("tab", updates.tab);
      }
    }

    const queryString = params.toString();

    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateHistoryParams({ page: 1, query: searchDraft });
  };

  const openCreateDialogForType = (type: TransactionType) => {
    const baseForm = createEmptyForm(wallets, categories, preferences);

    setCreateForm({
      ...baseForm,
      type,
      categoryGroup: getDefaultCategoryGroup(categories, type),
      categoryId: "",
      budgetCategoryId: "",
      transferToWalletId: "",
      isUnbudgetedExpense: false,
      allocateToBudget: true,
      allocateSavings: false,
      savingsAmount: "",
      savingsNote: "",
      transferFeeEnabled: false,
      transferFeeMethod: "",
      transferFeeAmount: "",
    });
    setIsCreateTypePickerOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Show optimistic toast
    const toastId = toast.loading("Adding transaction...");

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(createForm)),
      });
      const data = (await response.json()) as {
        transaction?: TransactionView;
        transactions?: TransactionView[];
        error?: string;
      };

      if (!response.ok || (!data.transaction && !data.transactions)) {
        const errorMsg = data.error || "Failed to create transaction.";
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      // Save preferences for next transaction
      saveWalletPreference(createForm.walletId);
      if (
        createForm.type === TransactionType.EXPENSE &&
        createForm.categoryId
      ) {
        saveExpenseCategoryPreference(createForm.categoryId);
      }

      // Optimistic insert: add to list immediately
      const newTransactions =
        data.transactions || (data.transaction ? [data.transaction] : []);
      const visibleNewTransactions = newTransactions.filter(
        transactionMatchesActiveTab,
      );
      setTransactions((current) =>
        [...visibleNewTransactions, ...current].slice(0, pagination.pageSize),
      );
      setTotalCount((current) => current + visibleNewTransactions.length);
      setCreateForm(createEmptyForm(wallets, categories, preferences));
      setIsCreateDialogOpen(false);

      toast.success("Transaction added", { id: toastId });
    } catch {
      const errorMsg = "Failed to create transaction. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (transaction: TransactionView) => {
    setError(null);
    setEditTransactionId(transaction.id);
    setEditForm(transactionToForm(transaction, categories, budgetCategories));
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editTransactionId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const toastId = toast.loading("Saving transaction...");

    try {
      const response = await fetch(`/api/transactions/${editTransactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(editForm)),
      });
      const data = (await response.json()) as {
        transaction?: TransactionView;
        error?: string;
      };

      if (!response.ok || !data.transaction) {
        const errorMsg = data.error || "Failed to update transaction.";
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      setEditTransactionId(null);
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === data.transaction!.id
            ? data.transaction!
            : transaction,
        ),
      );

      toast.success("Transaction saved", { id: toastId });
    } catch {
      const errorMsg = "Failed to update transaction. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    setError(null);
    setIsSubmitting(true);

    const toastId = toast.loading("Deleting transaction...");

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        const errorMsg = data.error || "Failed to delete transaction.";
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== transactionId),
      );
      setTotalCount((current) => Math.max(0, current - 1));

      toast.success("Transaction deleted", { id: toastId });
    } catch {
      const errorMsg = "Failed to delete transaction. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="transaction-density flex min-h-0 w-full flex-col gap-4 overflow-auto lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:overflow-hidden"
        onScroll={handleTransactionScroll}
      >
        <section className="flex min-h-0 flex-col gap-3 sm:gap-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 sm:px-4 sm:py-3 sm:text-sm">
              {error}
            </p>
          ) : null}

          <div className="rounded-lg bg-white p-3 shadow-sm sm:p-4">
            <div
              className="scrollbar-hide -mx-1 flex gap-1 overflow-x-auto px-1 sm:mx-0 sm:mb-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:rounded-lg sm:bg-zinc-100 sm:p-1"
              aria-label="Transaction type filter"
            >
              {transactionHistoryTabs.map((tab) => {
                const isActive = pagination.tab === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() =>
                      updateHistoryParams({ page: 1, tab: tab.value })
                    }
                    disabled={isPending || isActive}
                  className={
                    isActive
                      ? "shrink-0 rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-sm sm:rounded-md sm:bg-white sm:px-3 sm:text-zinc-950"
                      : "shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-not-allowed sm:rounded-md sm:border-0 sm:bg-transparent sm:px-3 sm:text-sm"
                  }
                >
                    {tab.label}
                  </button>
                );
              })}
            </div>

          <form
            onSubmit={handleSearch}
            className="hidden flex-col gap-2 sm:flex sm:flex-row sm:items-end sm:gap-3"
          >
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 sm:text-sm">
                Search history
              </label>
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Search note, wallet, category, amount"
                  maxLength={100}
                />
              </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
              >
                Search
              </button>
                {pagination.query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDraft("");
                      updateHistoryParams({ page: 1, query: "" });
                  }}
                  disabled={isPending}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
                >
                  Clear
                  </button>
                ) : null}
              </div>
            </form>

          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
            <p className="text-xs text-zinc-500 sm:text-sm">
              Showing {pageStart}-{pageEnd} of {totalCount} {activeTabLabel}{" "}
              transactions
            </p>
            <label className="hidden items-center gap-2 text-xs font-medium text-zinc-700 sm:flex sm:text-sm">
              Per page
              <select
                  value={pagination.pageSize}
                  onChange={(event) =>
                    updateHistoryParams({
                      page: 1,
                      pageSize: Number(event.target.value),
                    })
                  }
                  disabled={isPending}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                  {pagination.pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

        <div className="min-h-0 space-y-2 sm:space-y-3 lg:overflow-y-auto lg:pr-2">
            {transactions.length === 0 ? (
              <EmptyState
                icon="📊"
                title={
                  pagination.query
                    ? "No matching transactions"
                    : "No transactions yet"
                }
                description={
                  pagination.query
                    ? "Try another keyword or clear the search."
                    : `No ${activeTabLabel.toLowerCase()} transactions on this page yet.`
                }
              />
            ) : null}

            {transactions.map((transaction) => (
            <article
              key={transaction.id}
              className="rounded-lg bg-white p-2.5 shadow-sm sm:p-5"
            >
                {editTransactionId === transaction.id ? (
                  <TransactionForm
                    form={editForm}
                    wallets={wallets}
                    categories={categories}
                    budgetCategories={budgetCategories}
                    submitLabel="Save Transaction"
                    isSubmitting={isSubmitting}
                    onChange={setEditForm}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditTransactionId(null)}
                    originalTransaction={transaction}
                  />
                ) : (
                  <TransactionRow
                    transaction={transaction}
                    isSubmitting={isSubmitting}
                    onEdit={() => startEdit(transaction)}
                    onDelete={() => handleDelete(transaction.id)}
                  />
                )}
              </article>
            ))}
          </div>

        <div className="hidden flex-col gap-2 rounded-lg bg-white p-3 shadow-sm sm:flex sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <p className="text-xs font-medium text-zinc-600 sm:text-sm">
            Page {pagination.page} of {totalPages}
          </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() =>
                  updateHistoryParams({
                    page: Math.max(1, pagination.page - 1),
                  })
              }
              disabled={pagination.page <= 1 || isPending}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  updateHistoryParams({
                    page: Math.min(totalPages, pagination.page + 1),
                  })
              }
              disabled={pagination.page >= totalPages || isPending}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
                Next
              </button>
            </div>
          </div>
        </section>

      <aside className="hidden min-h-[640px] flex-col overflow-hidden rounded-lg bg-white p-4 shadow-sm lg:flex lg:min-h-0 lg:self-stretch xl:p-5">
        <h2 className="text-base font-semibold text-zinc-950">
          Add Transaction
        </h2>
        <div className="mt-4 min-h-0 flex-1">
            <TransactionForm
              form={createForm}
              wallets={wallets}
              categories={categories}
              budgetCategories={budgetCategories}
              submitLabel="Add Transaction"
              isSubmitting={isSubmitting}
              onChange={setCreateForm}
              onSubmit={handleCreate}
              stickyActions
            />
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setIsCreateTypePickerOpen(true)}
        aria-label="Tambah transaksi"
        title="Tambah transaksi"
        className="fixed bottom-36 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-95 lg:hidden"
      >
        <PlusIcon />
      </button>

      <button
        type="button"
        onClick={() => setIsFilterDialogOpen(true)}
        aria-label="Filter transactions"
        title="Filter transactions"
        className="fixed bottom-48 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-lg transition hover:bg-zinc-50 active:scale-95 lg:hidden"
      >
        <FilterIcon />
      </button>

      <div
        className={
          isMobilePaginationVisible
            ? "fixed bottom-24 left-4 right-20 z-40 rounded-lg border border-zinc-200 bg-white/95 p-2 shadow-lg backdrop-blur transition-all duration-200 sm:hidden"
            : "pointer-events-none fixed bottom-24 left-4 right-20 z-40 translate-y-3 rounded-lg border border-zinc-200 bg-white/95 p-2 opacity-0 shadow-lg backdrop-blur transition-all duration-150 sm:hidden"
        }
      >
        <p className="mb-1 text-center text-[11px] font-medium text-zinc-500">
          Page {pagination.page} of {totalPages}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              updateHistoryParams({
                page: Math.max(1, pagination.page - 1),
              })
            }
            disabled={pagination.page <= 1 || isPending}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() =>
              updateHistoryParams({
                page: Math.min(totalPages, pagination.page + 1),
              })
            }
            disabled={pagination.page >= totalPages || isPending}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {isCreateTypePickerOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/45 p-3 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-type-dialog-title"
          onClick={() => setIsCreateTypePickerOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <h2
                id="transaction-type-dialog-title"
                className="text-base font-semibold text-zinc-950"
              >
                Add Transaction
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateTypePickerOpen(false)}
                aria-label="Tutup pilihan transaksi"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  X
                </span>
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {transactionTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => openCreateDialogForType(option.value)}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:bg-zinc-50 active:scale-[0.99]"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-950">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {option.value === TransactionType.EXPENSE
                        ? "Catat pengeluaran dan envelope"
                        : option.value === TransactionType.INCOME
                          ? "Catat pemasukan dan savings"
                          : "Pindah saldo antar wallet"}
                    </span>
                  </span>
                  <span className="text-lg font-semibold text-zinc-400">
                    &gt;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/45 p-3 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-transaction-dialog-title"
          onClick={() => setIsCreateDialogOpen(false)}
        >
          <div
            className="flex h-[calc(100dvh-4rem)] max-h-[42rem] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 pb-3 sm:pb-4">
              <h2
                id="add-transaction-dialog-title"
                className="text-base font-semibold text-zinc-950 sm:text-lg"
              >
                Add Transaction
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateDialogOpen(false)}
                aria-label="Tutup form transaksi"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 sm:h-9 sm:w-9"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  X
                </span>
              </button>
            </div>
            <div className="mt-3 min-h-0 flex-1 sm:mt-4">
              <TransactionForm
                form={createForm}
                wallets={wallets}
                categories={categories}
                budgetCategories={budgetCategories}
                submitLabel="Add Transaction"
                isSubmitting={isSubmitting}
                onChange={setCreateForm}
                onSubmit={handleCreate}
                stickyActions
              />
            </div>
          </div>
        </div>
      ) : null}

      {isFilterDialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/45 p-3 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-filter-dialog-title"
          onClick={() => setIsFilterDialogOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <h2
                id="transaction-filter-dialog-title"
                className="text-base font-semibold text-zinc-950"
              >
                Filter Transactions
              </h2>
              <button
                type="button"
                onClick={() => setIsFilterDialogOpen(false)}
                aria-label="Close filter"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  X
                </span>
              </button>
            </div>

            <form
              onSubmit={(event) => {
                handleSearch(event);
                setIsFilterDialogOpen(false);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Search history
                </label>
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Search note, wallet, category, amount"
                  maxLength={100}
                />
              </div>

              <label className="block text-xs font-medium text-zinc-700">
                Per page
                <select
                  value={pagination.pageSize}
                  onChange={(event) =>
                    updateHistoryParams({
                      page: 1,
                      pageSize: Number(event.target.value),
                    })
                  }
                  disabled={isPending}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pagination.pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    updateHistoryParams({ page: 1, query: "" });
                    setIsFilterDialogOpen(false);
                  }}
                  disabled={isPending}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5h18" />
      <path d="M6 12h12" />
      <path d="M10 19h4" />
    </svg>
  );
}

function TransactionRow({
  transaction,
  isSubmitting,
  onEdit,
  onDelete,
}: {
  transaction: TransactionView;
  isSubmitting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const signedAmount = getSignedAmount(transaction);
  const isTransfer = transaction.type === TransactionType.TRANSFER;
  const amountClass =
    signedAmount > 0
      ? "text-base font-bold text-emerald-700 sm:text-xl"
      : signedAmount < 0
        ? "text-base font-bold text-red-700 sm:text-xl"
        : "text-base font-bold text-zinc-950 sm:text-xl";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3 sm:hidden">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-950">
            {formatDisplayTitle(transaction.description)}
          </h2>
          <p className={amountClass}>
            <SensitiveAmount>
              {isTransfer
                ? formatRupiah(transaction.amount)
                : formatRupiah(signedAmount)}
            </SensitiveAmount>
          </p>
        </div>

        <div className="hidden flex-wrap items-center gap-1.5 sm:flex sm:gap-2">
          <h2 className="text-lg font-semibold text-zinc-950">
            {formatDisplayTitle(transaction.description)}
          </h2>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            {getTransactionTypeLabel(transaction.type)}
          </span>
          {transaction.isPrepaid ? (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
              Paid Early
            </span>
          ) : null}
          {transaction.isUnbudgetedExpense ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
              Unbudgeted Expense
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
            {getTransactionTypeLabel(transaction.type)}
          </span>
          {transaction.isPrepaid ? (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              Paid Early
            </span>
          ) : null}
          {transaction.isUnbudgetedExpense ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              Unbudgeted
            </span>
          ) : null}
        </div>

        <p className="mt-1 truncate text-[11px] text-zinc-500 sm:text-sm">
          {new Date(transaction.transactionDate).toLocaleDateString("id-ID")}{" "}
          - {transaction.userName}
        </p>
        <p className="mt-1 truncate text-[11px] text-zinc-500 sm:text-sm">
          {isTransfer
            ? `${transaction.walletName} -> ${transaction.transferToWalletName}`
            : `${transaction.walletName} - ${transaction.categoryName}${
                transaction.budgetCategoryName
                  ? ` - ${transaction.budgetCategoryName}`
                  : ""
              }`}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 sm:items-end sm:gap-3">
        <p className={`hidden sm:block ${amountClass}`}>
          <SensitiveAmount>
            {isTransfer
              ? formatRupiah(transaction.amount)
              : formatRupiah(signedAmount)}
          </SensitiveAmount>
        </p>
        {transaction.type === TransactionType.INCOME &&
        transaction.savingsAmount ? (
          <p className="text-xs font-medium text-blue-700">
            Savings:{" "}
            <SensitiveAmount>
              {formatRupiah(transaction.savingsAmount)}
            </SensitiveAmount>
          </p>
        ) : null}
        {transaction.type === TransactionType.INCOME ? (
          transaction.budgetMonth ? (
            <p className="text-xs font-medium text-emerald-700">
              Budgetable for{" "}
              {formatBudgetPeriod(transaction.budgetMonth.slice(0, 7))}:{" "}
              <SensitiveAmount>
                {formatRupiah(transaction.budgetableAmount)}
              </SensitiveAmount>
            </p>
          ) : (
            <p className="text-xs font-medium text-zinc-500">
              Tidak dialokasikan ke budget
            </p>
          )
        ) : null}
        {transaction.canManage ? (
          <div className="flex gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="rounded-md border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TransactionForm({
  form,
  wallets,
  categories,
  budgetCategories,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
  originalTransaction,
  stickyActions = false,
}: {
  form: TransactionFormState;
  wallets: WalletOption[];
  categories: CategoryOption[];
  budgetCategories: BudgetCategoryOption[];
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: TransactionFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  originalTransaction?: TransactionView;
  stickyActions?: boolean;
}) {
  const [isAmountCalculatorOpen, setIsAmountCalculatorOpen] = useState(false);
  const selectableCategories = categories.filter(
    (category) => category.type === form.type,
  );
  const categoryGroups = getCategoryGroups(categories, form.type);
  const isTransfer = form.type === TransactionType.TRANSFER;
  const selectedGroupCategories = selectableCategories.filter(
    (category) => category.group === form.categoryGroup,
  );
  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId,
  );
  const isTransferOutExpense =
    form.type === TransactionType.EXPENSE &&
    selectedCategory?.key === "transfer_out";
  const canUseTransferFee = isTransfer || isTransferOutExpense;
  const parsedAmount = parseIntegerAmount(form.amount) || 0;
  const parsedSavingsAmount = form.allocateSavings
    ? parseIntegerAmount(form.savingsAmount) || 0
    : 0;
  const parsedBudgetableAmount = calculateBudgetableIncomeAmount({
    incomeAmount: parsedAmount,
    savingsAmount: parsedSavingsAmount,
    allocateToBudget: form.allocateToBudget,
  });
  const parsedTransferFeeAmount =
    parseIntegerAmount(form.transferFeeAmount) || 0;
  const selectedTransferFeeOption = transferFeeOptions.find(
    (option) => option.value === form.transferFeeMethod,
  );
  const budgetImpactAmount = isTransfer
    ? parsedTransferFeeAmount
    : parsedAmount +
      (isTransferOutExpense && form.transferFeeEnabled
        ? parsedTransferFeeAmount
        : 0);
  const unbudgetedImpactAmount =
    parsedAmount +
    (isTransferOutExpense && form.transferFeeEnabled
      ? parsedTransferFeeAmount
      : 0);
  const availableBudgetCategories = budgetCategories.filter((category) =>
    category.periods.some((period) => period.month === form.budgetMonth),
  );
  const selectedBudgetAllocation = availableBudgetCategories
    .find((category) => category.id === form.budgetCategoryId)
    ?.periods.find((period) => period.month === form.budgetMonth);
  const editedExpenseAmount =
    originalTransaction?.type === TransactionType.EXPENSE &&
    originalTransaction.budgetCategoryId === form.budgetCategoryId &&
    originalTransaction.budgetMonth?.slice(0, 7) === form.budgetMonth
      ? originalTransaction.amount
      : 0;
  const currentCategoryRemaining = selectedBudgetAllocation
    ? selectedBudgetAllocation.amount -
      selectedBudgetAllocation.spent +
      editedExpenseAmount
    : null;
  const categoryRemainingAfterSave =
    currentCategoryRemaining === null
      ? null
      : currentCategoryRemaining - budgetImpactAmount;

  return (
    <form
      onSubmit={onSubmit}
      className={
        stickyActions
          ? "flex h-full min-h-0 flex-col"
          : "space-y-3 sm:space-y-4"
      }
    >
      <div
        className={
          stickyActions
            ? "min-h-0 flex-1 space-y-3 overflow-y-auto pb-3 pr-1 sm:space-y-4 sm:pb-4"
            : "space-y-3 sm:space-y-4"
        }
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Type
          </label>
          <select
            value={form.type}
            onChange={(event) =>
              onChange({
                ...form,
                type: event.target.value as TransactionType,
                categoryGroup: getDefaultCategoryGroup(
                  categories,
                  event.target.value as TransactionType,
                ),
                categoryId: "",
                budgetCategoryId: "",
                transferToWalletId: "",
                isUnbudgetedExpense: false,
                allocateToBudget: true,
                allocateSavings: false,
                savingsAmount: "",
                savingsNote: "",
                transferFeeEnabled: false,
                transferFeeMethod: "",
                transferFeeAmount: "",
              })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {transactionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              value={form.amount}
              onClick={() => setIsAmountCalculatorOpen(true)}
              readOnly
              inputMode="none"
              className="w-full cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Tap untuk hitung amount"
              required
            />
            <button
              type="button"
              onClick={() => setIsAmountCalculatorOpen(true)}
              className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Hitung
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Jumlahkan beberapa barang langsung di sini.
          </p>
        </div>

        {isAmountCalculatorOpen ? (
          <AmountCalculator
            initialAmount={parsedAmount}
            onApply={(amount) => {
              onChange({ ...form, amount: formatAmountInput(amount) });
              setIsAmountCalculatorOpen(false);
            }}
            onClose={() => setIsAmountCalculatorOpen(false)}
          />
        ) : null}

        {form.type === TransactionType.INCOME ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 sm:p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={form.allocateToBudget}
                onChange={(event) =>
                  onChange({
                    ...form,
                    allocateToBudget: event.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              Gunakan income ini untuk budget
            </label>
            {!form.allocateToBudget ? (
              <p className="mt-2 text-xs text-zinc-500">
                Income tetap masuk wallet dan cashflow, tetapi tidak menambah
                Budgetable Income.
              </p>
            ) : null}
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-700 sm:mt-4">
              <input
                type="checkbox"
                checked={form.allocateSavings}
                onChange={(event) =>
                  onChange({
                    ...form,
                    allocateSavings: event.target.checked,
                    savingsAmount: event.target.checked
                      ? form.savingsAmount
                      : "",
                    savingsNote: event.target.checked ? form.savingsNote : "",
                  })
                }
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              Masukkan sebagian ke Savings
            </label>

            {form.allocateSavings ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Savings Amount
                  </label>
                  <input
                    value={form.savingsAmount}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        savingsAmount: normalizeAmountInput(event.target.value),
                      })
                    }
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Rp 1.000.000"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Savings Note
                  </label>
                  <input
                    value={form.savingsNote}
                    onChange={(event) =>
                      onChange({ ...form, savingsNote: event.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Savings from salary"
                    maxLength={120}
                  />
                </div>
              </div>
            ) : null}
            <div className="mt-3 rounded-lg bg-white px-3 py-3 text-xs text-zinc-600 ring-1 ring-zinc-200">
              <p>Preview allocation</p>
              <p className="mt-2">
                Income tercatat: {formatRupiah(parsedAmount)}
              </p>
              <p>Savings bertambah: {formatRupiah(parsedSavingsAmount)}</p>
              {form.allocateToBudget ? (
                <>
                  <p className="mt-2 font-semibold text-emerald-700">
                    Budgetable for {formatBudgetPeriod(form.budgetMonth)}:{" "}
                    {formatRupiah(parsedBudgetableAmount)}
                  </p>
                  <p className="mt-2 text-zinc-500">
                    Sisa income menjadi saldo budgetable untuk periode pilihan.
                  </p>
                </>
              ) : (
                <p className="mt-2 font-semibold text-zinc-600">
                  Budgetable Income: {formatRupiah(0)}
                </p>
              )}
              {form.allocateToBudget &&
              form.allocateSavings &&
              parsedAmount > 0 &&
              parsedBudgetableAmount === 0 ? (
                <p className="mt-2 font-medium text-blue-700">
                  Income ini sepenuhnya masuk Savings dan tidak menambah saldo
                  budgetable periode ini.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            {isTransfer ? "From Wallet" : "Wallet"}
          </label>
          <select
            value={form.walletId}
            onChange={(event) =>
              onChange({ ...form, walletId: event.target.value })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          >
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
        </div>

        {isTransfer ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              To Wallet
            </label>
            <select
              value={form.transferToWalletId}
              onChange={(event) =>
                onChange({ ...form, transferToWalletId: event.target.value })
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            >
              <option value="">Select destination</option>
              {wallets
                .filter((wallet) => wallet.id !== form.walletId)
                .map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Group Kategori
              </label>
              <select
                value={form.categoryGroup}
                onChange={(event) =>
                  onChange({
                    ...form,
                    categoryGroup: event.target.value,
                    categoryId: "",
                  })
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
                disabled={categoryGroups.length === 0}
              >
                <option value="">Select group</option>
                {categoryGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Sub Kategori
              </label>
              <select
                value={form.categoryId}
                onChange={(event) => {
                  const category = selectableCategories.find(
                    (item) => item.id === event.target.value,
                  );

                  onChange({
                    ...form,
                    categoryId: event.target.value,
                    categoryGroup: category?.group || form.categoryGroup,
                    transferFeeEnabled:
                      category?.key === "transfer_out"
                        ? form.transferFeeEnabled
                        : false,
                    transferFeeMethod:
                      category?.key === "transfer_out"
                        ? form.transferFeeMethod
                        : "",
                    transferFeeAmount:
                      category?.key === "transfer_out"
                        ? form.transferFeeAmount
                        : "",
                  });
                }}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
                disabled={!form.categoryGroup}
              >
                <option value="">Select sub category</option>
                {selectedGroupCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {canUseTransferFee && !onCancel ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 sm:p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={form.transferFeeEnabled}
                onChange={(event) =>
                  onChange({
                    ...form,
                    transferFeeEnabled: event.target.checked,
                    transferFeeMethod: event.target.checked
                      ? form.transferFeeMethod || transferFeeOptions[0].value
                      : "",
                    transferFeeAmount: event.target.checked
                      ? form.transferFeeAmount ||
                        formatAmountInput(transferFeeOptions[0].amount)
                      : "",
                  })
                }
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              Biaya Admin
            </label>
            {form.transferFeeEnabled ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Metode Biaya Admin
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {transferFeeOptions.map((option) => {
                      const isSelected = form.transferFeeMethod === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            onChange({
                              ...form,
                              transferFeeMethod: option.value,
                              transferFeeAmount: formatAmountInput(
                                option.amount,
                              ),
                            })
                          }
                          className={
                            isSelected
                              ? "rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-left text-sm font-semibold text-indigo-700 ring-2 ring-indigo-100"
                              : "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                          }
                        >
                          <span className="block">{option.label}</span>
                          <span className="mt-1 block text-xs text-zinc-500">
                            {formatRupiah(option.amount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="hidden"
                    value={form.transferFeeAmount}
                    required
                  />
                </div>
                {isTransfer ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700">
                        Admin Fee Budget Period
                      </label>
                      <input
                        type="month"
                        value={form.budgetMonth}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            budgetMonth: event.target.value,
                            budgetCategoryId: getBudgetCategoryIdForMonth(
                              budgetCategories,
                              form.budgetCategoryId,
                              event.target.value,
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700">
                        Admin Fee Budget Category
                      </label>
                      <select
                        value={form.budgetCategoryId}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            budgetCategoryId: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        required
                      >
                        <option value="">
                          {availableBudgetCategories.length === 0
                            ? "No assigned budget category for this period"
                            : "Select budget category"}
                        </option>
                        {availableBudgetCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {selectedBudgetAllocation &&
                      currentCategoryRemaining !== null &&
                      categoryRemainingAfterSave !== null ? (
                        <div className="mt-3 rounded-lg bg-white px-3 py-3 text-xs text-zinc-600 ring-1 ring-zinc-200">
                          <p>
                            Current remaining:{" "}
                            {formatRupiah(currentCategoryRemaining)}
                          </p>
                          {categoryRemainingAfterSave < 0 ? (
                            <p className="mt-2 font-semibold text-red-700">
                              Fee will overspend by:{" "}
                              {formatRupiah(
                                Math.abs(categoryRemainingAfterSave),
                              )}
                            </p>
                          ) : (
                            <p className="mt-2 font-semibold text-emerald-700">
                              Remaining after fee:{" "}
                              {formatRupiah(categoryRemainingAfterSave)}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="rounded-lg bg-white px-3 py-2 text-xs text-zinc-600 ring-1 ring-zinc-200">
                    Biaya admin mengikuti budget period dan budget category
                    transaksi Transfer Keluar.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Date
          </label>
          <input
            type="date"
            value={form.transactionDate}
            onChange={(event) => {
              const nextTransactionDate = event.target.value;
              const nextTransactionMonth = nextTransactionDate.slice(0, 7);

              // If budgetMonth was in sync with previous transaction month, keep them in sync
              const prevTransactionMonth = form.transactionDate.slice(0, 7);
              const budgetMonthWasSynced =
                form.budgetMonth === prevTransactionMonth;

              const nextBudgetMonth = budgetMonthWasSynced
                ? nextTransactionMonth
                : form.budgetMonth;

              onChange({
                ...form,
                transactionDate: nextTransactionDate,
                budgetMonth: nextBudgetMonth,
                budgetCategoryId: getBudgetCategoryIdForMonth(
                  budgetCategories,
                  form.budgetCategoryId,
                  nextBudgetMonth,
                ),
              });
            }}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>

        {form.type === TransactionType.EXPENSE ||
        (form.type === TransactionType.INCOME && form.allocateToBudget) ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              {form.type === TransactionType.EXPENSE && form.isUnbudgetedExpense
                ? "Reporting Period"
                : "Budget Period"}
            </label>
            <input
              type="month"
              value={form.budgetMonth}
              onChange={(event) => {
                const nextBudgetMonth = event.target.value;

                onChange({
                  ...form,
                  budgetMonth: nextBudgetMonth,
                  budgetCategoryId: getBudgetCategoryIdForMonth(
                    budgetCategories,
                    form.budgetCategoryId,
                    nextBudgetMonth,
                  ),
                });
              }}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />
            {form.type === TransactionType.EXPENSE &&
            !form.isUnbudgetedExpense &&
            form.budgetMonth > form.transactionDate.slice(0, 7) ? (
              <p className="mt-2 text-xs font-medium text-blue-700">
                Akan ditandai Paid Early karena pembayaran terjadi sebelum
                budget period.
              </p>
            ) : null}
            {form.type === TransactionType.EXPENSE &&
            form.isUnbudgetedExpense ? (
              <p className="mt-2 text-xs text-zinc-500">
                Digunakan untuk merangkum pengeluaran unbudgeted pada periode
                ini.
              </p>
            ) : null}
          </div>
        ) : null}

        {form.type === TransactionType.EXPENSE ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Expense Allocation
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.isUnbudgetedExpense}
                onChange={(event) =>
                  onChange({
                    ...form,
                    isUnbudgetedExpense: event.target.checked,
                    budgetCategoryId: event.target.checked
                      ? ""
                      : form.budgetCategoryId,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block font-medium">Unbudgeted Expense</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Untuk pengeluaran tidak direncanakan seperti tilang atau ban
                  bocor. Saldo wallet berkurang, tetapi tidak memotong envelope.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        {form.type === TransactionType.EXPENSE && !form.isUnbudgetedExpense ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Budget Category
            </label>
            <select
              value={form.budgetCategoryId}
              onChange={(event) =>
                onChange({ ...form, budgetCategoryId: event.target.value })
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            >
              <option value="">
                {availableBudgetCategories.length === 0
                  ? "No assigned budget category for this month"
                  : "No budget category"}
              </option>
              {availableBudgetCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {selectedBudgetAllocation &&
            currentCategoryRemaining !== null &&
            categoryRemainingAfterSave !== null ? (
              <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-3 text-xs text-zinc-600 ring-1 ring-zinc-200">
                <p>
                  Current remaining: {formatRupiah(currentCategoryRemaining)}
                </p>
                {categoryRemainingAfterSave < 0 ? (
                  <>
                    <p className="mt-2 font-semibold text-red-700">
                      Overspent by:{" "}
                      {formatRupiah(Math.abs(categoryRemainingAfterSave))}
                    </p>
                    <p className="mt-1 text-zinc-500">
                      Expense tetap dapat disimpan, tetapi budget category akan
                      melebihi alokasi.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 font-semibold text-emerald-700">
                    Remaining after save:{" "}
                    {formatRupiah(categoryRemainingAfterSave)}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {form.type === TransactionType.EXPENSE && form.isUnbudgetedExpense ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
            <p className="font-semibold">Impact preview</p>
            <p className="mt-1">
              Available to Budget untuk {formatBudgetPeriod(form.budgetMonth)}{" "}
              akan berkurang sebesar {formatRupiah(unbudgetedImpactAmount)}.
            </p>
            <p className="mt-1 text-amber-700">
              Expense ini tidak memotong envelope, tapi tetap mengurangi saldo
              wallet.
            </p>
          </div>
        ) : null}

        {form.type === TransactionType.EXPENSE &&
        !form.isUnbudgetedExpense &&
        selectedBudgetAllocation &&
        currentCategoryRemaining !== null &&
        categoryRemainingAfterSave !== null ? (
          <div
            className={
              categoryRemainingAfterSave < 0
                ? "rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-800"
                : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800"
            }
          >
            <p className="font-semibold">Impact preview</p>
            <p className="mt-1">
              Envelope {selectedBudgetAllocation ? "akan tersisa" : ""}{" "}
              {formatRupiah(categoryRemainingAfterSave)} setelah transaksi ini.
            </p>
            {categoryRemainingAfterSave < 0 ? (
              <p className="mt-1">
                Ini akan membuat envelope overspent sebesar{" "}
                {formatRupiah(Math.abs(categoryRemainingAfterSave))}.
              </p>
            ) : null}
          </div>
        ) : null}

        {canUseTransferFee &&
        form.transferFeeEnabled &&
        parsedTransferFeeAmount > 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-800">
            <p className="font-semibold">Impact preview</p>
            <p className="mt-1">
              {isTransfer
                ? "Transfer dicatat sebagai perpindahan saldo."
                : "Transfer keluar dicatat sebagai expense utama."}{" "}
              Biaya admin {selectedTransferFeeOption?.label || "transfer"}{" "}
              sebesar {formatRupiah(parsedTransferFeeAmount)} mengikuti budget
              period dan allocation transaksi ini.
            </p>
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Note
          </label>
          <input
            value={form.description}
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Lunch, salary, top up"
            maxLength={120}
          />
        </div>
      </div>

      <div
        className={
          stickyActions
            ? "flex shrink-0 gap-2 border-t border-zinc-100 bg-white pt-3 sm:pt-4"
            : "flex gap-2"
        }
      >
        <button
          type="submit"
          disabled={isSubmitting || wallets.length === 0}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 sm:px-4 sm:text-sm"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

type AmountCalculatorOperator = "+" | "-" | "x";

type AmountCalculatorTerm = {
  operator: AmountCalculatorOperator;
  amount: number;
};

function calculateTermsTotal(terms: AmountCalculatorTerm[]) {
  return terms.reduce((total, term, index) => {
    if (index === 0) {
      return term.operator === "-" ? -term.amount : term.amount;
    }

    if (term.operator === "+") {
      return total + term.amount;
    }

    if (term.operator === "-") {
      return total - term.amount;
    }

    return total * term.amount;
  }, 0);
}

function AmountCalculator({
  initialAmount,
  onApply,
  onClose,
}: {
  initialAmount: number;
  onApply: (amount: number) => void;
  onClose: () => void;
}) {
  const [terms, setTerms] = useState<AmountCalculatorTerm[]>([]);
  const [operator, setOperator] = useState<AmountCalculatorOperator>("+");
  const [entry, setEntry] = useState(
    initialAmount > 0 ? String(initialAmount) : "",
  );
  const currentTerms =
    entry === "" ? terms : [...terms, { operator, amount: Number(entry) }];
  const total = calculateTermsTotal(currentTerms);

  const appendDigits = (digits: string) => {
    setEntry((current) => {
      const nextValue = `${current}${digits}`.replace(/^0+(?=\d)/, "");

      return nextValue.slice(0, 15);
    });
  };

  const selectOperator = (nextOperator: AmountCalculatorOperator) => {
    if (entry !== "") {
      setTerms(currentTerms);
      setEntry("");
    }

    setOperator(nextOperator);
  };

  const clear = () => {
    setTerms([]);
    setOperator("+");
    setEntry("");
  };

  const expression = currentTerms
    .map((term, index) => {
      const prefix =
        index === 0 && term.operator === "+" ? "" : `${term.operator} `;

      return `${prefix}${formatAmountInput(term.amount)}`;
    })
    .join(" ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-2 sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Amount calculator"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-3 shadow-xl sm:rounded-2xl sm:p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950 sm:text-base">
              Kalkulator Amount
            </h3>
            <p className="text-xs text-zinc-500">
              Hitung item secara berurutan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 sm:px-3 sm:py-2 sm:text-sm"
          >
            Tutup
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-zinc-950 px-3 py-2.5 text-right text-white sm:mt-4 sm:px-4 sm:py-3">
          <p className="min-h-5 truncate text-xs text-zinc-400">
            {expression || "Masukkan harga barang"}
          </p>
          <p className="mt-1.5 text-xl font-semibold sm:mt-2 sm:text-2xl">
            {formatRupiah(total)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:mt-4 sm:gap-2">
          {["7", "8", "9"].map((digit) => (
            <CalculatorButton key={digit} onClick={() => appendDigits(digit)}>
              {digit}
            </CalculatorButton>
          ))}
          <CalculatorButton accent onClick={() => selectOperator("+")}>
            +
          </CalculatorButton>
          {["4", "5", "6"].map((digit) => (
            <CalculatorButton key={digit} onClick={() => appendDigits(digit)}>
              {digit}
            </CalculatorButton>
          ))}
          <CalculatorButton accent onClick={() => selectOperator("-")}>
            -
          </CalculatorButton>
          {["1", "2", "3"].map((digit) => (
            <CalculatorButton key={digit} onClick={() => appendDigits(digit)}>
              {digit}
            </CalculatorButton>
          ))}
          <CalculatorButton accent onClick={() => selectOperator("x")}>
            x
          </CalculatorButton>
          <CalculatorButton onClick={() => appendDigits("000")}>
            000
          </CalculatorButton>
          <CalculatorButton onClick={() => appendDigits("0")}>
            0
          </CalculatorButton>
          <CalculatorButton
            onClick={() => setEntry((current) => current.slice(0, -1))}
          >
            Hapus
          </CalculatorButton>
          <CalculatorButton onClick={clear}>C</CalculatorButton>
        </div>

        <button
          type="button"
          onClick={() => onApply(total)}
          disabled={total <= 0}
          className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-4 sm:py-3"
        >
          Gunakan Total {total > 0 ? formatRupiah(total) : ""}
        </button>
      </div>
    </div>
  );
}

function CalculatorButton({
  children,
  onClick,
  accent = false,
}: {
  children: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2 py-3 text-sm font-semibold transition sm:py-4 sm:text-base ${
        accent
          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
