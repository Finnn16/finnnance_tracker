import { NextResponse } from "next/server";

import { isAppUnlocked } from "@/lib/app-lock";
import { getCurrentAppUserForRequest } from "@/lib/clerk-auth";

type UnlockedAppUserResult =
  | {
      ok: true;
      user: NonNullable<
        Awaited<ReturnType<typeof getCurrentAppUserForRequest>>["user"]
      >;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function getUnlockedAppUserForRequest(): Promise<UnlockedAppUserResult> {
  const auth = await getCurrentAppUserForRequest();

  if (!auth.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      ),
    };
  }

  if (!(await isAppUnlocked(auth.user.id))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unlock the app with your PIN first.", redirectTo: "/unlock" },
        { status: 423 },
      ),
    };
  }

  return {
    ok: true,
    user: auth.user,
  };
}
