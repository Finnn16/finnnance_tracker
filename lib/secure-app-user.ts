import { redirect } from "next/navigation";

import { isAppUnlocked } from "@/lib/app-lock";
import { getCurrentAppUser } from "@/lib/clerk-auth";
import { toSafeRedirectPath } from "@/lib/safe-redirect";
import { measureServerOperation } from "@/lib/server-performance";

export async function requireUnlockedAppUser(redirectTo = "/") {
  const safeRedirectTo = toSafeRedirectPath(redirectTo, "/");
  const user = await measureServerOperation(
    `page ${safeRedirectTo}.authenticated-user`,
    () => getCurrentAppUser(),
  );

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.hasPin) {
    redirect(`/setup-pin?redirect=${encodeURIComponent(safeRedirectTo)}`);
  }

  const isUnlocked = await measureServerOperation(
    `page ${safeRedirectTo}.unlock-cookie`,
    () => isAppUnlocked(user.id),
  );

  if (!isUnlocked) {
    redirect(`/unlock?redirect=${encodeURIComponent(safeRedirectTo)}`);
  }

  return user;
}
