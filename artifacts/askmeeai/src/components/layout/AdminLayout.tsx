import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { 
  Bot, Menu, X, Users, Settings, Activity,
  CreditCard, Package, LogOut, MessageSquare, FileText
} from 'lucide-react';

const ADMIN_NAV = [
  { name: 'Overview', href: '/admin', icon: Activity },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Packages', href: '/admin/packages', icon: Package },
  { name: 'Token Pricing', href: '/admin/token-pricing', icon: CreditCard },
  { name: 'Payments', href: '/admin/payments', icon: FileText },
  { name: 'Payment Methods', href: '/admin/payment-methods', icon: CreditCard },
  { name: 'AI Usage', href: '/admin/ai-usage', icon: MessageSquare },
  { name: 'Revenue', href: '/admin/revenue', icon: Activity },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!user) setLocation('/login');
    else if (user.role !== 'ADMIN') setLocation('/chat');
  }, [user, setLocation]);

  if (!user || user.role !== 'ADMIN') return null;

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
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 md:static md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/admin" onClick={closeSidebar} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot size={20} />
            </div>
            <span className="font-sans text-lg font-bold tracking-tight text-white">AskMeAI Admin</span>
          </Link>
          <button onClick={closeSidebar} className="md:hidden text-muted-foreground hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {ADMIN_NAV.map(item => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={closeSidebar} 
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="border-t border-border p-4 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-white truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
            <button onClick={logout} className="rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-destructive transition-colors" title="Logout">
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
          <span className="text-sm font-medium text-white">Admin Dashboard</span>
        </header>
        <main className="flex-1 relative overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
