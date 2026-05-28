"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { SensitiveAmount } from "@/components/PrivacyMode";
import { formatDisplayTitle } from "@/lib/display-text";
import {
  formatRupiah,
  normalizeAmountInput,
  parseIntegerAmount,
} from "@/lib/money";
import { DebtStatus, DebtType } from "@/lib/prisma-enums";

type DebtPaymentView = {
  id: string;
  walletId: string | null;
  walletName: string | null;
  amount: number;
  note: string | null;
  date: string;
};

type DebtView = {
  id: string;
  walletId: string | null;
  walletName: string | null;
  personName: string;
  type: DebtType;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  note: string | null;
  date: string;
  dueDate: string | null;
  status: DebtStatus;
  payments: DebtPaymentView[];
};

type WalletOption = {
  id: string;
  name: string;
  currentBalance: number;
};

type SafeToLendSummary = {
  totalWalletBalance: number;
  savingsBalance: number;
  remainingBudgetNeeded: number;
  safeToLend: number;
  requestedAmount: number;
  shortage: number;
  isSafe: boolean;
  strictMode: boolean;
};

type DebtFormState = {
  type: DebtType;
  personName: string;
  amount: string;
  walletId: string;
  date: string;
  dueDate: string;
  note: string;
};

type PaymentFormState = {
  amount: string;
  walletId: string;
  date: string;
  note: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function debtTypeLabel(type: DebtType) {
  return type === DebtType.RECEIVABLE ? "PIUTANG" : "HUTANG";
}

function debtDirectionLabel(type: DebtType) {
  return type === DebtType.RECEIVABLE
    ? "Orang lain harus bayar ke saya"
    : "Saya harus bayar ke orang lain";
}

function statusLabel(status: DebtStatus) {
  if (status === DebtStatus.UNPAID) {
    return "Unpaid";
  }

  if (status === DebtStatus.PARTIAL) {
    return "Partial";
  }

  if (status === DebtStatus.PAID) {
    return "Paid";
  }

  return "Cancelled";
}

function statusClass(status: DebtStatus) {
  if (status === DebtStatus.PAID) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === DebtStatus.PARTIAL) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === DebtStatus.CANCELLED) {
    return "bg-zinc-100 text-zinc-500 ring-zinc-200";
  }

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function emptyDebtForm(walletId: string): DebtFormState {
  return {
    type: DebtType.RECEIVABLE,
    personName: "",
    amount: "",
    walletId,
    date: todayInputValue(),
    dueDate: "",
    note: "",
  };
}

function emptyPaymentForm(walletId: string): PaymentFormState {
  return {
    amount: "",
    walletId,
    date: todayInputValue(),
    note: "",
  };
}

