export const UserRole = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const WalletType = {
  CASH: "CASH",
  BANK: "BANK",
  EWALLET: "EWALLET",
  DIGITAL_BANK: "DIGITAL_BANK",
  CREDIT_CARD: "CREDIT_CARD",
  PAYLATER: "PAYLATER",
  INVESTMENT: "INVESTMENT",
  ASSET: "ASSET",
  OTHER: "OTHER",
} as const;

export type WalletType = (typeof WalletType)[keyof typeof WalletType];

export const TransactionType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
  TRANSFER: "TRANSFER",
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionSource = {
  WEB: "WEB",
  WHATSAPP: "WHATSAPP",
  SYSTEM: "SYSTEM",
} as const;

export type TransactionSource =
  (typeof TransactionSource)[keyof typeof TransactionSource];

export const TransactionConfirmationStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;

export type TransactionConfirmationStatus =
  (typeof TransactionConfirmationStatus)[keyof typeof TransactionConfirmationStatus];
