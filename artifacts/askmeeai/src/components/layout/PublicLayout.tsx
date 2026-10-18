import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot size={20} />
            </div>
            <span className="font-sans text-xl font-bold tracking-tight text-white">AskMeAI</span>
          </Link>
          <nav className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link href={user.role === 'ADMIN' ? '/admin' : '/chat'} className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-white transition-colors hover:text-primary">
                    Log in
                  </Link>
                  <Link href="/register" className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-white text-black px-4 py-2 text-sm font-medium shadow transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <footer className="border-t border-white/5 bg-black/40 py-12 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} AskMeAI. Built with intention.</p>
        </div>
      </footer>
    </div>
  );
}
