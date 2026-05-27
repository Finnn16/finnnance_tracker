"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  calculateBudgetableIncomeAmount,
  monthInputValue,
} from "@/lib/budgets";
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
): TransactionFormState {
  const defaultWallet =
    wallets.find((wallet) => wallet.isDefault) || wallets[0];
  const transactionDate = todayInputValue();
  const defaultBudgetMonth = monthInputValue(new Date(transactionDate));

  return {
    type: TransactionType.EXPENSE,
    amount: "",
    walletId: defaultWallet?.id || "",
    transferToWalletId: "",
    categoryGroup: getDefaultCategoryGroup(categories, TransactionType.EXPENSE),
    categoryId: "",
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
  const [transactions, setTransactions] = useState(initialTransactions);
  const [createForm, setCreateForm] = useState(() =>
    createEmptyForm(wallets, categories),
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
        setError(data.error || "Failed to create transaction.");
        return;
      }

      setCreateForm(createEmptyForm(wallets, categories));
      setTransactions((current) => [
        ...(data.transactions || (data.transaction ? [data.transaction] : [])),
        ...current,
      ]);
    } catch {
      setError("Failed to create transaction. Please try again.");
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
        setError(data.error || "Failed to update transaction.");
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
    } catch {
      setError("Failed to update transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to delete transaction.");
        return;
      }

      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== transactionId),
      );
    } catch {
      setError("Failed to delete transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-4">
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

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-sm text-zinc-500 shadow-sm">
              No transactions yet.
            </div>
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

      <aside className="rounded-lg bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
        <h2 className="text-lg font-semibold text-zinc-950">Add Transaction</h2>
        <div className="mt-5">
          <TransactionForm
            form={createForm}
            wallets={wallets}
            categories={categories}
            budgetCategories={budgetCategories}
            submitLabel="Add Transaction"
            isSubmitting={isSubmitting}
            onChange={setCreateForm}
            onSubmit={handleCreate}
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
      <p className="mt-2 text-2xl font-bold text-zinc-950">{value}</p>
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
            {transaction.description}
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
          {isTransfer
            ? formatRupiah(transaction.amount)
            : formatRupiah(signedAmount)}
        </p>
        {transaction.type === TransactionType.INCOME &&
        transaction.savingsAmount ? (
          <p className="text-xs font-medium text-blue-700">
            Savings: {formatRupiah(transaction.savingsAmount)}
          </p>
        ) : null}
        {transaction.type === TransactionType.INCOME ? (
          transaction.budgetMonth ? (
            <p className="text-xs font-medium text-emerald-700">
              Budgetable for{" "}
              {formatBudgetPeriod(transaction.budgetMonth.slice(0, 7))}:{" "}
              {formatRupiah(transaction.budgetableAmount)}
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
}) {
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
    <form onSubmit={onSubmit} className="space-y-4">
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
        <input
          value={form.amount}
          onChange={(event) =>
            onChange({
              ...form,
              amount: normalizeAmountInput(event.target.value),
            })
          }
          inputMode="numeric"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Rp 30.000"
          required
        />
      </div>

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
                  savingsAmount: event.target.checked ? form.savingsAmount : "",
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
            <p className="mt-2">Income tercatat: {formatRupiah(parsedAmount)}</p>
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
                    onChange({ ...form, budgetCategoryId: event.target.value })
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

      {(form.type === TransactionType.EXPENSE ||
        (form.type === TransactionType.INCOME && form.allocateToBudget)) ? <div>
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
            Akan ditandai Paid Early karena pembayaran terjadi sebelum budget
            period.
          </p>
        ) : null}
        {form.type === TransactionType.EXPENSE &&
        form.isUnbudgetedExpense ? (
          <p className="mt-2 text-xs text-zinc-500">
            Digunakan untuk merangkum pengeluaran unbudgeted pada periode ini.
          </p>
        ) : null}
      </div> : null}

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

      <div className="flex gap-2">
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
