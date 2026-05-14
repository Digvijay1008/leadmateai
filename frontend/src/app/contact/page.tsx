'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex-1 w-full grid md:grid-cols-2 gap-16 relative">
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        
        {/* Contact Info Side */}
        <div>
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white mb-6">
            Let's talk about your <span className="text-primary">pipeline.</span>
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed font-medium mb-12">
            Whether you need a custom enterprise integration or just want to see a live demo, our team is ready to help you close more deals.
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600">
                <span className="material-symbols-outlined">chat</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">WhatsApp Us</h3>
                <p className="text-sm text-slate-500 mb-2">Instant response from our team.</p>
                <a href="https://wa.me/15551234567" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Message +1 (555) 123-4567</a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-primary">
                <span className="material-symbols-outlined">mail</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Email Support</h3>
                <p className="text-sm text-slate-500 mb-2">We typically reply within 24 hours.</p>
                <a href="mailto:hello@leadmate.ai" className="font-bold text-primary hover:underline transition-colors">hello@leadmate.ai</a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined">location_city</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Headquarters</h3>
                <p className="text-sm text-slate-500">
                  100 Tech Hub Blvd<br/>
                  Suite 400<br/>
                  Austin, TX 78701
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Form Side */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-black font-headline mb-2 text-slate-900 dark:text-white tracking-tight">Book a Demo</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Fill out the form and we'll be in touch instantly.</p>
          
          {success ? (
            <div className="bg-emerald-50 text-emerald-700 p-8 rounded-2xl text-center">
              <span className="material-symbols-outlined text-4xl mb-4">check_circle</span>
              <h3 className="font-bold text-lg mb-2">Request Received!</h3>
              <p className="text-sm">Our team will reach out shortly to schedule your demo.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-500 ml-1">First Name</label>
                  <input type="text" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-500 ml-1">Last Name</label>
                  <input type="text" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-500 ml-1">Work Email</label>
                <input type="email" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-500 ml-1">Company</label>
                <input type="text" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-500 ml-1">Message</label>
                <textarea required rows={4} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none" placeholder="Tell us about your team size and use case..."></textarea>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 mt-4 bg-primary hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50">
                {loading ? 'Submitting...' : 'Request Demo'}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <PublicFooter />
    </main>
  );
}
