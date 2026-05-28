"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";

import { calculateBudgetPeriodSummary, monthInputValue } from "@/lib/budgets";
import { SensitiveAmount } from "@/components/PrivacyMode";
import { TransactionType, UserRole } from "@/lib/prisma-enums";
import {
  formatAmountInput,
  formatRupiah,
  normalizeAmountInput,
} from "@/lib/money";
import { transactionTypeOptions } from "@/lib/transactions";

type UserOption = {
  id: string;
  name: string;
  email: string;
};

type CategoryView = {
  id: string;
  name: string;
  type: TransactionType;
  group: string;
  isHidden: boolean;
  isFallback: boolean;
  transactionCount: number;
};

type CategoryGroupView = {
  id: string;
  name: string;
  type: TransactionType;
  group: string;
};

type BudgetCategoryView = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  name: string;
  isHidden: boolean;
  budgetCount: number;
  transactionCount: number;
};

type BudgetView = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  budgetCategoryId: string | null;
  budgetCategoryName: string;
  budgetCategoryHidden: boolean;
  month: string;
  amount: number;
  spent: number;
  paidEarlyAmount: number;
};

type CategoryForm = {
  name: string;
  type: TransactionType;
  group: string;
  isHidden: boolean;
};

type BudgetCategoryForm = {
  userId: string;
  name: string;
  isHidden: boolean;
};

type BudgetForm = {
  userId: string;
  budgetCategoryId: string;
  month: string;
  amount: string;
};

type CategoryGroupForm = {
  type: TransactionType;
  name: string;
};

const emptyCategoryForm: CategoryForm = {
  name: "",
  type: TransactionType.EXPENSE,
  group: "custom",
  isHidden: false,
};

const emptyCategoryGroupForm: CategoryGroupForm = {
  type: TransactionType.EXPENSE,
  name: "",
};

function getCategoryGroupId(type: TransactionType, name: string) {
  return `${type}::${name.toLowerCase()}`;
}

function buildCategoryGroups(
  categories: CategoryView[],
  anchors: CategoryGroupView[],
) {
  const groups = new Map<
    string,
    CategoryGroupView & { categoryCount: number }
  >();

  for (const category of categories) {
    const key = getCategoryGroupId(category.type, category.group);
    const existing = groups.get(key);

    if (existing) {
      existing.categoryCount += 1;
      continue;
    }

    groups.set(key, {
      id: key,
      name: category.group,
      type: category.type,
      group: category.group,
      categoryCount: 1,
    });
  }

  for (const anchor of anchors) {
    const key = getCategoryGroupId(anchor.type, anchor.group);
    const existing = groups.get(key);

    if (existing) {
      continue;
    }

    groups.set(key, {
      ...anchor,
      id: key,
      categoryCount: 0,
    });
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (left.type !== right.type) {
      return left.type.localeCompare(right.type);
    }

    return left.name.localeCompare(right.name);
  });
}

function toCategoryForm(category: CategoryView): CategoryForm {
  return {
    name: category.name,
    type: category.type,
    group: category.group,
    isHidden: category.isHidden,
  };
}

function toCategoryPayload(form: CategoryForm) {
  return {
    name: form.name,
    type: form.type,
    group: form.group,
    isHidden: form.isHidden,
  };
}

function toBudgetCategoryForm(
  category: BudgetCategoryView,
): BudgetCategoryForm {
  return {
    userId: category.userId,
    name: category.name,
    isHidden: category.isHidden,
  };
}

function toBudgetCategoryPayload(form: BudgetCategoryForm) {
  return {
    userId: form.userId,
    name: form.name,
    isHidden: form.isHidden,
  };
}

function toCategoryGroupForm(group: CategoryGroupView): CategoryGroupForm {
  return {
    type: group.type,
    name: group.name,
  };
}

