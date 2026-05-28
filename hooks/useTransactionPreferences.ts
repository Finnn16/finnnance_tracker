import { useState } from "react";

const STORAGE_KEY = "finnnance_transaction_preferences";

interface TransactionPreferences {
  lastWalletId?: string;
  lastCategoryId?: string;
  lastExpenseCategoryId?: string;
  lastBudgetCategoryId?: string;
  lastTransactionType?: "INCOME" | "EXPENSE" | "TRANSFER";
}

function readStoredPreferences(): TransactionPreferences {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function useTransactionPreferences() {
  const [preferences, setPreferences] = useState(readStoredPreferences);

  const savePreference = (key: keyof TransactionPreferences, value: string) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
    }
  };

  return {
    preferences,
    isLoaded: true,
    saveWalletPreference: (walletId: string) =>
      savePreference("lastWalletId", walletId),
    saveCategoryPreference: (categoryId: string) =>
      savePreference("lastCategoryId", categoryId),
    saveExpenseCategoryPreference: (categoryId: string) =>
      savePreference("lastExpenseCategoryId", categoryId),
    saveBudgetCategoryPreference: (budgetCategoryId: string) =>
      savePreference("lastBudgetCategoryId", budgetCategoryId),
    saveTransactionTypePreference: (type: "INCOME" | "EXPENSE" | "TRANSFER") =>
      savePreference("lastTransactionType", type),
  };
}
