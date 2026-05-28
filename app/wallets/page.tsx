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
    <AppPageShell title="Wallets" user={user}>
      <WalletsClient initialWallets={walletViews} />
    </AppPageShell>
  );
}
