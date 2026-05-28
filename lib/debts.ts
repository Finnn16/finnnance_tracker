import { parseIntegerAmount } from "@/lib/money";
import { DebtStatus, DebtType, SavingLedgerType, TransactionType } from "@/lib/prisma-enums";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { budgetMonthRange, normalizeMonthStart } from "@/lib/budgets";

const debtTypeValues = new Set(Object.values(DebtType));

export type DebtPayload = {
  type: DebtType;
  personName: string;
  amount: number;
  walletId: string;
  date: Date;
  dueDate: Date | null;
  note: string | null;
  confirmUnsafe: boolean;
};

export type DebtPaymentPayload = {
  amount: number;
  walletId: string;
  date: Date;
  note: string | null;
};

export type SafeToLendSummary = {
  month: string;
  totalWalletBalance: number;
  savingsBalance: number;
  remainingBudgetNeeded: number;
  safeToLend: number;
  requestedAmount: number;
  shortage: number;
  isSafe: boolean;
  strictMode: boolean;
};

function parseDateOnly(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value) {
    return { ok: false as const, error: `${fieldName} is required.` };
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return { ok: false as const, error: `${fieldName} is invalid.` };
  }

  return { ok: true as const, date };
}

function parseOptionalDateOnly(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === "") {
    return { ok: true as const, date: null };
  }

  return parseDateOnly(value, fieldName);
}

function cleanNote(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const note = value.trim();
  return note ? note.slice(0, 200) : null;
}

export function validateDebtPayload(
  body: unknown,
): { ok: true; data: DebtPayload } | { ok: false; error: string } {
  const input = body as {
    type?: unknown;
    personName?: unknown;
    amount?: unknown;
    walletId?: unknown;
    date?: unknown;
    dueDate?: unknown;
    note?: unknown;
    confirmUnsafe?: unknown;
  } | null;

  const type = typeof input?.type === "string" ? input.type : "";

  if (!debtTypeValues.has(type as DebtType)) {
    return { ok: false, error: "Debt type is invalid." };
  }

  const personName =
    typeof input?.personName === "string" ? input.personName.trim() : "";

  if (personName.length < 2 || personName.length > 60) {
    return { ok: false, error: "Person name must be 2-60 characters." };
  }

  const amount = parseIntegerAmount(input?.amount);

  if (amount === null || amount <= 0) {
    return { ok: false, error: "Amount must be greater than 0." };
  }

  const walletId =
    typeof input?.walletId === "string" ? input.walletId.trim() : "";

  if (!walletId) {
    return { ok: false, error: "Wallet is required." };
  }

  const dateResult = parseDateOnly(input?.date, "Date");

  if (!dateResult.ok) {
    return { ok: false, error: dateResult.error };
  }

  const dueDateResult = parseOptionalDateOnly(input?.dueDate, "Due date");

  if (!dueDateResult.ok) {
    return { ok: false, error: dueDateResult.error };
  }

  return {
    ok: true,
    data: {
      type: type as DebtType,
      personName,
      amount,
      walletId,
      date: dateResult.date,
      dueDate: dueDateResult.date,
      note: cleanNote(input?.note),
      confirmUnsafe: input?.confirmUnsafe === true,
    },
  };
}

export function validateDebtPaymentPayload(
  body: unknown,
): { ok: true; data: DebtPaymentPayload } | { ok: false; error: string } {
  const input = body as {
    amount?: unknown;
    walletId?: unknown;
    date?: unknown;
    note?: unknown;
  } | null;

  const amount = parseIntegerAmount(input?.amount);

  if (amount === null || amount <= 0) {
    return { ok: false, error: "Payment amount must be greater than 0." };
  }

  const walletId =
    typeof input?.walletId === "string" ? input.walletId.trim() : "";

  if (!walletId) {
    return { ok: false, error: "Wallet is required." };
  }

  const dateResult = parseDateOnly(input?.date, "Payment date");

  if (!dateResult.ok) {
    return { ok: false, error: dateResult.error };
  }

  return {
    ok: true,
    data: {
      amount,
      walletId,
      date: dateResult.date,
      note: cleanNote(input?.note),
    },
  };
}

export function calculateDebtStatus(amount: number, paidAmount: number) {
  if (paidAmount <= 0) {
    return DebtStatus.UNPAID;
  }

  if (paidAmount >= amount) {
    return DebtStatus.PAID;
  }

  return DebtStatus.PARTIAL;
}

