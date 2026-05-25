import { NextRequest, NextResponse } from "next/server";

import {
  applyTransactionBalanceEffect,
  TransactionBalanceEffect,
} from "@/lib/transaction-balance";
import {
  TransactionSource,
  TransactionType,
  UserRole,
} from "@/lib/prisma-enums";
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
  description: string;
  transactionDate: Date;
  createdAt: Date;
  user: { id: string; name: string; email: string };
  wallet: { id: string; name: string };
  transferToWallet: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  budgetCategory: { id: string; name: string } | null;
};

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
    createdAt: transaction.createdAt.toISOString(),
    canManage: role === UserRole.ADMIN || currentUserId === transaction.userId,
  };
}

async function validateTransactionReferences(
  userId: string,
  payload: TransactionBalanceEffect & {
    categoryId: string | null;
    budgetCategoryId: string | null;
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

  const [wallet, category, budgetCategory] = await Promise.all([
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
    payload.type === TransactionType.EXPENSE && payload.budgetCategoryId
      ? prisma.budgetCategory.findFirst({
          where: {
            id: payload.budgetCategoryId,
            userId,
            isHidden: false,
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
    !budgetCategory
  ) {
    return "Budget category not found.";
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
          description: result.data.description,
          transactionDate: result.data.transactionDate,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          wallet: { select: { id: true, name: true } },
          transferToWallet: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          budgetCategory: { select: { id: true, name: true } },
        },
      });

      await applyTransactionBalanceEffect(tx, result.data, 1);

      if (!result.data.transferFeeEnabled || !result.data.transferFeeAmount) {
        return [createdTransfer];
      }

      const createdFee = await tx.transaction.create({
        data: {
          userId: auth.user.id,
          walletId: result.data.walletId,
          transferToWalletId: null,
          categoryId: adminFeeCategoryId!,
          budgetCategoryId: null,
          type: TransactionType.EXPENSE,
          amount: result.data.transferFeeAmount,
          description: "Biaya Admin",
          source: TransactionSource.SYSTEM,
          rawMessage: `transfer_fee:${createdTransfer.id}`,
          transactionDate: result.data.transactionDate,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          wallet: { select: { id: true, name: true } },
          transferToWallet: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          budgetCategory: { select: { id: true, name: true } },
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

      return [createdTransfer, createdFee];
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
