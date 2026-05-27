import { TransactionType } from "@/lib/prisma-enums";
import { parseIntegerAmount } from "@/lib/money";
import {
  calculateBudgetableIncomeAmount,
  normalizeMonthStart,
  isPrepaidTransaction,
} from "@/lib/budgets";

export const transactionTypeOptions: Array<{
  value: TransactionType;
  label: string;
}> = [
  { value: TransactionType.EXPENSE, label: "Expense" },
  { value: TransactionType.INCOME, label: "Income" },
  { value: TransactionType.TRANSFER, label: "Transfer" },
];

const transactionTypes = new Set(
  transactionTypeOptions.map((option) => option.value),
);

export type TransactionPayload = {
  type: TransactionType;
  amount: number;
  walletId: string;
  transferToWalletId: string | null;
  categoryId: string | null;
  budgetCategoryId: string | null;
  budgetMonth: Date | null;
  isPrepaid: boolean;
  isUnbudgetedExpense: boolean;
  savingsAmount: number;
  budgetableAmount: number;
  savingsNote: string | null;
  description: string;
  transactionDate: Date;
  transferFeeEnabled: boolean;
  transferFeeAmount: number | null;
  transferFeeBudgetCategoryId: string | null;
  transferFeeBudgetMonth: Date | null;
  transferFeeIsPrepaid: boolean;
};

export function getTransactionTypeLabel(type: TransactionType) {
  return (
    transactionTypeOptions.find((option) => option.value === type)?.label ||
    "Transaction"
  );
}

function getDefaultDescription(type: TransactionType) {
  if (type === TransactionType.INCOME) {
    return "Income";
  }

  if (type === TransactionType.EXPENSE) {
    return "Expense";
  }

  return "Transfer";
}

