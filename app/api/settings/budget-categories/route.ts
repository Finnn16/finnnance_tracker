import { NextRequest, NextResponse } from "next/server";

import { validateBudgetCategoryPayload } from "@/lib/budget-categories";
import { UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

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

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const budgetCategories = await prisma.budgetCategory.findMany({
    where:
      auth.user.role === UserRole.ADMIN ? undefined : { userId: auth.user.id },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { budgets: true, transactions: true } },
    },
    orderBy: [{ isHidden: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    budgetCategories: budgetCategories.map(toBudgetCategoryView),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const result = validateBudgetCategoryPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const input = body as { userId?: unknown } | null;
  const userId =
    auth.user.role === UserRole.ADMIN && typeof input?.userId === "string"
      ? input.userId
      : auth.user.id;

  if (auth.user.role !== UserRole.ADMIN && userId !== auth.user.id) {
    return NextResponse.json(
      { error: "You can only manage your own budget categories." },
      { status: 403 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  try {
    const budgetCategory = await prisma.budgetCategory.create({
      data: {
        userId,
        name: result.data.name,
        isHidden: result.data.isHidden,
      },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { budgets: true, transactions: true } },
      },
    });

    return NextResponse.json(
      { budgetCategory: toBudgetCategoryView(budgetCategory) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create budget category:", error);
    return NextResponse.json(
      { error: "Budget category name is already used." },
      { status: 409 },
    );
  }
}
