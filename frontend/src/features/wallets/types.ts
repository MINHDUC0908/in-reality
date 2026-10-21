export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletDto {
  name: string;
  balance?: number;
  currency?: string;
}

export interface UpdateWalletDto {
  name?: string;
  balance?: number;
  currency?: string;
}

export interface TransferWalletDto {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string;
  date?: string;
}

export interface TransferResponse {
  message: string;
  fromWallet: Wallet;
  toWallet: Wallet;
  expenseTransactionId: string;
  incomeTransactionId: string;
}
