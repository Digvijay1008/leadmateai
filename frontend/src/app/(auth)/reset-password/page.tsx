'use client';
import React, { useState, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const { resetPassword, loading, error, success } = useAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    await resetPassword(password, token);
  };

  return (
    <>
      <h1 className="text-3xl font-black font-headline mb-2 text-slate-900 dark:text-white tracking-tight">Set new password</h1>
      <p className="text-slate-500 text-sm mb-8 font-medium">Your new password must be different to previously used passwords.</p>
      
      {(error || localError) && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold mb-6">{localError || error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-semibold mb-6">{success}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-500 ml-1">New Password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-500 ml-1">Confirm Password</label>
          <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-4 mt-8 bg-primary hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50">
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-background text-slate-900 dark:text-white min-h-screen flex flex-col relative overflow-hidden">
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="glass rounded-[2rem] p-10 shadow-2xl border border-white/50 dark:border-slate-800/50">
            <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
