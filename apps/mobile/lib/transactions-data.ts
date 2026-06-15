import { currentMonthKey, formatRupiah } from "./dashboard-data";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TransactionTab = "all" | "income" | "expense" | "transfer";

type SupabaseUser = {
  id: string;
  name: string;
  email: string;
};

type SupabaseWallet = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  is_default: boolean;
};

type SupabaseWalletBalance = {
  id: string;
  current_balance: number;
};

type SupabaseCategory = {
  id: string;
  key: string;
  name: string;
  group: string;
  type: TransactionType;
};

type SupabaseBudgetCategory = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
};

type SupabaseTransaction = {
  id: string;
  user_id: string;
  wallet_id: string;
  transfer_to_wallet_id: string | null;
  category_id: string | null;
  budget_category_id: string | null;
  budget_month: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  is_prepaid: boolean;
  savings_amount: number;
  budgetable_amount: number;
};

export type TransactionUserOption = {
  id: string;
  name: string;
  email: string;
};

export type TransactionWalletOption = {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
};

export type TransactionCategoryOption = {
  id: string;
  key: string;
  name: string;
  group: string;
  type: TransactionType;
};

export type TransactionBudgetCategoryOption = {
  id: string;
  userId: string;
  name: string;
};

export type MobileTransactionView = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  walletId: string;
  walletName: string;
  transferToWalletId: string | null;
  transferToWalletName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  budgetCategoryId: string | null;
  budgetCategoryName: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  budgetMonth: string | null;
  isPrepaid: boolean;
  savingsAmount: number;
  budgetableAmount: number;
};

export type TransactionsFetchOptions = {
  monthKey?: string;
  ownerEmail?: string;
  tab?: TransactionTab;
  query?: string;
  limit?: number;
};

export type TransactionsData = {
  periodLabel: string;
  users: TransactionUserOption[];
  wallets: TransactionWalletOption[];
  categories: TransactionCategoryOption[];
  budgetCategories: TransactionBudgetCategoryOption[];
  transactions: MobileTransactionView[];
  summary: {
    income: number;
    expense: number;
    netCashflow: number;
    transactionCount: number;
  };
};

export type CreateTransactionInput = {
  ownerEmail: string;
  type: TransactionType;
  walletId: string;
  transferToWalletId?: string | null;
  categoryId?: string | null;
  budgetCategoryId?: string | null;
  amount: number;
  description: string;
  transactionDate: string;
  budgetMonth?: string | null;
};

export type CreateTransactionResult = {
  transactions: SupabaseTransaction[];
  warning?: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dashboardUserEmail = process.env.EXPO_PUBLIC_FINNNANCE_USER_EMAIL;
const allowedEmails = (process.env.EXPO_PUBLIC_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || "";
}

function unique(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function inFilter(values: string[]) {
  return `in.(${values.join(",")})`;
}

function monthRange(monthKey = currentMonthKey()) {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);
  const start = new Date(yearValue, (monthValue || 1) - 1, 1);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  return {
    start,
    startIso: start.toISOString(),
    nextIso: next.toISOString(),
  };
}

function periodLabel(monthKey = currentMonthKey()) {
  const range = monthRange(monthKey);

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(range.start);
}

function getSupabaseUrl(table: string, params: [string, string][] = []) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env is not configured.");
  }

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);

  params.forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return url;
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: string };

    return data.message || data.error;
  } catch {
    return undefined;
  }
}

