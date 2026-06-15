import {
  calculateTransactionWalletMovements,
} from "@finnnance/core";

export type {
  TransactionBalanceEffect,
  WalletBalanceMovement,
} from "@finnnance/core";

type WalletBalanceClient = {
  wallet: {
    update: (args: {
      where: { id: string };
      data: { currentBalance: { increment: number } };
    }) => Promise<unknown>;
  };
};

export async function applyTransactionBalanceEffect(
  tx: WalletBalanceClient,
  effect: import("@finnnance/core").TransactionBalanceEffect,
  direction: 1 | -1,
) {
  const movements = calculateTransactionWalletMovements(effect, direction);

  for (const movement of movements) {
    await tx.wallet.update({
      where: { id: movement.walletId },
      data: { currentBalance: { increment: movement.increment } },
    });
  }
}
