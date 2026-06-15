import { AppPageShell } from "@/components/AppPageShell";
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
  reconciliations: Array<{
    id: string;
    systemBalance: number;
    actualBalance: number;
    difference: number;
    reason: string;
    note: string | null;
    reconciledAt: Date;
  }>;
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
        reconciliations: {
          orderBy: { reconciledAt: "desc" },
          take: 5,
        },
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
    lastReconciledAt:
      wallet.reconciliations[0]?.reconciledAt.toISOString() || null,
    reconciliationHistory: wallet.reconciliations.map((item) => ({
      id: item.id,
      systemBalance: item.systemBalance,
      actualBalance: item.actualBalance,
      difference: item.difference,
      reason: item.reason,
      note: item.note,
      reconciledAt: item.reconciledAt.toISOString(),
    })),
  }));

  return (
    <AppPageShell title="Wallets" user={user}>
      <WalletsClient initialWallets={walletViews} />
    </AppPageShell>
  );
}
