import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { AppLockButton } from "@/components/AppLockButton";
import { WalletsClient } from "@/components/WalletsClient";
import { prisma } from "@/lib/prisma";
import { WalletType } from "@/lib/prisma-enums";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

type WalletRow = {
  id: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  currentBalance: number;
  isDefault: boolean;
  _count: {
    transactions: number;
    transferTransactions: number;
  };
};

export default async function WalletsPage() {
  const user = await requireUnlockedAppUser("/wallets");
  const wallets = await measureServerOperation("page /wallets.data", () =>
    prisma.wallet.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            transactions: true,
            transferTransactions: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  );

  const walletViews = wallets.map((wallet: WalletRow) => ({
    id: wallet.id,
    name: wallet.name,
    type: wallet.type,
    initialBalance: wallet.initialBalance,
    currentBalance: wallet.currentBalance,
    isDefault: wallet.isDefault,
    transactionCount:
      wallet._count.transactions + wallet._count.transferTransactions,
  }));

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-sm font-medium text-indigo-700">
              Back
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-zinc-950">Wallets</h1>
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
        <WalletsClient initialWallets={walletViews} />
      </main>
    </div>
  );
}
