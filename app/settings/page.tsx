import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { AppLockButton } from "@/components/AppLockButton";
import { SettingsClient } from "@/components/SettingsClient";
import { UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUnlockedAppUser("/settings");
  const [users, categories, categoryGroups, budgetCategories] =
    await measureServerOperation("page /settings.data", () => Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { isSelectable: true },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: [
          { type: "asc" },
          { isHidden: "asc" },
          { group: "asc" },
          { name: "asc" },
        ],
      }),
      prisma.category.findMany({
        where: { isSelectable: false, level: -1 },
        select: { id: true, name: true, type: true, group: true },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      prisma.budgetCategory.findMany({
        where: user.role === UserRole.ADMIN ? undefined : { userId: user.id },
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { budgets: true, transactions: true } },
        },
        orderBy: [{ isHidden: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
    ]));

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
                Settings
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
            initialCategories={categories.map(
              (category: (typeof categories)[number]) => ({
                id: category.id,
                name: category.name,
                type: category.type,
                group: category.group,
                isHidden: category.isHidden,
                isFallback: category.isFallback,
                transactionCount: category._count.transactions,
              }),
            )}
            initialCategoryGroups={categoryGroups.map(
              (group: (typeof categoryGroups)[number]) => ({
                id: group.id,
                name: group.name,
                type: group.type,
                group: group.group,
              }),
            )}
            initialBudgets={[]}
            initialBudgetCategories={budgetCategories.map(
              (category: (typeof budgetCategories)[number]) => ({
                id: category.id,
                userId: category.userId,
                userName: category.user.name,
                userEmail: category.user.email,
                name: category.name,
                isHidden: category.isHidden,
                budgetCount: category._count.budgets,
                transactionCount: category._count.transactions,
              }),
            )}
            budgetableIncomeByPeriod={{} as Record<string, number>}
            unbudgetedSpentByPeriod={{} as Record<string, number>}
            fundingShortfallByUser={{} as Record<string, number>}
            users={users}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </main>
      </div>
    </div>
  );
}
