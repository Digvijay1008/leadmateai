import Link from 'next/link';

export function PublicNavbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-8 py-4">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter text-primary font-headline">LeadMate</span>
        </Link>
        <div className="hidden md:flex gap-6">
          <Link href="/" className="font-body text-sm font-medium tracking-tight text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">Home</Link>
          <Link href="/pricing" className="font-body text-sm font-medium tracking-tight text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">Pricing</Link>
          <Link href="/about" className="font-body text-sm font-medium tracking-tight text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">About</Link>
          <Link href="/contact" className="font-body text-sm font-medium tracking-tight text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">Contact</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-slate-600 dark:text-slate-300 font-body text-sm font-bold hover:text-primary transition-colors">Log In</Link>
        <Link href="/signup" className="hidden sm:inline-flex bg-primary text-white px-6 py-2.5 rounded-full font-body text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all">Start Free Trial</Link>
        <Link href="/contact" className="hidden lg:inline-flex border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-6 py-2.5 rounded-full font-body text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Book Demo</Link>
      </div>
    </nav>
  );
}
