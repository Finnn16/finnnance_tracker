import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { AppLockButton } from "@/components/AppLockButton";
import { SavingsClient } from "@/components/SavingsClient";
import {
  calculateSavingsSummary,
  summarizeSavingsLedgers,
} from "@/lib/savings";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/prisma-enums";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export default async function SavingsPage() {
  const user = await requireUnlockedAppUser("/savings");
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(monthStart);

  const [wallets, categories, ledgers] = await measureServerOperation(
    "page /savings.data",
    () => Promise.all([
    prisma.wallet.findMany({
      include: { user: { select: { name: true } } },
      orderBy: [
        { user: { name: "asc" } },
        { isDefault: "desc" },
        { name: "asc" },
      ],
    }),
    prisma.category.findMany({
      where: {
        type: TransactionType.EXPENSE,
        isSelectable: true,
        isHidden: false,
      },
      select: { id: true, name: true, group: true },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    }),
    prisma.savingLedger.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    ]),
  );

  const summary = calculateSavingsSummary({
    ledgers,
    totalWalletBalance: wallets.reduce(
      (total, wallet) => total + wallet.currentBalance,
      0,
    ),
    monthStart,
    nextMonthStart,
  });

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-sm font-medium text-indigo-700">
              Back
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-zinc-950">Savings</h1>
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
        <SavingsClient
          summary={summary}
          history={summarizeSavingsLedgers(ledgers)}
          wallets={wallets.map((wallet) => ({
            id: wallet.id,
            name: wallet.name,
            ownerName: wallet.user.name,
          }))}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            group: category.group,
          }))}
        />
      </main>
    </div>
  );
}
