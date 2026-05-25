import { NextRequest, NextResponse } from "next/server";

import { TransactionType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { createCategoryGroupKey } from "@/lib/categories";

type CategoryGroupRouteBody = {
  type?: unknown;
  name?: unknown;
  newName?: unknown;
};

function normalizeGroupName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGroupType(value: unknown) {
  return value === TransactionType.EXPENSE || value === TransactionType.INCOME
    ? value
    : "";
}

async function findCategoryGroup(type: TransactionType, name: string) {
  return prisma.category.findFirst({
    where: {
      type,
      group: name,
      isSelectable: false,
      level: -1,
    },
    select: {
      id: true,
      name: true,
      type: true,
      group: true,
      isHidden: true,
      level: true,
    },
  });
}

export async function GET() {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const groups = await prisma.category.findMany({
    where: {
      isSelectable: false,
      level: -1,
    },
    select: {
      id: true,
      name: true,
      type: true,
      group: true,
      isHidden: true,
      level: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request
    .json()
    .catch(() => null)) as CategoryGroupRouteBody | null;
  const type = normalizeGroupType(body?.type);
  const name = normalizeGroupName(body?.name);

  if (!type) {
    return NextResponse.json({ error: "Invalid group type." }, { status: 400 });
  }

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json(
      { error: "Group must be 2-40 characters." },
      { status: 400 },
    );
  }

  const existingGroup = await prisma.category.findFirst({
    where: { type, group: name, isSelectable: true },
    select: { id: true },
  });

  const existingAnchor = await findCategoryGroup(type, name);

  if (existingGroup || existingAnchor) {
    return NextResponse.json(
      { error: "Group name is already used for this type." },
      { status: 409 },
    );
  }

  const group = await prisma.category.create({
    data: {
      key: createCategoryGroupKey(name, type),
      name,
      type,
      group: name,
      level: -1,
      isSelectable: false,
      isHidden: true,
      isFallback: false,
    },
    select: {
      id: true,
      name: true,
      type: true,
      group: true,
      isHidden: true,
      level: true,
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request
    .json()
    .catch(() => null)) as CategoryGroupRouteBody | null;
  const type = normalizeGroupType(body?.type);
  const name = normalizeGroupName(body?.name);
  const newName = normalizeGroupName(body?.newName);

  if (!type) {
    return NextResponse.json({ error: "Invalid group type." }, { status: 400 });
  }

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json(
      { error: "Group must be 2-40 characters." },
      { status: 400 },
    );
  }

  if (newName.length < 2 || newName.length > 40) {
    return NextResponse.json(
      { error: "Group must be 2-40 characters." },
      { status: 400 },
    );
  }

  if (name === newName) {
    return NextResponse.json(
      { error: "New group name must be different." },
      { status: 400 },
    );
  }

  const conflictGroup = await prisma.category.findFirst({
    where: {
      type,
      group: newName,
      isSelectable: true,
      NOT: { group: name },
    },
    select: { id: true },
  });

  const conflictAnchor = await findCategoryGroup(type, newName);

  if (conflictGroup || conflictAnchor) {
    return NextResponse.json(
      { error: "Group name is already used for this type." },
      { status: 409 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.category.updateMany({
      where: { type, group: name, isSelectable: true },
      data: { group: newName },
    });

    const anchor = await tx.category.findFirst({
      where: {
        type,
        group: name,
        isSelectable: false,
        level: -1,
      },
      select: { id: true },
    });

    if (anchor) {
      await tx.category.update({
        where: { id: anchor.id },
        data: {
          key: createCategoryGroupKey(newName, type),
          name: newName,
          group: newName,
        },
      });
    }

    return {
      group: {
        type,
        name: newName,
      },
    };
  });

  return NextResponse.json(updated);
}
