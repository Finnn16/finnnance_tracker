type BudgetPlanStatus = "SAFE" | "OVERPLANNED";
type CashCoverageStatus = "COVERED" | "GAP";
type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

type DashboardSummaryResponse = {
  wallet?: {
    operationalBalance?: number;
    totalWalletBalance?: number;
  };
  savings?: {
    reservedSavings?: number;
  };
  budget?: {
    readyToBudget?: number;
    budgetSet?: number;
    budgetSpent?: number;
    remainingActiveBudget?: number;
    budgetPlanGap?: number;
    budgetPlanStatus?: BudgetPlanStatus;
  };
  coverage?: {
    totalWalletBalance?: number;
    reservedSavings?: number;
    remainingActiveBudget?: number;
    protectedMoney?: number;
    displayFreeCash?: number;
    cashCoverageGap?: number;
    cashCoverageStatus?: CashCoverageStatus;
  };
};

type SupabaseUser = {
  id: string;
  name: string;
  email: string;
};

type SupabaseWallet = {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  is_default: boolean;
};

type SupabaseTransaction = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  budget_category_id: string | null;
  category_id: string | null;
  wallet_id: string;
  transfer_to_wallet_id: string | null;
};

type SupabaseBudget = {
  id: string;
  amount: number;
  budget_category_id: string | null;
};

type SupabaseCategory = {
  id: string;
  name: string;
};

type SupabaseSavingLedger = {
  id: string;
  type: "ADD" | "WITHDRAW" | "ADJUSTMENT";
  amount: number | string;
};

export type MobileDashboardData = {
  userName: string;
  periodLabel: string;
  isFallback: boolean;
  budget: {
    readyToBudget: number;
    budgetSet: number;
    spent: number;
    remainingActiveBudget: number;
    usedPercentage: number;
    budgetPlanGap: number;
    budgetPlanStatus: BudgetPlanStatus;
  };
  coverage: {
    cashCoverageStatus: CashCoverageStatus;
    cashCoverageGap: number;
    displayFreeCash: number;
    totalWalletBalance: number;
    reservedSavings: number;
    protectedMoney: number;
  };
  summary: {
    income: number;
    expense: number;
    netCashflow: number;
    transactionCount: number;
  };
  wallets: {
    id: string;
    name: string;
    type: string;
    balance: number;
  }[];
  topCategories: {
    id: string;
    name: string;
    amount: number;
    percentage: number;
  }[];
  budgetItems: {
    id: string;
    name: string;
    spent: number;
    amount: number;
    progress: number;
  }[];
  recentTransactions: {
    id: string;
    title: string;
    subtitle: string;
    amount: string;
  }[];
};

export type DashboardUserOption = {
  id: string;
  name: string;
  email: string;
};

export type DashboardFetchOptions = {
  monthKey?: string;
  ownerEmail?: string;
};

