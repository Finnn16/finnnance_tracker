import { AppPageShell } from "@/components/AppPageShell";
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
    <AppPageShell title="Settings" user={user} fill>
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
    </AppPageShell>
  );
}
