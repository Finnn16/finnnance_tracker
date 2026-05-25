import { WalletType } from "@/lib/generated/prisma/enums";
import { parseIntegerAmount } from "@/lib/money";

export const walletTypeOptions: Array<{ value: WalletType; label: string }> = [
  { value: WalletType.CASH, label: "Cash" },
  { value: WalletType.BANK, label: "Bank" },
  { value: WalletType.EWALLET, label: "E-Wallet" },
  { value: WalletType.DIGITAL_BANK, label: "Digital Bank" },
  { value: WalletType.CREDIT_CARD, label: "Credit Card" },
  { value: WalletType.PAYLATER, label: "Paylater" },
  { value: WalletType.INVESTMENT, label: "Investment" },
  { value: WalletType.ASSET, label: "Asset" },
  { value: WalletType.OTHER, label: "Other" },
];

const walletTypeValues = new Set(walletTypeOptions.map((option) => option.value));

export type WalletPayload = {
  name: string;
  type: WalletType;
  initialBalance: number;
  isDefault: boolean;
};

export function createWalletKey(name: string) {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return key || "wallet";
}

export function getWalletTypeLabel(type: WalletType) {
  return (
    walletTypeOptions.find((option) => option.value === type)?.label || "Other"
  );
}

export function validateWalletPayload(body: unknown):
  | { ok: true; data: WalletPayload }
  | { ok: false; error: string } {
  const input = body as {
    name?: unknown;
    type?: unknown;
    initialBalance?: unknown;
    isDefault?: unknown;
  } | null;

  const name = typeof input?.name === "string" ? input.name.trim() : "";

  if (name.length < 2 || name.length > 40) {
    return { ok: false, error: "Wallet name must be 2-40 characters." };
  }

  const type = typeof input?.type === "string" ? input.type : WalletType.OTHER;

  if (!walletTypeValues.has(type as WalletType)) {
    return { ok: false, error: "Invalid wallet type." };
  }

  const initialBalance = parseIntegerAmount(input?.initialBalance);

  if (initialBalance === null) {
    return { ok: false, error: "Initial balance must be a whole number." };
  }

  return {
    ok: true,
    data: {
      name,
      type: type as WalletType,
      initialBalance,
      isDefault: input?.isDefault === true,
    },
  };
}