export const fallbackDashboardData: MobileDashboardData = {
  userName: "Finnn",
  periodLabel: "Juni 2026",
  isFallback: true,
  budget: {
    readyToBudget: 6500000,
    budgetSet: 5850000,
    spent: 2450000,
    remainingActiveBudget: 3400000,
    usedPercentage: 42,
    budgetPlanGap: 0,
    budgetPlanStatus: "SAFE",
  },
  coverage: {
    cashCoverageStatus: "COVERED",
    cashCoverageGap: 0,
    displayFreeCash: 2150000,
    totalWalletBalance: 12500000,
    reservedSavings: 2500000,
    protectedMoney: 3400000,
  },
  summary: {
    income: 7500000,
    expense: 2450000,
    netCashflow: 5050000,
    transactionCount: 28,
  },
  wallets: [
    { id: "cash", name: "Cash", type: "Wallet", balance: 1200000 },
    { id: "bank", name: "BCA", type: "Bank", balance: 9200000 },
    { id: "ewallet", name: "E-Wallet", type: "Digital", balance: 2100000 },
  ],
  topCategories: [
    { id: "food", name: "Makan", amount: 850000, percentage: 35 },
    { id: "transport", name: "Transport", amount: 420000, percentage: 17 },
    { id: "family", name: "Keluarga", amount: 380000, percentage: 16 },
  ],
  budgetItems: [
    { id: "food", name: "Makan", spent: 850000, amount: 1500000, progress: 57 },
    {
      id: "transport",
      name: "Transport",
      spent: 420000,
      amount: 700000,
      progress: 60,
    },
    { id: "fun", name: "Hiburan", spent: 260000, amount: 500000, progress: 52 },
  ],
  recentTransactions: [
    {
      id: "trx-1",
      title: "Makan Siang",
      subtitle: "Hari ini - Makan - Cash",
      amount: "-Rp 45.000",
    },
    {
      id: "trx-2",
      title: "Gaji Bulanan",
      subtitle: "Kemarin - Income - BCA",
      amount: "Rp 7.500.000",
    },
    {
      id: "trx-3",
      title: "Top Up E-Wallet",
      subtitle: "2 hari lalu - Transfer",
      amount: "Rp 300.000",
    },
  ],
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dashboardUserEmail = process.env.EXPO_PUBLIC_FINNNANCE_USER_EMAIL;
const allowedEmails = (process.env.EXPO_PUBLIC_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const dashboardSummaryUrl =
  process.env.EXPO_PUBLIC_FINNNANCE_DASHBOARD_SUMMARY_URL;

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function currentMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function currentMonthKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(monthKey: string, offset: number) {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);
  const date = new Date(yearValue, (monthValue || 1) - 1 + offset, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(monthKey = currentMonthKey()) {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);
  const start = new Date(yearValue, (monthValue || 1) - 1, 1);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  return {
    start,
    next,
    startIso: start.toISOString(),
    nextIso: next.toISOString(),
  };
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toWalletTypeLabel(type: string) {
  const labels: Record<string, string> = {
    CASH: "Cash",
    BANK: "Bank",
    EWALLET: "E-Wallet",
    DIGITAL_BANK: "Digital Bank",
    CREDIT_CARD: "Credit Card",
    PAYLATER: "Paylater",
    INVESTMENT: "Investment",
    ASSET: "Asset",
    OTHER: "Other",
  };

  return labels[type] || "Other";
}

function unique(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function inFilter(values: string[]) {
  return `in.(${values.join(",")})`;
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || "";
}

function mergeDashboardSummary(
  summary: DashboardSummaryResponse,
): MobileDashboardData {
  const budgetSet =
    summary.budget?.budgetSet ?? fallbackDashboardData.budget.budgetSet;
  const spent =
    summary.budget?.budgetSpent ?? fallbackDashboardData.budget.spent;

  return {
    ...fallbackDashboardData,
    periodLabel: currentMonthLabel(),
    isFallback: false,
    budget: {
      readyToBudget:
        summary.budget?.readyToBudget ??
        fallbackDashboardData.budget.readyToBudget,
      budgetSet,
      spent,
      remainingActiveBudget:
        summary.budget?.remainingActiveBudget ??
        fallbackDashboardData.budget.remainingActiveBudget,
      usedPercentage: budgetSet > 0 ? Math.round((spent / budgetSet) * 100) : 0,
      budgetPlanGap:
        summary.budget?.budgetPlanGap ??
        fallbackDashboardData.budget.budgetPlanGap,
      budgetPlanStatus:
        summary.budget?.budgetPlanStatus ??
        fallbackDashboardData.budget.budgetPlanStatus,
    },
    coverage: {
      cashCoverageStatus:
        summary.coverage?.cashCoverageStatus ??
        fallbackDashboardData.coverage.cashCoverageStatus,
      cashCoverageGap:
        summary.coverage?.cashCoverageGap ??
        fallbackDashboardData.coverage.cashCoverageGap,
      displayFreeCash:
        summary.coverage?.displayFreeCash ??
        fallbackDashboardData.coverage.displayFreeCash,
      totalWalletBalance:
        summary.coverage?.totalWalletBalance ??
        summary.wallet?.totalWalletBalance ??
        fallbackDashboardData.coverage.totalWalletBalance,
      reservedSavings:
        summary.coverage?.reservedSavings ??
        summary.savings?.reservedSavings ??
        fallbackDashboardData.coverage.reservedSavings,
      protectedMoney:
        summary.coverage?.protectedMoney ??
        fallbackDashboardData.coverage.protectedMoney,
    },
  };
}

async function fetchDashboardSummary() {
  if (!dashboardSummaryUrl) {
    throw new Error("Dashboard summary URL is not configured.");
  }

  const response = await fetch(dashboardSummaryUrl, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Dashboard summary request failed.");
  }

  return mergeDashboardSummary(
    (await response.json()) as DashboardSummaryResponse,
  );
}

async function supabaseSelect<T>(
  table: string,
  params: [string, string][],
): Promise<T[]> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env is not configured.");
  }

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);

  params.forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} request failed.`);
  }

  return (await response.json()) as T[];
}

async function getCategoryMap(
  table: "categories" | "budget_categories",
  ids: string[],
) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const rows = await supabaseSelect<SupabaseCategory>(table, [
    ["select", "id,name"],
    ["id", inFilter(ids)],
  ]);

  return new Map(rows.map((row) => [row.id, row.name]));
}

function summarizeSavings(ledgers: SupabaseSavingLedger[]) {
  return ledgers.reduce((total, ledger) => {
    const amount = toNumber(ledger.amount);

    return ledger.type === "WITHDRAW" ? total - amount : total + amount;
  }, 0);
}

async function findDashboardUser(userEmail: string) {
  const normalizedEmail = normalizeEmail(userEmail);
  const fallbackEmail = normalizeEmail(dashboardUserEmail);
  const exactUsers = await supabaseSelect<SupabaseUser>("users", [
    ["select", "id,name,email"],
    ["email", `eq.${normalizedEmail}`],
    ["limit", "1"],
  ]);

  if (exactUsers[0]) {
    return exactUsers[0];
  }

  const lookupEmails = unique([normalizedEmail, fallbackEmail, ...allowedEmails]);

  if (lookupEmails.length === 0) {
    return null;
  }

  const filteredUsers = await supabaseSelect<SupabaseUser>("users", [
    ["select", "id,name,email"],
    ["email", inFilter(lookupEmails)],
  ]);
  const visibleUsers =
    filteredUsers.length > 0
      ? filteredUsers
      : await supabaseSelect<SupabaseUser>("users", [
          ["select", "id,name,email"],
          ["limit", "20"],
        ]);
  console.log(
    "Supabase user lookup:",
    JSON.stringify({
      requestedEmail: normalizedEmail,
      fallbackEmail,
      filteredUsers: filteredUsers.length,
      visibleUsers: visibleUsers.length,
      visibleEmails: visibleUsers.map((user) => normalizeEmail(user.email)),
    }),
  );

  return (
    visibleUsers.find(
      (user) => normalizeEmail(user.email) === normalizedEmail,
    ) ||
    visibleUsers.find(
      (user) => normalizeEmail(user.email) === fallbackEmail,
    ) ||
    visibleUsers.find((user) => lookupEmails.includes(normalizeEmail(user.email))) ||
    visibleUsers[0] ||
    null
  );
}

async function getVisibleDashboardUsers() {
  const lookupEmails = unique([
    normalizeEmail(dashboardUserEmail),
    ...allowedEmails,
  ]);
  const filteredUsers =
    lookupEmails.length > 0
      ? await supabaseSelect<SupabaseUser>("users", [
          ["select", "id,name,email"],
          ["email", inFilter(lookupEmails)],
          ["order", "name.asc"],
        ])
      : [];

  if (filteredUsers.length > 0) {
    return filteredUsers;
  }

  return supabaseSelect<SupabaseUser>("users", [
    ["select", "id,name,email"],
    ["limit", "20"],
    ["order", "name.asc"],
  ]);
}

export async function fetchDashboardUsers(): Promise<DashboardUserOption[]> {
  const users = await getVisibleDashboardUsers();

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
  }));
}

async function fetchDirectSupabaseDashboard({
  monthKey,
  ownerEmail = dashboardUserEmail,
}: DashboardFetchOptions = {}): Promise<MobileDashboardData> {
  if (!ownerEmail) {
    throw new Error("Dashboard user email is not configured.");
  }

  const range = monthRange(monthKey);
  const isAllUsers = ownerEmail === "all";
  const users = isAllUsers
    ? await getVisibleDashboardUsers()
    : [await findDashboardUser(ownerEmail)];
  const selectedUsers = users.filter(Boolean) as SupabaseUser[];

  if (selectedUsers.length === 0) {
    throw new Error(`Dashboard user was not found for ${normalizeEmail(ownerEmail)}.`);
  }

  const userIds = selectedUsers.map((user) => user.id);
  const userFilter = userIds.length === 1 ? `eq.${userIds[0]}` : inFilter(userIds);
  const [wallets, transactions, budgets, savingLedgers] = await Promise.all([
    supabaseSelect<SupabaseWallet>("wallets", [
      ["select", "id,name,type,current_balance,is_default"],
      ["user_id", userFilter],
      ["order", "is_default.desc,name.asc"],
    ]),
    supabaseSelect<SupabaseTransaction>("transactions", [
      [
        "select",
        "id,type,amount,description,transaction_date,budget_category_id,category_id,wallet_id,transfer_to_wallet_id",
      ],
      ["user_id", userFilter],
      ["transaction_date", `gte.${range.startIso}`],
      ["transaction_date", `lt.${range.nextIso}`],
      ["order", "transaction_date.desc,created_at.desc"],
    ]),
    supabaseSelect<SupabaseBudget>("budgets", [
      ["select", "id,amount,budget_category_id"],
      ["user_id", userFilter],
      ["month", `gte.${range.startIso}`],
      ["month", `lt.${range.nextIso}`],
      ["order", "amount.desc"],
    ]),
    supabaseSelect<SupabaseSavingLedger>("saving_ledgers", [
      ["select", "id,type,amount"],
      ["user_id", userFilter],
    ]),
  ]);

  const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet.name]));
  const categoryMap = await getCategoryMap(
    "categories",
    unique(transactions.map((transaction) => transaction.category_id)),
  );
  const budgetCategoryMap = await getCategoryMap(
    "budget_categories",
    unique([
      ...transactions.map((transaction) => transaction.budget_category_id),
      ...budgets.map((budget) => budget.budget_category_id),
    ]),
  );
  const income = transactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalWalletBalance = wallets.reduce(
    (total, wallet) => total + wallet.current_balance,
    0,
  );
  const reservedSavings = summarizeSavings(savingLedgers);
  const operationalBalance = Math.max(totalWalletBalance - reservedSavings, 0);
  const readyToBudget = income;
  const budgetSet = budgets.reduce((total, budget) => total + budget.amount, 0);
  const spentByBudgetCategory = new Map<string, number>();
  let budgetSpent = 0;

  transactions.forEach((transaction) => {
    if (transaction.type !== "EXPENSE" || !transaction.budget_category_id) {
      return;
    }

    budgetSpent += transaction.amount;
    spentByBudgetCategory.set(
      transaction.budget_category_id,
      (spentByBudgetCategory.get(transaction.budget_category_id) || 0) +
        transaction.amount,
    );
  });

  const remainingActiveBudget = budgets.reduce((total, budget) => {
    const spent = budget.budget_category_id
      ? spentByBudgetCategory.get(budget.budget_category_id) || 0
      : 0;

    return total + Math.max(budget.amount - spent, 0);
  }, 0);
  const budgetPlanGap = Math.max(budgetSet - readyToBudget, 0);
  const protectedMoney = remainingActiveBudget;
  const displayFreeCash = Math.max(operationalBalance - protectedMoney, 0);
  const cashCoverageGap = Math.max(protectedMoney - operationalBalance, 0);
  const categoryTotals = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (transaction.type !== "EXPENSE") {
      return;
    }

    const categoryName =
      (transaction.category_id && categoryMap.get(transaction.category_id)) ||
      "Uncategorized";

    categoryTotals.set(
      categoryName,
      (categoryTotals.get(categoryName) || 0) + transaction.amount,
    );
  });

  return {
    userName: isAllUsers ? "Semua User" : selectedUsers[0].name,
    periodLabel: currentMonthLabel(range.start),
    isFallback: false,
    budget: {
      readyToBudget,
      budgetSet,
      spent: budgetSpent,
      remainingActiveBudget,
      usedPercentage:
        budgetSet > 0
          ? Math.min(100, Math.round((budgetSpent / budgetSet) * 100))
          : 0,
      budgetPlanGap,
      budgetPlanStatus: budgetPlanGap > 0 ? "OVERPLANNED" : "SAFE",
    },
    coverage: {
      cashCoverageStatus: cashCoverageGap > 0 ? "GAP" : "COVERED",
      cashCoverageGap,
      displayFreeCash,
      totalWalletBalance: operationalBalance,
      reservedSavings,
      protectedMoney,
    },
    summary: {
      income,
      expense,
      netCashflow: income - expense,
      transactionCount: transactions.length,
    },
    wallets: wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      type: toWalletTypeLabel(wallet.type),
      balance: wallet.current_balance,
    })),
    topCategories: Array.from(categoryTotals.entries())
      .map(([name, amount], index) => ({
        id: `${name}-${index}`,
        name,
        amount,
        percentage: expense > 0 ? Math.round((amount / expense) * 100) : 0,
      }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5),
    budgetItems: budgets
      .map((budget) => {
        const spent = budget.budget_category_id
          ? spentByBudgetCategory.get(budget.budget_category_id) || 0
          : 0;

        return {
          id: budget.id,
          name:
            (budget.budget_category_id &&
              budgetCategoryMap.get(budget.budget_category_id)) ||
            "Unassigned",
          spent,
          amount: budget.amount,
          progress:
            budget.amount > 0
              ? Math.min(100, Math.round((spent / budget.amount) * 100))
              : 0,
        };
      })
      .slice(0, 5),
    recentTransactions: transactions.slice(0, 8).map((transaction) => {
      const subtitle =
        (transaction.budget_category_id &&
          budgetCategoryMap.get(transaction.budget_category_id)) ||
        (transaction.category_id && categoryMap.get(transaction.category_id)) ||
        (transaction.transfer_to_wallet_id
          ? `${walletMap.get(transaction.wallet_id) || "Wallet"} to ${
              walletMap.get(transaction.transfer_to_wallet_id) || "Wallet"
            }`
          : walletMap.get(transaction.wallet_id)) ||
        "Wallet";

      return {
        id: transaction.id,
        title: transaction.description,
        subtitle: `${formatShortDate(transaction.transaction_date)} - ${subtitle}`,
        amount:
          transaction.type === "EXPENSE"
            ? `-${formatRupiah(transaction.amount)}`
            : formatRupiah(transaction.amount),
      };
    }),
  };
}

export async function fetchDashboardData(
  options: DashboardFetchOptions = {},
): Promise<MobileDashboardData> {
  try {
    console.log("Trying direct Supabase:", options);
    return await fetchDirectSupabaseDashboard(options);
  } catch (directError) {
    console.log("Direct Supabase failed:", directError);

    try {
      console.log("Trying dashboard summary API");
      return await fetchDashboardSummary();
    } catch (summaryError) {
      console.log("Summary API failed:", summaryError);
      return fallbackDashboardData;
    }
  }
}
