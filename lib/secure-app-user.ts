import { redirect } from "next/navigation";

import { isAppUnlocked } from "@/lib/app-lock";
import { getCurrentAppUser } from "@/lib/clerk-auth";
import { toSafeRedirectPath } from "@/lib/safe-redirect";

export async function requireUnlockedAppUser(redirectTo = "/") {
  const safeRedirectTo = toSafeRedirectPath(redirectTo, "/");
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.hasPin) {
    redirect(`/setup-pin?redirect=${encodeURIComponent(safeRedirectTo)}`);
  }

  if (!(await isAppUnlocked(user.id))) {
    redirect(`/unlock?redirect=${encodeURIComponent(safeRedirectTo)}`);
  }

  return user;
}
