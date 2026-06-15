import { NextRequest, NextResponse } from "next/server";

import {
  TransactionConfirmationStatus,
  TransactionDetailStatus,
  TransactionSource,
  TransactionType,
  SavingLedgerType,
  UserRole,
} from "@/lib/prisma-enums";
import { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import {
  budgetMonthRange,
  monthInputValue,
  normalizeMonthStart,
} from "@/lib/budgets";
import { validateBudgetableIncomeReduction } from "@/lib/budgetable-income";
import {
  assertGlobalAllocationNotWorse,
  getGlobalAllocationSummary,
  GlobalAllocationError,
} from "@/lib/global-allocation";
import {
  applyTransactionBalanceEffect,
  TransactionBalanceEffect,
} from "@/lib/transaction-balance";
import { validateTransactionPayload } from "@/lib/transactions";

type TransactionRouteProps = {
  params: Promise<{ id: string }>;
};

type TransactionWithRelations = {
  id: string;
  userId: string;
  walletId: string;
  transferToWalletId: string | null;
  categoryId: string | null;
  budgetCategoryId: string | null;
  type: TransactionType;
  amount: number;
  savingsAmount: number;
  budgetableAmount: number;
  description: string;
  source: TransactionSource;
  confirmationStatus: TransactionConfirmationStatus;
  detailStatus: TransactionDetailStatus;
  needsReview: boolean;
  transactionDate: Date;
  budgetMonth: Date | null;
  isPrepaid: boolean;
  createdAt: Date;
  user: { id: string; name: string; email: string };
  wallet: { id: string; name: string };
  transferToWallet: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  budgetCategory: { id: string; name: string } | null;
  savingLedgers: {
    id: string;
    type: SavingLedgerType;
    amount: Prisma.Decimal;
    note: string | null;
  }[];
};

function getSavingsNote(transaction: TransactionWithRelations) {
  return (
    transaction.savingLedgers.find(
      (ledger) => ledger.type === SavingLedgerType.ADD,
    )?.note || null
  );
}

function toTransactionView(transaction: TransactionWithRelations) {
  return {
    id: transaction.id,
    userId: transaction.userId,
    userName: transaction.user.name,
    userEmail: transaction.user.email,
    walletId: transaction.walletId,
    walletName: transaction.wallet.name,
    transferToWalletId: transaction.transferToWalletId,
    transferToWalletName: transaction.transferToWallet?.name || null,
    categoryId: transaction.categoryId,
    categoryName: transaction.category?.name || null,
    budgetCategoryId: transaction.budgetCategoryId,
    budgetCategoryName: transaction.budgetCategory?.name || null,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    source: transaction.source,
    confirmationStatus: transaction.confirmationStatus,
    detailStatus: transaction.detailStatus,
    needsReview: transaction.needsReview,
    transactionDate: transaction.transactionDate.toISOString(),
    budgetMonth: transaction.budgetMonth?.toISOString() || null,
    isPrepaid: transaction.isPrepaid,
    isUnbudgetedExpense:
      transaction.type === TransactionType.EXPENSE &&
      transaction.budgetCategoryId === null,
    savingsAmount: transaction.savingsAmount || null,
    savingsNote: getSavingsNote(transaction),
    budgetableAmount: transaction.budgetableAmount,
    createdAt: transaction.createdAt.toISOString(),
    canManage: true,
  };
}

function canManageTransaction(
  role: UserRole,
  currentUserId: string,
  userId: string,
) {
  return role === UserRole.ADMIN || currentUserId === userId;
}

function getBudgetPeriod(transaction: {
  budgetMonth: Date | null;
  transactionDate: Date;
}) {
  return (
    transaction.budgetMonth || normalizeMonthStart(transaction.transactionDate)!
  );
}

async function validateTransactionReferences(
  userId: string,
  payload: TransactionBalanceEffect & {
    categoryId: string | null;
    budgetCategoryId: string | null;
    budgetMonth: Date | null;
  },
) {
  if (payload.type === TransactionType.TRANSFER) {
    const [wallet, transferToWallet] = await Promise.all([
      prisma.wallet.findFirst({
        where: { id: payload.walletId, userId },
        select: { id: true },
      }),
      prisma.wallet.findFirst({
        where: { id: payload.transferToWalletId || "", userId },
        select: { id: true },
      }),
    ]);

    if (!wallet) {
      return "Wallet not found.";
    }

    if (!transferToWallet) {
      return "Destination wallet not found.";
    }

    return null;
  }

  const [wallet, category, budgetAssignment] = await Promise.all([
    prisma.wallet.findFirst({
      where: { id: payload.walletId, userId },
      select: { id: true },
    }),
    prisma.category.findFirst({
      where: {
        id: payload.categoryId || "",
        type: payload.type,
        isSelectable: true,
        isHidden: false,
      },
      select: { id: true },
    }),
    payload.type === TransactionType.EXPENSE &&
    payload.budgetCategoryId &&
    payload.budgetMonth
      ? prisma.budget.findFirst({
          where: {
            userId,
            month: budgetMonthRange(payload.budgetMonth)!,
            budgetCategoryId: payload.budgetCategoryId,
            budgetCategory: { isHidden: false },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!wallet) {
    return "Wallet not found.";
  }

  if (!category) {
    return "Category not found for this transaction type.";
  }

  if (
    payload.type === TransactionType.EXPENSE &&
    payload.budgetCategoryId &&
    !budgetAssignment
  ) {
    return "Budget category is not assigned for the selected budget month.";
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: TransactionRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      savingLedgers: { select: { id: true, type: true, amount: true, note: true } },
    },
  });

  if (!existingTransaction) {
    return NextResponse.json(
      { error: "Transaction not found." },
      { status: 404 },
    );
  }

  if (
    !canManageTransaction(
      auth.user.role,
      auth.user.id,
      existingTransaction.userId,
    )
  ) {
    return NextResponse.json(
      { error: "You can only edit your own transactions." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const result = validateTransactionPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const referenceError = await validateTransactionReferences(
    existingTransaction.userId,
    result.data,
  );

  if (referenceError) {
    return NextResponse.json({ error: referenceError }, { status: 400 });
  }

  if (existingTransaction.type === TransactionType.INCOME) {
    const existingBudgetPeriod = getBudgetPeriod(existingTransaction);
    const replacementBudgetableAmount =
      result.data.type === TransactionType.INCOME &&
      result.data.budgetMonth &&
      monthInputValue(result.data.budgetMonth) ===
        monthInputValue(existingBudgetPeriod)
        ? result.data.budgetableAmount
        : 0;

    if (replacementBudgetableAmount < existingTransaction.budgetableAmount) {
      const incomeReductionError = await validateBudgetableIncomeReduction({
        userId: existingTransaction.userId,
        budgetMonth: existingBudgetPeriod,
        excludedIncomeId: existingTransaction.id,
        replacementBudgetableAmount,
      });

      if (incomeReductionError) {
        return NextResponse.json(
          { error: incomeReductionError },
          { status: 400 },
        );
      }
    }
  }

  const shouldAllowFundingShortfall =
    existingTransaction.type === TransactionType.EXPENSE ||
    result.data.type === TransactionType.EXPENSE;
  const previousAllocation = shouldAllowFundingShortfall
    ? null
    : await getGlobalAllocationSummary(prisma, existingTransaction.userId);

  try {
    const updatedTransaction = await prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
      await applyTransactionBalanceEffect(tx, existingTransaction, -1);

      await tx.savingLedger.deleteMany({
        where: {
          sourceTransactionId: id,
          type: SavingLedgerType.ADD,
        },
      });

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          walletId: result.data.walletId,
          transferToWalletId: result.data.transferToWalletId,
          categoryId: result.data.categoryId,
          budgetCategoryId: result.data.budgetCategoryId,
          type: result.data.type,
          amount: result.data.amount,
          savingsAmount: result.data.savingsAmount,
          budgetableAmount: result.data.budgetableAmount,
          description: result.data.description,
          confirmationStatus: TransactionConfirmationStatus.CONFIRMED,
          detailStatus: TransactionDetailStatus.COMPLETED,
          needsReview: false,
          transactionDate: result.data.transactionDate,
          budgetMonth: result.data.budgetMonth,
          isPrepaid: result.data.isPrepaid,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          wallet: { select: { id: true, name: true } },
          transferToWallet: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          budgetCategory: { select: { id: true, name: true } },
          savingLedgers: { select: { id: true, type: true, amount: true, note: true } },
        },
      });

      await applyTransactionBalanceEffect(tx, result.data, 1);

      let updatedRecord: TransactionWithRelations | null =
        updated as unknown as TransactionWithRelations;

      if (
        result.data.type === TransactionType.INCOME &&
        result.data.savingsAmount &&
        result.data.savingsAmount > 0
      ) {
        await tx.savingLedger.create({
          data: {
            userId: existingTransaction.userId,
            type: SavingLedgerType.ADD,
            amount: new Prisma.Decimal(result.data.savingsAmount),
            note: result.data.savingsNote || "Savings from income",
            date: result.data.transactionDate,
            sourceTransactionId: updated.id,
          },
        });

        updatedRecord = (await tx.transaction.findUnique({
          where: { id: updated.id },
          include: {
            user: { select: { id: true, name: true, email: true } },
            wallet: { select: { id: true, name: true } },
            transferToWallet: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            budgetCategory: { select: { id: true, name: true } },
            savingLedgers: { select: { id: true, type: true, amount: true, note: true } },
          },
        })) as unknown as TransactionWithRelations;
      }

        if (previousAllocation) {
          await assertGlobalAllocationNotWorse({
            db: tx,
            userId: existingTransaction.userId,
            previousShortfall: previousAllocation.shortfall,
          });
        }

        return updatedRecord || updated;
      },
    );

    return NextResponse.json({
      transaction: toTransactionView(updatedTransaction),
    });
  } catch (error) {
    if (error instanceof GlobalAllocationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: TransactionRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!existingTransaction) {
    return NextResponse.json(
      { error: "Transaction not found." },
      { status: 404 },
    );
  }

  if (
    !canManageTransaction(
      auth.user.role,
      auth.user.id,
      existingTransaction.userId,
    )
  ) {
    return NextResponse.json(
      { error: "You can only delete your own transactions." },
      { status: 403 },
    );
  }

  if (
    existingTransaction.type === TransactionType.INCOME &&
    existingTransaction.budgetableAmount > 0
  ) {
    const incomeReductionError = await validateBudgetableIncomeReduction({
      userId: existingTransaction.userId,
      budgetMonth: getBudgetPeriod(existingTransaction),
      excludedIncomeId: existingTransaction.id,
      replacementBudgetableAmount: 0,
    });

    if (incomeReductionError) {
      return NextResponse.json({ error: incomeReductionError }, { status: 400 });
    }
  }

  const linkedSavingsCount = await prisma.savingLedger.count({
    where: {
      sourceTransactionId: id,
      ...(existingTransaction.type === TransactionType.INCOME
        ? { type: { not: SavingLedgerType.ADD } }
        : {}),
    },
  });

  if (linkedSavingsCount > 0) {
    return NextResponse.json(
      {
        error:
          "Transaction ini punya savings ledger yang harus diselesaikan sebelum delete.",
      },
      { status: 400 },
    );
  }

  const previousAllocation = await getGlobalAllocationSummary(
    prisma,
    existingTransaction.userId,
  );

  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await applyTransactionBalanceEffect(tx, existingTransaction, -1);

      if (existingTransaction.type === TransactionType.INCOME) {
        await tx.savingLedger.deleteMany({
          where: {
            sourceTransactionId: id,
            type: SavingLedgerType.ADD,
          },
        });
      }

      if (
        existingTransaction.type === TransactionType.TRANSFER ||
        existingTransaction.type === TransactionType.EXPENSE
      ) {
        const linkedFees = await tx.transaction.findMany({
          where: {
            userId: existingTransaction.userId,
            type: TransactionType.EXPENSE,
            source: TransactionSource.SYSTEM,
            rawMessage: { endsWith: `:${existingTransaction.id}` },
          },
        });

        for (const linkedFee of linkedFees) {
          await applyTransactionBalanceEffect(tx, linkedFee, -1);
          await tx.transaction.delete({ where: { id: linkedFee.id } });
        }
      }

      await tx.transaction.delete({ where: { id } });

      await assertGlobalAllocationNotWorse({
        db: tx,
        userId: existingTransaction.userId,
        previousShortfall: previousAllocation.shortfall,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GlobalAllocationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
