import { NextResponse } from "next/server";

import { createExpiredAppUnlockCookie } from "@/lib/app-lock";

export async function POST() {
  const response = NextResponse.json({ ok: true, redirectTo: "/unlock" });
  const expiredCookie = createExpiredAppUnlockCookie();

  response.cookies.set(
    expiredCookie.name,
    expiredCookie.value,
    expiredCookie.options,
  );

  return response;
}
