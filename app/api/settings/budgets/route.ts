import { NextRequest, NextResponse } from "next/server";

import { calculateBudgetPeriodSummary, validateBudgetPayload } from "@/lib/budgets";
import {
  assertGlobalAllocationNotWorse,
  getGlobalAllocationSummary,
  GlobalAllocationError,
} from "@/lib/global-allocation";
import { TransactionType, UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/prisma-transaction";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

function toBudgetView(budget: {
  id: string;
  userId: string;
  budgetCategoryId: string | null;
  month: Date;
  amount: number;
  user: { name: string; email: string };
  budgetCategory: { name: string; isHidden: boolean } | null;
}) {
  return {
    id: budget.id,
    userId: budget.userId,
    userName: budget.user.name,
    userEmail: budget.user.email,
    budgetCategoryId: budget.budgetCategoryId,
    budgetCategoryName: budget.budgetCategory?.name ?? "Unassigned",
    budgetCategoryHidden: budget.budgetCategory?.isHidden ?? false,
    month: budget.month.toISOString(),
    amount: budget.amount,
  };
}

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const budgets = await prisma.budget.findMany({
    where:
      auth.user.role === UserRole.ADMIN ? undefined : { userId: auth.user.id },
    include: {
      user: { select: { name: true, email: true } },
      budgetCategory: { select: { id: true, name: true, isHidden: true } },
    },
    orderBy: [{ month: "desc" }, { budgetCategory: { name: "asc" } }],
  });

  return NextResponse.json({
    budgets: budgets.map(toBudgetView),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const result = validateBudgetPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (
    auth.user.role !== UserRole.ADMIN &&
    result.data.userId !== auth.user.id
  ) {
    return NextResponse.json(
      { error: "You can only manage your own budget." },
      { status: 403 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: result.data.userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const budgetCategory = await prisma.budgetCategory.findFirst({
    where: {
      id: result.data.budgetCategoryId,
      userId: result.data.userId,
      isHidden: false,
    },
    select: { id: true, isHidden: true },
  });

  if (!budgetCategory) {
    return NextResponse.json(
      { error: "Active budget category not found." },
      { status: 404 },
    );
  }

  const [monthBudgets, budgetableIncome] = await Promise.all([
      prisma.budget.findMany({
        where: { userId: result.data.userId, month: result.data.month },
        select: { budgetCategoryId: true, amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: result.data.userId,
          type: TransactionType.INCOME,
          budgetMonth: result.data.month,
        },
        _sum: { budgetableAmount: true },
      }),
    ]);

  const budgetedAmount = monthBudgets.reduce(
    (total, budget) => total + budget.amount,
    0,
  );
  const existingBudgetAmount =
    monthBudgets.find(
      (budget) => budget.budgetCategoryId === result.data.budgetCategoryId,
    )?.amount || 0;
  const budgetedAmountAfterUpsert =
    budgetedAmount - existingBudgetAmount + result.data.amount;
  const summaryAfterUpsert = calculateBudgetPeriodSummary({
    budgetableIncome: budgetableIncome._sum.budgetableAmount ?? 0,
    totalBudget: budgetedAmountAfterUpsert,
    totalSpent: 0,
  });

  if (
    summaryAfterUpsert.budgetableIncome === 0 &&
    budgetedAmountAfterUpsert > 0
  ) {
    return NextResponse.json(
      {
        error:
          "Belum ada income yang dialokasikan untuk budget period ini. Tambahkan income terlebih dahulu atau pilih budget period lain.",
      },
      { status: 400 },
    );
  }

  if (summaryAfterUpsert.availableToBudget < 0) {
    return NextResponse.json(
      {
        error:
          "Budget melebihi saldo budgetable bulan ini. Kurangi nominal budget atau tambahkan income yang dialokasikan ke bulan ini.",
      },
      { status: 400 },
    );
  }

  const previousAllocation = await getGlobalAllocationSummary(
    prisma,
    result.data.userId,
  );

  try {
    const resultAfterUpsert = await prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        const updatedBudget = await tx.budget.upsert({
          where: {
            userId_month_budgetCategoryId: {
              userId: result.data.userId,
              month: result.data.month,
              budgetCategoryId: result.data.budgetCategoryId,
            },
          },
          update: { amount: result.data.amount },
          create: {
            userId: result.data.userId,
            budgetCategoryId: result.data.budgetCategoryId,
            month: result.data.month,
            amount: result.data.amount,
          },
          include: {
            user: { select: { name: true, email: true } },
            budgetCategory: { select: { name: true, isHidden: true } },
          },
        });

        const allocation = await assertGlobalAllocationNotWorse({
          db: tx,
          userId: result.data.userId,
          previousShortfall: previousAllocation.shortfall,
        });

        return { updatedBudget, allocation };
      },
    );

    return NextResponse.json({
      budget: toBudgetView(resultAfterUpsert.updatedBudget),
      fundingShortfall: resultAfterUpsert.allocation.shortfall,
    });
  } catch (error) {
    if (error instanceof GlobalAllocationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
