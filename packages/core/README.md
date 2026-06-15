# @finnnance/core

Shared, platform-neutral business logic for Finnnance Tracker.

Use this package from the Next.js web app and the future React Native / Expo mobile app so finance rules stay in one place.

## What Belongs Here

This package is safe for mobile because it must not import:

- Next.js APIs
- React components or hooks
- Prisma client or generated Prisma types
- Clerk auth
- Node-only APIs
- Database queries
- Environment variables

Keep API routes, database writes, auth checks, cookies, and server-only orchestration in the app layer. Put calculation rules, payload validation, domain enums, labels, and presentation-safe config here.

## Install / Workspace Usage

From a workspace app in this monorepo, add the dependency:

```json
{
  "dependencies": {
    "@finnnance/core": "file:../../packages/core"
  }
}
```

For an Expo app under `apps/mobile`, import it like this:

```ts
import { formatRupiah, validateTransactionPayload } from "@finnnance/core";
```

You can also import by module when you want smaller, clearer imports:

```ts
import { validateTransactionPayload } from "@finnnance/core/transactions";
import { formatRupiah } from "@finnnance/core/money";
```

## Public Modules

### `@finnnance/core/domain-enums`

Domain enum constants and types. These mirror database enum values but do not depend on Prisma.

Exports:

- `UserRole`
- `WalletType`
- `TransactionType`
- `TransactionSource`
- `TransactionConfirmationStatus`
- `SavingLedgerType`
- `DebtType`
- `DebtStatus`

Example:

```ts
import { TransactionType, WalletType } from "@finnnance/core";

const transactionType = TransactionType.EXPENSE;
const walletType = WalletType.BANK;
```

### `@finnnance/core/money`

Money formatting and parsing helpers. All money values should stay as integer Rupiah.

Exports:

- `formatRupiah(amount)`
- `formatAmountInput(value)`
- `normalizeAmountInput(value)`
- `parseIntegerAmount(value)`

Example:

```ts
formatRupiah(125000); // "Rp125.000"
parseIntegerAmount("Rp 125.000"); // 125000
```

### `@finnnance/core/budget-calculations`

Pure budget and budget-period formulas.

Exports:

- `BUDGET_TIME_ZONE`
- `calculateBudgetableIncomeAmount(input)`
- `calculateBudgetPeriodSummary(input)`
- `calculateGlobalAllocationSummary(input)`
- `monthInputValue(date)`
- `toMonthStart(value)`
- `normalizeMonthStart(value)`
- `nextMonthStart(value)`
- `budgetMonthRange(value)`
- `isPrepaidTransaction(transactionDate, budgetMonth)`

Example:

```ts
const summary = calculateBudgetPeriodSummary({
  budgetableIncome: 8500000,
  totalBudget: 8000000,
  totalSpent: 2000000,
  unbudgetedSpent: 125000,
});
```

### `@finnnance/core/budgets`

Budget helpers plus budget payload validation.

Exports:

- All budget calculation exports above
- `validateBudgetPayload(body)`
- `BudgetPayload`

Use this in mobile forms before calling the API.

### `@finnnance/core/categories`

Category key generation and validation.

Exports:

- `createCategoryKey(name, type)`
- `createCategoryGroupKey(name, type)`
- `validateCategoryPayload(body)`
- `CategoryPayload`

### `@finnnance/core/budget-categories`

Budget category payload validation.

Exports:

- `validateBudgetCategoryPayload(body)`
- `BudgetCategoryPayload`

### `@finnnance/core/wallets`

Wallet labels, options, key generation, and payload validation.

Exports:

- `walletTypeOptions`
- `createWalletKey(name)`
- `getWalletTypeLabel(type)`
- `validateWalletPayload(body)`
- `WalletPayload`

Example:

```ts
const result = validateWalletPayload({
  name: "BCA",
  type: WalletType.BANK,
  initialBalance: "Rp 500.000",
  isDefault: true,
});
```

### `@finnnance/core/transactions`

Transaction labels, transfer fee config, and transaction payload validation.

