import { NextRequest, NextResponse } from "next/server";

import { UserRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

type BudgetRouteProps = {
  params: Promise<{ id: string }>;
};

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

  return NextResponse.json({ ok: true });
}
