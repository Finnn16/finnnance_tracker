import { NextRequest, NextResponse } from "next/server";

import {
  createCategoryKey,
  validateCategoryPayload,
} from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type CategoryRouteProps = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(
  request: NextRequest,
  { params }: CategoryRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = validateCategoryPayload(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { name, type, group, isHidden } = result.data;

  try {
    const category = await prisma.category.update({
      where: { id, isSelectable: true },
      data: {
        key: createCategoryKey(name, type),
        name,
        type,
        group,
        isHidden,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json({ category: toCategoryView(category) });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Category name is already used for this type." },
      { status: 409 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: CategoryRouteProps,
) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      isSelectable: true,
      _count: {
        select: {
          children: true,
          transactions: true,
        },
      },
    },
  });

  if (!category?.isSelectable) {
    return NextResponse.json(
      { error: "Category not found." },
      { status: 404 },
    );
  }

  if (category._count.children > 0 || category._count.transactions > 0) {
    return NextResponse.json(
      {
        error:
          "Category cannot be deleted because it has transactions or child categories. Hide it instead.",
      },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
