import { useEffect, useState } from "react";

const STORAGE_KEY = "finnnance_transaction_preferences";

interface TransactionPreferences {
  lastWalletId?: string;
  lastCategoryId?: string;
  lastExpenseCategoryId?: string;
  lastBudgetCategoryId?: string;
  lastTransactionType?: "INCOME" | "EXPENSE" | "TRANSFER";
}

export function useTransactionPreferences() {
  const [preferences, setPreferences] = useState<TransactionPreferences>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      } catch {
        // Ignore parse errors
      }
      setIsLoaded(true);
    }
  }, []);

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
    isLoaded,
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
