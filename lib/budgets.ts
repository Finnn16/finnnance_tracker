import { parseIntegerAmount } from "@/lib/money";
import { normalizeMonthStart } from "@/lib/budget-calculations";

export {
  BUDGET_TIME_ZONE,
  budgetMonthRange,
  calculateBudgetableIncomeAmount,
  calculateBudgetPeriodSummary,
  isPrepaidTransaction,
  monthInputValue,
  nextMonthStart,
  normalizeMonthStart,
  toMonthStart,
} from "@/lib/budget-calculations";

export type BudgetPayload = {
  userId: string;
  budgetCategoryId: string;
  month: Date;
  amount: number;
};

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
  const month = normalizeMonthStart(monthValue);

  if (!month) {
    return { ok: false, error: "Month is invalid." };
  }

  const amount = parseIntegerAmount(input?.amount);

  if (amount === null || amount <= 0) {
    return { ok: false, error: "Budget amount must be greater than 0." };
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
