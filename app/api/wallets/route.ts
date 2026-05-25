import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { createWalletKey, validateWalletPayload } from "@/lib/wallets";

function toWalletView(wallet: {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  isDefault: boolean;
  _count: {
    transactions: number;
    transferTransactions: number;
  };
}) {
  return {
    id: wallet.id,
    name: wallet.name,
    type: wallet.type,
    initialBalance: wallet.initialBalance,
    currentBalance: wallet.currentBalance,
    isDefault: wallet.isDefault,
    transactionCount:
      wallet._count.transactions + wallet._count.transferTransactions,
  };
}

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const wallets = await prisma.wallet.findMany({
    where: { userId: auth.user.id },
    include: {
      _count: {
        select: {
          transactions: true,
          transferTransactions: true,
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ wallets: wallets.map(toWalletView) });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const result = validateWalletPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { name, type, initialBalance } = result.data;
  const key = createWalletKey(name);
  const walletCount = await prisma.wallet.count({
    where: { userId: auth.user.id },
  });
  const isDefault = result.data.isDefault || walletCount === 0;

  try {
    const wallet = await prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        if (isDefault) {
          await tx.wallet.updateMany({
            where: { userId: auth.user.id, isDefault: true },
            data: { isDefault: false },
          });
        }

        return tx.wallet.create({
          data: {
            userId: auth.user.id,
            key,
            name,
            type,
            initialBalance,
            currentBalance: initialBalance,
            isDefault,
          },
        });
      },
    );

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error) {
    console.error("Failed to create wallet:", error);
    return NextResponse.json(
      { error: "Wallet name is already used." },
      { status: 409 },
    );
  }
}
