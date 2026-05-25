import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const APP_UNLOCK_COOKIE = "finnnance_app_unlock";
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_MINUTES = 15;
export const APP_UNLOCK_MINUTES = 30;

const HASH_PREFIX = "pin_scrypt_v1";
const UNLOCK_DURATION_MS = APP_UNLOCK_MINUTES * 60 * 1000;

type CookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  expires: Date;
  maxAge?: number;
};

function getAppLockSecret() {
  const secret = process.env.APP_LOCK_SECRET || process.env.CLERK_SECRET_KEY;

  if (!secret) {
    throw new Error(
      "APP_LOCK_SECRET or CLERK_SECRET_KEY is required for app lock cookies.",
    );
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getAppLockSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

function getCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export function isValidPinFormat(pin: string) {
  const pattern = new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`);
  return pattern.test(pin);
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(pin, salt, 64).toString("base64url");

  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPin(pin: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }

  const [prefix, salt, hash] = storedHash.split("$");

  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(pin, salt, expected.length);

  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

export function createAppUnlockCookie(userId: string) {
  const expires = new Date(Date.now() + UNLOCK_DURATION_MS);
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: expires.getTime() }),
  ).toString("base64url");
  const signature = sign(payload);

  return {
    name: APP_UNLOCK_COOKIE,
    value: `${payload}.${signature}`,
    options: {
      ...getCookieOptions(expires),
      maxAge: APP_UNLOCK_MINUTES * 60,
    },
  };
}

export function createExpiredAppUnlockCookie() {
  return {
    name: APP_UNLOCK_COOKIE,
    value: "",
    options: {
      ...getCookieOptions(new Date(0)),
      maxAge: 0,
    },
  };
}

export function verifyAppUnlockCookie(
  cookieValue: string | undefined,
  userId: string,
) {
  if (!cookieValue) {
    return false;
  }

  const [payload, signature] = cookieValue.split(".");

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userId?: string; expiresAt?: number };

    return parsed.userId === userId && Number(parsed.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export async function isAppUnlocked(userId: string) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(APP_UNLOCK_COOKIE)?.value;

  return verifyAppUnlockCookie(cookieValue, userId);
}

export function createPinLockoutUntil() {
  return new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000);
}

export function getRemainingLockoutSeconds(lockedUntil: Date | null) {
  if (!lockedUntil) {
    return 0;
  }

  return Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
}