Exports:

- `transactionTypeOptions`
- `transferFeeOptions`
- `getTransactionTypeLabel(type)`
- `validateTransactionPayload(body)`
- `TransactionPayload`
- `TransferFeeMethod`

Example:

```ts
const result = validateTransactionPayload({
  type: TransactionType.EXPENSE,
  amount: "Rp 75.000",
  walletId: "wallet_1",
  categoryId: "cat_food",
  budgetCategoryId: "budget_food",
  budgetMonth: "2026-06",
  transactionDate: "2026-06-05",
});
```

### `@finnnance/core/transaction-balance`

Pure wallet movement calculation for income, expense, and transfer. The web server adapter applies these movements to Prisma; mobile can use them for previews or offline state.

Exports:

- `calculateTransactionWalletMovements(effect, direction)`
- `TransactionBalanceEffect`
- `WalletBalanceMovement`

Example:

```ts
const movements = calculateTransactionWalletMovements(
  {
    type: TransactionType.TRANSFER,
    amount: 100000,
    walletId: "cash",
    transferToWalletId: "bca",
  },
  1,
);
```

### `@finnnance/core/savings`

Savings summary and history mappers.

Exports:

- `calculateSavingsSummary(input)`
- `summarizeSavingsLedgers(ledgers)`
- `monthRangeLabel(start, end)`
- `monthStartFromKey(value)`
- `startOfNextMonth(date)`
- `SavingsLedgerRow`
- `SavingsMonthlySummary`
- `SavingsHistoryItem`

### `@finnnance/core/debts`

Debt validation, debt status, wallet movement formulas, and debt view mapper.

Exports:

- `validateDebtPayload(body)`
- `validateDebtPaymentPayload(body)`
- `calculateDebtStatus(amount, paidAmount)`
- `calculateDebtWalletIncrement(type, amount)`
- `calculateDebtPaymentWalletIncrement(type, amount)`
- `toDebtView(debt)`
- `DebtPayload`
- `DebtPaymentPayload`
- `SafeToLendSummary`

Server-only note: `calculateSafeToLend` still lives in the web app because it queries wallets, savings ledgers, budgets, expenses, and budget month strict mode from the database.

### `@finnnance/core/display-text`

Reusable display text formatting.

Exports:

- `formatDisplayTitle(value, fallback)`

### `@finnnance/core/dashboard-simple-card-library`

Dashboard card metadata that can be reused by web and mobile to keep dashboard card names/descriptions consistent.

Exports:

- `dashboardSimpleCardGroups`
- `dashboardSimpleCardConfigs`
- `DashboardSimpleCardGroup`
- `DashboardSimpleCardConfig`

## Recommended Mobile Usage Pattern

Use core for local form validation and previews, then submit to the backend for persistence.

```ts
import { validateTransactionPayload } from "@finnnance/core/transactions";

async function submitTransaction(form: unknown) {
  const parsed = validateTransactionPayload(form);

  if (!parsed.ok) {
    return { ok: false, message: parsed.error };
  }

  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  return response.json();
}
```

## Server-Only Logic That Is Not Shared

These rules are intentionally not inside `@finnnance/core` because they need database/auth/server context:

- `lib/auth.ts`
- `lib/clerk-auth.ts`
- `lib/secure-api-user.ts`
- `lib/secure-app-user.ts`
- `lib/prisma.ts`
- `lib/prisma-transaction.ts`
- `lib/budgetable-income.ts`
- `lib/global-allocation.ts` database query orchestration
- `lib/dashboard.ts` database query orchestration
- API routes under `app/api`

If mobile needs the result of these workflows, call the API endpoint instead of importing server code.

## Development Checklist

When adding a new business rule:

1. Put pure calculation or validation in `packages/core/src`.
2. Export it from `packages/core/src/index.ts` and `packages/core/package.json` if it needs subpath import.
3. Keep the web `lib/*` file as a small adapter if server code is still needed.
4. Add or update tests that import from `packages/core/src/...`.
5. Run `npm run core:check` and the relevant app type-check/tests.
