import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBudgetableIncomeAmount,
  calculateBudgetPeriodSummary,
  calculateGlobalAllocationSummary,
} from "../lib/budget-calculations.ts";

test("income allocated to savings only exposes the budgetable remainder", () => {
  assert.equal(
    calculateBudgetableIncomeAmount({
      incomeAmount: 10_000_000,
      savingsAmount: 1_500_000,
    }),
    8_500_000,
  );
});

test("income can be recorded without contributing to a budget period", () => {
  assert.equal(
    calculateBudgetableIncomeAmount({
      incomeAmount: 10_000_000,
      savingsAmount: 0,
      allocateToBudget: false,
    }),
    0,
  );
});

test("available to budget is independent from spending progress", () => {
  assert.deepEqual(
    calculateBudgetPeriodSummary({
      budgetableIncome: 8_500_000,
      totalBudget: 8_000_000,
      totalSpent: 2_000_000,
    }),
    {
      budgetableIncome: 8_500_000,
      totalBudget: 8_000_000,
      availableToBudget: 500_000,
      totalSpent: 2_000_000,
      remainingBudget: 6_000_000,
    },
  );
});

test("spent may exceed the envelope without changing period allocation", () => {
  const summary = calculateBudgetPeriodSummary({
    budgetableIncome: 2_000_000,
    totalBudget: 2_000_000,
    totalSpent: 2_250_000,
  });

  assert.equal(summary.availableToBudget, 0);
  assert.equal(summary.remainingBudget, -250_000);
});

test("global allocation reports wallet shortfall across savings and remaining budgets", () => {
  assert.deepEqual(
    calculateGlobalAllocationSummary({
      totalWalletBalance: 5_000_000,
      totalSavings: 1_000_000,
      totalActiveBudgetRemaining: 4_500_000,
    }),
    {
      totalWalletBalance: 5_000_000,
      totalSavings: 1_000_000,
      totalActiveBudgetRemaining: 4_500_000,
      allocatedAmount: 5_500_000,
      availableUnallocatedCash: -500_000,
      shortfall: 500_000,
    },
  );
});
