import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  TransactionConfirmationStatus,
  TransactionDetailStatus,
  TransactionSource,
  TransactionType,
} from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { applyTransactionBalanceEffect } from "@/lib/transaction-balance";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";

type QuickAddBody = {
  type?: unknown;
  amount?: unknown;
  walletId?: unknown;
  note?: unknown;
  transactionDate?: unknown;
  source?: unknown;
  force?: unknown;
};

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseType(value: unknown) {
  const normalized = typeof value === "string" ? value.toUpperCase() : "";

  if (
    normalized === TransactionType.EXPENSE ||
    normalized === TransactionType.INCOME
  ) {
    return normalized;
  }

  return null;
}

function parseTransactionDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return new Date();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

async function getRequestUser(request: NextRequest, walletId: string) {
  const shortcutToken = request.headers.get("x-shortcut-token")?.trim();

  if (shortcutToken) {
    if (!env.iosShortcutToken || shortcutToken !== env.iosShortcutToken) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { success: false, message: "Unauthorized shortcut token." },
          { status: 401 },
        ),
      };
    }

    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: { user: true },
    });

    if (!wallet) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { success: false, message: "Wallet tidak ditemukan." },
          { status: 404 },
        ),
      };
    }

    return { ok: true as const, user: wallet.user, source: "shortcut" as const };
  }

  const auth = await getUnlockedAppUserForRequest("api /api/quick-add");

  if (!auth.ok) {
    return { ok: false as const, response: auth.response };
  }

  return { ok: true as const, user: auth.user, source: "web" as const };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as QuickAddBody | null;
  const walletId = typeof body?.walletId === "string" ? body.walletId : "";
  const requestUser = await getRequestUser(request, walletId);

  if (!requestUser.ok) {
    return requestUser.response;
  }

  const type = parseType(body?.type);
  const amount = parseAmount(body?.amount);
  const transactionDate = parseTransactionDate(body?.transactionDate);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 120) : "";
  const force = body?.force === true;

  if (!type) {
    return NextResponse.json(
      { success: false, message: "Type harus Expense atau Income." },
      { status: 400 },
    );
  }

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { success: false, message: "Amount tidak valid." },
      { status: 400 },
    );
  }

  if (!walletId) {
    return NextResponse.json(
      { success: false, message: "Wallet wajib dipilih." },
      { status: 400 },
    );
  }

  if (!transactionDate) {
    return NextResponse.json(
      { success: false, message: "Tanggal transaksi tidak valid." },
      { status: 400 },
    );
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId: requestUser.user.id },
    select: { id: true, name: true },
  });

  if (!wallet) {
    return NextResponse.json(
      { success: false, message: "Wallet tidak ditemukan untuk user ini." },
      { status: 404 },
    );
  }

  const duplicateWindowStart = new Date(Date.now() - 10 * 60 * 1000);
  const duplicate = await prisma.transaction.findFirst({
    where: {
      userId: requestUser.user.id,
      walletId,
      type,
      amount,
      createdAt: { gte: duplicateWindowStart },
    },
    include: { wallet: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (duplicate && !force) {
    return NextResponse.json(
      {
        success: false,
        code: "possible_duplicate",
        message: `Ada transaksi mirip beberapa menit lalu: ${type} ${amount} dari ${duplicate.wallet.name}.`,
        duplicate: {
          id: duplicate.id,
          amount: duplicate.amount,
          type: duplicate.type,
          walletName: duplicate.wallet.name,
          createdAt: duplicate.createdAt.toISOString(),
        },
      },
      { status: 409 },
    );
  }

  const source =
    requestUser.source === "shortcut" ||
    body?.source === "ios_shortcut"
      ? TransactionSource.IOS_SHORTCUT
      : TransactionSource.QUICK_ADD;

  const transaction = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const created = await tx.transaction.create({
        data: {
          userId: requestUser.user.id,
          walletId,
          type,
          amount,
          description: note || "Catat Cepat",
          source,
          confirmationStatus: TransactionConfirmationStatus.PENDING,
          detailStatus: TransactionDetailStatus.PENDING_DETAIL,
          needsReview: true,
          rawMessage: `quick_add:${requestUser.source}`,
          transactionDate,
          budgetMonth: null,
          categoryId: null,
          budgetCategoryId: null,
          budgetableAmount: 0,
        },
      });

      await applyTransactionBalanceEffect(tx, created, 1);

      return created;
    },
  );

  return NextResponse.json(
    {
      success: true,
      message: "Quick transaction saved",
      data: {
        id: transaction.id,
        status: "pending_detail",
      },
    },
    { status: 201 },
  );
}
