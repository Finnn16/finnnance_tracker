import { AppPageShell } from "@/components/AppPageShell";
import { DebtsClient } from "@/components/DebtsClient";
import { toDebtView } from "@/lib/debts";
import { prisma } from "@/lib/prisma";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const user = await requireUnlockedAppUser("/debts");
  const [wallets, debts] = await measureServerOperation("page /debts.data", () =>
    Promise.all([
      prisma.wallet.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, currentBalance: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      prisma.debt.findMany({
        where: { userId: user.id },
        include: {
          user: { select: { name: true, email: true } },
          wallet: { select: { name: true } },
          payments: {
            include: { wallet: { select: { name: true } } },
          },
        },
        orderBy: [{ status: "asc" }, { date: "desc" }, { createdAt: "desc" }],
      }),
    ]),
  );

  return (
    <AppPageShell title="Hutang Piutang" user={user}>
      <DebtsClient
        initialDebts={debts.map(toDebtView)}
        wallets={wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          currentBalance: wallet.currentBalance,
        }))}
      />
    </AppPageShell>
  );
}
