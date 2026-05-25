import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/generated/prisma/enums";
import { WalletType } from "@/lib/generated/prisma/enums";
import { env } from "@/lib/env";

export interface AuthValidationResult {
  isValid: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    hasPin: boolean;
  };
}

/**
 * Validate and sync an OAuth user with the app database.
 * Checks email against allowlist and creates/updates user profile.
 */
export async function validateAndSyncUser(
  email: string,
  name: string,
  clerkUserId?: string,
): Promise<AuthValidationResult> {
  try {
    // Validate email exists
    if (!email) {
      return {
        isValid: false,
        error: "Email is required",
      };
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email is in allowlist
    if (!env.allowedEmails.includes(normalizedEmail)) {
      return {
        isValid: false,
        error: "Your email is not authorized to access this application",
      };
    }

    // Determine user role based on email
    const role: UserRole =
      normalizedEmail === env.adminEmail ? UserRole.ADMIN : UserRole.USER;

    const displayName = name || "User";
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    let user = existingUser;

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkUserId,
          email: normalizedEmail,
          name: displayName,
          role,
        },
      });
      await ensureDefaultWallet(user.id);
    } else if (
      user.name !== displayName ||
      user.role !== role ||
      (clerkUserId && user.clerkUserId !== clerkUserId)
    ) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          clerkUserId,
          name: displayName,
          role,
        },
      });
    }

    return {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasPin: Boolean(user.pinHash),
      },
    };
  } catch (error) {
    console.error("Error validating and syncing user:", error);
    return {
      isValid: false,
      error: "Failed to validate user. Please try again.",
    };
  }
}

async function ensureDefaultWallet(userId: string) {
  const defaultWallet = await prisma.wallet.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });

  if (defaultWallet) {
    return;
  }

  await prisma.wallet.upsert({
    where: {
      userId_key: {
        userId,
        key: "bca",
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId,
      key: "bca",
      name: "BCA",
      type: WalletType.BANK,
      isDefault: true,
    },
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}
