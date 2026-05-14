'use client';

import React, { useEffect, useState } from 'react';
import { billingApi, WalletBalanceResponse, TransactionResponse } from '@/services/billing.api';

export default function BillingPage() {
  const [balance, setBalance] = useState<WalletBalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState<number>(50);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balRes, txRes] = await Promise.all([
        billingApi.getBalance(),
        billingApi.getTransactions(1, 50)
      ]);
      setBalance(balRes);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error('Failed to load billing data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmount <= 0) return;
    
    try {
      setProcessing(true);
      const res = await billingApi.topup(topupAmount);
      alert(`Payment Gateway Link Simulated!\nAmount: ${res.requested_amount} ${res.currency}\nStatus: ${res.status}`);
      // In a real flow, redirect to Stripe/Razorpay checkout here
    } catch (err) {
      console.error('Topup failed', err);
      alert('Failed to initiate topup.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      <header className="shrink-0">
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Billing & Usage</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Manage your wallet balance, top-ups, and transaction history.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent dark:from-primary/5 pointer-events-none rounded-bl-full" />
          
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Available Balance</h3>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-black font-headline text-slate-900 dark:text-white tracking-tighter">
                ${balance?.balance?.toFixed(2) || '0.00'}
              </span>
              <span className="text-lg font-bold text-slate-400 mb-1">{balance?.currency || 'USD'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 w-fit px-3 py-1.5 rounded-lg mb-8">
              <span className="material-symbols-outlined text-base">timer</span>
              ~{balance?.available_minutes || 0} minutes of AI voice remaining
            </div>

            <form onSubmit={handleTopup} className="flex gap-3 mt-auto">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  min="10" 
                  step="10"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-headline"
                />
              </div>
              <button 
                type="submit"
                disabled={processing}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-sm shadow-primary/25 whitespace-nowrap"
              >
                {processing ? 'Processing...' : 'Add Funds'}
              </button>
            </form>
          </div>
        </div>
        
        <div className="bg-slate-900 dark:bg-black border border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col items-start justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-6">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <h3 className="text-xl font-bold font-headline text-white mb-3">Pay As You Go</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Leadmate uses a prepaid wallet system. You are only charged for exact talk-time down to the second. SIP telephony costs and AI agent processing are bundled seamlessly.
          </p>
          <div className="space-y-3 w-full">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Outbound Dialing</span>
              <span className="text-white font-bold">$0.12 / min</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Inbound Reception</span>
              <span className="text-white font-bold">$0.10 / min</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Volume Discount (&gt;5k mins)</span>
              <span className="text-emerald-400 font-bold">15% Off</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden mt-2">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <span className="material-symbols-outlined text-3xl">receipt_long</span>
            </div>
            <p className="text-slate-500 font-medium text-sm">No transactions found.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Description</th>
                  <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                        tx.type === 'topup' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        tx.type === 'usage_deduction' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        tx.type === 'hold_created' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {tx.description || (tx.type === 'topup' ? 'Wallet recharge' : 'Call usage charge')}
                    </td>
                    <td className={`px-5 py-4 text-right font-bold tabular-nums ${
                      tx.type === 'topup' || tx.type === 'hold_released' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {tx.type === 'topup' || tx.type === 'hold_released' ? '+' : '-'}
                      ${Math.abs(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