export function DebtsClient({
  initialDebts,
  wallets,
}: {
  initialDebts: DebtView[];
  wallets: WalletOption[];
}) {
  const defaultWalletId = wallets[0]?.id || "";
  const [debts, setDebts] = useState(initialDebts);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(
    initialDebts[0]?.id || null,
  );
  const [debtForm, setDebtForm] = useState(emptyDebtForm(defaultWalletId));
  const [paymentForm, setPaymentForm] = useState(
    emptyPaymentForm(defaultWalletId),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unsafeWarning, setUnsafeWarning] = useState<SafeToLendSummary | null>(
    null,
  );
  const [safeToLend, setSafeToLend] = useState<SafeToLendSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDebt = useMemo(
    () => debts.find((debt) => debt.id === selectedDebtId) || debts[0] || null,
    [debts, selectedDebtId],
  );
  const activeDebts = debts.filter(
    (debt) =>
      debt.status !== DebtStatus.PAID && debt.status !== DebtStatus.CANCELLED,
  );
  const closedDebts = debts.filter(
    (debt) =>
      debt.status === DebtStatus.PAID || debt.status === DebtStatus.CANCELLED,
  );
  const summary = useMemo(
    () =>
      debts.reduce(
        (total, debt) => {
          if (
            debt.status === DebtStatus.PAID ||
            debt.status === DebtStatus.CANCELLED
          ) {
            return total;
          }

          if (debt.type === DebtType.RECEIVABLE) {
            total.receivable += debt.remainingAmount;
          } else {
            total.payable += debt.remainingAmount;
          }

          return total;
        },
        { receivable: 0, payable: 0 },
      ),
    [debts],
  );

  useEffect(() => {
    const amount = parseIntegerAmount(debtForm.amount) || 0;

    if (debtForm.type !== DebtType.RECEIVABLE || amount <= 0) {
      return;
    }

    const handle = window.setTimeout(async () => {
      const params = new URLSearchParams({
        amount: String(amount),
        date: debtForm.date,
      });
      const response = await fetch(`/api/debts/safe-to-lend?${params}`);
      const data = (await response.json()) as {
        safeToLend?: SafeToLendSummary;
      };

      if (response.ok && data.safeToLend) {
        setSafeToLend(data.safeToLend);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [debtForm.amount, debtForm.date, debtForm.type]);

  async function refreshDebts() {
    const response = await fetch("/api/debts", { cache: "no-store" });
    const data = (await response.json()) as { debts?: DebtView[] };

    if (response.ok && data.debts) {
      setDebts(data.debts);
      setSelectedDebtId((current) => current || data.debts?.[0]?.id || null);
    }
  }

  async function createDebt(confirmUnsafe = false) {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...debtForm,
          confirmUnsafe,
          dueDate: debtForm.dueDate || null,
        }),
      });
      const data = (await response.json()) as {
        debt?: DebtView;
        error?: string;
        warning?: string;
        safeToLend?: SafeToLendSummary;
      };

      if (response.status === 409 && data.safeToLend) {
        setUnsafeWarning(data.safeToLend);
        setNotice(data.warning || "Pinjaman perlu dikonfirmasi.");
        return;
      }

      if (!response.ok || !data.debt) {
        setError(data.error || "Failed to create debt.");
        return;
      }

      setDebtForm(emptyDebtForm(defaultWalletId));
      setUnsafeWarning(null);
      setSelectedDebtId(data.debt.id);
      await refreshDebts();
    } catch {
      setError("Failed to create debt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createDebt(false);
  }

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDebt) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/debts/${selectedDebt.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      const data = (await response.json()) as {
        debt?: DebtView;
        error?: string;
      };

      if (!response.ok || !data.debt) {
        setError(data.error || "Failed to record payment.");
        return;
      }

      setPaymentForm(emptyPaymentForm(defaultWalletId));
      setSelectedDebtId(data.debt.id);
      await refreshDebts();
    } catch {
      setError("Failed to record payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelDebt(debtId: string) {
    if (
      !window.confirm("Cancel debt ini? Wallet tidak akan otomatis dibalik.")
    ) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/debts/${debtId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to cancel debt.");
        return;
      }

      await refreshDebts();
    } catch {
      setError("Failed to cancel debt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentDebtAmount = parseIntegerAmount(debtForm.amount) || 0;
  const visibleSafeToLend =
    debtForm.type === DebtType.RECEIVABLE &&
    currentDebtAmount > 0 &&
    safeToLend?.requestedAmount === currentDebtAmount
      ? safeToLend
      : null;
  const paymentAmount = parseIntegerAmount(paymentForm.amount) || 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Piutang Aktif"
          value={formatRupiah(summary.receivable)}
        />
        <StatCard label="Hutang Aktif" value={formatRupiah(summary.payable)} />
        <StatCard
          label="Net Debt Position"
          value={formatRupiah(summary.receivable - summary.payable)}
        />
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  Active Debt
                </h2>
                <p className="text-sm text-zinc-500">
                  Hutang dan piutang aktif dipisahkan dari income dan expense.
                </p>
              </div>
              <span className="text-sm text-zinc-400">
                {activeDebts.length} active
              </span>
            </div>

            <DebtList
              debts={activeDebts}
              selectedDebtId={selectedDebt?.id || null}
              onSelect={setSelectedDebtId}
            />
          </div>

          {closedDebts.length > 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">
                Closed Debt
              </h2>
              <DebtList
                debts={closedDebts}
                selectedDebtId={selectedDebt?.id || null}
                onSelect={setSelectedDebtId}
              />
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">New Debt</h2>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Debt Type
                </label>
                <select
                  value={debtForm.type}
                  onChange={(event) =>
                    setDebtForm({
                      ...debtForm,
                      type: event.target.value as DebtType,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value={DebtType.RECEIVABLE}>PIUTANG</option>
                  <option value={DebtType.PAYABLE}>HUTANG</option>
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  {debtDirectionLabel(debtForm.type)}
                </p>
              </div>

              <FormInput
                label="Person Name"
                value={debtForm.personName}
                onChange={(value) =>
                  setDebtForm({ ...debtForm, personName: value })
                }
                placeholder="Name Person"
              />

              <FormInput
                label="Amount"
                value={debtForm.amount}
                onChange={(value) =>
                  setDebtForm({
                    ...debtForm,
                    amount: normalizeAmountInput(value),
                  })
                }
                placeholder="Rp 500.000"
                inputMode="numeric"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Wallet
                </label>
                <select
                  value={debtForm.walletId}
                  onChange={(event) =>
                    setDebtForm({ ...debtForm, walletId: event.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} - {formatRupiah(wallet.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput
                  label="Date"
                  value={debtForm.date}
                  onChange={(value) =>
                    setDebtForm({ ...debtForm, date: value })
                  }
                  type="date"
                />
                <FormInput
                  label="Due Date"
                  value={debtForm.dueDate}
                  onChange={(value) =>
                    setDebtForm({ ...debtForm, dueDate: value })
                  }
                  type="date"
                  required={false}
                />
              </div>

              <FormInput
                label="Note"
                value={debtForm.note}
                onChange={(value) => setDebtForm({ ...debtForm, note: value })}
                placeholder="Note Opsional "
                required={false}
              />

              {visibleSafeToLend ? (
                <SafeToLendBox summary={visibleSafeToLend} />
              ) : null}

              {unsafeWarning ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">Safe to Lend Warning</p>
                  <p className="mt-1">
                    Dana bebas kamu hanya{" "}
                    <SensitiveAmount>
                      {formatRupiah(unsafeWarning.safeToLend)}
                    </SensitiveAmount>
                    . Shortage{" "}
                    <SensitiveAmount>
                      {formatRupiah(unsafeWarning.shortage)}
                    </SensitiveAmount>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => createDebt(true)}
                    disabled={isSubmitting}
                    className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue Anyway
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || wallets.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "+ New Debt"}
              </button>
            </form>
          </div>

          {selectedDebt ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    {selectedDebt.personName}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {debtTypeLabel(selectedDebt.type)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusClass(
                    selectedDebt.status,
                  )}`}
                >
                  {statusLabel(selectedDebt.status)}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Detail
                  label="Original"
                  value={formatRupiah(selectedDebt.amount)}
                />
                <Detail
                  label="Paid"
                  value={formatRupiah(selectedDebt.paidAmount)}
                />
                <Detail
                  label="Remaining"
                  value={formatRupiah(selectedDebt.remainingAmount)}
                />
                <Detail label="Due" value={formatDate(selectedDebt.dueDate)} />
                <Detail label="Wallet" value={selectedDebt.walletName || "-"} />
                <Detail label="Date" value={formatDate(selectedDebt.date)} />
              </dl>

              {selectedDebt.note ? (
                <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                  {formatDisplayTitle(selectedDebt.note)}
                </p>
              ) : null}

              {selectedDebt.status !== DebtStatus.PAID &&
              selectedDebt.status !== DebtStatus.CANCELLED ? (
                <form onSubmit={handlePayment} className="mt-5 space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Record Payment
                  </h3>

                  <FormInput
                    label="Amount"
                    value={paymentForm.amount}
                    onChange={(value) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: normalizeAmountInput(value),
                      })
                    }
                    placeholder="Rp 200.000"
                    inputMode="numeric"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      Wallet
                    </label>
                    <select
                      value={paymentForm.walletId}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          walletId: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    >
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <FormInput
                    label="Payment Date"
                    value={paymentForm.date}
                    onChange={(value) =>
                      setPaymentForm({ ...paymentForm, date: value })
                    }
                    type="date"
                  />

                  <FormInput
                    label="Note"
                    value={paymentForm.note}
                    onChange={(value) =>
                      setPaymentForm({ ...paymentForm, note: value })
                    }
                    placeholder="Cicilan pertama"
                    required={false}
                  />

                  <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    Remaining after payment:{" "}
                    <SensitiveAmount>
                      {formatRupiah(
                        Math.max(
                          0,
                          selectedDebt.remainingAmount - paymentAmount,
                        ),
                      )}
                    </SensitiveAmount>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Saving..." : "Record Payment"}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelDebt(selectedDebt.id)}
                      disabled={isSubmitting}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel Debt
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-zinc-950">
                  Payment History
                </h3>
                <div className="mt-3 space-y-2">
                  {selectedDebt.payments.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Belum ada payment history.
                    </p>
                  ) : null}
                  {selectedDebt.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-zinc-950">
                          <SensitiveAmount>
                            {formatRupiah(payment.amount)}
                          </SensitiveAmount>
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(payment.date)}
                        </p>
                      </div>
                      <p className="mt-1 text-zinc-500">
                        {payment.walletName || "-"}{" "}
                        {payment.note
                          ? `- ${formatDisplayTitle(payment.note)}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function DebtList({
  debts,
  selectedDebtId,
  onSelect,
}: {
  debts: DebtView[];
  selectedDebtId: string | null;
  onSelect: (id: string) => void;
}) {
  if (debts.length === 0) {
    return <p className="mt-5 text-sm text-zinc-500">Belum ada debt.</p>;
  }

  return (
    <div className="mt-5 space-y-3">
      {debts.map((debt) => (
        <button
          key={debt.id}
          type="button"
          onClick={() => onSelect(debt.id)}
          className={`w-full rounded-lg border p-4 text-left transition ${
            selectedDebtId === debt.id
              ? "border-blue-200 bg-blue-50"
              : "border-zinc-200 bg-zinc-50 hover:bg-white"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-950">{debt.personName}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusClass(
                    debt.status,
                  )}`}
                >
                  {statusLabel(debt.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {debtTypeLabel(debt.type)} - due {formatDate(debt.dueDate)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-zinc-500">Remaining</p>
              <p className="text-lg font-bold text-zinc-950">
                <SensitiveAmount>
                  {formatRupiah(debt.remainingAmount)}
                </SensitiveAmount>
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function SafeToLendBox({ summary }: { summary: SafeToLendSummary }) {
  const safeClass = summary.isSafe
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${safeClass}`}>
      <p className="font-semibold">Safe to Lend</p>
      <div className="mt-2 grid gap-1">
        <p>
          Dana bebas:{" "}
          <SensitiveAmount>{formatRupiah(summary.safeToLend)}</SensitiveAmount>
        </p>
        <p>
          Loan amount:{" "}
          <SensitiveAmount>
            {formatRupiah(summary.requestedAmount)}
          </SensitiveAmount>
        </p>
        {!summary.isSafe ? (
          <p>
            Shortage:{" "}
            <SensitiveAmount>{formatRupiah(summary.shortage)}</SensitiveAmount>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-950">
        <SensitiveAmount>{value}</SensitiveAmount>
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1 font-semibold text-zinc-950">
        <SensitiveAmount>{value}</SensitiveAmount>
      </dd>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  inputMode?: "numeric";
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
