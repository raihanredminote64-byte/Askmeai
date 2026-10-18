import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { 
  Bot, Menu, Plus, MessageSquare, Search,
  LogOut, User as UserIcon, X, Wallet, Sparkles, ArrowUpRight
} from 'lucide-react';
import { useListConversations, useGetCreditBalance } from '@workspace/api-client-react';

export function ChatLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) setLocation('/login');
  }, [user, setLocation]);

  const { data: conversations } = useListConversations(
    { search: search || undefined },
    { query: { enabled: !!user, queryKey: ['conversations', search] } }
  );

  const { data: creditData } = useGetCreditBalance({
    query: { enabled: !!user, queryKey: ['creditBalance'] }
  });

  if (!user) return null;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-300 md:static md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4">
          <Link href="/chat" onClick={closeSidebar} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot size={20} />
            </div>
            <span className="font-sans text-xl font-bold tracking-tight text-white">AskMeAI</span>
          </Link>
          <button onClick={closeSidebar} className="md:hidden text-muted-foreground hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <Link href="/chat" onClick={closeSidebar} className="flex w-full items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 border border-white/10">
            <Plus size={16} />
            New Chat
          </Link>
        </div>

        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/50 py-2 pl-9 pr-3 text-sm text-white placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-1">
            {conversations?.map(conv => (
              <Link key={conv.id} href={`/chat/${conv.id}`} onClick={closeSidebar} className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/5 ${location === `/chat/${conv.id}` ? 'bg-white/10 text-white' : 'text-muted-foreground'}`}>
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate">{conv.title || 'New Conversation'}</span>
              </Link>
            ))}
            {conversations?.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground text-center">No conversations found.</p>
            )}
          </div>
        </div>

        <div className="border-t border-border p-4 space-y-4 bg-black/20">
          <Link
            href="/pricing"
            onClick={closeSidebar}
            className="group block rounded-xl border border-primary/25 bg-primary/10 p-3 transition-colors hover:bg-primary/15"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles size={15} className="text-primary" />
                Need more credits?
              </div>
              <ArrowUpRight size={15} className="text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Subscribe and pay securely with QRIS.</p>
          </Link>

          <div className="flex items-center justify-between rounded-lg bg-white/5 p-3 border border-white/5">
            <div className="flex items-center gap-2 text-sm">
              <Wallet size={16} className="text-primary" />
              <span className="text-muted-foreground">Credits</span>
            </div>
            <span className="font-mono font-medium text-white">
              {creditData?.credits?.toLocaleString('id-ID') ?? user.credits?.toLocaleString('id-ID')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/profile" className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white">
              <UserIcon size={16} />
              <span className="truncate">{user.name}</span>
            </Link>
            <button onClick={logout} className="rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-destructive transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-white">
            <Menu size={24} />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot size={18} />
          </div>
        </header>
        <main className="flex-1 relative overflow-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
