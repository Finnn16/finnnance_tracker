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
  QUICK_ADD: "QUICK_ADD",
  IOS_SHORTCUT: "IOS_SHORTCUT",
  RECONCILE: "RECONCILE",
  TRANSFER: "TRANSFER",
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

export const TransactionDetailStatus = {
  COMPLETED: "COMPLETED",
  PENDING_DETAIL: "PENDING_DETAIL",
  VOID: "VOID",
} as const;

export type TransactionDetailStatus =
  (typeof TransactionDetailStatus)[keyof typeof TransactionDetailStatus];

export const WalletBalanceCheckpointStatus = {
  MATCHED: "MATCHED",
  UNMATCHED: "UNMATCHED",
  RESOLVED: "RESOLVED",
  IGNORED: "IGNORED",
} as const;

export type WalletBalanceCheckpointStatus =
  (typeof WalletBalanceCheckpointStatus)[keyof typeof WalletBalanceCheckpointStatus];

export const SavingLedgerType = {
  ADD: "ADD",
  WITHDRAW: "WITHDRAW",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export type SavingLedgerType =
  (typeof SavingLedgerType)[keyof typeof SavingLedgerType];

export const DebtType = {
  RECEIVABLE: "RECEIVABLE",
  PAYABLE: "PAYABLE",
} as const;

export type DebtType = (typeof DebtType)[keyof typeof DebtType];

export const DebtStatus = {
  UNPAID: "UNPAID",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;

export type DebtStatus = (typeof DebtStatus)[keyof typeof DebtStatus];
