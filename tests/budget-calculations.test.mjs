import assert from "node:assert/strict";
import test from "node:test";

import {
  budgetMonthRange,
  calculateBudgetableIncomeAmount,
  calculateBudgetPeriodSummary,
  calculateGlobalAllocationSummary,
  isPrepaidTransaction,
  monthInputValue,
  normalizeMonthStart,
} from "../packages/core/src/budget-calculations.ts";

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

test("available to budget accounts for unbudgeted spending", () => {
  assert.deepEqual(
    calculateBudgetPeriodSummary({
      budgetableIncome: 8_500_000,
      totalBudget: 8_000_000,
      totalSpent: 2_000_000,
      unbudgetedSpent: 125_000,
    }),
    {
      budgetableIncome: 8_500_000,
      totalBudget: 8_000_000,
      unbudgetedSpent: 125_000,
      availableToBudget: 375_000,
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
  assert.equal(summary.unbudgetedSpent, 0);
  assert.equal(summary.remainingBudget, -250_000);
});

test("global allocation reports operational cash shortfall across remaining budgets", () => {
  assert.deepEqual(
    calculateGlobalAllocationSummary({
      totalWalletBalance: 5_000_000,
      totalSavings: 1_000_000,
      totalActiveBudgetRemaining: 4_500_000,
    }),
    {
      totalWalletBalance: 4_000_000,
      totalSavings: 1_000_000,
      totalActiveBudgetRemaining: 4_500_000,
      allocatedAmount: 4_500_000,
      availableUnallocatedCash: -500_000,
      shortfall: 500_000,
    },
  );
});

test("budget period remains June across UTC representation of Jakarta midnight", () => {
  const juneStart = normalizeMonthStart("2026-06");

  assert.equal(juneStart.toISOString(), "2026-05-31T17:00:00.000Z");
  assert.equal(monthInputValue(juneStart), "2026-06");
  assert.equal(
    isPrepaidTransaction(
      new Date("2026-06-01T00:00:00.000Z"),
      juneStart,
    ),
    false,
  );
});

test("budget period range contains June markers using Jakarta boundaries", () => {
  const period = budgetMonthRange("2026-06");

  assert.equal(period.gte.toISOString(), "2026-05-31T17:00:00.000Z");
  assert.equal(period.lt.toISOString(), "2026-06-30T17:00:00.000Z");
});


