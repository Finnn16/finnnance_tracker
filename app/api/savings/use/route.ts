import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/lib/generated/prisma/client";
import { parseIntegerAmount } from "@/lib/money";
import { isPrepaidTransaction, normalizeMonthStart } from "@/lib/budgets";
import {
  SavingLedgerType,
  TransactionSource,
  TransactionType,
} from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { applyTransactionBalanceEffect } from "@/lib/transaction-balance";

async function validateExpenseReferences(
  userId: string,
  walletId: string,
  categoryId: string,
) {
  const [wallet, category] = await Promise.all([
    prisma.wallet.findFirst({
      where: { id: walletId, userId },
      select: { id: true },
    }),
    prisma.category.findFirst({
      where: {
        id: categoryId,
        type: TransactionType.EXPENSE,
        isSelectable: true,
        isHidden: false,
      },
      select: { id: true },
    }),
  ]);

  if (!wallet) {
    return "Wallet not found.";
  }

  if (!category) {
    return "Category not found for this transaction type.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const usageType = typeof body?.usageType === "string" ? body.usageType : "";
  const amount = parseIntegerAmount(body?.amount);
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim()
      : null;
  const dateValue = typeof body?.date === "string" ? body.date : "";
  const date = dateValue ? new Date(dateValue) : new Date();

  if (amount === null || amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than 0." },
      { status: 400 },
    );
  }

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  if (usageType === "RETURN_TO_AVAILABLE") {
    const ledgers = await prisma.savingLedger.findMany({
      where: { userId: auth.user.id },
      select: { type: true, amount: true },
    });
    const currentSavings = ledgers.reduce((total, ledger) => {
      const ledgerAmount = ledger.amount.toNumber();

      return ledger.type === SavingLedgerType.WITHDRAW
        ? total - ledgerAmount
        : total + ledgerAmount;
    }, 0);

    if (amount > currentSavings) {
      return NextResponse.json(
        { error: "Amount melebihi saldo savings saat ini." },
        { status: 400 },
      );
    }

    const ledger = await prisma.savingLedger.create({
      data: {
        userId: auth.user.id,
        type: SavingLedgerType.WITHDRAW,
        amount: new Prisma.Decimal(amount),
        note: note || "Return to available balance",
        date,
      },
    });

    return NextResponse.json({ ok: true, ledgerId: ledger.id });
  }

  if (usageType !== "EXPENSE") {
    return NextResponse.json({ error: "Invalid usage type." }, { status: 400 });
  }

  const walletId = typeof body?.walletId === "string" ? body.walletId : "";
  const categoryId =
    typeof body?.categoryId === "string" ? body.categoryId : "";
  const budgetMonthValue =
    typeof body?.budgetMonth === "string" ? body.budgetMonth : "";
  const budgetMonth = budgetMonthValue
    ? normalizeMonthStart(budgetMonthValue)
    : normalizeMonthStart(date);

  if (!walletId) {
    return NextResponse.json({ error: "Wallet is required." }, { status: 400 });
  }

  if (!categoryId) {
    return NextResponse.json(
      { error: "Category is required." },
      { status: 400 },
    );
  }

  if (!budgetMonth) {
    return NextResponse.json(
      { error: "Invalid budget month." },
      { status: 400 },
    );
  }

  const referenceError = await validateExpenseReferences(
    auth.user.id,
    walletId,
    categoryId,
  );

  if (referenceError) {
    return NextResponse.json({ error: referenceError }, { status: 400 });
  }

  const result = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          userId: auth.user.id,
          walletId,
          transferToWalletId: null,
          categoryId,
          budgetCategoryId: null,
          type: TransactionType.EXPENSE,
          amount,
          description: note || "Savings expense",
          source: TransactionSource.SYSTEM,
          rawMessage: "savings-use",
          transactionDate: date,
          budgetMonth,
          isPrepaid: isPrepaidTransaction(date, budgetMonth),
        },
      });

      await applyTransactionBalanceEffect(
        tx,
        {
          type: TransactionType.EXPENSE,
          amount,
          walletId,
          transferToWalletId: null,
        },
        1,
      );

      const ledger = await tx.savingLedger.create({
        data: {
          userId: auth.user.id,
          type: SavingLedgerType.WITHDRAW,
          amount: new Prisma.Decimal(amount),
          note: note || `Savings used for expense:${createdTransaction.id}`,
          date,
          sourceTransactionId: createdTransaction.id,
        },
      });

      return { transactionId: createdTransaction.id, ledgerId: ledger.id };
    },
  );

  return NextResponse.json({ ok: true, ...result });
}
