import { NextRequest, NextResponse } from "next/server";

import {
  createAppUnlockCookie,
  createPinLockoutUntil,
  getRemainingLockoutSeconds,
  isValidPinFormat,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_MINUTES,
  verifyPin,
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
    redirectTo?: unknown;
  } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!isValidPinFormat(pin)) {
    return NextResponse.json(
      { error: "Enter your PIN to unlock the app." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      pinHash: true,
      pinFailedAttempts: true,
      pinLockedUntil: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.pinHash) {
    return NextResponse.json(
      { error: "Set up your PIN before unlocking.", redirectTo: "/setup-pin" },
      { status: 409 },
    );
  }

  const remainingLockoutSeconds = getRemainingLockoutSeconds(
    user.pinLockedUntil,
  );

  if (remainingLockoutSeconds > 0) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil(
          remainingLockoutSeconds / 60,
        )} minute(s).`,
        remainingLockoutSeconds,
      },
      { status: 423 },
    );
  }

  if (!verifyPin(pin, user.pinHash)) {
    const nextFailedAttempts = user.pinFailedAttempts + 1;
    const shouldLock = nextFailedAttempts >= MAX_PIN_ATTEMPTS;

    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        pinFailedAttempts: shouldLock ? 0 : nextFailedAttempts,
        pinLockedUntil: shouldLock ? createPinLockoutUntil() : null,
      },
    });

    return NextResponse.json(
      {
        error: shouldLock
          ? `Too many failed attempts. PIN is locked for ${PIN_LOCKOUT_MINUTES} minutes.`
          : `Wrong PIN. ${MAX_PIN_ATTEMPTS - nextFailedAttempts} attempt(s) left.`,
      },
      { status: 401 },
    );
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
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
