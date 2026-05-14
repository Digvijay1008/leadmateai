import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center px-12 py-8 mt-auto">
      <div className="flex flex-col gap-2 mb-6 md:mb-0">
        <Link href="/" className="font-bold text-primary font-headline text-xl">LeadMate AI</Link>
        <span className="font-body text-xs text-slate-500">© 2024 LeadMate AI. The Digital Estate.</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <Link href="/about" className="font-body text-xs text-slate-400 hover:text-primary transition-all">About</Link>
        <Link href="/pricing" className="font-body text-xs text-slate-400 hover:text-primary transition-all">Pricing</Link>
        <Link href="/contact" className="font-body text-xs text-slate-400 hover:text-primary transition-all">Contact</Link>
        <span className="font-body text-xs text-slate-400">Privacy Policy</span>
        <span className="font-body text-xs text-slate-400">Terms of Service</span>
      </div>
    </footer>
  );
}
