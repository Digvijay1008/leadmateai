'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error, success } = useAuth();
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await forgotPassword(email);
  };

  return (
    <div className="bg-background text-slate-900 dark:text-white min-h-screen flex flex-col relative overflow-hidden">
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="glass rounded-[2rem] p-10 shadow-2xl border border-white/50 dark:border-slate-800/50">
            <Link href="/login" className="inline-block mb-6 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined rounded-full border border-slate-200 dark:border-slate-700 p-2">arrow_back</span>
            </Link>
            <h1 className="text-3xl font-black font-headline mb-2 text-slate-900 dark:text-white tracking-tight">Forgot Password</h1>
            <p className="text-slate-500 text-sm mb-8 font-medium">No worries, we'll send you reset instructions.</p>
            
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold mb-6">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-semibold mb-6">{success}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-500 ml-1">Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-md">mail</span>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="agent@brokerage.com" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 mt-8 bg-primary hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
