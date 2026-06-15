export function calculateBudgetableIncomeAmount({
  incomeAmount,
  savingsAmount,
  allocateToBudget = true,
}: {
  incomeAmount: number;
  savingsAmount: number;
  allocateToBudget?: boolean;
}) {
  return allocateToBudget ? Math.max(incomeAmount - savingsAmount, 0) : 0;
}

export function calculateBudgetPeriodSummary({
  budgetableIncome,
  totalBudget,
  totalSpent,
  unbudgetedSpent = 0,
}: {
  budgetableIncome: number;
  totalBudget: number;
  totalSpent: number;
  unbudgetedSpent?: number;
}) {
  return {
    budgetableIncome,
    totalBudget,
    unbudgetedSpent,
    availableToBudget: budgetableIncome - totalBudget - unbudgetedSpent,
    totalSpent,
    remainingBudget: totalBudget - totalSpent,
  };
}

export function calculateGlobalAllocationSummary({
  totalWalletBalance,
  totalSavings,
  totalActiveBudgetRemaining,
}: {
  totalWalletBalance: number;
  totalSavings: number;
  totalActiveBudgetRemaining: number;
}) {
  const operationalWalletBalance = Math.max(totalWalletBalance - totalSavings, 0);
  const allocatedAmount = totalActiveBudgetRemaining;
  const shortfall = Math.max(
    totalActiveBudgetRemaining - operationalWalletBalance,
    0,
  );

  return {
    totalWalletBalance: operationalWalletBalance,
    totalSavings,
    totalActiveBudgetRemaining,
    allocatedAmount,
    availableUnallocatedCash: operationalWalletBalance - allocatedAmount,
    shortfall,
  };
}

export const BUDGET_TIME_ZONE = "Asia/Jakarta";

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function parseMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})/.exec(value);

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

  return { year, month };
}

export function monthInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUDGET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : "";
}

export function toMonthStart(value: string | Date) {
  const parsed = parseMonthKey(
    value instanceof Date ? monthInputValue(value) : value,
  );

  if (!parsed) {
    return null;
  }

  return new Date(
    Date.UTC(parsed.year, parsed.month - 1, 1) - JAKARTA_OFFSET_MS,
  );
}

export function normalizeMonthStart(value: string | Date) {
  return toMonthStart(value);
}

export function nextMonthStart(value: string | Date) {
  const start = toMonthStart(value);

  if (!start) {
    return null;
  }

  const key = monthInputValue(start);
  const parsed = parseMonthKey(key)!;
  const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1;
  const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year;

  return toMonthStart(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}`,
  );
}

export function budgetMonthRange(value: string | Date) {
  const gte = toMonthStart(value);
  const lt = nextMonthStart(value);

  return gte && lt ? { gte, lt } : null;
}

export function isPrepaidTransaction(transactionDate: Date, budgetMonth: Date) {
  return monthInputValue(transactionDate) < monthInputValue(budgetMonth);
}
