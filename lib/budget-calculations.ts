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
}: {
  budgetableIncome: number;
  totalBudget: number;
  totalSpent: number;
}) {
  return {
    budgetableIncome,
    totalBudget,
    availableToBudget: budgetableIncome - totalBudget,
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
  const allocatedAmount = totalSavings + totalActiveBudgetRemaining;
  const shortfall = Math.max(allocatedAmount - totalWalletBalance, 0);

  return {
    totalWalletBalance,
    totalSavings,
    totalActiveBudgetRemaining,
    allocatedAmount,
    availableUnallocatedCash: totalWalletBalance - allocatedAmount,
    shortfall,
  };
}
