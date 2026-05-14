import { fetchApi } from '@/lib/api-client';

export interface WalletBalanceResponse {
  balance: number;
  currency: string;
  available_minutes: number;
}

export interface TransactionResponse {
  id: string;
  type: 'topup' | 'usage_deduction' | 'hold_created' | 'hold_settled' | 'hold_released';
  amount: number;
  status: string;
  created_at: string;
  reference_id?: string;
  description?: string;
}

export const billingApi = {
  getBalance: async (): Promise<WalletBalanceResponse> => {
    return await fetchApi('/v1/wallet/balance');
  },

  getTransactions: async (page = 1, limit = 50): Promise<{ transactions: TransactionResponse[]; total: number }> => {
    return await fetchApi(`/v1/wallet/transactions?page=${page}&limit=${limit}`);
  },

  topup: async (amount: number): Promise<any> => {
    return await fetchApi('/v1/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }
};
