import { NextResponse } from "next/server";

import { Prisma } from "@/lib/generated/prisma/client";
import { monthInputValue } from "@/lib/budgets";
import { SavingLedgerType } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function toHistoryItem(ledger: {
  id: string;
  type: SavingLedgerType;
  amount: Prisma.Decimal;
  note: string | null;
  date: Date;
  sourceTransactionId: string | null;
  user: { name: string; email: string };
}) {
  return {
    id: ledger.id,
    type: ledger.type,
    amount: Number(ledger.amount),
    note: ledger.note,
    date: ledger.date.toISOString(),
    sourceTransactionId: ledger.sourceTransactionId,
    userName: ledger.user.name,
    userEmail: ledger.user.email,
  };
}

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(monthStart);

  const [ledgers, wallets] = await Promise.all([
    prisma.savingLedger.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.wallet.findMany({ select: { currentBalance: true } }),
  ]);

  const currentBalance = ledgers.reduce((total, ledger) => {
    const amount = Number(ledger.amount);

    if (ledger.type === SavingLedgerType.ADD) {
      return total + amount;
    }

    if (ledger.type === SavingLedgerType.WITHDRAW) {
      return total - amount;
    }

    return total + amount;
  }, 0);

  const addedThisMonth = ledgers.reduce((total, ledger) => {
    if (ledger.type !== SavingLedgerType.ADD) {
      return total;
    }

    return ledger.date >= monthStart && ledger.date < nextMonthStart
      ? total + Number(ledger.amount)
      : total;
  }, 0);

  const usedThisMonth = ledgers.reduce((total, ledger) => {
    if (ledger.type !== SavingLedgerType.WITHDRAW) {
      return total;
    }

    return ledger.date >= monthStart && ledger.date < nextMonthStart
      ? total + Number(ledger.amount)
      : total;
  }, 0);

  const adjustmentThisMonth = ledgers.reduce((total, ledger) => {
    if (ledger.type !== SavingLedgerType.ADJUSTMENT) {
      return total;
    }

    return ledger.date >= monthStart && ledger.date < nextMonthStart
      ? total + Number(ledger.amount)
      : total;
  }, 0);

  const lastReconciled = ledgers.find(
    (ledger) => ledger.type === SavingLedgerType.ADJUSTMENT,
  );

  return NextResponse.json({
    summary: {
      currentBalance,
      availableToSpend:
        wallets.reduce((total, wallet) => total + wallet.currentBalance, 0) -
        currentBalance,
      totalWalletBalance: wallets.reduce(
        (total, wallet) => total + wallet.currentBalance,
        0,
      ),
      addedThisMonth,
      usedThisMonth,
      adjustmentThisMonth,
      lastReconciledAt: lastReconciled?.date.toISOString() || null,
      period: monthInputValue(monthStart),
    },
    history: ledgers.slice(0, 100).map(toHistoryItem),
  });
}
