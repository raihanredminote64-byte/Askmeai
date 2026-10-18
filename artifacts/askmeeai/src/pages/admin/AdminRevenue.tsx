import { AdminLayout } from '@/components/layout/AdminLayout';
import { useGetAdminRevenue } from '@workspace/api-client-react';
import { TrendingUp, DollarSign, Zap, Activity, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GetAdminRevenuePeriod } from '@workspace/api-client-react';

export default function AdminRevenue() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading } = useGetAdminRevenue({ period: period as GetAdminRevenuePeriod });

  const cards = data ? [
    { label: 'Total Revenue (IDR)', value: `Rp${Number(data.totalRevenue ?? 0).toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Credits Sold', value: Number(data.creditsSold ?? 0).toLocaleString(), icon: Zap, color: 'text-primary' },
    { label: 'Credits Used', value: Number(data.creditsUsed ?? 0).toLocaleString(), icon: Activity, color: 'text-yellow-400' },
    { label: 'Total AI Requests', value: Number(data.totalRequests ?? 0).toLocaleString(), icon: TrendingUp, color: 'text-blue-400' },
    { label: 'Input Tokens', value: Number(data.inputTokens ?? 0).toLocaleString(), icon: Activity, color: 'text-muted-foreground' },
    { label: 'Output Tokens', value: Number(data.outputTokens ?? 0).toLocaleString(), icon: Activity, color: 'text-muted-foreground' },
  ] : [];

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue</h1>
          <p className="text-muted-foreground mt-1">Financial overview and token economics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 bg-black/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-white/5 bg-card/50 p-6 flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ${color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {data && (
            <div className="rounded-2xl border border-white/5 bg-card/50 p-6">
              <h3 className="font-semibold text-white mb-4">Cost Estimates (USD)</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Revenue</p>
                  <p className="text-lg font-bold text-white">${Number(data.estimatedRevenue ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated API Cost</p>
                  <p className="text-lg font-bold text-white">${Number(data.estimatedCost ?? 0).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className="text-lg font-bold text-emerald-400">{Number(data.estimatedMargin ?? 0).toFixed(1)}%</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">* Estimates based on approximate IDR/USD exchange rate and standard API pricing.</p>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
