import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/lib/generated/prisma/client";
import {
  calculateBudgetableIncomeAmount,
} from "@/lib/budgets";
import { validateBudgetableIncomeReduction } from "@/lib/budgetable-income";
import {
  assertGlobalAllocationNotWorse,
  getGlobalAllocationSummary,
  GlobalAllocationError,
} from "@/lib/global-allocation";
import {
  SavingLedgerType,
  TransactionType,
  UserRole,
} from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { parseIntegerAmount } from "@/lib/money";

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const incomeTransactionId =
    typeof body?.incomeTransactionId === "string"
      ? body.incomeTransactionId
      : "";
  const amount = parseIntegerAmount(body?.amount);
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim()
      : null;
  const dateValue = typeof body?.date === "string" ? body.date : "";
  const date = dateValue ? new Date(dateValue) : new Date();

  if (!incomeTransactionId) {
    return NextResponse.json(
      { error: "Income transaction is required." },
      { status: 400 },
    );
  }

  if (amount === null || amount <= 0) {
    return NextResponse.json(
      { error: "Savings amount must be greater than 0." },
      { status: 400 },
    );
  }

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const incomeTransaction = await prisma.transaction.findUnique({
    where: { id: incomeTransactionId },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      savingsAmount: true,
      budgetMonth: true,
      budgetableAmount: true,
      transactionDate: true,
    },
  });

  if (!incomeTransaction) {
    return NextResponse.json(
      { error: "Income transaction not found." },
      { status: 404 },
    );
  }

  if (
    incomeTransaction.userId !== auth.user.id &&
    auth.user.role !== UserRole.ADMIN
  ) {
    return NextResponse.json(
      { error: "You can only manage your own savings." },
      { status: 403 },
    );
  }

  if (incomeTransaction.type !== TransactionType.INCOME) {
    return NextResponse.json(
      { error: "Selected transaction must be income." },
      { status: 400 },
    );
  }

  if (amount > incomeTransaction.amount) {
    return NextResponse.json(
      { error: "Nominal savings tidak boleh lebih besar dari income." },
      { status: 400 },
    );
  }

  const budgetableAmount = calculateBudgetableIncomeAmount({
    incomeAmount: incomeTransaction.amount,
    savingsAmount: amount,
    allocateToBudget: incomeTransaction.budgetMonth !== null,
  });

  if (
    incomeTransaction.budgetMonth &&
    budgetableAmount < incomeTransaction.budgetableAmount
  ) {
    const incomeReductionError = await validateBudgetableIncomeReduction({
      userId: incomeTransaction.userId,
      budgetMonth: incomeTransaction.budgetMonth,
      excludedIncomeId: incomeTransaction.id,
      replacementBudgetableAmount: budgetableAmount,
    });

    if (incomeReductionError) {
      return NextResponse.json({ error: incomeReductionError }, { status: 400 });
    }
  }

  const previousAllocation =
    amount > incomeTransaction.savingsAmount
      ? await getGlobalAllocationSummary(prisma, incomeTransaction.userId)
      : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.savingLedger.deleteMany({
        where: {
          sourceTransactionId: incomeTransactionId,
          type: SavingLedgerType.ADD,
        },
      });

      const ledger = await tx.savingLedger.create({
        data: {
          userId: incomeTransaction.userId,
          type: SavingLedgerType.ADD,
          amount: new Prisma.Decimal(amount),
          note: note || "Savings from income",
          date: Number.isNaN(date.getTime())
            ? incomeTransaction.transactionDate
            : date,
          sourceTransactionId: incomeTransactionId,
        },
      });

      await tx.transaction.update({
        where: { id: incomeTransactionId },
        data: {
          savingsAmount: amount,
          budgetableAmount,
        },
      });

      if (previousAllocation) {
        await assertGlobalAllocationNotWorse({
          db: tx,
          userId: incomeTransaction.userId,
          previousShortfall: previousAllocation.shortfall,
        });
      }

      return {
        ledgerId: ledger.id,
      };
    });

    return NextResponse.json({ ok: true, ledgerId: result.ledgerId });
  } catch (error) {
    if (error instanceof GlobalAllocationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