export function applyDebtWalletMovement({
  type,
  amount,
  walletId,
  tx,
}: {
  type: DebtType;
  amount: number;
  walletId: string;
  tx: PrismaTransactionClient;
}) {
  const increment = type === DebtType.RECEIVABLE ? -amount : amount;

  return tx.wallet.update({
    where: { id: walletId },
    data: { currentBalance: { increment } },
  });
}

export function applyDebtPaymentWalletMovement({
  type,
  amount,
  walletId,
  tx,
}: {
  type: DebtType;
  amount: number;
  walletId: string;
  tx: PrismaTransactionClient;
}) {
  const increment = type === DebtType.RECEIVABLE ? amount : -amount;

  return tx.wallet.update({
    where: { id: walletId },
    data: { currentBalance: { increment } },
  });
}

export async function calculateSafeToLend({
  db,
  userId,
  amount,
  date,
}: {
  db: PrismaTransactionClient;
  userId: string;
  amount: number;
  date: Date;
}): Promise<SafeToLendSummary> {
  const monthStart = normalizeMonthStart(date)!;
  const monthRange = budgetMonthRange(monthStart)!;

  const [wallets, ledgers, budgets, expenses, budgetMonth] = await Promise.all([
    db.wallet.findMany({
      where: { userId },
      select: { currentBalance: true },
    }),
    db.savingLedger.findMany({
      where: { userId },
      select: { amount: true, type: true },
    }),
    db.budget.aggregate({
      where: {
        userId,
        month: monthRange,
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        OR: [
          { budgetMonth: monthRange },
          { budgetMonth: null, transactionDate: monthRange },
        ],
      },
      _sum: { amount: true },
    }),
    db.budgetMonth.findUnique({
      where: { userId_month: { userId, month: monthStart } },
      select: { strictMode: true },
    }),
  ]);

  const totalWalletBalance = wallets.reduce(
    (total, wallet) => total + wallet.currentBalance,
    0,
  );
  const savingsBalance = ledgers.reduce((total, ledger) => {
    const ledgerAmount = Number(ledger.amount);

    if (ledger.type === SavingLedgerType.WITHDRAW) {
      return total - ledgerAmount;
    }

    return total + ledgerAmount;
  }, 0);
  const totalBudgeted = budgets._sum.amount ?? 0;
  const totalSpent = expenses._sum.amount ?? 0;
  const remainingBudgetNeeded = Math.max(0, totalBudgeted - totalSpent);
  const safeToLend =
    totalWalletBalance - savingsBalance - remainingBudgetNeeded;
  const shortage = Math.max(0, amount - safeToLend);

  return {
    month: monthStart.toISOString(),
    totalWalletBalance,
    savingsBalance,
    remainingBudgetNeeded,
    safeToLend,
    requestedAmount: amount,
    shortage,
    isSafe: shortage === 0,
    strictMode: budgetMonth?.strictMode ?? false,
  };
}

export function toDebtView(debt: {
  id: string;
  userId: string;
  walletId: string | null;
  personName: string;
  type: DebtType;
  amount: number;
  note: string | null;
  date: Date;
  dueDate: Date | null;
  status: DebtStatus;
  createdAt: Date;
  user?: { name: string; email: string } | null;
  wallet?: { name: string } | null;
  payments: {
    id: string;
    walletId: string | null;
    amount: number;
    note: string | null;
    date: Date;
    wallet?: { name: string } | null;
  }[];
}) {
  const paidAmount = debt.payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const remainingAmount = Math.max(0, debt.amount - paidAmount);

  return {
    id: debt.id,
    userId: debt.userId,
    userName: debt.user?.name || null,
    userEmail: debt.user?.email || null,
    walletId: debt.walletId,
    walletName: debt.wallet?.name || null,
    personName: debt.personName,
    type: debt.type,
    amount: debt.amount,
    paidAmount,
    remainingAmount,
    note: debt.note,
    date: debt.date.toISOString(),
    dueDate: debt.dueDate?.toISOString() || null,
    status: debt.status,
    createdAt: debt.createdAt.toISOString(),
    payments: debt.payments
      .map((payment) => ({
        id: payment.id,
        walletId: payment.walletId,
        walletName: payment.wallet?.name || null,
        amount: payment.amount,
        note: payment.note,
        date: payment.date.toISOString(),
      }))
      .sort((left, right) => right.date.localeCompare(left.date)),
  };
}
