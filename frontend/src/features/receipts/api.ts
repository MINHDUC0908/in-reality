import { apiClient, extractData } from '@/lib/api';
import type { Transaction } from '../transactions/types';
import type { ScanReceiptResponse, ConfirmReceiptDto, Receipt } from './types';

export const receiptApi = {
  async scanReceipt(
    imageUri: string,
    filename: string = 'receipt.jpg',
    mimeType: string = 'image/jpeg',
  ): Promise<ScanReceiptResponse> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await apiClient.post('/receipts/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // OCR/AI analysis may take a bit longer
    });

    return extractData<ScanReceiptResponse>(response);
  },

  async confirmReceipt(
    receiptId: string,
    dto: ConfirmReceiptDto,
  ): Promise<Transaction> {
    const response = await apiClient.post(`/receipts/${receiptId}/confirm`, dto);
    return extractData<Transaction>(response);
  },

  async getReceipt(id: string): Promise<Receipt> {
    const response = await apiClient.get(`/receipts/${id}`);
    return extractData<Receipt>(response);
  },

  async getReceipts(): Promise<Receipt[]> {
    const response = await apiClient.get('/receipts');
    return extractData<Receipt[]>(response);
  },

  async deleteReceipt(id: string): Promise<void> {
    await apiClient.delete(`/receipts/${id}`);
  },
};
