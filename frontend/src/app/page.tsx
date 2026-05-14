import React from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function Homepage() {
  return (
    <main className="min-h-screen bg-background flex flex-col font-body">
      <PublicNavbar />
      
      {/* 1. Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto w-full text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-primary/10 blur-[120px] rounded-full -z-10"></div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 mb-8 tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          LeadMate AI Agents are Live
        </div>
        <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter text-slate-900 dark:text-white mb-6 leading-[1.1]">
          Never miss another <br/> <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500">real estate lead.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 font-medium">
          Deploy autonomous voice and text agents that answer inquiries, qualify leads, and book meetings 24/7.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/signup" className="w-full sm:w-auto bg-primary hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-primary/20 transition-all text-lg">Start Free Trial</Link>
          <Link href="/contact" className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-4 rounded-full font-bold transition-all text-lg flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">calendar_month</span> Book Demo
          </Link>
        </div>
      </section>

      {/* 2. AI Voice Demo Preview Card */}
      <section className="px-6 max-w-5xl mx-auto w-full mb-32 -mt-10 realtive z-10">
         <div className="glass rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white/50 dark:border-slate-800/50 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-emerald-400 p-1 shrink-0 relative animate-pulse-slow">
               <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary">record_voice_over</span>
               </div>
            </div>
            <div className="flex-1 text-center md:text-left">
               <h3 className="text-2xl font-black font-headline text-slate-900 dark:text-white mb-2 tracking-tight">Hear it in action</h3>
               <p className="text-slate-500 text-sm mb-4">Listen to how our AI agent handles a complex pricing inquiry naturally.</p>
               <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 rounded-full py-3 px-6 w-full max-w-md mx-auto md:mx-0">
                  <button className="text-primary hover:scale-110 transition-transform"><span className="material-symbols-outlined text-3xl">play_circle</span></button>
                  <div className="flex-1 h-2 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                     <div className="w-1/3 h-full bg-primary relative"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow border border-slate-200"></div></div>
                  </div>
                  <span className="text-xs font-bold text-slate-500">0:12 / 0:45</span>
               </div>
            </div>
         </div>
      </section>

      {/* 3. Workflow Section */}
      <section className="px-6 max-w-7xl mx-auto w-full mb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">How it works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Connect Sources', desc: 'Plug in Zillow, Realtor.com, WhatsApp, or your website instantly.' },
            { step: '02', title: 'Agent Engages', desc: 'LeadMate calls or texts the prospect within 3 seconds of inquiry.' },
            { step: '03', title: 'You Close', desc: 'Qualified appointments appear directly on your calendar.' }
          ].map((w, i) => (
             <div key={i} className="relative p-8 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-6xl font-black font-headline text-slate-100 dark:text-slate-800 absolute top-4 right-6 pointer-events-none">{w.step}</span>
                <h3 className="text-xl font-bold font-headline text-slate-900 dark:text-white mb-3 relative z-10 mt-8">{w.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed relative z-10">{w.desc}</p>
             </div>
          ))}
        </div>
      </section>

      {/* 4. Feature Cards */}
      <section className="px-6 max-w-7xl mx-auto w-full mb-32">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="col-span-full md:col-span-2 lg:col-span-2 bg-slate-50 dark:bg-slate-800 rounded-3xl p-10 border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">integration_instructions</span>
              <h3 className="text-2xl font-bold font-headline mb-4">Deep Integrations</h3>
              <p className="text-slate-600 dark:text-slate-400">Push qualified leads directly into FollowUp Boss, Salesforce, or HubSpot without writing a single line of code.</p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-10 border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-4xl text-emerald-500 mb-6">translate</span>
              <h3 className="text-xl font-bold font-headline mb-4">Multilingual</h3>
              <p className="text-slate-600 dark:text-slate-400">Agents that speak English, Spanish, French, and Mandarin.</p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-10 border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-4xl text-indigo-500 mb-6">analytics</span>
              <h3 className="text-xl font-bold font-headline mb-4">Smart Analytics</h3>
              <p className="text-slate-600 dark:text-slate-400">Track conversion rates and ROI on every campaign instantly.</p>
           </div>
        </div>
      </section>

      {/* 5. Testimonials */}
      <section className="px-6 max-w-7xl mx-auto w-full mb-32">
        <h2 className="text-3xl font-black font-headline text-center mb-16 tracking-tight">Trusted by top producers</h2>
        <div className="grid md:grid-cols-3 gap-8">
           {[1, 2, 3].map(i => (
             <div key={i} className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <span className="text-4xl text-primary opacity-20 font-serif absolute top-6 left-6">"</span>
                <p className="text-slate-600 dark:text-slate-300 italic mb-6 relative z-10 pt-4">LeadMate has effectively cloned my top inside sales agent. We saw a 300% increase in contact rates within the first week.</p>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                   <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sarah Jenkins</h4>
                      <p className="text-xs text-slate-500">Brokerage Owner</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="px-6 max-w-3xl mx-auto w-full mb-32">
         <h2 className="text-3xl font-black font-headline text-center mb-12 tracking-tight">Frequently Asked Questions</h2>
         <div className="space-y-4">
            {[
              { q: 'Can I use my own voice?', a: 'Yes. Enterprise plans include voice cloning capabilities so the AI sounds exactly like you or your designated spokesperson.' },
              { q: 'How does it handle complex questions?', a: 'If a prospect asks something outside the Knowledge Base, LeadMate gracefully defers and transfers the call to a live agent immediately.' },
              { q: 'Is it compliant with telemarketing laws?', a: 'Yes. LeadMate enforces DNC checks, timezone restrictions, and requires opt-in consent for outbound capabilities.' },
            ].map((faq, i) => (
              <details key={i} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                 <summary className="flex justify-between items-center font-bold font-headline cursor-pointer list-none p-6 text-slate-900 dark:text-white">
                    {faq.q}
                    <span className="transition group-open:rotate-180 material-symbols-outlined text-slate-400">expand_more</span>
                 </summary>
                 <div className="text-slate-600 dark:text-slate-400 p-6 pt-0 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800/50 mt-2">
                    {faq.a}
                 </div>
              </details>
            ))}
         </div>
      </section>

      {/* 7. Bottom CTA */}
      <section className="px-6 max-w-5xl mx-auto w-full mb-32">
         <div className="bg-slate-900 dark:bg-slate-800 rounded-[3rem] p-16 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/30 to-transparent pointer-events-none"></div>
            <h2 className="text-4xl font-extrabold font-headline tracking-tighter mb-6 relative z-10">Stop losing leads to response time.</h2>
            <p className="text-slate-300 mb-10 max-w-xl mx-auto relative z-10">Get started today and deploy your first AI agent in under 10 minutes.</p>
            <div className="flex justify-center flex-col sm:flex-row gap-4 relative z-10">
               <Link href="/signup" className="bg-primary hover:bg-indigo-600 px-8 py-4 rounded-full font-bold shadow-lg transition-colors text-white">Start 14-Day Free Trial</Link>
               <span className="text-xs text-slate-400 flex items-center justify-center mt-2 sm:mt-0 font-medium">No credit card required</span>
            </div>
         </div>
      </section>

      <PublicFooter />
    </main>
  );
}