async function supabaseSelect<T>(
  table: string,
  params: [string, string][],
): Promise<T[]> {
  const response = await fetch(getSupabaseUrl(table, params).toString(), {
    headers: {
      apikey: supabaseKey || "",
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    const message = await readError(response);

    throw new Error(message || `Supabase ${table} request failed.`);
  }

  return (await response.json()) as T[];
}

async function supabaseInsert<T>(
  table: string,
  body: Record<string, unknown>,
): Promise<T[]> {
  const response = await fetch(getSupabaseUrl(table).toString(), {
    method: "POST",
    headers: {
      apikey: supabaseKey || "",
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await readError(response);

    throw new Error(message || `Supabase ${table} insert failed.`);
  }

  return (await response.json()) as T[];
}

async function supabaseUpdate<T>(
  table: string,
  params: [string, string][],
  body: Record<string, unknown>,
): Promise<T[]> {
  const response = await fetch(getSupabaseUrl(table, params).toString(), {
    method: "PATCH",
    headers: {
      apikey: supabaseKey || "",
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await readError(response);

    throw new Error(message || `Supabase ${table} update failed.`);
  }

  return (await response.json()) as T[];
}

async function getVisibleUsers() {
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

async function findUser(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const fallbackEmail = normalizeEmail(dashboardUserEmail);
  const exactUsers = await supabaseSelect<SupabaseUser>("users", [
    ["select", "id,name,email"],
    ["email", `eq.${normalizedEmail}`],
    ["limit", "1"],
  ]);

  if (exactUsers[0]) {
    return exactUsers[0];
  }

  const users = await getVisibleUsers();

  return (
    users.find((user) => normalizeEmail(user.email) === normalizedEmail) ||
    users.find((user) => normalizeEmail(user.email) === fallbackEmail) ||
    users[0] ||
    null
  );
}

function toUserOption(user: SupabaseUser): TransactionUserOption {
  return {
    id: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
  };
}

function getUserFilter(users: SupabaseUser[]) {
  const ids = users.map((user) => user.id);

  return ids.length === 1 ? `eq.${ids[0]}` : inFilter(ids);
}

function matchesQuery(transaction: MobileTransactionView, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchable = [
    transaction.description,
    transaction.userName,
    transaction.userEmail,
    transaction.walletName,
    transaction.transferToWalletName,
    transaction.categoryName,
    transaction.budgetCategoryName,
    String(transaction.amount),
    formatRupiah(transaction.amount),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedQuery);
}

function sortWallets(wallets: TransactionWalletOption[]) {
  return wallets.sort((left, right) => {
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

async function getWalletBalance(walletId: string) {
  const rows = await supabaseSelect<SupabaseWalletBalance>("wallets", [
    ["select", "id,current_balance"],
    ["id", `eq.${walletId}`],
    ["limit", "1"],
  ]);

  if (!rows[0]) {
    throw new Error("Wallet tidak ditemukan.");
  }

  return rows[0].current_balance;
}

async function setWalletBalance(walletId: string, balance: number) {
  await supabaseUpdate<SupabaseWalletBalance>(
    "wallets",
    [["id", `eq.${walletId}`]],
    { current_balance: balance },
  );
}

async function applyWalletBalanceEffect(input: CreateTransactionInput) {
  if (input.type === "INCOME") {
    const currentBalance = await getWalletBalance(input.walletId);

    await setWalletBalance(input.walletId, currentBalance + input.amount);
    return;
  }

  if (input.type === "EXPENSE") {
    const currentBalance = await getWalletBalance(input.walletId);

    await setWalletBalance(input.walletId, currentBalance - input.amount);
    return;
  }

  const transferToWalletId = input.transferToWalletId;

  if (!transferToWalletId) {
    return;
  }

  const [sourceBalance, targetBalance] = await Promise.all([
    getWalletBalance(input.walletId),
    getWalletBalance(transferToWalletId),
  ]);

  await Promise.all([
    setWalletBalance(input.walletId, sourceBalance - input.amount),
    setWalletBalance(transferToWalletId, targetBalance + input.amount),
  ]);
}

export async function fetchTransactionsData({
  monthKey = currentMonthKey(),
  ownerEmail = dashboardUserEmail,
  tab = "all",
  query = "",
  limit = 50,
}: TransactionsFetchOptions = {}): Promise<TransactionsData> {
  if (!ownerEmail) {
    throw new Error("Transaction user email is not configured.");
  }

  const range = monthRange(monthKey);
  const allVisibleUsers = await getVisibleUsers();
  const selectedUsers =
    ownerEmail === "all" ? allVisibleUsers : [await findUser(ownerEmail)];
  const users = selectedUsers.filter(Boolean) as SupabaseUser[];

  if (users.length === 0) {
    throw new Error(`Transaction user was not found for ${normalizeEmail(ownerEmail)}.`);
  }

  const userFilter = getUserFilter(users);
  const transactionParams: [string, string][] = [
    [
      "select",
      "id,user_id,wallet_id,transfer_to_wallet_id,category_id,budget_category_id,budget_month,type,amount,description,transaction_date,is_prepaid,savings_amount,budgetable_amount",
    ],
    ["user_id", userFilter],
    ["transaction_date", `gte.${range.startIso}`],
    ["transaction_date", `lt.${range.nextIso}`],
    ["order", "transaction_date.desc,created_at.desc"],
    ["limit", String(limit)],
  ];

  if (tab !== "all") {
    transactionParams.push(["type", `eq.${tab.toUpperCase()}`]);
  }

  const [walletRows, categoryRows, budgetCategoryRows, transactionRows] =
    await Promise.all([
      supabaseSelect<SupabaseWallet>("wallets", [
        ["select", "id,user_id,name,type,is_default"],
        ["user_id", userFilter],
        ["order", "is_default.desc,name.asc"],
      ]),
      supabaseSelect<SupabaseCategory>("categories", [
        ["select", "id,key,name,group,type"],
        ["is_selectable", "eq.true"],
        ["is_hidden", "eq.false"],
        ["order", "type.asc,group.asc,name.asc"],
      ]),
      supabaseSelect<SupabaseBudgetCategory>("budget_categories", [
        ["select", "id,user_id,name,sort_order"],
        ["user_id", userFilter],
        ["is_hidden", "eq.false"],
        ["order", "sort_order.asc,name.asc"],
      ]),
      supabaseSelect<SupabaseTransaction>("transactions", transactionParams),
    ]);

  const userMap = new Map(allVisibleUsers.map((user) => [user.id, user]));
  const walletMap = new Map(walletRows.map((wallet) => [wallet.id, wallet]));
  const categoryMap = new Map(categoryRows.map((category) => [category.id, category]));
  const budgetCategoryMap = new Map(
    budgetCategoryRows.map((category) => [category.id, category]),
  );

  const transactions = transactionRows
    .map((transaction) => {
      const user = userMap.get(transaction.user_id);
      const wallet = walletMap.get(transaction.wallet_id);
      const transferWallet = transaction.transfer_to_wallet_id
        ? walletMap.get(transaction.transfer_to_wallet_id)
        : null;
      const category = transaction.category_id
        ? categoryMap.get(transaction.category_id)
        : null;
      const budgetCategory = transaction.budget_category_id
        ? budgetCategoryMap.get(transaction.budget_category_id)
        : null;

      return {
        id: transaction.id,
        userId: transaction.user_id,
        userName: user?.name || "User",
        userEmail: normalizeEmail(user?.email),
        walletId: transaction.wallet_id,
        walletName: wallet?.name || "Wallet",
        transferToWalletId: transaction.transfer_to_wallet_id,
        transferToWalletName: transferWallet?.name || null,
        categoryId: transaction.category_id,
        categoryName: category?.name || null,
        budgetCategoryId: transaction.budget_category_id,
        budgetCategoryName: budgetCategory?.name || null,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        transactionDate: transaction.transaction_date,
        budgetMonth: transaction.budget_month,
        isPrepaid: transaction.is_prepaid,
        savingsAmount: transaction.savings_amount,
        budgetableAmount: transaction.budgetable_amount,
      };
    })
    .filter((transaction) => matchesQuery(transaction, query));

  const income = transactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((total, transaction) => total + transaction.amount, 0);

  return {
    periodLabel: periodLabel(monthKey),
    users: allVisibleUsers.map(toUserOption),
    wallets: sortWallets(
      walletRows.map((wallet) => ({
        id: wallet.id,
        userId: wallet.user_id,
        name: wallet.name,
        isDefault: wallet.is_default,
      })),
    ),
    categories: categoryRows.map((category) => ({
      id: category.id,
      key: category.key,
      name: category.name,
      group: category.group,
      type: category.type,
    })),
    budgetCategories: budgetCategoryRows.map((category) => ({
      id: category.id,
      userId: category.user_id,
      name: category.name,
    })),
    transactions,
    summary: {
      income,
      expense,
      netCashflow: income - expense,
      transactionCount: transactions.length,
    },
  };
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<CreateTransactionResult> {
  const user = await findUser(input.ownerEmail);

  if (!user) {
    throw new Error(`Transaction user was not found for ${normalizeEmail(input.ownerEmail)}.`);
  }

  if (!input.walletId) {
    throw new Error("Pilih wallet terlebih dahulu.");
  }

  if (input.type === "TRANSFER" && !input.transferToWalletId) {
    throw new Error("Pilih wallet tujuan transfer.");
  }

  const budgetMonth = input.budgetMonth
    ? new Date(`${input.budgetMonth}-01T00:00:00`).toISOString()
    : null;

  const rows = await supabaseInsert<SupabaseTransaction>("transactions", {
    user_id: user.id,
    wallet_id: input.walletId,
    transfer_to_wallet_id:
      input.type === "TRANSFER" ? input.transferToWalletId || null : null,
    category_id: input.type === "TRANSFER" ? null : input.categoryId || null,
    budget_category_id:
      input.type === "EXPENSE" ? input.budgetCategoryId || null : null,
    budget_month: input.type === "TRANSFER" ? null : budgetMonth,
    type: input.type,
    amount: input.amount,
    description: input.description.trim(),
    transaction_date: new Date(`${input.transactionDate}T00:00:00`).toISOString(),
    budgetable_amount: input.type === "INCOME" ? input.amount : 0,
  });

  try {
    await applyWalletBalanceEffect(input);
  } catch (balanceError) {
    return {
      transactions: rows,
      warning:
        balanceError instanceof Error
          ? `Transaksi tersimpan, tetapi saldo wallet gagal diupdate: ${balanceError.message}`
          : "Transaksi tersimpan, tetapi saldo wallet gagal diupdate.",
    };
  }

  return { transactions: rows };
}
