import { TransactionType } from "@/lib/prisma-enums";

type WalletBalanceClient = {
  wallet: {
    update: (args: {
      where: { id: string };
      data: { currentBalance: { increment: number } };
    }) => Promise<unknown>;
  };
};

export type TransactionBalanceEffect = {
  type: TransactionType;
  amount: number;
  walletId: string;
  transferToWalletId: string | null;
};

export async function applyTransactionBalanceEffect(
  tx: WalletBalanceClient,
  effect: TransactionBalanceEffect,
  direction: 1 | -1,
) {
  if (effect.type === TransactionType.INCOME) {
    await tx.wallet.update({
      where: { id: effect.walletId },
      data: { currentBalance: { increment: effect.amount * direction } },
    });
    return;
  }

  if (effect.type === TransactionType.EXPENSE) {
    await tx.wallet.update({
      where: { id: effect.walletId },
      data: { currentBalance: { increment: -effect.amount * direction } },
    });
    return;
  }

  await tx.wallet.update({
    where: { id: effect.walletId },
    data: { currentBalance: { increment: -effect.amount * direction } },
  });

  if (effect.transferToWalletId) {
    await tx.wallet.update({
      where: { id: effect.transferToWalletId },
      data: { currentBalance: { increment: effect.amount * direction } },
    });
  }
}
