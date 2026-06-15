import {
  calculateDebtPaymentWalletIncrement,
  calculateDebtWalletIncrement,
} from "@finnnance/core";
import { budgetMonthRange, normalizeMonthStart } from "@/lib/budgets";
import { SavingLedgerType, TransactionType } from "@/lib/prisma-enums";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";

export {
  calculateDebtPaymentWalletIncrement,
  calculateDebtStatus,
  calculateDebtWalletIncrement,
  toDebtView,
  validateDebtPaymentPayload,
  validateDebtPayload,
} from "@finnnance/core";

export type {
  DebtPayload,
  DebtPaymentPayload,
  SafeToLendSummary,
} from "@finnnance/core";

export function applyDebtWalletMovement({
  type,
  amount,
  walletId,
  tx,
}: {
  type: import("@finnnance/core").DebtType;
  amount: number;
  walletId: string;
  tx: PrismaTransactionClient;
}) {
  return tx.wallet.update({
    where: { id: walletId },
    data: { currentBalance: { increment: calculateDebtWalletIncrement(type, amount) } },
  });
}

export function applyDebtPaymentWalletMovement({
  type,
  amount,
  walletId,
  tx,
}: {
  type: import("@finnnance/core").DebtType;
  amount: number;
  walletId: string;
  tx: PrismaTransactionClient;
}) {
  return tx.wallet.update({
    where: { id: walletId },
    data: { currentBalance: { increment: calculateDebtPaymentWalletIncrement(type, amount) } },
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
}): Promise<import("@finnnance/core").SafeToLendSummary> {
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

  const rawWalletBalance = wallets.reduce(
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
  const totalWalletBalance = Math.max(rawWalletBalance - savingsBalance, 0);
  const safeToLend = totalWalletBalance - remainingBudgetNeeded;
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
