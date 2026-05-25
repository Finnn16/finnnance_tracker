import { NextRequest, NextResponse } from "next/server";

import {
  createCategoryKey,
  validateCategoryPayload,
} from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

function toCategoryView(category: {
  id: string;
  name: string;
  type: string;
  group: string;
  isHidden: boolean;
  isFallback: boolean;
  _count: { transactions: number };
}) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    group: category.group,
    isHidden: category.isHidden,
    isFallback: category.isFallback,
    transactionCount: category._count.transactions,
  };
}

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const categories = await prisma.category.findMany({
    where: { isSelectable: true },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: [{ type: "asc" }, { isHidden: "asc" }, { group: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    categories: categories.map(toCategoryView),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const result = validateCategoryPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { name, type, group, isHidden } = result.data;

  try {
    const category = await prisma.category.create({
      data: {
        key: createCategoryKey(name, type),
        name,
        type,
        group,
        isHidden,
        isSelectable: true,
        level: 0,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json({ category: toCategoryView(category) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Category name is already used for this type." },
      { status: 409 },
    );
  }
}
