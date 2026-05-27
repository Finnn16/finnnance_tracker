import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/lib/generated/prisma/client";
import { parseIntegerAmount } from "@/lib/money";
import { SavingLedgerType } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import {
  assertGlobalAllocationNotWorse,
  getGlobalAllocationSummary,
  GlobalAllocationError,
} from "@/lib/global-allocation";

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const actualAmount = parseIntegerAmount(body?.actualAmount);
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim()
      : null;
  const dateValue = typeof body?.date === "string" ? body.date : "";
  const date = dateValue ? new Date(dateValue) : new Date();

  if (actualAmount === null) {
    return NextResponse.json(
      { error: "Actual savings amount is required." },
      { status: 400 },
    );
  }

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const ledgers = await prisma.savingLedger.findMany({
    where: { userId: auth.user.id },
    select: { type: true, amount: true },
  });

  const currentBalance = ledgers.reduce((total, ledger) => {
    const amount = Number(ledger.amount);

    if (ledger.type === SavingLedgerType.ADD) {
      return total + amount;
    }

    if (ledger.type === SavingLedgerType.WITHDRAW) {
      return total - amount;
    }

    return total + amount;
  }, 0);

  const adjustment = actualAmount - currentBalance;

  const previousAllocation =
    adjustment > 0
      ? await getGlobalAllocationSummary(prisma, auth.user.id)
      : null;

  try {
    const ledger = await prisma.$transaction(async (tx) => {
      const createdLedger = await tx.savingLedger.create({
        data: {
          userId: auth.user.id,
          type: SavingLedgerType.ADJUSTMENT,
          amount: new Prisma.Decimal(adjustment),
          note: note || "Reconciliation adjustment",
          date,
        },
      });

      if (previousAllocation) {
        await assertGlobalAllocationNotWorse({
          db: tx,
          userId: auth.user.id,
          previousShortfall: previousAllocation.shortfall,
        });
      }

      return createdLedger;
    });

    return NextResponse.json({ ok: true, adjustment, ledgerId: ledger.id });
  } catch (error) {
    if (error instanceof GlobalAllocationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
