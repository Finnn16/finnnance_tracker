import { NextRequest, NextResponse } from "next/server";

import { validateBudgetCategoryPayload } from "@/lib/budget-categories";
import { UserRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type BudgetCategoryRouteProps = {
  params: Promise<{ id: string }>;
};

function toBudgetCategoryView(category: {
  id: string;
  userId: string;
  name: string;
  isHidden: boolean;
  user: { name: string; email: string };
  _count: { budgets: number; transactions: number };
}) {
  return {
    id: category.id,
    userId: category.userId,
    userName: category.user.name,
    userEmail: category.user.email,
    name: category.name,
    isHidden: category.isHidden,
    budgetCount: category._count.budgets,
    transactionCount: category._count.transactions,
  };
}

function canManageBudgetCategory(
  role: UserRole,
  currentUserId: string,
  ownerUserId: string,
) {
  return role === UserRole.ADMIN || currentUserId === ownerUserId;
}

export async function PATCH(
  request: NextRequest,
  { params }: BudgetCategoryRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existingCategory = await prisma.budgetCategory.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existingCategory) {
    return NextResponse.json(
      { error: "Budget category not found." },
      { status: 404 },
    );
  }

  if (
    !canManageBudgetCategory(
      auth.user.role,
      auth.user.id,
      existingCategory.userId,
    )
  ) {
    return NextResponse.json(
      { error: "You can only manage your own budget categories." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const result = validateBudgetCategoryPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const budgetCategory = await prisma.budgetCategory.update({
      where: { id },
      data: result.data,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { budgets: true, transactions: true } },
      },
    });

    return NextResponse.json({
      budgetCategory: toBudgetCategoryView(budgetCategory),
    });
  } catch (error) {
    console.error("Failed to update budget category:", error);
    return NextResponse.json(
      { error: "Budget category name is already used." },
      { status: 409 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: BudgetCategoryRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existingCategory = await prisma.budgetCategory.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      _count: { select: { budgets: true, transactions: true } },
    },
  });

  if (!existingCategory) {
    return NextResponse.json(
      { error: "Budget category not found." },
      { status: 404 },
    );
  }

  if (
    !canManageBudgetCategory(
      auth.user.role,
      auth.user.id,
      existingCategory.userId,
    )
  ) {
    return NextResponse.json(
      { error: "You can only manage your own budget categories." },
      { status: 403 },
    );
  }

  if (
    existingCategory._count.budgets > 0 ||
    existingCategory._count.transactions > 0
  ) {
    return NextResponse.json(
      { error: "Hide this budget category instead of deleting used data." },
      { status: 400 },
    );
  }

  await prisma.budgetCategory.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
