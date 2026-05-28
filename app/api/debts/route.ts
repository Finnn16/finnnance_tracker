import { NextRequest, NextResponse } from "next/server";

import {
  applyDebtWalletMovement,
  calculateSafeToLend,
  toDebtView,
  validateDebtPayload,
} from "@/lib/debts";
import { DebtType } from "@/lib/prisma-enums";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const debts = await prisma.debt.findMany({
    where: { userId: auth.user.id },
    include: {
      user: { select: { name: true, email: true } },
      wallet: { select: { name: true } },
      payments: {
        include: { wallet: { select: { name: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ debts: debts.map(toDebtView) });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const result = validateDebtPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id: result.data.walletId, userId: auth.user.id },
    select: { id: true },
  });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  const safeToLend =
    result.data.type === DebtType.RECEIVABLE
      ? await calculateSafeToLend({
          db: prisma,
          userId: auth.user.id,
          amount: result.data.amount,
          date: result.data.date,
        })
      : null;

  if (safeToLend && !safeToLend.isSafe) {
    if (safeToLend.strictMode) {
      return NextResponse.json(
        {
          error:
            "Pinjaman melebihi dana bebas dan strict mode budget sedang aktif.",
          safeToLend,
        },
        { status: 400 },
      );
    }

    if (!result.data.confirmUnsafe) {
      return NextResponse.json(
        {
          warning:
            "Dana bebas kamu tidak cukup untuk pinjaman ini. Konfirmasi untuk tetap melanjutkan.",
          safeToLend,
        },
        { status: 409 },
      );
    }
  }

  const debt = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const createdDebt = await tx.debt.create({
      data: {
        userId: auth.user.id,
        walletId: result.data.walletId,
        personName: result.data.personName,
        type: result.data.type,
        amount: result.data.amount,
        note: result.data.note,
        date: result.data.date,
        dueDate: result.data.dueDate,
      },
      include: {
        user: { select: { name: true, email: true } },
        wallet: { select: { name: true } },
        payments: {
          include: { wallet: { select: { name: true } } },
        },
      },
    });

    await applyDebtWalletMovement({
      tx,
      type: result.data.type,
      amount: result.data.amount,
      walletId: result.data.walletId,
    });

    return createdDebt;
  });

  return NextResponse.json(
    { debt: toDebtView(debt), safeToLend },
    { status: 201 },
  );
}
