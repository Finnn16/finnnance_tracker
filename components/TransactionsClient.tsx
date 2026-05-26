"use client";

import { FormEvent, useMemo, useState } from "react";

import { TransactionType } from "@/lib/prisma-enums";
import {
  formatAmountInput,
  formatRupiah,
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
  transferFeeEnabled: boolean;
  transferFeeAmount: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
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

function createEmptyForm(
  wallets: WalletOption[],
  categories: CategoryOption[],
): TransactionFormState {
  const defaultWallet =
    wallets.find((wallet) => wallet.isDefault) || wallets[0];

  return {
    type: TransactionType.EXPENSE,
    amount: "",
    walletId: defaultWallet?.id || "",
    transferToWalletId: "",
    categoryGroup: getDefaultCategoryGroup(categories, TransactionType.EXPENSE),
    categoryId: "",
    budgetCategoryId: "",
    description: "",
    transactionDate: todayInputValue(),
    transferFeeEnabled: false,
    transferFeeAmount: "",
  };
}

function transactionToForm(
  transaction: TransactionView,
  categories: CategoryOption[],
): TransactionFormState {
  const categoryGroup =
    categories.find((category) => category.id === transaction.categoryId)
      ?.group || "";

  return {
    type: transaction.type,
    amount: formatAmountInput(String(transaction.amount)),
    walletId: transaction.walletId,
    transferToWalletId: transaction.transferToWalletId || "",
    categoryGroup,
    categoryId: transaction.categoryId || "",
    budgetCategoryId: transaction.budgetCategoryId || "",
    description: transaction.description,
    transactionDate: transaction.transactionDate.slice(0, 10),
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
    budgetCategoryId: form.budgetCategoryId || null,
    description: form.description,
    transactionDate: form.transactionDate,
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
    setEditForm(transactionToForm(transaction, categories));
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
}) {
  const selectableCategories = categories.filter(
    (category) => category.type === form.type,
  );
  const categoryGroups = getCategoryGroups(categories, form.type);
  const isTransfer = form.type === TransactionType.TRANSFER;
  const selectedGroupCategories = selectableCategories.filter(
    (category) => category.group === form.categoryGroup,
  );

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

          {form.type === TransactionType.EXPENSE ? (
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
              >
                <option value="">No budget category</option>
                {budgetCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Nominal Biaya Admin
              </label>
              <input
                value={form.transferFeeAmount}
                onChange={(event) =>
                  onChange({
                    ...form,
                    transferFeeAmount: normalizeAmountInput(event.target.value),
                  })
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Rp 1.000"
                required
              />
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
          onChange={(event) =>
            onChange({ ...form, transactionDate: event.target.value })
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          required
        />
      </div>

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
