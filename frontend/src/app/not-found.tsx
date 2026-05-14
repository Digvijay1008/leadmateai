import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 mt-16 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full -z-10"></div>
        <h1 className="font-headline text-[12rem] leading-none font-black text-slate-100 dark:text-slate-800 tracking-tighter select-none">
          404
        </h1>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-24">
          <h2 className="text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white mb-4 tracking-tight">
            Lost your way?
          </h2>
          <p className="text-slate-500 font-medium max-w-lg mx-auto mb-8">
            The page you're looking for doesn't exist or has been moved. Let's get you back to closing deals.
          </p>
          <Link 
            href="/" 
            className="bg-primary hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            Return to Homepage
          </Link>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
