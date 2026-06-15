import { NextRequest, NextResponse } from "next/server";

import { WalletBalanceCheckpointStatus, UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type CheckpointBody = {
  walletId?: unknown;
  realBalance?: unknown;
  note?: unknown;
};

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest(
    "api /api/wallet-balance-checkpoints",
  );

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as CheckpointBody | null;
  const walletId = typeof body?.walletId === "string" ? body.walletId : "";
  const realBalance = parseAmount(body?.realBalance);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 160) : null;

  if (!walletId) {
    return NextResponse.json({ error: "Wallet wajib dipilih." }, { status: 400 });
  }

  if (realBalance === null) {
    return NextResponse.json(
      { error: "Saldo real tidak valid." },
      { status: 400 },
    );
  }

  const wallet = await prisma.wallet.findFirst({
    where: {
      id: walletId,
      ...(auth.user.role === UserRole.ADMIN ? {} : { userId: auth.user.id }),
    },
    select: { id: true, name: true, userId: true, currentBalance: true },
  });

  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet tidak ditemukan." },
      { status: 404 },
    );
  }

  const differenceAmount = realBalance - wallet.currentBalance;
  const status =
    differenceAmount === 0
      ? WalletBalanceCheckpointStatus.MATCHED
      : WalletBalanceCheckpointStatus.UNMATCHED;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const checkpoint = await tx.walletBalanceCheckpoint.create({
      data: {
        userId: wallet.userId,
        walletId: wallet.id,
        webBalance: wallet.currentBalance,
        realBalance,
        differenceAmount,
        status,
        checkedAt: now,
        note,
      },
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        lastBalanceCheckedAt: now,
        ...(status === WalletBalanceCheckpointStatus.MATCHED
          ? { lastMatchedAt: now }
          : {}),
      },
      select: {
        id: true,
        name: true,
        currentBalance: true,
        lastBalanceCheckedAt: true,
        lastMatchedAt: true,
      },
    });

    return { checkpoint, wallet: updatedWallet };
  });

  return NextResponse.json({
    checkpoint: {
      id: result.checkpoint.id,
      walletId: result.checkpoint.walletId,
      webBalance: result.checkpoint.webBalance,
      realBalance: result.checkpoint.realBalance,
      differenceAmount: result.checkpoint.differenceAmount,
      status: result.checkpoint.status,
      checkedAt: result.checkpoint.checkedAt.toISOString(),
      note: result.checkpoint.note,
    },
    wallet: {
      ...result.wallet,
      lastBalanceCheckedAt:
        result.wallet.lastBalanceCheckedAt?.toISOString() || null,
      lastMatchedAt: result.wallet.lastMatchedAt?.toISOString() || null,
    },
  });
}
