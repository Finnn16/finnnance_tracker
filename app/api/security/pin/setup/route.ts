import { NextRequest, NextResponse } from "next/server";

import {
  createAppUnlockCookie,
  hashPin,
  isValidPinFormat,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
} from "@/lib/app-lock";
import { getCurrentAppUserForRequest } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";
import { toSafeRedirectPath } from "@/lib/safe-redirect";

export async function POST(request: NextRequest) {
  const auth = await getCurrentAppUserForRequest();

  if (!auth.user) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    pin?: unknown;
    confirmPin?: unknown;
    redirectTo?: unknown;
  } | null;

  const pin = typeof body?.pin === "string" ? body.pin : "";
  const confirmPin =
    typeof body?.confirmPin === "string" ? body.confirmPin : "";

  if (!isValidPinFormat(pin)) {
    return NextResponse.json(
      {
        error: `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits.`,
      },
      { status: 400 },
    );
  }

  if (pin !== confirmPin) {
    return NextResponse.json(
      { error: "PIN confirmation does not match." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { pinHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.pinHash) {
    return NextResponse.json(
      { error: "PIN is already set for this account." },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      pinHash: hashPin(pin),
      pinSetAt: new Date(),
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: toSafeRedirectPath(
      typeof body?.redirectTo === "string" ? body.redirectTo : "/",
    ),
  });
  const unlockCookie = createAppUnlockCookie(auth.user.id);

  response.cookies.set(
    unlockCookie.name,
    unlockCookie.value,
    unlockCookie.options,
  );

  return response;
}
