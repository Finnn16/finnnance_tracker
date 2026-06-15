import { TransactionType, type TransactionType as TransactionTypeValue } from "./domain-enums";

export type TransactionBalanceEffect = {
  type: TransactionTypeValue;
  amount: number;
  walletId: string;
  transferToWalletId: string | null;
};

export type WalletBalanceMovement = {
  walletId: string;
  increment: number;
};

export function calculateTransactionWalletMovements(
  effect: TransactionBalanceEffect,
  direction: 1 | -1,
): WalletBalanceMovement[] {
  if (effect.type === TransactionType.INCOME) {
    return [
      { walletId: effect.walletId, increment: effect.amount * direction },
    ];
  }

  if (effect.type === TransactionType.EXPENSE) {
    return [
      { walletId: effect.walletId, increment: -effect.amount * direction },
    ];
  }

  const movements: WalletBalanceMovement[] = [
    { walletId: effect.walletId, increment: -effect.amount * direction },
  ];

  if (effect.transferToWalletId) {
    movements.push({
      walletId: effect.transferToWalletId,
      increment: effect.amount * direction,
    });
  }

  return movements;
}
