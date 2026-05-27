import {
  calculateGlobalAllocationSummary,
} from "@/lib/budget-calculations";
import { SavingLedgerType, TransactionType } from "@/lib/prisma-enums";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";

type GlobalAllocationClient = Pick<
  PrismaTransactionClient,
  "budget" | "savingLedger" | "transaction" | "wallet"
>;

function periodCategoryKey(
  month: Date,
  budgetCategoryId: string | null,
) {
  return `${month.getFullYear()}-${month.getMonth()}|${budgetCategoryId || ""}`;
}

function expenseBudgetPeriod(transaction: {
  budgetMonth: Date | null;
  transactionDate: Date;
}) {
  return (
    transaction.budgetMonth ||
    new Date(
      transaction.transactionDate.getFullYear(),
      transaction.transactionDate.getMonth(),
      1,
    )
  );
}

export async function getGlobalAllocationSummary(
  db: GlobalAllocationClient,
  userId?: string,
) {
  const userScope = userId ? { userId } : {};
  const [wallets, savingsLedgers, budgets, budgetExpenses] = await Promise.all([
    db.wallet.findMany({
      where: userScope,
      select: { currentBalance: true },
    }),
    db.savingLedger.findMany({
      where: userScope,
      select: { type: true, amount: true },
    }),
    db.budget.findMany({
      where: userScope,
      select: { month: true, amount: true, budgetCategoryId: true },
    }),
    db.transaction.findMany({
      where: {
        ...userScope,
        type: TransactionType.EXPENSE,
        budgetCategoryId: { not: null },
      },
      select: {
        amount: true,
        budgetMonth: true,
        budgetCategoryId: true,
        transactionDate: true,
      },
    }),
  ]);

  const spentByEnvelope = new Map<string, number>();

  for (const expense of budgetExpenses) {
    const key = periodCategoryKey(
      expenseBudgetPeriod(expense),
      expense.budgetCategoryId,
    );
    spentByEnvelope.set(
      key,
      (spentByEnvelope.get(key) || 0) + expense.amount,
    );
  }

  const totalWalletBalance = wallets.reduce(
    (total, wallet) => total + wallet.currentBalance,
    0,
  );
  const totalSavings = savingsLedgers.reduce((total, ledger) => {
    const amount = ledger.amount.toNumber();

    if (ledger.type === SavingLedgerType.WITHDRAW) {
      return total - amount;
    }

    return total + amount;
  }, 0);
  const totalActiveBudgetRemaining = budgets.reduce((total, budget) => {
    const spent =
      spentByEnvelope.get(
        periodCategoryKey(budget.month, budget.budgetCategoryId),
      ) || 0;

    return total + Math.max(budget.amount - spent, 0);
  }, 0);

  return calculateGlobalAllocationSummary({
    totalWalletBalance,
    totalSavings,
    totalActiveBudgetRemaining,
  });
}

export class GlobalAllocationError extends Error {
  constructor(public readonly shortfall: number) {
    super(
      "Perubahan ini membuat total savings dan sisa budget aktif melebihi saldo wallet. Kurangi alokasi atau tambahkan saldo terlebih dahulu.",
    );
    this.name = "GlobalAllocationError";
  }
}

export async function assertGlobalAllocationNotWorse({
  db,
  userId,
  previousShortfall,
}: {
  db: GlobalAllocationClient;
  userId: string;
  previousShortfall: number;
}) {
  const summary = await getGlobalAllocationSummary(db, userId);

  if (summary.shortfall > previousShortfall) {
    throw new GlobalAllocationError(summary.shortfall);
  }

  return summary;
}
