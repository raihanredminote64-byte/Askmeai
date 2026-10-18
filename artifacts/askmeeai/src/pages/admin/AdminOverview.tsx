import { AdminLayout } from '@/components/layout/AdminLayout';
import { useGetAdminStats } from '@workspace/api-client-react';
import { Users, MessageSquare, Zap, CreditCard, Activity, Package } from 'lucide-react';

export default function AdminOverview() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers?.toLocaleString(), icon: Users },
    { label: 'Active Users', value: stats?.activeUsers?.toLocaleString(), icon: Activity },
    { label: 'Conversations', value: stats?.totalConversations?.toLocaleString(), icon: MessageSquare },
    { label: 'Pending Orders', value: stats?.pendingOrders?.toLocaleString(), icon: Package },
    { label: 'Credits Issued', value: stats?.totalCreditsIssued?.toLocaleString(), icon: Zap },
    { label: 'Credits Used', value: stats?.totalCreditsUsed?.toLocaleString(), icon: CreditCard },
  ];

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-muted-foreground mt-1">Platform statistics and performance</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-card/50 p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white">{stat.value || 0}</h3>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 rounded-2xl border border-white/5 bg-card/50 p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Activity size={18} className="text-primary" />
          <span className="font-medium text-white">Revenue</span>
        </div>
        <div className="text-4xl font-bold text-white">
          Rp{stats?.totalRevenue?.toLocaleString('id-ID') || 0}
        </div>
      </div>
    </AdminLayout>
  );
}
