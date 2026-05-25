import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { AppLockButton } from "@/components/AppLockButton";
import { SettingsClient } from "@/components/SettingsClient";
import { UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const user = await requireUnlockedAppUser("/budgets");
  const [users, budgetCategories, budgets] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.budgetCategory.findMany({
      where: user.role === UserRole.ADMIN ? undefined : { userId: user.id },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { budgets: true, transactions: true } },
      },
      orderBy: [{ isHidden: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.budget.findMany({
      where: user.role === UserRole.ADMIN ? undefined : { userId: user.id },
      include: {
        user: { select: { name: true, email: true } },
        budgetCategory: { select: { id: true, name: true, isHidden: true } },
      },
      orderBy: [{ month: "desc" }, { budgetCategory: { name: "asc" } }],
    }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 bg-white shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <Link href="/" className="text-sm font-medium text-indigo-700">
                Back
              </Link>
              <h1 className="mt-1 text-2xl font-bold text-zinc-950">
                Budgets
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-zinc-600 sm:inline">
                {user.name}
              </span>
              <AppLockButton />
              <UserButton />
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
          <SettingsClient
            view="budgets"
            initialCategories={[]}
            initialCategoryGroups={[]}
            initialBudgets={budgets.map((budget: (typeof budgets)[number]) => ({
              id: budget.id,
              userId: budget.userId,
              userName: budget.user.name,
              userEmail: budget.user.email,
              budgetCategoryId: budget.budgetCategoryId,
              budgetCategoryName: budget.budgetCategory?.name ?? "Unassigned",
              budgetCategoryHidden: budget.budgetCategory?.isHidden ?? false,
              month: budget.month.toISOString(),
              amount: budget.amount,
            }))}
            initialBudgetCategories={budgetCategories.map((category: (typeof budgetCategories)[number]) => ({
              id: category.id,
              userId: category.userId,
              userName: category.user.name,
              userEmail: category.user.email,
              name: category.name,
              isHidden: category.isHidden,
              budgetCount: category._count.budgets,
              transactionCount: category._count.transactions,
            }))}
            users={users}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </main>
      </div>
    </div>
  );
}
