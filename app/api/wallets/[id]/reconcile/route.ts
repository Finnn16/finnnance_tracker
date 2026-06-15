import { NextRequest, NextResponse } from "next/server";

import { parseIntegerAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type WalletReconcileRouteProps = {
  params: Promise<{ id: string }>;
};

const reasonLabels = new Set([
  "admin_fee",
  "forgotten_transaction",
  "balance_correction",
  "unknown",
]);

function validateReconcilePayload(body: unknown) {
  const input = body as {
    actualBalance?: unknown;
    reason?: unknown;
    note?: unknown;
  } | null;
  const actualBalance = parseIntegerAmount(input?.actualBalance);
  const reason = typeof input?.reason === "string" ? input.reason : "unknown";
  const note = typeof input?.note === "string" ? input.note.trim() : "";

  if (actualBalance === null) {
    return { ok: false as const, error: "Actual balance must be a number." };
  }

  if (!reasonLabels.has(reason)) {
    return { ok: false as const, error: "Invalid reconcile reason." };
  }

  if (note.length > 160) {
    return { ok: false as const, error: "Note must be 160 characters or less." };
  }

  return {
    ok: true as const,
    data: {
      actualBalance,
      reason,
      note: note || null,
    },
  };
}

export async function POST(
  request: NextRequest,
  { params }: WalletReconcileRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = validateReconcilePayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id, userId: auth.user.id },
    select: { id: true, currentBalance: true },
  });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  const difference = result.data.actualBalance - wallet.currentBalance;

  const reconciliation = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { currentBalance: result.data.actualBalance },
    });

    return tx.walletReconciliation.create({
      data: {
        userId: auth.user.id,
        walletId: wallet.id,
        systemBalance: wallet.currentBalance,
        actualBalance: result.data.actualBalance,
        difference,
        reason: result.data.reason,
        note: result.data.note,
      },
    });
  });

  return NextResponse.json({
    reconciliation: {
      id: reconciliation.id,
      systemBalance: reconciliation.systemBalance,
      actualBalance: reconciliation.actualBalance,
      difference: reconciliation.difference,
      reason: reconciliation.reason,
      note: reconciliation.note,
      reconciledAt: reconciliation.reconciledAt.toISOString(),
    },
  });
}
