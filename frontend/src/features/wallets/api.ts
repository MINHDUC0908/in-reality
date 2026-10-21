import { apiClient, extractData } from '@/lib/api';
import type { Wallet, CreateWalletDto, UpdateWalletDto, TransferWalletDto, TransferResponse } from './types';

export const walletApi = {
  async getWallets(): Promise<Wallet[]> {
    const response = await apiClient.get('/wallets');
    return extractData<Wallet[]>(response);
  },

  async getWallet(id: string): Promise<Wallet> {
    const response = await apiClient.get(`/wallets/${id}`);
    return extractData<Wallet>(response);
  },

  async createWallet(dto: CreateWalletDto): Promise<Wallet> {
    const response = await apiClient.post('/wallets', dto);
    return extractData<Wallet>(response);
  },

  async updateWallet(id: string, dto: UpdateWalletDto): Promise<Wallet> {
    const response = await apiClient.patch(`/wallets/${id}`, dto);
    return extractData<Wallet>(response);
  },

  async deleteWallet(id: string): Promise<void> {
    await apiClient.delete(`/wallets/${id}`);
  },

  async transferMoney(dto: TransferWalletDto): Promise<TransferResponse> {
    const response = await apiClient.post('/wallets/transfer', dto);
    return extractData<TransferResponse>(response);
  },
};
