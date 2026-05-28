import { NextRequest, NextResponse } from "next/server";

import { toDebtView } from "@/lib/debts";
import { DebtStatus } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type DebtRouteProps = {
  params: Promise<{ id: string }>;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { ok: true as const, date: null };
  }

  if (typeof value !== "string") {
    return { ok: false as const, error: "Due date is invalid." };
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return { ok: false as const, error: "Due date is invalid." };
  }

  return { ok: true as const, date };
}

export async function GET(_request: NextRequest, { params }: DebtRouteProps) {
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
      },
    },
  });

  if (!debt) {
    return NextResponse.json({ error: "Debt not found." }, { status: 404 });
  }

  return NextResponse.json({ debt: toDebtView(debt) });
}

export async function PATCH(request: NextRequest, { params }: DebtRouteProps) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existingDebt = await prisma.debt.findFirst({
    where: { id, userId: auth.user.id },
    select: { id: true, status: true },
  });

  if (!existingDebt) {
    return NextResponse.json({ error: "Debt not found." }, { status: 404 });
  }

  if (existingDebt.status === DebtStatus.CANCELLED) {
    return NextResponse.json(
      { error: "Cancelled debt cannot be edited." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    personName?: unknown;
    dueDate?: unknown;
    note?: unknown;
  } | null;

  const personName = cleanText(body?.personName, 60);

  if (!personName || personName.length < 2) {
    return NextResponse.json(
      { error: "Person name must be 2-60 characters." },
      { status: 400 },
    );
  }

  const dueDate = parseOptionalDate(body?.dueDate);

  if (!dueDate.ok) {
    return NextResponse.json({ error: dueDate.error }, { status: 400 });
  }

  const debt = await prisma.debt.update({
    where: { id },
    data: {
      personName,
      dueDate: dueDate.date,
      note: cleanText(body?.note, 200),
    },
    include: {
      user: { select: { name: true, email: true } },
      wallet: { select: { name: true } },
      payments: {
        include: { wallet: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json({ debt: toDebtView(debt) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: DebtRouteProps,
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
      },
    },
  });

  if (!debt) {
    return NextResponse.json({ error: "Debt not found." }, { status: 404 });
  }

  if (debt.status === DebtStatus.CANCELLED) {
    return NextResponse.json({ debt: toDebtView(debt) });
  }

  const cancelledDebt = await prisma.debt.update({
    where: { id },
    data: { status: DebtStatus.CANCELLED },
    include: {
      user: { select: { name: true, email: true } },
      wallet: { select: { name: true } },
      payments: {
        include: { wallet: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json({ debt: toDebtView(cancelledDebt) });
}
