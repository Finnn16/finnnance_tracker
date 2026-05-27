import { budgetMonthRange, calculateBudgetPeriodSummary } from "@/lib/budgets";
import { TransactionType } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";

export async function validateBudgetableIncomeReduction({
  userId,
  budgetMonth,
  excludedIncomeId,
  replacementBudgetableAmount,
}: {
  userId: string;
  budgetMonth: Date;
  excludedIncomeId: string;
  replacementBudgetableAmount: number;
}) {
  const monthRange = budgetMonthRange(budgetMonth)!;
  const [budgets, remainingIncome] = await Promise.all([
    prisma.budget.aggregate({
      where: { userId, month: monthRange },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.INCOME,
        budgetMonth: monthRange,
        id: { not: excludedIncomeId },
      },
      _sum: { budgetableAmount: true },
    }),
  ]);

  const summary = calculateBudgetPeriodSummary({
    budgetableIncome:
      (remainingIncome._sum.budgetableAmount ?? 0) +
      replacementBudgetableAmount,
    totalBudget: budgets._sum.amount ?? 0,
    totalSpent: 0,
  });

  if (summary.availableToBudget >= 0) {
    return null;
  }

  return "Perubahan income membuat budget bulan ini melebihi saldo budgetable. Kurangi budget terlebih dahulu sebelum mengubah atau menghapus income ini.";
}
