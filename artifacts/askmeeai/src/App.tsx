import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// Public pages
import Landing from '@/pages/public/Landing';
import Login from '@/pages/public/Login';
import Register from '@/pages/public/Register';
import Pricing from '@/pages/public/Pricing';

// Protected pages
import Chat from '@/pages/protected/Chat';
import Profile from '@/pages/protected/Profile';

// Admin pages
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminPackages from '@/pages/admin/AdminPackages';
import AdminPaymentMethods from '@/pages/admin/AdminPaymentMethods';
import AdminTokenPricing from '@/pages/admin/AdminTokenPricing';
import AdminAiUsage from '@/pages/admin/AdminAiUsage';
import AdminRevenue from '@/pages/admin/AdminRevenue';
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs';
import AdminSettings from '@/pages/admin/AdminSettings';

// Layout wrappers for public pages
import { PublicLayout } from '@/components/layout/PublicLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  if (user.role !== 'ADMIN') return <Redirect to="/chat" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">
        <PublicLayout><Landing /></PublicLayout>
      </Route>
      <Route path="/login">
        <PublicLayout><Login /></PublicLayout>
      </Route>
      <Route path="/register">
        <PublicLayout><Register /></PublicLayout>
      </Route>
      <Route path="/pricing">
        <PublicLayout><Pricing /></PublicLayout>
      </Route>

      {/* Protected routes */}
      <Route path="/chat">
        <AuthGuard><Chat /></AuthGuard>
      </Route>
      <Route path="/chat/:id">
        <AuthGuard><Chat /></AuthGuard>
      </Route>
      <Route path="/profile">
        <AuthGuard><Profile /></AuthGuard>
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <AdminGuard><AdminOverview /></AdminGuard>
      </Route>
      <Route path="/admin/users">
        <AdminGuard><AdminUsers /></AdminGuard>
      </Route>
      <Route path="/admin/packages">
        <AdminGuard><AdminPackages /></AdminGuard>
      </Route>
      <Route path="/admin/token-pricing">
        <AdminGuard><AdminTokenPricing /></AdminGuard>
      </Route>
      <Route path="/admin/payments">
        <AdminGuard><AdminOrders /></AdminGuard>
      </Route>
      <Route path="/admin/payment-methods">
        <AdminGuard><AdminPaymentMethods /></AdminGuard>
      </Route>
      <Route path="/admin/ai-usage">
        <AdminGuard><AdminAiUsage /></AdminGuard>
      </Route>
      <Route path="/admin/revenue">
        <AdminGuard><AdminRevenue /></AdminGuard>
      </Route>
      <Route path="/admin/audit-logs">
        <AdminGuard><AdminAuditLogs /></AdminGuard>
      </Route>
      <Route path="/admin/settings">
        <AdminGuard><AdminSettings /></AdminGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
