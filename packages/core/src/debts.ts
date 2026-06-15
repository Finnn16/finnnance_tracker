import { DebtStatus, DebtType, type DebtStatus as DebtStatusValue, type DebtType as DebtTypeValue } from "./domain-enums";
import { parseIntegerAmount } from "./money";

const debtTypeValues = new Set(Object.values(DebtType));

export type DebtPayload = {
  type: DebtTypeValue;
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

  if (!debtTypeValues.has(type as DebtTypeValue)) {
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
      type: type as DebtTypeValue,
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

export function calculateDebtStatus(amount: number, paidAmount: number): DebtStatusValue {
  if (paidAmount <= 0) {
    return DebtStatus.UNPAID;
  }

  if (paidAmount >= amount) {
    return DebtStatus.PAID;
  }

  return DebtStatus.PARTIAL;
}

export function calculateDebtWalletIncrement(type: DebtTypeValue, amount: number) {
  return type === DebtType.RECEIVABLE ? -amount : amount;
}

export function calculateDebtPaymentWalletIncrement(
  type: DebtTypeValue,
  amount: number,
) {
  return type === DebtType.RECEIVABLE ? amount : -amount;
}

export function toDebtView(debt: {
  id: string;
  userId: string;
  walletId: string | null;
  personName: string;
  type: DebtTypeValue;
  amount: number;
  note: string | null;
  date: Date;
  dueDate: Date | null;
  status: DebtStatusValue;
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
