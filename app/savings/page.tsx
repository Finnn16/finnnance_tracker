import { AppPageShell } from "@/components/AppPageShell";
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
    <AppPageShell title="Savings" user={user}>
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
    </AppPageShell>
  );
}
