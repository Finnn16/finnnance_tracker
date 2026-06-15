"use client";

import { FormEvent, useState } from "react";

import { WalletType } from "@/lib/prisma-enums";
import {
  formatAmountInput,
  formatRupiah,
  normalizeAmountInput,
  parseIntegerAmount,
} from "@/lib/money";
import { SensitiveAmount } from "@/components/PrivacyMode";
import { getWalletTypeLabel, walletTypeOptions } from "@/lib/wallets";
import { EmptyState } from "@/components/EmptyState";

type WalletView = {
  id: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  currentBalance: number;
  isDefault: boolean;
  transactionCount: number;
  lastReconciledAt: string | null;
  reconciliationHistory: WalletReconciliationView[];
};

type WalletReconciliationView = {
  id: string;
  systemBalance: number;
  actualBalance: number;
  difference: number;
  reason: string;
  note: string | null;
  reconciledAt: string;
};

type WalletFormState = {
  name: string;
  type: WalletType;
  initialBalance: string;
  isDefault: boolean;
};

type ReconcileFormState = {
  actualBalance: string;
  reason: string;
  note: string;
};

const emptyForm: WalletFormState = {
  name: "",
  type: WalletType.BANK,
  initialBalance: formatAmountInput("0"),
  isDefault: false,
};

const reconcileReasons = [
  { value: "admin_fee", label: "Biaya admin" },
  { value: "forgotten_transaction", label: "Transaksi lupa dicatat" },
  { value: "balance_correction", label: "Koreksi saldo" },
  { value: "unknown", label: "Unknown" },
];

function reasonLabel(value: string) {
  return (
    reconcileReasons.find((reason) => reason.value === value)?.label ||
    "Unknown"
  );
}

function formatRelativeReconcileDate(value: string | null) {
  if (!value) {
    return "Belum pernah";
  }

  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return `${diffDays} hari lalu`;
}

