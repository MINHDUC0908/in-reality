import type { Transaction } from '../transactions/types';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface ScanReceiptResponse {
  receiptId: string;
  imageUrl: string;
  merchantName: string | null;
  amount: number | null;
  transactionDate: string | null;
  items?: ReceiptItem[];
  suggestedCategory: { id: string; name: string } | null;
  confidenceScore: number;
  source: string;
}

export interface ConfirmReceiptDto {
  walletId: string;
  categoryId?: string;
  amount?: number;
  transactionDate?: string;
  description?: string;
}

export interface Receipt {
  id: string;
  userId: string;
  imageUrl: string;
  rawOcrJson?: any;
  ocrStatus: 'pending' | 'done' | 'confirmed' | 'failed';
  ocrConfidence?: number | null;
  errorMessage?: string | null;
  transactionId?: string | null;
  createdAt: string;
}
