import React from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex-1 w-full">
        {/* Header / Mission */}
        <section className="text-center mb-24 max-w-4xl mx-auto">
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900 dark:text-white mb-6">
            Building the <span className="text-primary">Digital Estate</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 leading-relaxed font-medium">
            Our mission is to arm real estate professionals with autonomous AI systems that handle the busywork, so agents can focus on building relationships and closing deals.
          </p>
        </section>

        {/* Story & Vision */}
        <section className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <div>
            <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-3">Our Story</span>
            <h2 className="text-3xl font-black font-headline mb-6 tracking-tight text-slate-900 dark:text-white">Born from the frustration of lost leads.</h2>
            <div className="space-y-4 text-slate-500 leading-relaxed">
              <p>
                In 2022, we analyzed over 50,000 real estate inquiries. We found that 68% of inbound leads were either missed entirely or received a follow-up too late. 
              </p>
              <p>
                LeadMate was built to solve this exact problem. By combining state-of-the-art conversational AI with deep real estate domain knowledge, we created virtual agents capable of qualifying instantly, 24/7.
              </p>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl h-80 flex items-center justify-center p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
             <p className="z-10 text-xl font-bold italic text-slate-400 text-center">"Every missed call is a missed commission."</p>
          </div>
        </section>

        {/* Why LeadMate */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black font-headline tracking-tight text-slate-900 dark:text-white">Why LeadMate?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="material-symbols-outlined text-4xl text-emerald-500 mb-6">bolt</span>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white font-headline">Speed to Lead</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Agent connection under 3 seconds ensures the prospect is always engaged when interest is highest.</p>
            </div>
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="material-symbols-outlined text-4xl text-primary mb-6">forum</span>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white font-headline">Contextual Awareness</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Our AI models are trained exclusively on real estate data, understanding property specs and market nuances.</p>
            </div>
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="material-symbols-outlined text-4xl text-indigo-500 mb-6">handshake</span>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white font-headline">Built for Agents</h3>
              <p className="text-slate-500 text-sm leading-relaxed">We don't replace agents; we augment them. We handle the funnel so you can handle the handshake.</p>
            </div>
          </div>
        </section>

        {/* Team Placeholder */}
        <section className="text-center mb-32">
          <h2 className="text-3xl font-black font-headline tracking-tight text-slate-900 dark:text-white mb-12">Meet the Leadership</h2>
          <div className="grid md:grid-cols-4 gap-8">
             {[1, 2, 3, 4].map(idx => (
               <div key={idx} className="flex flex-col items-center">
                 <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-800 mb-4 border-4 border-white dark:border-slate-900 shadow-lg"></div>
                 <h4 className="font-bold text-slate-900 dark:text-white">Founder {idx}</h4>
                 <span className="text-xs text-primary font-bold tracking-widest uppercase mt-1">Founding Team</span>
               </div>
             ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="bg-primary rounded-[3rem] p-16 text-center text-white relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[150%] bg-white/10 blur-[100px] rounded-full rotate-45 transform pointer-events-none"></div>
          <h2 className="text-4xl font-extrabold font-headline tracking-tighter mb-6 relative z-10">Join the waitlist or chat with us.</h2>
          <p className="text-primary-foreground/80 mb-10 max-w-xl mx-auto relative z-10">We're always looking for innovative brokerages to partner with and shape the future of real estate tech.</p>
          <div className="flex justify-center gap-4 relative z-10">
            <Link href="/contact" className="bg-white text-primary px-8 py-4 rounded-full font-bold shadow-lg hover:bg-slate-50 transition-colors">Get in Touch</Link>
            <Link href="/signup" className="border border-white/30 hover:bg-white/10 text-white px-8 py-4 rounded-full font-bold transition-colors backdrop-blur-sm">Start Trial</Link>
          </div>
        </section>
      </div>
      
      <PublicFooter />
    </main>
  );
}
