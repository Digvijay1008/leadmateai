'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const { signup, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    await signup({ 
      ownerName: formData.fullName,
      businessName: formData.companyName,
      email: formData.email, 
      password: formData.password,
      phone: formData.phone
    });
  };

  return (
    <div className="bg-background text-slate-900 dark:text-white min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full"></div>
      </div>
      <header className="absolute top-0 w-full p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-sm">real_estate_agent</span>
          </div>
          <span className="font-headline font-bold text-xl tracking-tight">LeadMate</span>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-6 py-24">
        <div className="w-full max-w-lg">
          <div className="glass rounded-[2rem] p-10 shadow-2xl border border-white/50 dark:border-slate-800/50">
            <h1 className="text-3xl font-black font-headline mb-2 tracking-tight">Create your account</h1>
            <p className="text-slate-500 text-sm mb-8 font-medium">Start accelerating your deals with AI.</p>
            
            {(error || localError) && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold mb-6 flex gap-2 items-center">
                 <span className="material-symbols-outlined text-sm">error</span>{localError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-500 ml-1">Full Name</label>
                  <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-500 ml-1">Company Name</label>
                  <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="Nexus Realty" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-500 ml-1">Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-md">mail</span>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="agent@brokerage.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-500 ml-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-md">call</span>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-500 ml-1">Password</label>
                  <input type="password" name="password" required minLength={8} value={formData.password} onChange={handleChange} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-500 ml-1">Confirm Password</label>
                  <input type="password" name="confirmPassword" required minLength={8} value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="••••••••" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 mt-8 bg-primary hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50">
                {loading ? 'Creating workspace...' : 'Create Workspace'}
              </button>
            </form>
            <p className="text-center mt-8 text-sm font-medium text-slate-500">
              Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
