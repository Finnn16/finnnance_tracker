"use client";

import { FormEvent, useMemo, useState } from "react";
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
  transferFeeAmount: string;
};

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
  wallets,
  categories,
  budgetCategories,
}: {
  initialTransactions: TransactionView[];
  wallets: WalletOption[];
  categories: CategoryOption[];
  budgetCategories: BudgetCategoryOption[];
}) {
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

  const totals = useMemo(
    () =>
      transactions.reduce(
        (summary, transaction) => {
          if (transaction.type === TransactionType.INCOME) {
            summary.income += transaction.amount;
          }

          if (transaction.type === TransactionType.EXPENSE) {
            summary.expense += transaction.amount;
          }

          return summary;
        },
        { income: 0, expense: 0 },
      ),
    [transactions],
  );

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
      setTransactions((current) => [...newTransactions, ...current]);
      setCreateForm(createEmptyForm(wallets, categories, preferences));

      toast.success("Transaction added", { id: toastId });
    } catch (error) {
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
    } catch (error) {
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

      toast.success("Transaction deleted", { id: toastId });
    } catch (error) {
      const errorMsg = "Failed to delete transaction. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-col gap-6 overflow-auto lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
      <section className="flex min-h-0 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Income" value={formatRupiah(totals.income)} />
          <SummaryCard label="Expense" value={formatRupiah(totals.expense)} />
          <SummaryCard
            label="Net"
            value={formatRupiah(totals.income - totals.expense)}
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 space-y-3 lg:overflow-y-auto lg:pr-2">
          {transactions.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No transactions yet"
              description="Start tracking your finances by adding your first transaction."
            />
          ) : null}

          {transactions.map((transaction) => (
            <article
              key={transaction.id}
              className="rounded-lg bg-white p-5 shadow-sm"
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
      </section>

      <aside className="flex min-h-[640px] flex-col overflow-hidden rounded-lg bg-white p-5 shadow-sm lg:min-h-0 lg:self-stretch">
        <h2 className="text-lg font-semibold text-zinc-950">Add Transaction</h2>
        <div className="mt-5 min-h-0 flex-1">
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
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-950">
        <SensitiveAmount>{value}</SensitiveAmount>
      </p>
    </div>
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
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
        <p className="mt-1 text-sm text-zinc-500">
          {new Date(transaction.transactionDate).toLocaleDateString("id-ID")} -{" "}
          {transaction.userName}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {isTransfer
            ? `${transaction.walletName} -> ${transaction.transferToWalletName}`
            : `${transaction.walletName} - ${transaction.categoryName}${
                transaction.budgetCategoryName
                  ? ` - ${transaction.budgetCategoryName}`
                  : ""
              }`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <p
          className={
            signedAmount > 0
              ? "text-xl font-bold text-emerald-700"
              : signedAmount < 0
                ? "text-xl font-bold text-red-700"
                : "text-xl font-bold text-zinc-950"
          }
        >
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
  const budgetImpactAmount = isTransfer
    ? parsedTransferFeeAmount
    : parsedAmount;
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
      className={stickyActions ? "flex h-full min-h-0 flex-col" : "space-y-4"}
    >
      <div
        className={
          stickyActions
            ? "min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1"
            : "space-y-4"
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
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
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
            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-zinc-700">
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

        {isTransfer && !onCancel ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={form.transferFeeEnabled}
                onChange={(event) =>
                  onChange({
                    ...form,
                    transferFeeEnabled: event.target.checked,
                    transferFeeAmount: event.target.checked
                      ? form.transferFeeAmount
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
                    Nominal Biaya Admin
                  </label>
                  <input
                    value={form.transferFeeAmount}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        transferFeeAmount: normalizeAmountInput(
                          event.target.value,
                        ),
                      })
                    }
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Rp 1.000"
                    required
                  />
                </div>
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
                          {formatRupiah(Math.abs(categoryRemainingAfterSave))}
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
            ? "flex shrink-0 gap-2 border-t border-zinc-100 bg-white pt-4"
            : "flex gap-2"
        }
      >
        <button
          type="submit"
          disabled={isSubmitting || wallets.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Amount calculator"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-950">
              Kalkulator Amount
            </h3>
            <p className="text-xs text-zinc-500">
              Hitung item secara berurutan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
          >
            Tutup
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-zinc-950 px-4 py-3 text-right text-white">
          <p className="min-h-5 truncate text-xs text-zinc-400">
            {expression || "Masukkan harga barang"}
          </p>
          <p className="mt-2 text-2xl font-semibold">{formatRupiah(total)}</p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
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
          className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      className={`rounded-xl px-2 py-4 text-base font-semibold transition ${
        accent
          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
