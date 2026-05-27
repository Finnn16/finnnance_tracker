import { NextResponse } from "next/server";

import { isAppUnlocked } from "@/lib/app-lock";
import { getCurrentAppUserForRequest } from "@/lib/clerk-auth";
import { measureServerOperation } from "@/lib/server-performance";

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

export async function getUnlockedAppUserForRequest(
  routeLabel = "api",
): Promise<UnlockedAppUserResult> {
  const auth = await measureServerOperation(
    `${routeLabel}.authenticated-user`,
    () => getCurrentAppUserForRequest(),
  );

  if (!auth.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      ),
    };
  }

  const user = auth.user;
  const isUnlocked = await measureServerOperation(
    `${routeLabel}.unlock-cookie`,
    () => isAppUnlocked(user.id),
  );

  if (!isUnlocked) {
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
    user,
  };
}
