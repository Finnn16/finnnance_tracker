import { NextRequest, NextResponse } from "next/server";

import {
  applyDebtPaymentWalletMovement,
  calculateDebtStatus,
  toDebtView,
  validateDebtPaymentPayload,
} from "@/lib/debts";
import { DebtStatus } from "@/lib/prisma-enums";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type DebtPaymentRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: DebtPaymentRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const debt = await prisma.debt.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      user: { select: { name: true, email: true } },
      wallet: { select: { name: true } },
      payments: {
        include: { wallet: { select: { name: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!debt) {
    return NextResponse.json({ error: "Debt not found." }, { status: 404 });
  }

  return NextResponse.json({ payments: toDebtView(debt).payments });
}

export async function POST(
  request: NextRequest,
  { params }: DebtPaymentRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = validateDebtPaymentPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [debt, wallet] = await Promise.all([
    prisma.debt.findFirst({
      where: { id, userId: auth.user.id },
      include: {
        payments: { select: { amount: true } },
      },
    }),
    prisma.wallet.findFirst({
      where: { id: result.data.walletId, userId: auth.user.id },
      select: { id: true },
    }),
  ]);

  if (!debt) {
    return NextResponse.json({ error: "Debt not found." }, { status: 404 });
  }

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  if (debt.status === DebtStatus.CANCELLED) {
    return NextResponse.json(
      { error: "Cancelled debt cannot receive payment." },
      { status: 400 },
    );
  }

  if (debt.status === DebtStatus.PAID) {
    return NextResponse.json(
      { error: "Debt is already paid." },
      { status: 400 },
    );
  }

  const paidAmount = debt.payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const remainingAmount = debt.amount - paidAmount;

  if (result.data.amount > remainingAmount) {
    return NextResponse.json(
      { error: "Pembayaran melebihi sisa hutang/piutang." },
      { status: 400 },
    );
  }

  const updatedDebt = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      await tx.debtPayment.create({
        data: {
          debtId: debt.id,
          walletId: result.data.walletId,
          amount: result.data.amount,
          note: result.data.note,
          date: result.data.date,
        },
      });

      await applyDebtPaymentWalletMovement({
        tx,
        type: debt.type,
        amount: result.data.amount,
        walletId: result.data.walletId,
      });

      const nextPaidAmount = paidAmount + result.data.amount;

      return tx.debt.update({
        where: { id: debt.id },
        data: {
          status: calculateDebtStatus(debt.amount, nextPaidAmount),
        },
        include: {
          user: { select: { name: true, email: true } },
          wallet: { select: { name: true } },
          payments: {
            include: { wallet: { select: { name: true } } },
          },
        },
      });
    },
  );

  return NextResponse.json({ debt: toDebtView(updatedDebt) }, { status: 201 });
}