function syncStatus(value: string | null) {
  if (!value) {
    return {
      label: "Belum dicek",
      className: "bg-amber-50 text-amber-700",
    };
  }

  const diffDays = Math.floor(
    (Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays > 7) {
    return {
      label: "Perlu dicek",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Synced",
    className: "bg-emerald-50 text-emerald-700",
  };
}

function toFormState(wallet: WalletView): WalletFormState {
  return {
    name: wallet.name,
    type: wallet.type,
    initialBalance: formatAmountInput(wallet.initialBalance),
    isDefault: wallet.isDefault,
  };
}

function toPayload(form: WalletFormState) {
  return {
    name: form.name,
    type: form.type,
    initialBalance: form.initialBalance,
    isDefault: form.isDefault,
  };
}

export function WalletsClient({
  initialWallets,
}: {
  initialWallets: WalletView[];
}) {
  const [wallets, setWallets] = useState(initialWallets);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editWalletId, setEditWalletId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reconcileWallet, setReconcileWallet] = useState<WalletView | null>(
    null,
  );
  const [reconcileForm, setReconcileForm] = useState<ReconcileFormState>({
    actualBalance: "",
    reason: "balance_correction",
    note: "",
  });
  const parsedReconcileActual = parseIntegerAmount(
    reconcileForm.actualBalance,
  );
  const reconcileDifference =
    reconcileWallet && parsedReconcileActual !== null
      ? parsedReconcileActual - reconcileWallet.currentBalance
      : 0;

  const refreshWallets = async () => {
    const response = await fetch("/api/wallets");
    const data = (await response.json()) as { wallets?: WalletView[] };

    if (response.ok && data.wallets) {
      setWallets(data.wallets);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(createForm)),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to create wallet.");
        return;
      }

      setCreateForm(emptyForm);
      setIsCreateDialogOpen(false);
      await refreshWallets();
    } catch {
      setError("Failed to create wallet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (wallet: WalletView) => {
    setError(null);
    setEditWalletId(wallet.id);
    setEditForm(toFormState(wallet));
  };

  const startReconcile = (wallet: WalletView) => {
    setError(null);
    setReconcileWallet(wallet);
    setReconcileForm({
      actualBalance: formatAmountInput(wallet.currentBalance),
      reason: "balance_correction",
      note: "",
    });
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editWalletId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/wallets/${editWalletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(editForm)),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to update wallet.");
        return;
      }

      setEditWalletId(null);
      await refreshWallets();
    } catch {
      setError("Failed to update wallet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (walletId: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/wallets/${walletId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to delete wallet.");
        return;
      }

      await refreshWallets();
    } catch {
      setError("Failed to delete wallet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconcile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reconcileWallet) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/wallets/${reconcileWallet.id}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reconcileForm),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to reconcile wallet.");
        return;
      }

      setReconcileWallet(null);
      await refreshWallets();
    } catch {
      setError("Failed to reconcile wallet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Wallets</p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {wallets.length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Default</p>
            <p className="mt-2 truncate text-2xl font-bold text-zinc-950">
              {wallets.find((wallet) => wallet.isDefault)?.name || "-"}
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          {wallets.length === 0 ? (
            <EmptyState
              icon="💰"
              title="No wallets yet"
              description="Create your first wallet to start tracking your money."
            />
          ) : null}

          {wallets.map((wallet) => (
            <article
              key={wallet.id}
              className="rounded-lg bg-white p-5 shadow-sm"
            >
              {editWalletId === wallet.id ? (
                <WalletForm
                  form={editForm}
                  submitLabel="Save Wallet"
                  isSubmitting={isSubmitting}
                  onChange={setEditForm}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditWalletId(null)}
                />
              ) : (
                <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-zinc-950">
                        {wallet.name}
                      </h2>
                      {wallet.isDefault ? (
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                          Default
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${syncStatus(wallet.lastReconciledAt).className}`}
                      >
                        {syncStatus(wallet.lastReconciledAt).label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {getWalletTypeLabel(wallet.type)} -{" "}
                      {wallet.transactionCount} transaction(s)
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Last reconciled:{" "}
                      {formatRelativeReconcileDate(wallet.lastReconciledAt)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <p className="text-xl font-bold text-zinc-950">
                      <SensitiveAmount>
                        {formatRupiah(wallet.currentBalance)}
                      </SensitiveAmount>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startReconcile(wallet)}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                      >
                        Reconcile
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(wallet)}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(wallet.id)}
                        disabled={isSubmitting}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {wallet.reconciliationHistory.length > 0 ? (
                  <div className="rounded-lg bg-zinc-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Recent reconcile
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {wallet.reconciliationHistory.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 text-xs text-zinc-500"
                        >
                          <span className="min-w-0 truncate">
                            {reasonLabel(item.reason)} -{" "}
                            {new Intl.DateTimeFormat("id-ID", {
                              day: "2-digit",
                              month: "short",
                            }).format(new Date(item.reconciledAt))}
                          </span>
                          <span
                            className={
                              item.difference < 0
                                ? "font-semibold text-red-700"
                                : item.difference > 0
                                  ? "font-semibold text-emerald-700"
                                  : "font-semibold text-zinc-500"
                            }
                          >
                            {item.difference > 0 ? "+" : ""}
                            <SensitiveAmount>
                              {formatRupiah(item.difference)}
                            </SensitiveAmount>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <aside className="hidden rounded-lg bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:block lg:self-start">
        <h2 className="text-lg font-semibold text-zinc-950">Add Wallet</h2>
        <div className="mt-5">
          <WalletForm
            form={createForm}
            submitLabel="Add Wallet"
            isSubmitting={isSubmitting}
            onChange={setCreateForm}
            onSubmit={handleCreate}
          />
        </div>
      </aside>
    </div>

      <button
        type="button"
        onClick={() => setIsCreateDialogOpen(true)}
        aria-label="Add wallet"
        title="Add wallet"
        className="fixed bottom-36 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-95 lg:hidden"
      >
        <PlusIcon />
      </button>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/45 p-3 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-wallet-dialog-title"
          onClick={() => setIsCreateDialogOpen(false)}
        >
          <div
            className="flex max-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <h2
                id="add-wallet-dialog-title"
                className="text-base font-semibold text-zinc-950"
              >
                Add Wallet
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateDialogOpen(false)}
                aria-label="Close wallet form"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  X
                </span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
              <WalletForm
                form={createForm}
                submitLabel="Add Wallet"
                isSubmitting={isSubmitting}
                onChange={setCreateForm}
                onSubmit={handleCreate}
              />
            </div>
          </div>
        </div>
      ) : null}

      {reconcileWallet ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/45 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reconcile-wallet-dialog-title"
          onClick={() => setReconcileWallet(null)}
        >
          <form
            onSubmit={handleReconcile}
            className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h2
                  id="reconcile-wallet-dialog-title"
                  className="text-base font-semibold text-zinc-950"
                >
                  Reconcile {reconcileWallet.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Cocokkan saldo sistem dengan saldo aktual ATM/banking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReconcileWallet(null)}
                aria-label="Close reconcile form"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  X
                </span>
              </button>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl bg-zinc-50 px-3 py-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-zinc-500">Saldo sistem</p>
                <p className="mt-1 font-semibold text-zinc-950">
                  <SensitiveAmount>
                    {formatRupiah(reconcileWallet.currentBalance)}
                  </SensitiveAmount>
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Saldo aktual</p>
                <p className="mt-1 font-semibold text-zinc-950">
                  <SensitiveAmount>
                    {parsedReconcileActual !== null
                      ? formatRupiah(parsedReconcileActual)
                      : "-"}
                  </SensitiveAmount>
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Selisih</p>
                <p
                  className={
                    reconcileDifference < 0
                      ? "mt-1 font-semibold text-red-700"
                      : reconcileDifference > 0
                        ? "mt-1 font-semibold text-emerald-700"
                        : "mt-1 font-semibold text-zinc-950"
                  }
                >
                  {reconcileDifference > 0 ? "+" : ""}
                  <SensitiveAmount>
                    {formatRupiah(reconcileDifference)}
                  </SensitiveAmount>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Saldo aktual ATM/banking
                </label>
                <input
                  value={reconcileForm.actualBalance}
                  onChange={(event) =>
                    setReconcileForm({
                      ...reconcileForm,
                      actualBalance: normalizeAmountInput(event.target.value),
                    })
                  }
                  inputMode="numeric"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Reason
                </label>
                <select
                  value={reconcileForm.reason}
                  onChange={(event) =>
                    setReconcileForm({
                      ...reconcileForm,
                      reason: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {reconcileReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Note
                </label>
                <input
                  value={reconcileForm.note}
                  onChange={(event) =>
                    setReconcileForm({
                      ...reconcileForm,
                      note: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Opsional"
                  maxLength={160}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting || parsedReconcileActual === null}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save Reconcile"}
              </button>
              <button
                type="button"
                onClick={() => setReconcileWallet(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </form>
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

function WalletForm({
  form,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: WalletFormState;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: WalletFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="BCA, Cash, GoPay"
          maxLength={40}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          Type
        </label>
        <select
          value={form.type}
          onChange={(event) =>
            onChange({ ...form, type: event.target.value as WalletType })
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          {walletTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          Initial Balance
        </label>
        <input
          value={form.initialBalance}
          onChange={(event) =>
            onChange({
              ...form,
              initialBalance: normalizeAmountInput(event.target.value),
            })
          }
          inputMode="numeric"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Rp 0"
          required
        />
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(event) =>
            onChange({ ...form, isDefault: event.target.checked })
          }
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
        />
        Set as default wallet
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
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
