import { parseIntegerAmount } from "@/lib/money";

export type BudgetPayload = {
  userId: string;
  budgetCategoryId: string;
  month: Date;
  amount: number;
};

export function toMonthStart(value: string | Date) {
  const date = value instanceof Date ? value : new Date(`${value}-01`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function validateBudgetPayload(
  body: unknown,
): { ok: true; data: BudgetPayload } | { ok: false; error: string } {
  const input = body as {
    userId?: unknown;
    budgetCategoryId?: unknown;
    month?: unknown;
    amount?: unknown;
  } | null;

  const userId = typeof input?.userId === "string" ? input.userId : "";

  if (!userId) {
    return { ok: false, error: "User is required." };
  }

  const budgetCategoryId =
    typeof input?.budgetCategoryId === "string"
      ? input.budgetCategoryId.trim()
      : "";

  if (!budgetCategoryId) {
    return { ok: false, error: "Budget category is required." };
  }

  const monthValue = typeof input?.month === "string" ? input.month : "";
  const month = toMonthStart(monthValue);

  if (!month) {
    return { ok: false, error: "Month is invalid." };
  }

  const amount = parseIntegerAmount(input?.amount);

  if (amount === null || amount < 0) {
    return { ok: false, error: "Budget amount must be 0 or greater." };
  }

  return {
    ok: true,
    data: {
      userId,
      budgetCategoryId,
      month,
      amount,
    },
  };
}
