import { NextRequest, NextResponse } from "next/server";

import {
  TransactionSource,
  TransactionType,
  UserRole,
} from "@/lib/prisma-enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
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
  description: string;
  transactionDate: Date;
  createdAt: Date;
  user: { id: string; name: string; email: string };
  wallet: { id: string; name: string };
  transferToWallet: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  budgetCategory: { id: string; name: string } | null;
};

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
    transactionDate: transaction.transactionDate.toISOString(),
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

  const updatedTransaction = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
    await applyTransactionBalanceEffect(tx, existingTransaction, -1);

    const updated = await tx.transaction.update({
      where: { id },
      data: {
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

    return updated;
    },
  );

  return NextResponse.json({
    transaction: toTransactionView(updatedTransaction),
  });
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

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await applyTransactionBalanceEffect(tx, existingTransaction, -1);

    if (existingTransaction.type === TransactionType.TRANSFER) {
      const linkedFee = await tx.transaction.findFirst({
        where: {
          userId: existingTransaction.userId,
          type: TransactionType.EXPENSE,
          source: TransactionSource.SYSTEM,
          rawMessage: `transfer_fee:${existingTransaction.id}`,
        },
      });

      if (linkedFee) {
        await applyTransactionBalanceEffect(tx, linkedFee, -1);
        await tx.transaction.delete({ where: { id: linkedFee.id } });
      }
    }

    await tx.transaction.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
