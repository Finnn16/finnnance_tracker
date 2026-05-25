import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { createWalletKey, validateWalletPayload } from "@/lib/wallets";

type WalletRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: WalletRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = validateWalletPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const existingWallet = await prisma.wallet.findFirst({
    where: { id, userId: auth.user.id },
    select: {
      id: true,
      initialBalance: true,
      currentBalance: true,
      isDefault: true,
    },
  });

  if (!existingWallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  const { name, type, initialBalance } = result.data;
  const balanceDelta = initialBalance - existingWallet.initialBalance;
  const hasOtherDefaultWallet = await prisma.wallet.findFirst({
    where: {
      userId: auth.user.id,
      id: { not: id },
      isDefault: true,
    },
    select: { id: true },
  });
  const isDefault =
    result.data.isDefault ||
    (existingWallet.isDefault && !hasOtherDefaultWallet);

  try {
    const wallet = await prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        if (isDefault) {
          await tx.wallet.updateMany({
            where: { userId: auth.user.id, isDefault: true, id: { not: id } },
            data: { isDefault: false },
          });
        }

        return tx.wallet.update({
          where: { id },
          data: {
            key: createWalletKey(name),
            name,
            type,
            initialBalance,
            currentBalance: existingWallet.currentBalance + balanceDelta,
            isDefault,
          },
        });
      },
    );

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error("Failed to update wallet:", error);
    return NextResponse.json(
      { error: "Wallet name is already used." },
      { status: 409 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: WalletRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const wallet = await prisma.wallet.findFirst({
    where: { id, userId: auth.user.id },
    select: {
      id: true,
      isDefault: true,
      _count: {
        select: {
          transactions: true,
          transferTransactions: true,
        },
      },
    },
  });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  const usageCount =
    wallet._count.transactions + wallet._count.transferTransactions;

  if (usageCount > 0) {
    return NextResponse.json(
      { error: "Wallet cannot be deleted because it has transactions." },
      { status: 409 },
    );
  }

  const otherWallet = await prisma.wallet.findFirst({
    where: { userId: auth.user.id, id: { not: id } },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  if (!otherWallet) {
    return NextResponse.json(
      { error: "At least one wallet is required." },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.wallet.delete({ where: { id } });

    if (wallet.isDefault) {
      const replacement = await tx.wallet.findFirst({
        where: { userId: auth.user.id },
        select: { id: true },
        orderBy: { name: "asc" },
      });

      if (replacement) {
        await tx.wallet.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
