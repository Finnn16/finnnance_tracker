"use client";

import { FormEvent, useMemo, useState } from "react";

import { WalletType } from "@/lib/generated/prisma/enums";
import { formatRupiah } from "@/lib/money";
import { getWalletTypeLabel, walletTypeOptions } from "@/lib/wallets";

type WalletView = {
  id: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  currentBalance: number;
  isDefault: boolean;
  transactionCount: number;
};

type WalletFormState = {
  name: string;
  type: WalletType;
  initialBalance: string;
  isDefault: boolean;
};

const emptyForm: WalletFormState = {
  name: "",
  type: WalletType.BANK,
  initialBalance: "0",
  isDefault: false,
};

function toFormState(wallet: WalletView): WalletFormState {
  return {
    name: wallet.name,
    type: wallet.type,
    initialBalance: String(wallet.initialBalance),
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

  const totalBalance = useMemo(
    () => wallets.reduce((total, wallet) => total + wallet.currentBalance, 0),
    [wallets],
  );

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Balance</p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {formatRupiah(totalBalance)}
            </p>
          </div>
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
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {getWalletTypeLabel(wallet.type)} -{" "}
                      {wallet.transactionCount} transaction(s)
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <p className="text-xl font-bold text-zinc-950">
                      {formatRupiah(wallet.currentBalance)}
                    </p>
                    <div className="flex gap-2">
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
              )}
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-lg bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
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
              initialBalance: event.target.value.replace(/[^\d-]/g, ""),
            })
          }
          inputMode="numeric"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="0"
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
