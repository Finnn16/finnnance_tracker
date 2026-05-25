import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { validateAndSyncUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";

type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hasPin: boolean;
};

type AppUserResult = {
  user: AppUser | null;
  status: number;
  error: string | null;
};

function getDisplayName(clerkUser: Awaited<ReturnType<typeof currentUser>>) {
  if (!clerkUser) {
    return "";
  }

  const fullName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || clerkUser.fullName || clerkUser.username || "";
}

async function resolveCurrentAppUser(): Promise<AppUserResult> {
  const session = await auth();

  if (!session.userId) {
    return {
      user: null,
      status: 401,
      error: "Authentication is required",
    };
  }

  const linkedUser = await prisma.user.findUnique({
    where: { clerkUserId: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      pinHash: true,
    },
  });

  if (linkedUser) {
    if (!env.allowedEmails.includes(linkedUser.email.toLowerCase())) {
      return {
        user: null,
        status: 403,
        error: "Your email is not authorized to access this application",
      };
    }

    return {
      user: {
        id: linkedUser.id,
        email: linkedUser.email,
        name: linkedUser.name,
        role: linkedUser.role,
        hasPin: Boolean(linkedUser.pinHash),
      },
      status: 200,
      error: null,
    };
  }

  // A Clerk profile lookup is only needed once to safely link an allowed OAuth user.
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();

  if (!email || !env.allowedEmails.includes(email)) {
    return {
      user: null,
      status: 403,
      error: "Your email is not authorized to access this application",
    };
  }

  const result = await validateAndSyncUser(
    email,
    getDisplayName(clerkUser) || email,
    session.userId,
  );

  if (!result.isValid || !result.user) {
    return {
      user: null,
      status: 403,
      error: result.error || "Unauthorized",
    };
  }

  return {
    user: result.user,
    status: 200,
    error: null,
  };
}

export async function getCurrentAppUser() {
  const result = await resolveCurrentAppUser();

  if (result.status === 401) {
    return null;
  }

  if (!result.user) {
    redirect(
      `/access-denied?error=${encodeURIComponent(result.error || "Unauthorized")}`,
    );
  }

  return result.user;
}

export async function getCurrentAppUserForRequest() {
  return resolveCurrentAppUser();
}
