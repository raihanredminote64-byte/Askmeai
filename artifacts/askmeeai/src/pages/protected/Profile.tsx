import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { useGetCreditBalance, useGetCreditHistory, useListOrders } from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Wallet, Package, Clock, History, LogOut, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: creditData } = useGetCreditBalance();
  const { data: creditHistory } = useGetCreditHistory({ limit: 10 });
  const { data: orders } = useListOrders();
  if (!user) return null;

  return (
    <ChatLayout>
      <div className="container mx-auto max-w-4xl p-4 py-8 md:p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Your Profile</h1>
          <Button variant="outline" className="border-white/10" onClick={() => { logout(); setLocation('/'); }}>
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* User Card */}
          <div className="rounded-2xl border border-white/5 bg-card/50 p-6 flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="mt-2 inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold transition-colors">
                {user.role}
              </div>
            </div>
          </div>

          {/* Credits Card */}
          <div className="rounded-2xl border border-white/5 bg-card/50 p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet size={18} className="text-primary" />
              <span>Available Credits</span>
            </div>
            <div className="text-4xl font-bold text-white mb-4">
               {(creditData?.credits ?? user.credits).toLocaleString('id-ID')}
            </div>
            <Button onClick={() => setLocation('/pricing')} className="w-full sm:w-auto self-start">
              Subscribe
            </Button>
          </div>
        </div>

        <Tabs defaultValue={location.includes('tab=orders') ? 'orders' : 'history'} className="w-full">
          <TabsList className="mb-6 bg-card/50 border border-white/5 w-full justify-start p-1 h-auto rounded-lg">
            <TabsTrigger value="history" className="rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white">
              <History size={16} className="mr-2" /> Credit History
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white">
              <Package size={16} className="mr-2" /> My Orders
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-0">
            <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
              {creditHistory?.items.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No credit history found.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {creditHistory?.items.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div>
                        <p className="font-medium text-white">{entry.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock size={12} />
                          {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                      <div className={`font-mono font-medium ${entry.amount > 0 ? 'text-primary' : 'text-white'}`}>
                        {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="orders" className="mt-0">
            <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
              {orders?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">You haven't placed any orders yet.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {orders?.map(order => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-white/[0.02] transition-colors">
                      <div>
                          <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{order.package?.name || 'Credit Package'}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                            ${order.status === 'PAID' ? 'bg-primary/20 text-primary' : 
                              order.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' : 
                              'bg-destructive/20 text-destructive'}`}>
                            {order.status === 'PAID' ? 'Top up berhasil' : order.status === 'PENDING' ? 'Sedang diproses' : 'Top up tidak berhasil'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                           {order.credits.toLocaleString('id-ID')} credits • Rp{order.amount.toLocaleString('id-ID')}
                        </p>
                         {order.status === 'PAID' && (
                           <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                             <CheckCircle2 size={13} /> Credits added to your balance
                           </p>
                         )}
                          {order.status === 'REJECTED' && (
                            <p className="mt-2 text-xs text-destructive">Top up tidak berhasil. Silakan buat order baru.</p>
                          )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock size={12} />
                          {format(new Date(order.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                       {order.status === 'PENDING' && (
                         <span className="text-xs text-muted-foreground">Menunggu pemeriksaan admin</span>
                       )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </ChatLayout>
  );
}
