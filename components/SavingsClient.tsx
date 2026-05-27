"use client";

import { FormEvent, useState } from "react";

import { monthInputValue } from "@/lib/budgets";
import {
  formatRupiah,
  normalizeAmountInput,
  parseIntegerAmount,
} from "@/lib/money";

type SavingsSummary = {
  currentBalance: number;
  availableToSpend: number;
  totalWalletBalance: number;
  addedThisMonth: number;
  usedThisMonth: number;
  adjustmentThisMonth: number;
  lastReconciledAt: string | null;
  period?: string;
};

type SavingsHistoryItem = {
  id: string;
  type: "ADD" | "WITHDRAW" | "ADJUSTMENT";
  amount: number;
  note: string | null;
  date: string;
  userName: string;
  userEmail: string;
  sourceTransactionId: string | null;
};

type WalletOption = {
  id: string;
  name: string;
  ownerName: string;
};

type CategoryOption = {
  id: string;
  name: string;
  group: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function typeLabel(type: SavingsHistoryItem["type"]) {
  if (type === "ADD") {
    return "Added";
  }

  if (type === "WITHDRAW") {
    return "Withdraw";
  }

  return "Adjustment";
}

export function SavingsClient({
  summary: initialSummary,
  history: initialHistory,
  wallets,
  categories,
}: {
  summary: SavingsSummary;
  history: SavingsHistoryItem[];
  wallets: WalletOption[];
  categories: CategoryOption[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [history, setHistory] = useState(initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageType, setUsageType] = useState<"EXPENSE" | "RETURN_TO_AVAILABLE">(
    "EXPENSE",
  );
  const [useAmount, setUseAmount] = useState("");
  const [useWalletId, setUseWalletId] = useState(wallets[0]?.id || "");
  const [useCategoryId, setUseCategoryId] = useState(categories[0]?.id || "");
  const [useBudgetMonth, setUseBudgetMonth] = useState(
    monthInputValue(new Date()),
  );
  const [useDate, setUseDate] = useState(todayInputValue());
  const [useNote, setUseNote] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [reconcileDate, setReconcileDate] = useState(todayInputValue());
  const [reconcileNote, setReconcileNote] = useState("");

  async function refreshOverview() {
    const response = await fetch("/api/savings", { cache: "no-store" });
    const data = (await response.json()) as {
      summary?: SavingsSummary;
      history?: SavingsHistoryItem[];
      error?: string;
    };

    if (!response.ok || !data.summary || !data.history) {
      throw new Error(data.error || "Failed to refresh savings overview.");
    }

    setSummary(data.summary);
    setHistory(data.history);
  }

  const submitUseSavings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/savings/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usageType,
          amount: useAmount,
          walletId: usageType === "EXPENSE" ? useWalletId : null,
          categoryId: usageType === "EXPENSE" ? useCategoryId : null,
          budgetMonth: usageType === "EXPENSE" ? useBudgetMonth : null,
          date: useDate,
          note: useNote,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to use savings.");
        return;
      }

      setUseAmount("");
      setUseNote("");
      await refreshOverview();
    } catch {
      setError("Failed to use savings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReconcile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/savings/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualAmount,
          date: reconcileDate,
          note: reconcileNote,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to reconcile savings.");
        return;
      }

      setActualAmount("");
      setReconcileNote("");
      await refreshOverview();
    } catch {
      setError("Failed to reconcile savings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedUseAmount = parseIntegerAmount(useAmount) || 0;
  const parsedActualAmount = parseIntegerAmount(actualAmount) || 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Savings Balance"
          value={formatRupiah(summary.currentBalance)}
        />
        <StatCard
          label="Available to Spend"
          value={formatRupiah(summary.availableToSpend)}
        />
        <StatCard
          label="Added This Month"
          value={formatRupiah(summary.addedThisMonth)}
        />
        <StatCard
          label="Used This Month"
          value={formatRupiah(summary.usedThisMonth)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Use Savings
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Catat penggunaan savings untuk expense atau kembalikan ke
                available balance.
              </p>
            </div>
          </div>

          <form onSubmit={submitUseSavings} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Usage Type
              </label>
              <select
                value={usageType}
                onChange={(event) =>
                  setUsageType(event.target.value as typeof usageType)
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="EXPENSE">Dipakai untuk pengeluaran</option>
                <option value="RETURN_TO_AVAILABLE">
                  Dikembalikan ke available balance
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Amount
              </label>
              <input
                value={useAmount}
                onChange={(event) =>
                  setUseAmount(normalizeAmountInput(event.target.value))
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Rp 300.000"
                required
              />
            </div>

            {usageType === "EXPENSE" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Wallet
                  </label>
                  <select
                    value={useWalletId}
                    onChange={(event) => setUseWalletId(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} - {wallet.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Category
                  </label>
                  <select
                    value={useCategoryId}
                    onChange={(event) => setUseCategoryId(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.group} - {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Budget Month
                  </label>
                  <input
                    type="month"
                    value={useBudgetMonth}
                    onChange={(event) => setUseBudgetMonth(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Date
              </label>
              <input
                type="date"
                value={useDate}
                onChange={(event) => setUseDate(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Note
              </label>
              <input
                value={useNote}
                onChange={(event) => setUseNote(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Service motor mendadak"
                maxLength={120}
              />
            </div>

            <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <p>Preview</p>
              <p className="mt-1">
                Savings balance akan berkurang {formatRupiah(parsedUseAmount)}.
              </p>
              {usageType === "EXPENSE" ? (
                <p>
                  Expense akan tercatat pada wallet dan kategori yang kamu
                  pilih.
                </p>
              ) : (
                <p>Tidak ada expense baru yang dibuat.</p>
              )}
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Savings Use"}
            </button>
          </form>
        </div>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Reconcile</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Cocokkan saldo savings di sistem dengan kondisi actual.
          </p>

          <form onSubmit={submitReconcile} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Actual Savings Amount
              </label>
              <input
                value={actualAmount}
                onChange={(event) =>
                  setActualAmount(normalizeAmountInput(event.target.value))
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Rp 700.000"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Date
              </label>
              <input
                type="date"
                value={reconcileDate}
                onChange={(event) => setReconcileDate(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Note
              </label>
              <input
                value={reconcileNote}
                onChange={(event) => setReconcileNote(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Koreksi karena uang terpakai"
                maxLength={120}
              />
            </div>

            <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <p>Preview</p>
              <p className="mt-1">
                Actual savings: {formatRupiah(parsedActualAmount)}
              </p>
              <p>
                Adjustment will be recorded automatically based on system
                balance.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Reconcile Savings"}
            </button>
          </form>
        </aside>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              Savings History
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Histori semua ledger savings yang tercatat di sistem.
            </p>
          </div>
          <span className="text-sm text-zinc-400">
            {history.length} entries
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada histori savings.</p>
          ) : null}
          {history.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-zinc-950">
                      {typeLabel(item.type)}
                    </p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">
                      {item.userName}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {new Date(item.date).toLocaleDateString("id-ID")} •{" "}
                    {item.note || "No note"}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    item.type === "ADJUSTMENT" && item.amount < 0
                      ? "text-red-700"
                      : item.type === "WITHDRAW"
                        ? "text-orange-700"
                        : "text-emerald-700"
                  }`}
                >
                  {item.type === "ADJUSTMENT" && item.amount < 0
                    ? `- ${formatRupiah(Math.abs(item.amount))}`
                    : formatRupiah(item.amount)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-950">{value}</p>
    </div>
  );
}
