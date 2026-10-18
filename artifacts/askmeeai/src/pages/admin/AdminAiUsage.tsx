import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListAiUsage } from '@workspace/api-client-react';
import { Loader2, Cpu } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAiUsage() {
  const { data, isLoading } = useListAiUsage({});

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Usage</h1>
        <p className="text-muted-foreground mt-1">Token consumption and credit costs</p>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Requests', value: data.total?.toLocaleString() },
            { label: 'Input Tokens', value: Number(data.totalInputTokens ?? 0).toLocaleString() },
            { label: 'Output Tokens', value: Number(data.totalOutputTokens ?? 0).toLocaleString() },
            { label: 'Total Credits Used', value: Number(data.totalCost ?? 0).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-card/50 p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cpu size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Input Tokens</th>
                <th className="px-4 py-3 font-medium">Output Tokens</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr>
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No AI usage recorded yet.</td></tr>
              ) : data?.items.map(item => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white">{item.userName || 'Unknown'}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.model}</td>
                  <td className="px-4 py-3 font-mono">{Number(item.inputTokens).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{Number(item.outputTokens).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-primary">{Number(item.totalCost).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM d, HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
