import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex-1 w-full">
        {/* Hero Section */}
        <header className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900 dark:text-white mb-6">
            Predictable Growth for <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Modern Real Estate</span>
          </h1>
          <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
            Simple, transparent pricing designed to scale with your portfolio. Start closing more deals with AI-driven lead intelligence.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mb-20">
            <span className="text-sm font-bold text-slate-500">Monthly</span>
            <button className="relative w-14 h-8 bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors hover:bg-slate-300 dark:hover:bg-slate-600">
              <div className="w-6 h-6 bg-primary rounded-full shadow-sm translate-x-6"></div>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Annual</span>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Save 20%</span>
            </div>
          </div>
        </header>

        {/* Pricing Bento Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-32 max-w-6xl mx-auto">
          {/* Starter Plan */}
          <div className="bg-white dark:bg-slate-900 p-10 flex flex-col border border-slate-200 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all">
            <div className="mb-8">
              <h3 className="font-headline text-2xl font-black text-slate-900 dark:text-white mb-2">Starter</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium">Perfect for individual agents.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">$49</span>
                <span className="text-slate-500 font-bold mb-1">/mo</span>
              </div>
            </div>
            <div className="space-y-4 mb-10 flex-grow font-medium">
              {['1,000 AI voice minutes', '1 Virtual Agent', 'Basic Knowledge Base', '2 CRM Seats'].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/signup" className="w-full py-4 text-center rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Start Free Trial</Link>
          </div>

          {/* Growth Plan (Most Popular) */}
          <div className="bg-white dark:bg-slate-900 flex flex-col border-2 border-primary rounded-[2.5rem] shadow-2xl scale-105 z-10 relative overflow-hidden">
            <div className="bg-primary text-white text-xs font-bold text-center py-2 uppercase tracking-widest">Most Popular</div>
            <div className="p-10 flex flex-col h-full bg-slate-50 dark:bg-slate-800/50">
              <div className="mb-8">
                <h3 className="font-headline text-2xl font-black text-slate-900 dark:text-white mb-2">Growth</h3>
                <p className="text-slate-500 text-sm mb-6 font-medium">Optimized for high-performance teams.</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">$149</span>
                  <span className="text-slate-500 font-bold mb-1">/mo</span>
                </div>
              </div>
              <div className="space-y-4 mb-10 flex-grow font-bold">
                {['5,000 AI voice minutes', '5 Virtual Agents', 'Unlimited Knowledge Base', '10 CRM Seats', 'Full API Access'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-500 text-xl">check_circle</span>
                    <span className="text-sm text-slate-900 dark:text-white">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className="w-full py-4 text-center rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Start Free Trial</Link>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white dark:bg-slate-900 p-10 flex flex-col border border-slate-200 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all">
            <div className="mb-8">
              <h3 className="font-headline text-2xl font-black text-slate-900 dark:text-white mb-2">Enterprise</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium">Bespoke solutions for brokerages.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">Custom</span>
              </div>
            </div>
            <div className="space-y-4 mb-10 flex-grow font-medium">
              {['Unlimited voice minutes', 'Unlimited Virtual Agents', 'White-label options', 'Custom Integrations', 'Dedicated Success Manager'].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/contact" className="w-full py-4 text-center rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Contact Sales</Link>
          </div>
        </div>

        {/* Compare Features Table */}
        <section className="mb-32 max-w-5xl mx-auto overflow-hidden">
          <h2 className="font-headline text-3xl font-extrabold text-slate-900 dark:text-white mb-12 text-center tracking-tight">Compare all features</h2>
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-6 font-bold text-slate-500 text-xs tracking-widest uppercase">Feature</th>
                  <th className="p-6 font-bold text-slate-900 dark:text-white text-base">Starter</th>
                  <th className="p-6 font-bold text-slate-900 dark:text-white text-base">Growth</th>
                  <th className="p-6 font-bold text-slate-900 dark:text-white text-base">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {[
                   ['Concurrent Calls', '1', '10', 'Unlimited'],
                   ['Voice Cloning', '-', 'Standard', 'Premium'],
                   ['CRM Integrations', 'Basic', 'Advanced', 'Custom'],
                   ['Analytics', 'Dashboard', 'Custom Reports', 'Data Export'],
                   ['Multi-language', '-', '✓', '✓']
                 ].map((row, i) => (
                   <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                     <td className="p-6 font-bold text-slate-700 dark:text-slate-300">{row[0]}</td>
                     <td className="p-6 text-slate-500 font-medium">{row[1] === '✓' ? <span className="material-symbols-outlined text-emerald-500">check</span> : row[1]}</td>
                     <td className="p-6 text-slate-500 font-medium">{row[2] === '✓' ? <span className="material-symbols-outlined text-emerald-500">check</span> : row[2]}</td>
                     <td className="p-6 text-slate-500 font-medium">{row[3] === '✓' ? <span className="material-symbols-outlined text-emerald-500">check</span> : row[3]}</td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-32 max-w-3xl mx-auto">
          <h2 className="font-headline text-3xl font-extrabold text-slate-900 dark:text-white mb-12 text-center tracking-tight">Got questions?</h2>
          <div className="space-y-4">
            {[
              {q: 'Can I change my plan later?', a: 'Absolutely. You can upgrade or downgrade your plan at any time. Prorated charges will be applied automatically.'},
              {q: 'What happens if I run out of minutes?', a: 'If you exceed your monthly allowance, additional minutes are billed at $0.05/min. We\'ll notify you when you reach 80% usage.'},
              {q: 'Do you offer a free trial?', a: 'Yes! Our Growth plan comes with a 14-day free trial containing 500 complimentary voice minutes.'}
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

        {/* Bottom CTA */}
        <section className="bg-primary rounded-[3rem] p-16 text-center text-white relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[150%] bg-white/10 blur-[100px] rounded-full rotate-45 transform pointer-events-none"></div>
          <h2 className="text-4xl font-extrabold font-headline tracking-tighter mb-6 relative z-10">Start automating your leads today.</h2>
          <div className="flex justify-center gap-4 relative z-10 mt-10">
            <Link href="/signup" className="bg-white text-primary px-8 py-4 rounded-full font-bold shadow-lg hover:bg-slate-50 transition-colors">Start 14-Day Free Trial</Link>
            <Link href="/contact" className="border border-white/30 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-colors backdrop-blur-sm">Contact Sales</Link>
          </div>
        </section>

      </div>
      <PublicFooter />
    </main>
  );
}
