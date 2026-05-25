import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { AppLockButton } from "@/components/AppLockButton";
import { TransactionsClient } from "@/components/TransactionsClient";
import { UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await requireUnlockedAppUser("/transactions");
  const [transactions, wallets, categories, budgetCategories] =
    await Promise.all([
      prisma.transaction.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          wallet: { select: { id: true, name: true } },
          transferToWallet: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          budgetCategory: { select: { id: true, name: true } },
        },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      prisma.wallet.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, isDefault: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      prisma.category.findMany({
        where: { isSelectable: true, isHidden: false },
        select: { id: true, name: true, type: true, group: true },
        orderBy: [{ type: "asc" }, { group: "asc" }, { name: "asc" }],
      }),
      prisma.budgetCategory.findMany({
        where: { userId: user.id, isHidden: false },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

  const transactionViews = transactions.map((transaction: (typeof transactions)[number]) => ({
    id: transaction.id,
    userId: transaction.userId,
    userName: transaction.user.name,
    userEmail: transaction.user.email,
    walletId: transaction.walletId,
    walletName: transaction.wallet.name,
    transferToWalletId: transaction.transferToWalletId,
    transferToWalletName: transaction.transferToWallet?.name || null,
    categoryId: transaction.categoryId,
    categoryName: transaction.category?.name || null,
    budgetCategoryId: transaction.budgetCategoryId,
    budgetCategoryName: transaction.budgetCategory?.name || null,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    transactionDate: transaction.transactionDate.toISOString(),
    canManage: user.role === UserRole.ADMIN || user.id === transaction.userId,
  }));

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-sm font-medium text-indigo-700">
              Back
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-zinc-950">
              Transactions
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <TransactionsClient
          initialTransactions={transactionViews}
          wallets={wallets}
          categories={categories}
          budgetCategories={budgetCategories}
        />
      </main>
    </div>
  );
}
