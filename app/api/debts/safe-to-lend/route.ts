import { NextRequest, NextResponse } from "next/server";

import { calculateSafeToLend } from "@/lib/debts";
import { parseIntegerAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";

export async function GET(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest();

  if (!auth.ok) {
    return auth.response;
  }

  const amount = parseIntegerAmount(
    request.nextUrl.searchParams.get("amount") || "0",
  );
  const dateValue =
    request.nextUrl.searchParams.get("date") || new Date().toISOString();
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);

  if (amount === null || amount < 0) {
    return NextResponse.json({ error: "Amount is invalid." }, { status: 400 });
  }

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
  }

  const safeToLend = await calculateSafeToLend({
    db: prisma,
    userId: auth.user.id,
    amount,
    date,
  });

  return NextResponse.json({ safeToLend });
}
