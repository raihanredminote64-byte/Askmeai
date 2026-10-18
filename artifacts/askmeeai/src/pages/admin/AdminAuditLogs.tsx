import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListAuditLogs } from '@workspace/api-client-react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAuditLogs() {
  const { data, isLoading } = useListAuditLogs({ limit: 50 });

  function actionColor(action: string) {
    if (action.startsWith('CREATE')) return 'bg-emerald-500/20 text-emerald-500';
    if (action.startsWith('DELETE') || action.startsWith('DISABLE') || action.startsWith('REJECT')) return 'bg-destructive/20 text-destructive';
    if (action.startsWith('APPROVE') || action.startsWith('ENABLE')) return 'bg-primary/20 text-primary';
    return 'bg-white/10 text-muted-foreground';
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Track all admin actions on the platform</p>
      </div>

      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : data?.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShieldCheck size={40} className="mb-4 text-white/20" />
            <p>No audit logs found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data?.items.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="mt-0.5 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono font-medium ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-white">{log.userEmail || 'System'}</span>
                    <span className="text-muted-foreground">on</span>
                    <span className="text-muted-foreground">{log.resource}</span>
                    {log.resourceId && (
                      <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">#{log.resourceId.slice(0, 8)}</span>
                    )}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(log.createdAt), 'MMM d, HH:mm')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