export function SettingsClient({
  initialCategories,
  initialCategoryGroups,
  initialBudgetCategories,
  initialBudgets,
  budgetableIncomeByPeriod,
  unbudgetedSpentByPeriod,
  fundingShortfallByUser,
  users,
  currentUserId,
  currentUserRole,
  view = "settings",
}: {
  initialCategories: CategoryView[];
  initialCategoryGroups: CategoryGroupView[];
  initialBudgetCategories: BudgetCategoryView[];
  initialBudgets: BudgetView[];
  budgetableIncomeByPeriod: Record<string, number>;
  unbudgetedSpentByPeriod: Record<string, number>;
  fundingShortfallByUser: Record<string, number>;
  users: UserOption[];
  currentUserId: string;
  currentUserRole: UserRole;
  view?: "settings" | "budgets";
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryGroupAnchors, setCategoryGroupAnchors] = useState(
    initialCategoryGroups,
  );
  const [budgetCategories, setBudgetCategories] = useState(
    initialBudgetCategories,
  );
  const [budgets, setBudgets] = useState(initialBudgets);
  const [fundingShortfalls, setFundingShortfalls] = useState(
    fundingShortfallByUser,
  );
  const [activePanel, setActivePanel] = useState<
    "categories" | "groups" | "budgetCategories" | "budgets"
  >(view === "budgets" ? "budgets" : "categories");
  const [showHidden, setShowHidden] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryGroupSearch, setCategoryGroupSearch] = useState("");
  const [budgetCategorySearch, setBudgetCategorySearch] = useState("");
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<
    "ALL" | typeof TransactionType.INCOME | typeof TransactionType.EXPENSE
  >("ALL");
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState(emptyCategoryForm);
  const [categoryGroupForm, setCategoryGroupForm] = useState(
    emptyCategoryGroupForm,
  );
  const [editCategoryGroupId, setEditCategoryGroupId] = useState<string | null>(
    null,
  );
  const [editCategoryGroupForm, setEditCategoryGroupForm] = useState(
    emptyCategoryGroupForm,
  );
  const [budgetCategoryForm, setBudgetCategoryForm] =
    useState<BudgetCategoryForm>({
      userId: currentUserId,
      name: "",
      isHidden: false,
    });
  const [editBudgetCategoryId, setEditBudgetCategoryId] = useState<
    string | null
  >(null);
  const [editBudgetCategoryForm, setEditBudgetCategoryForm] =
    useState<BudgetCategoryForm>({
      userId: currentUserId,
      name: "",
      isHidden: false,
    });
  const [budgetForm, setBudgetForm] = useState<BudgetForm>({
    userId: currentUserId,
    budgetCategoryId:
      initialBudgetCategories.find((category) => !category.isHidden)?.id || "",
    month: monthInputValue(new Date()),
    amount: formatAmountInput("0"),
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleUsers =
    currentUserRole === UserRole.ADMIN
      ? users
      : users.filter((user) => user.id === currentUserId);
  const categoryGroups = useMemo(
    () => buildCategoryGroups(categories, categoryGroupAnchors),
    [categories, categoryGroupAnchors],
  );
  const availableBudgetCategories = useMemo(
    () =>
      budgetCategories.filter(
        (category) =>
          category.userId === budgetForm.userId && !category.isHidden,
      ),
    [budgetCategories, budgetForm.userId],
  );
  const selectedMonthBudgets = useMemo(
    () =>
      budgets.filter((budget) => {
        const matchesUser = budget.userId === budgetForm.userId;
        const matchesMonth =
          monthInputValue(new Date(budget.month)) === budgetForm.month;

        return matchesUser && matchesMonth;
      }),
    [budgets, budgetForm.month, budgetForm.userId],
  );
  const selectedBudgetableIncome =
    budgetableIncomeByPeriod[`${budgetForm.userId}|${budgetForm.month}`] || 0;
  const selectedUnbudgetedSpent =
    unbudgetedSpentByPeriod[`${budgetForm.userId}|${budgetForm.month}`] || 0;
  const selectedFundingShortfall =
    fundingShortfalls[budgetForm.userId] || 0;
  const selectedBudgetSummary = useMemo(
    () =>
      calculateBudgetPeriodSummary({
        budgetableIncome: selectedBudgetableIncome,
        totalBudget: selectedMonthBudgets.reduce(
          (total, budget) => total + budget.amount,
          0,
        ),
        totalSpent: selectedMonthBudgets.reduce(
          (total, budget) => total + budget.spent,
          0,
        ),
      }),
    [selectedBudgetableIncome, selectedMonthBudgets],
  );
  const filteredCategories = useMemo(() => {
    const search = categorySearch.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesVisibility = showHidden || !category.isHidden;
      const matchesType =
        categoryTypeFilter === "ALL" || category.type === categoryTypeFilter;
      const matchesSearch =
        !search ||
        category.name.toLowerCase().includes(search) ||
        category.group.toLowerCase().includes(search);

      return matchesVisibility && matchesType && matchesSearch;
    });
  }, [categories, categorySearch, categoryTypeFilter, showHidden]);
  const filteredCategoryGroups = useMemo(() => {
    const search = categoryGroupSearch.trim().toLowerCase();

    return categoryGroups.filter((group) => {
      const matchesSearch =
        !search ||
        group.name.toLowerCase().includes(search) ||
        group.type.toLowerCase().includes(search);

      return matchesSearch;
    });
  }, [categoryGroups, categoryGroupSearch]);
  const filteredBudgetCategories = useMemo(() => {
    const search = budgetCategorySearch.trim().toLowerCase();

    return budgetCategories.filter((category) => {
      const matchesVisibility = showHidden || !category.isHidden;
      const matchesSearch =
        !search ||
        category.name.toLowerCase().includes(search) ||
        category.userName.toLowerCase().includes(search);

      return matchesVisibility && matchesSearch;
    });
  }, [budgetCategories, budgetCategorySearch, showHidden]);

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCategoryPayload(categoryForm)),
      });
      const data = (await response.json()) as {
        category?: CategoryView;
        error?: string;
      };

      if (!response.ok || !data.category) {
        setError(data.error || "Failed to create category.");
        return;
      }

      setCategoryForm(emptyCategoryForm);
      setCategories((current) => [...current, data.category!]);
    } catch {
      setError("Failed to create category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategoryGroup = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/category-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryGroupForm),
      });
      const data = (await response.json()) as {
        group?: CategoryGroupView;
        error?: string;
      };

      if (!response.ok || !data.group) {
        setError(data.error || "Failed to create group.");
        return;
      }

      setCategoryGroupForm(emptyCategoryGroupForm);
      setCategoryGroupAnchors((current) => [...current, data.group!]);
    } catch {
      setError("Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategoryGroup = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editCategoryGroupId) {
      return;
    }

    const [type, originalName] = editCategoryGroupId.split("::");

    if (!type || !originalName) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/category-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: originalName,
          newName: editCategoryGroupForm.name,
        }),
      });
      const data = (await response.json()) as {
        group?: { type: TransactionType; name: string };
        error?: string;
      };

      if (!response.ok || !data.group) {
        setError(data.error || "Failed to update group.");
        return;
      }

      setEditCategoryGroupId(null);
      setCategoryGroupAnchors((current) =>
        current.map((group) =>
          group.type === data.group!.type && group.group === originalName
            ? { ...group, name: data.group!.name, group: data.group!.name }
            : group,
        ),
      );
      setCategories((current) =>
        current.map((category) =>
          category.type === data.group!.type && category.group === originalName
            ? { ...category, group: data.group!.name }
            : category,
        ),
      );
      if (categoryForm.group === originalName) {
        setCategoryForm((current) => ({ ...current, group: data.group!.name }));
      }
      if (editCategoryForm.group === originalName) {
        setEditCategoryForm((current) => ({
          ...current,
          group: data.group!.name,
        }));
      }
    } catch {
      setError("Failed to update group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editCategoryId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/settings/categories/${editCategoryId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toCategoryPayload(editCategoryForm)),
        },
      );
      const data = (await response.json()) as {
        category?: CategoryView;
        error?: string;
      };

      if (!response.ok || !data.category) {
        setError(data.error || "Failed to update category.");
        return;
      }

      setEditCategoryId(null);
      setCategories((current) =>
        current.map((category) =>
          category.id === data.category!.id ? data.category! : category,
        ),
      );
    } catch {
      setError("Failed to update category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCategory = async (category: CategoryView) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/settings/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          type: category.type,
          group: category.group,
          isHidden: !category.isHidden,
        }),
      });
      const data = (await response.json()) as {
        category?: CategoryView;
        error?: string;
      };

      if (!response.ok || !data.category) {
        setError(data.error || "Failed to update category visibility.");
        return;
      }

      setCategories((current) =>
        current.map((item) =>
          item.id === data.category!.id ? data.category! : item,
        ),
      );
    } catch {
      setError("Failed to update category visibility.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/settings/categories/${categoryId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to delete category.");
        return;
      }

      setCategories((current) =>
        current.filter((category) => category.id !== categoryId),
      );
    } catch {
      setError("Failed to delete category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBudgetCategory = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/budget-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBudgetCategoryPayload(budgetCategoryForm)),
      });
      const data = (await response.json()) as {
        budgetCategory?: BudgetCategoryView;
        error?: string;
      };

      if (!response.ok || !data.budgetCategory) {
        setError(data.error || "Failed to create budget category.");
        return;
      }

      setBudgetCategoryForm({
        userId: budgetCategoryForm.userId,
        name: "",
        isHidden: false,
      });
      setBudgetCategories((current) => [...current, data.budgetCategory!]);
    } catch {
      setError("Failed to create budget category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBudgetCategory = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editBudgetCategoryId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/settings/budget-categories/${editBudgetCategoryId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toBudgetCategoryPayload(editBudgetCategoryForm)),
        },
      );
      const data = (await response.json()) as {
        budgetCategory?: BudgetCategoryView;
        error?: string;
      };

      if (!response.ok || !data.budgetCategory) {
        setError(data.error || "Failed to update budget category.");
        return;
      }

      setEditBudgetCategoryId(null);
      setBudgetCategories((current) =>
        current.map((category) =>
          category.id === data.budgetCategory!.id
            ? data.budgetCategory!
            : category,
        ),
      );
    } catch {
      setError("Failed to update budget category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBudgetCategory = async (category: BudgetCategoryView) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/settings/budget-categories/${category.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: category.userId,
            name: category.name,
            isHidden: !category.isHidden,
          }),
        },
      );
      const data = (await response.json()) as {
        budgetCategory?: BudgetCategoryView;
        error?: string;
      };

      if (!response.ok || !data.budgetCategory) {
        setError(data.error || "Failed to update budget category.");
        return;
      }

      setBudgetCategories((current) =>
        current.map((item) =>
          item.id === data.budgetCategory!.id ? data.budgetCategory! : item,
        ),
      );
    } catch {
      setError("Failed to update budget category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudgetCategory = async (categoryId: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/settings/budget-categories/${categoryId}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to delete budget category.");
        return;
      }

      setBudgetCategories((current) =>
        current.filter((category) => category.id !== categoryId),
      );
    } catch {
      setError("Failed to delete budget category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpsertBudget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetForm),
      });
      const data = (await response.json()) as {
        budget?: Omit<BudgetView, "spent" | "paidEarlyAmount">;
        fundingShortfall?: number;
        error?: string;
      };

      if (!response.ok || !data.budget) {
        setError(data.error || "Failed to save budget.");
        return;
      }

      const isNewBudget = !budgets.some(
        (budget) => budget.id === data.budget!.id,
      );

      setBudgetForm({ ...budgetForm, amount: "" });
      setFundingShortfalls((current) => ({
        ...current,
        [data.budget!.userId]: data.fundingShortfall ?? current[data.budget!.userId] ?? 0,
      }));
      setBudgets((current) => {
        const existingBudget = current.find(
          (budget) => budget.id === data.budget!.id,
        );

        return existingBudget
          ? current.map((budget) =>
              budget.id === data.budget!.id
                ? {
                    ...data.budget!,
                    spent: budget.spent,
                    paidEarlyAmount: budget.paidEarlyAmount,
                  }
                : budget,
            )
          : [
              { ...data.budget!, spent: 0, paidEarlyAmount: 0 },
              ...current,
            ];
      });
      if (isNewBudget && data.budget.budgetCategoryId) {
        setBudgetCategories((current) =>
          current.map((category) =>
            category.id === data.budget!.budgetCategoryId
              ? { ...category, budgetCount: category.budgetCount + 1 }
              : category,
          ),
        );
      }
    } catch {
      setError("Failed to save budget.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    const deletedBudget = budgets.find((budget) => budget.id === budgetId);

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/settings/budgets/${budgetId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        fundingShortfall?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || "Failed to delete budget.");
        return;
      }

      setBudgets((current) =>
        current.filter((budget) => budget.id !== budgetId),
      );
      if (deletedBudget) {
        setFundingShortfalls((current) => ({
          ...current,
          [deletedBudget.userId]:
            data.fundingShortfall ?? current[deletedBudget.userId] ?? 0,
        }));
      }
      if (deletedBudget?.budgetCategoryId) {
        setBudgetCategories((current) =>
          current.map((category) =>
            category.id === deletedBudget.budgetCategoryId
              ? {
                  ...category,
                  budgetCount: Math.max(0, category.budgetCount - 1),
                }
              : category,
          ),
        );
      }
    } catch {
      setError("Failed to delete budget.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            {view === "budgets" ? "Monthly Budget" : "Finance Settings"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {view === "budgets"
              ? "Allocate this month's spending across your budget envelopes."
              : "Manage transaction categories and budget envelopes."}
          </p>
        </div>

        {view === "settings" ? (
          <div className="grid grid-cols-3 rounded-lg bg-zinc-100 p-1">
            <TabButton
              active={activePanel === "categories"}
              label="Categories"
              onClick={() => setActivePanel("categories")}
            />
            <TabButton
              active={activePanel === "groups"}
              label="Groups"
              onClick={() => setActivePanel("groups")}
            />
            <TabButton
              active={activePanel === "budgetCategories"}
              label="Envelopes"
              onClick={() => setActivePanel("budgetCategories")}
            />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 p-5">
        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {activePanel === "categories" ? (
          <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <PanelList
              title="Transaction Categories"
              description="Hide categories to keep transaction input compact."
            >
              <div className="grid gap-3 border-b border-zinc-100 p-5 md:grid-cols-[minmax(0,1fr)_150px_130px]">
                <input
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Search name or group"
                />
                <select
                  value={categoryTypeFilter}
                  onChange={(event) =>
                    setCategoryTypeFilter(
                      event.target.value as
                        | "ALL"
                        | typeof TransactionType.INCOME
                        | typeof TransactionType.EXPENSE,
                    )
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">All types</option>
                  <option value={TransactionType.EXPENSE}>Expense</option>
                  <option value={TransactionType.INCOME}>Income</option>
                </select>
                <HiddenToggle checked={showHidden} onChange={setShowHidden} />
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {filteredCategories.length === 0 ? (
                  <EmptyPanel text="No categories match your filter." />
                ) : null}
                {filteredCategories.map((category) => (
                  <article
                    key={category.id}
                    className="rounded-lg border border-zinc-100 p-4"
                  >
                    {editCategoryId === category.id ? (
                      <CategoryForm
                        form={editCategoryForm}
                        submitLabel="Save Category"
                        isSubmitting={isSubmitting}
                        onChange={setEditCategoryForm}
                        onSubmit={handleUpdateCategory}
                        onCancel={() => setEditCategoryId(null)}
                      />
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-zinc-950">
                              {category.name}
                            </h3>
                            <Badge>{category.type}</Badge>
                            {category.isHidden ? (
                              <Badge tone="amber">Hidden</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {category.group} - {category.transactionCount}{" "}
                            transaction(s)
                          </p>
                        </div>
                        <ActionButtons
                          isSubmitting={isSubmitting}
                          hideLabel={category.isHidden ? "Unhide" : "Hide"}
                          onEdit={() => {
                            setEditCategoryId(category.id);
                            setEditCategoryForm(toCategoryForm(category));
                          }}
                          onHide={() => handleToggleCategory(category)}
                          onDelete={() => handleDeleteCategory(category.id)}
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </PanelList>

            <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 xl:self-start">
              <h2 className="text-lg font-semibold text-zinc-950">
                Add Category
              </h2>
              <div className="mt-5">
                <CategoryForm
                  form={categoryForm}
                  submitLabel="Add Category"
                  isSubmitting={isSubmitting}
                  onChange={setCategoryForm}
                  onSubmit={handleCreateCategory}
                />
              </div>
            </aside>
          </div>
        ) : null}

        {activePanel === "groups" ? (
          <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <PanelList
              title="Category Groups"
              description="Create and rename master groups used by the transaction form."
            >
              <div className="grid gap-3 border-b border-zinc-100 p-5 md:grid-cols-[minmax(0,1fr)_150px]">
                <input
                  value={categoryGroupSearch}
                  onChange={(event) =>
                    setCategoryGroupSearch(event.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Search group or type"
                />
                <HiddenToggle checked={showHidden} onChange={setShowHidden} />
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {filteredCategoryGroups.length === 0 ? (
                  <EmptyPanel text="No groups match your filter." />
                ) : null}
                {filteredCategoryGroups.map((group) => (
                  <article
                    key={group.id}
                    className="rounded-lg border border-zinc-100 p-4"
                  >
                    {editCategoryGroupId === group.id ? (
                      <CategoryGroupForm
                        form={editCategoryGroupForm}
                        submitLabel="Save Group"
                        isSubmitting={isSubmitting}
                        onChange={setEditCategoryGroupForm}
                        onSubmit={handleUpdateCategoryGroup}
                        onCancel={() => setEditCategoryGroupId(null)}
                      />
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-zinc-950">
                              {group.name}
                            </h3>
                            <Badge>{group.type}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {group.categoryCount} category(s)
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditCategoryGroupId(group.id);
                              setEditCategoryGroupForm(
                                toCategoryGroupForm(group),
                              );
                            }}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </PanelList>

            <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 xl:self-start">
              <h2 className="text-lg font-semibold text-zinc-950">Add Group</h2>
              <div className="mt-5">
                <CategoryGroupForm
                  form={categoryGroupForm}
                  submitLabel="Add Group"
                  isSubmitting={isSubmitting}
                  onChange={setCategoryGroupForm}
                  onSubmit={handleCreateCategoryGroup}
                />
              </div>
            </aside>
          </div>
        ) : null}

        {activePanel === "budgetCategories" ? (
          <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <PanelList
              title="Budget Envelopes"
              description="These are separate from transaction income or expense categories."
            >
              <div className="grid gap-3 border-b border-zinc-100 p-5 md:grid-cols-[minmax(0,1fr)_130px]">
                <input
                  value={budgetCategorySearch}
                  onChange={(event) =>
                    setBudgetCategorySearch(event.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Search envelope or user"
                />
                <HiddenToggle checked={showHidden} onChange={setShowHidden} />
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {filteredBudgetCategories.length === 0 ? (
                  <EmptyPanel text="No budget envelopes yet." />
                ) : null}
                {filteredBudgetCategories.map((category) => (
                  <article
                    key={category.id}
                    className="rounded-lg border border-zinc-100 p-4"
                  >
                    {editBudgetCategoryId === category.id ? (
                      <BudgetCategoryForm
                        form={editBudgetCategoryForm}
                        users={visibleUsers}
                        submitLabel="Save Envelope"
                        isSubmitting={isSubmitting}
                        canChangeUser={false}
                        onChange={setEditBudgetCategoryForm}
                        onSubmit={handleUpdateBudgetCategory}
                        onCancel={() => setEditBudgetCategoryId(null)}
                      />
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-zinc-950">
                              {category.name}
                            </h3>
                            {category.isHidden ? (
                              <Badge tone="amber">Hidden</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {category.userName} - {category.budgetCount}{" "}
                            budget(s) - {category.transactionCount}{" "}
                            transaction(s)
                          </p>
                        </div>
                        <ActionButtons
                          isSubmitting={isSubmitting}
                          hideLabel={category.isHidden ? "Unhide" : "Hide"}
                          onEdit={() => {
                            setEditBudgetCategoryId(category.id);
                            setEditBudgetCategoryForm(
                              toBudgetCategoryForm(category),
                            );
                          }}
                          onHide={() => handleToggleBudgetCategory(category)}
                          onDelete={() =>
                            handleDeleteBudgetCategory(category.id)
                          }
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </PanelList>

            <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 xl:self-start">
              <h2 className="text-lg font-semibold text-zinc-950">
                Add Envelope
              </h2>
              <div className="mt-5">
                <BudgetCategoryForm
                  form={budgetCategoryForm}
                  users={visibleUsers}
                  submitLabel="Add Envelope"
                  isSubmitting={isSubmitting}
                  canChangeUser={currentUserRole === UserRole.ADMIN}
                  onChange={setBudgetCategoryForm}
                  onSubmit={handleCreateBudgetCategory}
                />
              </div>
            </aside>
          </div>
        ) : null}

        {view === "budgets" && activePanel === "budgets" ? (
          <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-h-0 max-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <SummaryTile
                    label="Budgetable Income"
                    value={formatRupiah(selectedBudgetSummary.budgetableIncome)}
                    tone="green"
                  />
                  <SummaryTile
                    label="Total Budget Set"
                    value={formatRupiah(selectedBudgetSummary.totalBudget)}
                    tone="slate"
                  />
                  <SummaryTile
                    label="Available to Budget"
                    value={formatRupiah(selectedBudgetSummary.availableToBudget)}
                    tone={
                      selectedBudgetSummary.availableToBudget < 0
                        ? "red"
                        : "blue"
                    }
                  />
                  <SummaryTile
                    label="Unbudgeted Expense"
                    value={formatRupiah(selectedUnbudgetedSpent)}
                    tone={selectedUnbudgetedSpent > 0 ? "red" : "slate"}
                  />
                  <SummaryTile
                    label="Funding Shortfall"
                    value={formatRupiah(selectedFundingShortfall)}
                    tone={selectedFundingShortfall > 0 ? "red" : "slate"}
                  />
                </div>
                {selectedFundingShortfall > 0 ? (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    UNDERFUNDED: Total savings dan sisa budget aktif melebihi
                    saldo wallet sebesar{" "}
                    <SensitiveAmount>
                      {formatRupiah(selectedFundingShortfall)}
                    </SensitiveAmount>
                    .
                  </p>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="mb-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>
                    {selectedMonthBudgets.length} budget(s) for{" "}
                    {budgetForm.month}
                  </span>
                  <span>Updated from the selected user only</span>
                </div>

                {selectedMonthBudgets.length === 0 ? (
                  <EmptyPanel text="No budgets set for this month." />
                ) : null}

                <div className="space-y-2 pb-2">
                  {selectedMonthBudgets.map((budget) => {
                    const remaining = budget.amount - budget.spent;
                    const progress =
                      budget.amount > 0
                        ? Math.min(
                            100,
                            Math.round((budget.spent / budget.amount) * 100),
                          )
                        : 0;
                    const status =
                      budget.spent > budget.amount
                        ? "OVERBUDGET"
                        : progress >= 90
                          ? "DANGER"
                          : progress >= 70
                            ? "WARNING"
                            : "SAFE";

                    return (
                      <article
                        key={budget.id}
                        className="rounded-xl border border-zinc-100 bg-white px-4 py-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-zinc-950">
                                {budget.budgetCategoryName}
                              </h3>
                              {budget.budgetCategoryHidden ? (
                                <Badge tone="amber">Hidden</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {budget.userName}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-bold text-zinc-950">
                                <SensitiveAmount>
                                  {formatRupiah(budget.amount)}
                                </SensitiveAmount>
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                <SensitiveAmount>
                                  {formatRupiah(budget.spent)}
                                </SensitiveAmount>{" "}
                                spent
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBudget(budget.id)}
                              disabled={isSubmitting}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={
                              status === "OVERBUDGET"
                                ? "h-full rounded-full bg-red-500"
                                : status === "DANGER"
                                  ? "h-full rounded-full bg-amber-500"
                                  : status === "WARNING"
                                    ? "h-full rounded-full bg-blue-500"
                                    : "h-full rounded-full bg-emerald-500"
                            }
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                          <span>
                            <SensitiveAmount>
                              {formatRupiah(
                                remaining >= 0
                                  ? remaining
                                  : Math.abs(remaining),
                              )}
                            </SensitiveAmount>
                            {remaining >= 0 ? " remaining" : " over"}
                          </span>
                          {budget.paidEarlyAmount > 0 ? (
                            <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700">
                              Paid Early:{" "}
                              <SensitiveAmount>
                                {formatRupiah(budget.paidEarlyAmount)}
                              </SensitiveAmount>
                            </span>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 xl:self-start">
              <h2 className="text-lg font-semibold text-zinc-950">
                Set Budget
              </h2>
              <form onSubmit={handleUpsertBudget} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    User
                  </label>
                  <select
                    value={budgetForm.userId}
                    onChange={(event) => {
                      const userId = event.target.value;
                      const nextCategory =
                        budgetCategories.find(
                          (category) =>
                            category.userId === userId && !category.isHidden,
                        )?.id || "";

                      setBudgetForm({
                        ...budgetForm,
                        userId,
                        budgetCategoryId: nextCategory,
                      });
                    }}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
                  >
                    {visibleUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Budget Category
                  </label>
                  <select
                    value={budgetForm.budgetCategoryId}
                    onChange={(event) =>
                      setBudgetForm({
                        ...budgetForm,
                        budgetCategoryId: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
                    required
                  >
                    <option value="">Select envelope</option>
                    {availableBudgetCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {availableBudgetCategories.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Add a budget envelope first.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Month
                  </label>
                  <input
                    type="month"
                    value={budgetForm.month}
                    onChange={(event) =>
                      setBudgetForm({
                        ...budgetForm,
                        month: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Amount
                  </label>
                  <input
                    value={budgetForm.amount}
                    onChange={(event) =>
                      setBudgetForm({
                        ...budgetForm,
                        amount: normalizeAmountInput(event.target.value),
                      })
                    }
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
                    placeholder="Rp 1.300.000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    isSubmitting || availableBudgetCategories.length === 0
                  }
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Budget"}
                </button>
              </form>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm"
          : "rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
      }
    >
      {label}
    </button>
  );
}

function PanelList({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function HiddenToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Hidden
    </label>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "red" | "slate";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <article className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-base font-bold text-zinc-950">
        <SensitiveAmount>{value}</SensitiveAmount>
      </p>
    </article>
  );
}

function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: "zinc" | "amber";
}) {
  const className =
    tone === "amber"
      ? "rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
      : "rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600";

  return <span className={className}>{children}</span>;
}

function ActionButtons({
  isSubmitting,
  hideLabel,
  onEdit,
  onHide,
  onDelete,
}: {
  isSubmitting: boolean;
  hideLabel: string;
  onEdit: () => void;
  onHide: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onHide}
        disabled={isSubmitting}
        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
      >
        {hideLabel}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isSubmitting}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
      {text}
    </p>
  );
}

function CategoryForm({
  form,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: CategoryForm;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: CategoryForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextInput
        label="Name"
        value={form.name}
        placeholder="Coffee, Salary, Groceries"
        onChange={(name) => onChange({ ...form, name })}
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          Type
        </label>
        <select
          value={form.type}
          onChange={(event) =>
            onChange({ ...form, type: event.target.value as TransactionType })
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
        >
          {transactionTypeOptions
            .filter((option) => option.value !== TransactionType.TRANSFER)
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </select>
      </div>
      <TextInput
        label="Group"
        value={form.group}
        onChange={(group) => onChange({ ...form, group })}
      />
      <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={form.isHidden}
          onChange={(event) =>
            onChange({ ...form, isHidden: event.target.checked })
          }
        />
        Hidden from transaction dropdown
      </label>
      <FormActions
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
      />
    </form>
  );
}

function CategoryGroupForm({
  form,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: CategoryGroupForm;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: CategoryGroupForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          Type
        </label>
        <select
          value={form.type}
          onChange={(event) =>
            onChange({
              ...form,
              type: event.target.value as TransactionType,
            })
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
        >
          <option value={TransactionType.EXPENSE}>Expense</option>
          <option value={TransactionType.INCOME}>Income</option>
        </select>
      </div>
      <TextInput
        label="Group Name"
        value={form.name}
        placeholder="Makanan, Transport, Gaji"
        onChange={(name) => onChange({ ...form, name })}
      />
      <FormActions
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
      />
    </form>
  );
}

function BudgetCategoryForm({
  form,
  users,
  submitLabel,
  isSubmitting,
  canChangeUser,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: BudgetCategoryForm;
  users: UserOption[];
  submitLabel: string;
  isSubmitting: boolean;
  canChangeUser: boolean;
  onChange: (value: BudgetCategoryForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {canChangeUser ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            User
          </label>
          <select
            value={form.userId}
            onChange={(event) =>
              onChange({ ...form, userId: event.target.value })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <TextInput
        label="Name"
        value={form.name}
        placeholder="Makan Harian, Jajan, Lifestyle"
        onChange={(name) => onChange({ ...form, name })}
      />
      <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={form.isHidden}
          onChange={(event) =>
            onChange({ ...form, isHidden: event.target.checked })
          }
        />
        Hidden from budget and transaction dropdown
      </label>
      <FormActions
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
      />
    </form>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
        maxLength={60}
        placeholder={placeholder}
        required
      />
    </div>
  );
}

function FormActions({
  submitLabel,
  isSubmitting,
  onCancel,
}: {
  submitLabel: string;
  isSubmitting: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
