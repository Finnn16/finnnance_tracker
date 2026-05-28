import { NextResponse } from "next/server";

import { DebtStatus, DebtType } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const [debts, recentPayments] = await Promise.all([
    prisma.debt.findMany({
      where: { userId: auth.user.id },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        dueDate: true,
        personName: true,
        payments: { select: { amount: true } },
      },
    }),
    prisma.debtPayment.findMany({
      where: { debt: { userId: auth.user.id } },
      include: {
        wallet: { select: { name: true } },
        debt: { select: { personName: true, type: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  let totalReceivable = 0;
  let totalPayable = 0;

  const activeDebts = debts
    .filter((debt) => debt.status !== DebtStatus.CANCELLED)
    .map((debt) => {
      const paidAmount = debt.payments.reduce(
        (total, payment) => total + payment.amount,
        0,
      );
      const remainingAmount = Math.max(0, debt.amount - paidAmount);

      if (debt.status !== DebtStatus.PAID) {
        if (debt.type === DebtType.RECEIVABLE) {
          totalReceivable += remainingAmount;
        } else {
          totalPayable += remainingAmount;
        }
      }

      return {
        id: debt.id,
        personName: debt.personName,
        type: debt.type,
        status: debt.status,
        dueDate: debt.dueDate?.toISOString() || null,
        remainingAmount,
      };
    });

  const upcomingDueDates = activeDebts
    .filter((debt) => debt.status !== DebtStatus.PAID && debt.dueDate)
    .sort((left, right) => left.dueDate!.localeCompare(right.dueDate!))
    .slice(0, 5);

  return NextResponse.json({
    summary: {
      totalReceivable,
      totalPayable,
      netDebtPosition: totalReceivable - totalPayable,
      activeCount: activeDebts.filter((debt) => debt.status !== DebtStatus.PAID)
        .length,
      upcomingDueDates,
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        debtPersonName: payment.debt.personName,
        debtType: payment.debt.type,
        walletName: payment.wallet?.name || null,
        amount: payment.amount,
        note: payment.note,
        date: payment.date.toISOString(),
      })),
    },
  });
}
