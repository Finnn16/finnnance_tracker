import { NextRequest, NextResponse } from "next/server";

import { budgetMonthRange } from "@/lib/budgets";
import { parseIntegerAmount } from "@/lib/money";
import { TransactionType, UserRole } from "@/lib/prisma-enums";
import { getGlobalAllocationSummary } from "@/lib/global-allocation";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type BudgetRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: BudgetRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const amount = parseIntegerAmount(body?.amount);
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 160)
      : null;

  if (amount === null || amount < 0) {
    return NextResponse.json(
      { error: "Budget amount must be zero or greater." },
      { status: 400 },
    );
  }

  const budget = await prisma.budget.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      budgetCategoryId: true,
      amount: true,
      month: true,
      budgetCategory: { select: { name: true } },
    },
  });

  if (!budget) {
    return NextResponse.json({ error: "Budget not found." }, { status: 404 });
  }

  if (auth.user.role !== UserRole.ADMIN && budget.userId !== auth.user.id) {
    return NextResponse.json(
      { error: "You can only update your own budget." },
      { status: 403 },
    );
  }

  const spent = budget.budgetCategoryId
    ? await prisma.transaction.aggregate({
        where: {
          userId: budget.userId,
          type: TransactionType.EXPENSE,
          budgetCategoryId: budget.budgetCategoryId,
          budgetMonth: budgetMonthRange(budget.month)!,
        },
        _sum: { amount: true },
      })
    : null;
  const spentAmount = spent?._sum.amount ?? 0;

  if (amount < spentAmount) {
    return NextResponse.json(
      {
        error:
          "Budget tidak bisa dikurangi di bawah amount yang sudah terpakai.",
      },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    if (amount < budget.amount) {
      await tx.budgetAdjustment.create({
        data: {
          userId: budget.userId,
          budgetId: budget.id,
          budgetCategoryId: budget.budgetCategoryId,
          budgetCategoryName: budget.budgetCategory?.name ?? "Unassigned",
          month: budget.month,
          previousAmount: budget.amount,
          newAmount: amount,
          amount: budget.amount - amount,
          note: note || "Reduce envelope from funding shortfall resolver",
        },
      });
    }

    if (amount === 0) {
      await tx.budget.delete({ where: { id } });
    } else {
      await tx.budget.update({
        where: { id },
        data: { amount },
      });
    }
  });

  const allocation = await getGlobalAllocationSummary(prisma, budget.userId);

  return NextResponse.json({ ok: true, fundingShortfall: allocation.shortfall });
}

export async function DELETE(
  _request: NextRequest,
  { params }: BudgetRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const budget = await prisma.budget.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!budget) {
    return NextResponse.json({ error: "Budget not found." }, { status: 404 });
  }

  if (auth.user.role !== UserRole.ADMIN && budget.userId !== auth.user.id) {
    return NextResponse.json(
      { error: "You can only delete your own budget." },
      { status: 403 },
    );
  }

  await prisma.budget.delete({ where: { id } });
  const allocation = await getGlobalAllocationSummary(prisma, budget.userId);

  return NextResponse.json({ ok: true, fundingShortfall: allocation.shortfall });
}