export function validateTransactionPayload(
  body: unknown,
): { ok: true; data: TransactionPayload } | { ok: false; error: string } {
  const input = body as {
    type?: unknown;
    amount?: unknown;
    walletId?: unknown;
    transferToWalletId?: unknown;
    categoryId?: unknown;
    budgetCategoryId?: unknown;
    budgetMonth?: unknown;
    isUnbudgetedExpense?: unknown;
    allocateToBudget?: unknown;
    savingsAmount?: unknown;
    savingsNote?: unknown;
    description?: unknown;
    transactionDate?: unknown;
    transferFeeEnabled?: unknown;
    transferFeeAmount?: unknown;
  } | null;

  const type = typeof input?.type === "string" ? input.type : "";

  if (!transactionTypes.has(type as TransactionType)) {
    return { ok: false, error: "Invalid transaction type." };
  }

  const transactionType = type as TransactionType;
  const amount = parseIntegerAmount(input?.amount);

  if (amount === null || amount <= 0) {
    return { ok: false, error: "Amount must be greater than 0." };
  }

  const walletId = typeof input?.walletId === "string" ? input.walletId : "";

  if (!walletId) {
    return { ok: false, error: "Wallet is required." };
  }

  const transferToWalletId =
    typeof input?.transferToWalletId === "string" &&
    input.transferToWalletId.trim()
      ? input.transferToWalletId.trim()
      : null;

  if (transactionType === TransactionType.TRANSFER) {
    if (!transferToWalletId) {
      return { ok: false, error: "Destination wallet is required." };
    }

    if (transferToWalletId === walletId) {
      return {
        ok: false,
        error: "Source and destination wallets must be different.",
      };
    }
  }

  const transferFeeEnabled = input?.transferFeeEnabled === true;
  const transferFeeAmount = transferFeeEnabled
    ? parseIntegerAmount(input?.transferFeeAmount)
    : null;

  if (transactionType === TransactionType.TRANSFER && transferFeeEnabled) {
    if (transferFeeAmount === null || transferFeeAmount <= 0) {
      return {
        ok: false,
        error: "Admin fee amount must be greater than 0.",
      };
    }
  }

  const categoryId =
    typeof input?.categoryId === "string" && input.categoryId.trim()
      ? input.categoryId.trim()
      : null;

  if (transactionType !== TransactionType.TRANSFER && !categoryId) {
    return { ok: false, error: "Category is required." };
  }

  const budgetCategoryId =
    typeof input?.budgetCategoryId === "string" && input.budgetCategoryId.trim()
      ? input.budgetCategoryId.trim()
      : null;
  const isUnbudgetedExpense =
    transactionType === TransactionType.EXPENSE &&
    input?.isUnbudgetedExpense === true;

  if (
    transactionType === TransactionType.EXPENSE &&
    !isUnbudgetedExpense &&
    !budgetCategoryId
  ) {
    return {
      ok: false,
      error: "Pilih Budget Category atau tandai sebagai Unbudgeted Expense.",
    };
  }

  const rawDate =
    typeof input?.transactionDate === "string" ? input.transactionDate : "";
  const transactionDate = rawDate ? new Date(rawDate) : new Date();

  if (Number.isNaN(transactionDate.getTime())) {
    return { ok: false, error: "Invalid transaction date." };
  }

  const budgetMonthRaw =
    typeof input?.budgetMonth === "string" ? input.budgetMonth : "";
  const allocateIncomeToBudget =
    transactionType !== TransactionType.INCOME ||
    input?.allocateToBudget !== false;
  const isBudgetedTransferFee =
    transactionType === TransactionType.TRANSFER && transferFeeEnabled;
  const requiresBudgetPeriod =
    transactionType === TransactionType.EXPENSE ||
    (transactionType === TransactionType.INCOME && allocateIncomeToBudget) ||
    isBudgetedTransferFee;

  if (requiresBudgetPeriod && !budgetMonthRaw) {
    return { ok: false, error: "Budget period is required." };
  }

  const budgetMonth = budgetMonthRaw
    ? normalizeMonthStart(budgetMonthRaw)
    : null;

  if (requiresBudgetPeriod && !budgetMonth) {
    return { ok: false, error: "Invalid budget month." };
  }

  if (isBudgetedTransferFee && !budgetCategoryId) {
    return { ok: false, error: "Budget category is required for admin fee." };
  }

  const description =
    typeof input?.description === "string" ? input.description.trim() : "";

  const parsedSavingsAmount =
    transactionType === TransactionType.INCOME
      ? parseIntegerAmount(input?.savingsAmount)
      : null;
  const hasSavingsAllocation =
    transactionType === TransactionType.INCOME &&
    input?.savingsAmount !== null &&
    input?.savingsAmount !== undefined;

  if (transactionType === TransactionType.INCOME && hasSavingsAllocation) {
    if (parsedSavingsAmount === null || parsedSavingsAmount <= 0) {
      return { ok: false, error: "Savings amount must be greater than 0." };
    }

    if (parsedSavingsAmount > amount) {
      return {
        ok: false,
        error: "Nominal savings tidak boleh lebih besar dari income.",
      };
    }
  }

  const savingsAmount =
    transactionType === TransactionType.INCOME
      ? (parsedSavingsAmount ?? 0)
      : 0;
  const budgetableAmount =
    transactionType === TransactionType.INCOME
      ? calculateBudgetableIncomeAmount({
          incomeAmount: amount,
          savingsAmount,
          allocateToBudget: allocateIncomeToBudget,
        })
      : 0;

  const savingsNote =
    typeof input?.savingsNote === "string" && input.savingsNote.trim()
      ? input.savingsNote.trim()
      : null;

  if (description.length > 120) {
    return { ok: false, error: "Description must be 120 characters or less." };
  }

  return {
    ok: true,
    data: {
      type: transactionType,
      amount,
      walletId,
      transferToWalletId:
        transactionType === TransactionType.TRANSFER
          ? transferToWalletId
          : null,
      categoryId:
        transactionType === TransactionType.TRANSFER ? null : categoryId,
      budgetCategoryId:
        transactionType === TransactionType.EXPENSE && !isUnbudgetedExpense
          ? budgetCategoryId
          : null,
      budgetMonth:
        transactionType === TransactionType.TRANSFER ||
        (transactionType === TransactionType.INCOME && !allocateIncomeToBudget)
          ? null
          : budgetMonth,
      isPrepaid:
        transactionType === TransactionType.EXPENSE && !isUnbudgetedExpense
          ? isPrepaidTransaction(transactionDate, budgetMonth!)
          : false,
      isUnbudgetedExpense,
      savingsAmount,
      budgetableAmount,
      savingsNote,
      description: description || getDefaultDescription(transactionType),
      transactionDate,
      transferFeeEnabled:
        transactionType === TransactionType.TRANSFER && transferFeeEnabled,
      transferFeeAmount:
        transactionType === TransactionType.TRANSFER && transferFeeEnabled
          ? transferFeeAmount
          : null,
      transferFeeBudgetCategoryId: isBudgetedTransferFee
        ? budgetCategoryId
        : null,
      transferFeeBudgetMonth: isBudgetedTransferFee ? budgetMonth : null,
      transferFeeIsPrepaid: isBudgetedTransferFee
        ? isPrepaidTransaction(transactionDate, budgetMonth!)
        : false,
    },
  };
}
