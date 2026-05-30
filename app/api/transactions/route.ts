import { NextRequest, NextResponse } from "next/server";

import {
  applyTransactionBalanceEffect,
  TransactionBalanceEffect,
} from "@/lib/transaction-balance";
import {
  TransactionSource,
  TransactionType,
  SavingLedgerType,
  UserRole,
} from "@/lib/prisma-enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { budgetMonthRange, normalizeMonthStart } from "@/lib/budgets";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { validateTransactionPayload } from "@/lib/transactions";

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

function toTransactionView(
  transaction: TransactionWithRelations,
  currentUserId: string,
  role: UserRole,
) {
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
    canManage: role === UserRole.ADMIN || currentUserId === transaction.userId,
  };
}

async function validateTransactionReferences(
  userId: string,
  payload: TransactionBalanceEffect & {
    categoryId: string | null;
    budgetCategoryId: string | null;
    budgetMonth: Date | null;
    transferFeeEnabled: boolean;
    transferFeeBudgetCategoryId: string | null;
    transferFeeBudgetMonth: Date | null;
  },
) {
  if (payload.type === TransactionType.TRANSFER) {
    const [wallet, transferToWallet, feeBudgetAssignment] = await Promise.all([
      prisma.wallet.findFirst({
        where: { id: payload.walletId, userId },
        select: { id: true },
      }),
      prisma.wallet.findFirst({
        where: { id: payload.transferToWalletId || "", userId },
        select: { id: true },
      }),
      payload.transferFeeBudgetCategoryId && payload.transferFeeBudgetMonth
        ? prisma.budget.findFirst({
            where: {
              userId,
              month: budgetMonthRange(payload.transferFeeBudgetMonth)!,
              budgetCategoryId: payload.transferFeeBudgetCategoryId,
              budgetCategory: { isHidden: false },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!wallet) {
      return "Wallet not found.";
    }

    if (!transferToWallet) {
      return "Destination wallet not found.";
    }

    if (payload.transferFeeBudgetCategoryId && !feeBudgetAssignment) {
      return "Budget category is not assigned for the selected admin fee budget period.";
    }

    return null;
  }

  const [wallet, category, budgetAssignment, feeBudgetAssignment] =
    await Promise.all([
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
      select: { id: true, key: true },
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
    payload.transferFeeBudgetCategoryId && payload.transferFeeBudgetMonth
      ? prisma.budget.findFirst({
          where: {
            userId,
            month: budgetMonthRange(payload.transferFeeBudgetMonth)!,
            budgetCategoryId: payload.transferFeeBudgetCategoryId,
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
    payload.transferFeeEnabled &&
    payload.type === TransactionType.EXPENSE &&
    category.key !== "transfer_out"
  ) {
    return "Biaya admin hanya tersedia untuk kategori Transfer Keluar.";
  }

  if (
    payload.type === TransactionType.EXPENSE &&
    payload.budgetCategoryId &&
    !budgetAssignment
  ) {
    return "Budget category is not assigned for the selected budget month.";
  }

  if (payload.transferFeeBudgetCategoryId && !feeBudgetAssignment) {
    return "Budget category is not assigned for the selected admin fee budget period.";
  }

  return null;
}

async function findAdminFeeCategoryId() {
  const category = await prisma.category.findFirst({
    where: {
      key: "admin_fee",
      type: TransactionType.EXPENSE,
      isSelectable: true,
      isHidden: false,
    },
    select: { id: true },
  });

  return category?.id || null;
}

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const transactions = await prisma.transaction.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      wallet: { select: { id: true, name: true } },
      transferToWallet: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      budgetCategory: { select: { id: true, name: true } },
      savingLedgers: { select: { id: true, type: true, amount: true, note: true } },
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    transactions: transactions.map((transaction: TransactionWithRelations) =>
      toTransactionView(transaction, auth.user.id, auth.user.role),
    ),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const result = validateTransactionPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const referenceError = await validateTransactionReferences(
    auth.user.id,
    result.data,
  );

  if (referenceError) {
    return NextResponse.json({ error: referenceError }, { status: 400 });
  }

  const adminFeeCategoryId = result.data.transferFeeEnabled
    ? await findAdminFeeCategoryId()
    : null;

  if (result.data.transferFeeEnabled && !adminFeeCategoryId) {
    return NextResponse.json(
      { error: "Biaya Admin category not found." },
      { status: 400 },
    );
  }

  const createdTransactions = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const createdTransfer = await tx.transaction.create({
        data: {
          userId: auth.user.id,
          walletId: result.data.walletId,
          transferToWalletId: result.data.transferToWalletId,
          categoryId: result.data.categoryId,
          budgetCategoryId: result.data.budgetCategoryId,
          type: result.data.type,
          amount: result.data.amount,
          savingsAmount: result.data.savingsAmount,
          budgetableAmount: result.data.budgetableAmount,
          description: result.data.description,
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

      let createdTransferRecord: TransactionWithRelations =
        createdTransfer as unknown as TransactionWithRelations;

      if (
        result.data.type === TransactionType.INCOME &&
        result.data.savingsAmount &&
        result.data.savingsAmount > 0
      ) {
        await tx.savingLedger.create({
          data: {
            userId: auth.user.id,
            type: SavingLedgerType.ADD,
            amount: new Prisma.Decimal(result.data.savingsAmount),
            note: result.data.savingsNote || "Savings from income",
            date: result.data.transactionDate,
            sourceTransactionId: createdTransfer.id,
          },
        });

        createdTransferRecord = (await tx.transaction.findUnique({
          where: { id: createdTransfer.id },
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

      if (!result.data.transferFeeEnabled || !result.data.transferFeeAmount) {
        return [createdTransferRecord];
      }

      const createdFee = await tx.transaction.create({
        data: {
          userId: auth.user.id,
          walletId: result.data.walletId,
          transferToWalletId: null,
          categoryId: adminFeeCategoryId!,
          budgetCategoryId: result.data.transferFeeBudgetCategoryId,
          type: TransactionType.EXPENSE,
          amount: result.data.transferFeeAmount,
          description: result.data.transferFeeDescription || "Biaya Admin",
          source: TransactionSource.SYSTEM,
          rawMessage: `transfer_fee:${result.data.transferFeeMethod || "admin"}:${createdTransfer.id}`,
          transactionDate: result.data.transactionDate,
          budgetMonth:
            result.data.transferFeeBudgetMonth ||
            normalizeMonthStart(result.data.transactionDate),
          isPrepaid: result.data.transferFeeIsPrepaid,
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

      await applyTransactionBalanceEffect(
        tx,
        {
          type: TransactionType.EXPENSE,
          amount: result.data.transferFeeAmount,
          walletId: result.data.walletId,
          transferToWalletId: null,
        },
        1,
      );

      return [createdTransferRecord, createdFee];
    },
  );

  return NextResponse.json(
    {
      transactions: createdTransactions.map(
        (transaction: TransactionWithRelations) =>
          toTransactionView(transaction, auth.user.id, auth.user.role),
      ),
    },
    { status: 201 },
  );
}
