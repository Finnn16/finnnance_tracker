import { SavingLedgerType, type SavingLedgerType as SavingLedgerTypeValue } from "./domain-enums";

type DecimalLike = {
  toNumber: () => number;
};

type AmountLike = number | DecimalLike;

function toAmountNumber(amount: AmountLike) {
  return typeof amount === "number" ? amount : amount.toNumber();
}

export type SavingsLedgerRow = {
  id: string;
  type: SavingLedgerTypeValue;
  amount: AmountLike;
  date: Date;
  note: string | null;
  sourceTransactionId: string | null;
  userId: string;
  user: {
    name: string;
    email: string;
  };
};

export type SavingsMonthlySummary = {
  currentBalance: number;
  addedThisMonth: number;
  usedThisMonth: number;
  adjustmentThisMonth: number;
  availableToSpend: number;
  totalWalletBalance: number;
  lastReconciledAt: string | null;
};

export type SavingsHistoryItem = {
  id: string;
  type: SavingLedgerTypeValue;
  amount: number;
  note: string | null;
  date: string;
  userName: string;
  userEmail: string;
  sourceTransactionId: string | null;
};

export function calculateSavingsSummary({
  ledgers,
  totalWalletBalance,
  monthStart,
  nextMonthStart,
}: {
  ledgers: SavingsLedgerRow[];
  totalWalletBalance: number;
  monthStart: Date;
  nextMonthStart: Date;
}): SavingsMonthlySummary {
  let currentBalance = 0;
  let addedThisMonth = 0;
  let usedThisMonth = 0;
  let adjustmentThisMonth = 0;
  let lastReconciledAt: Date | null = null;

  for (const ledger of ledgers) {
    const amount = toAmountNumber(ledger.amount);

    if (ledger.type === SavingLedgerType.ADD) {
      currentBalance += amount;
    }

    if (ledger.type === SavingLedgerType.WITHDRAW) {
      currentBalance -= amount;
    }

    if (ledger.type === SavingLedgerType.ADJUSTMENT) {
      currentBalance += amount;
      lastReconciledAt =
        ledger.date > (lastReconciledAt || ledger.date)
          ? ledger.date
          : lastReconciledAt;
    }

    if (ledger.date >= monthStart && ledger.date < nextMonthStart) {
      if (ledger.type === SavingLedgerType.ADD) {
        addedThisMonth += amount;
      }

      if (ledger.type === SavingLedgerType.WITHDRAW) {
        usedThisMonth += amount;
      }

      if (ledger.type === SavingLedgerType.ADJUSTMENT) {
        adjustmentThisMonth += amount;
      }
    }
  }

  return {
    currentBalance,
    addedThisMonth,
    usedThisMonth,
    adjustmentThisMonth,
    availableToSpend: Math.max(totalWalletBalance - currentBalance, 0),
    totalWalletBalance: Math.max(totalWalletBalance - currentBalance, 0),
    lastReconciledAt: lastReconciledAt?.toISOString() || null,
  };
}

export function summarizeSavingsLedgers(ledgers: SavingsLedgerRow[]) {
  return ledgers.map<SavingsHistoryItem>((ledger) => ({
    id: ledger.id,
    type: ledger.type,
    amount: toAmountNumber(ledger.amount),
    note: ledger.note,
    date: ledger.date.toISOString(),
    userName: ledger.user.name,
    userEmail: ledger.user.email,
    sourceTransactionId: ledger.sourceTransactionId,
  }));
}

export function monthRangeLabel(start: Date, end: Date) {
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(start);

  const rangeLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  });

  return `${rangeLabel.format(start)} - ${rangeLabel.format(new Date(end.getTime() - 1))} (${monthLabel})`;
}

export function monthStartFromKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

export function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}
