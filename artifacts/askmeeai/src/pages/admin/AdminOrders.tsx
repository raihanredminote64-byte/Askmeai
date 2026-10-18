import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListAdminOrders, useApproveOrder, useRejectOrder, useValidateOrderProof } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Clock, Filter, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStorageObjectUrl } from '@/lib/qris-image';

function StatusBadge({ status }: { status: string }) {
  if (status === 'PAID') return <Badge className="bg-emerald-500/20 text-emerald-500 border-0"><CheckCircle2 size={12} className="mr-1" />Paid</Badge>;
  if (status === 'PENDING') return <Badge className="bg-yellow-500/20 text-yellow-500 border-0"><Clock size={12} className="mr-1" />Pending</Badge>;
  return <Badge className="bg-destructive/20 text-destructive border-0"><XCircle size={12} className="mr-1" />Rejected</Badge>;
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [invalidProofId, setInvalidProofId] = useState<string | null>(null);
  const [invalidProofReason, setInvalidProofReason] = useState('');

  const { data, isLoading } = useListAdminOrders({ status: statusFilter || undefined });

  const approve = useApproveOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        toast({ title: 'Order approved', description: 'Credits have been added to the user.' });
      },
      onError: (err: any) => toast({ title: 'Failed to approve', description: err.message, variant: 'destructive' }),
    },
  });

  const reject = useRejectOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        setRejectId(null);
        setRejectReason('');
        toast({ title: 'Order rejected' });
      },
      onError: (err: any) => toast({ title: 'Failed to reject', description: err.message, variant: 'destructive' }),
    },
  });

  const validateProof = useValidateOrderProof({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        setInvalidProofId(null);
        setInvalidProofReason('');
        toast({ title: 'Payment proof validation updated' });
      },
      onError: (err: any) => toast({ title: 'Could not update proof validation', description: err.message, variant: 'destructive' }),
    },
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Orders</h1>
          <p className="text-muted-foreground mt-1">Review and process payment requests. Automated checks are advisory only.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-black/50 border-white/10">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Proof</th>
                <th className="px-4 py-3 font-medium">Proof check</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr>
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No orders found.</td></tr>
              ) : data?.items.map(order => {
                const proofUrl = order.proofPath ? getStorageObjectUrl(order.proofPath) : order.proofUrl;
                return (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{order.user?.name}</div>
                    <div className="text-xs text-muted-foreground">{order.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white">{order.package?.name}</div>
                    <div className="text-xs text-muted-foreground">{order.credits?.toLocaleString()} credits</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-white">Rp{order.amount?.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.paymentMethod?.name}</td>
                  <td className="px-4 py-3">
                    {proofUrl ? (
                      <div className="flex flex-col gap-1">
                        <a
                          href={proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View <ExternalLink size={12} />
                        </a>
                        {order.proofTransferDate && (
                          <span className="text-[11px] text-muted-foreground">Transfer: {order.proofTransferDate}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not submitted</span>
                    )}
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    {order.proofValidationStatus && (
                      <div>
                        <Badge className={`border-0 ${
                          order.proofValidationStatus === 'VALID'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : order.proofValidationStatus === 'INVALID'
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {order.proofValidationStatus}
                          {order.proofValidationSource === 'AUTO' ? ' · auto' : order.proofValidationSource === 'MANUAL' ? ' · manual' : ''}
                        </Badge>
                        {order.proofValidationReason && (
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{order.proofValidationReason}</p>
                        )}
                        {typeof order.proofValidationConfidence === 'number' && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Confidence: {Math.round(order.proofValidationConfidence * 100)}%
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}</td>
                  <td className="px-4 py-3 text-right">
                    {order.status === 'PENDING' && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {proofUrl && order.proofValidationStatus !== 'VALID' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-emerald-500/30 text-xs text-emerald-400 hover:text-emerald-300"
                            onClick={() => validateProof.mutate({ id: order.id, data: { status: 'VALID' } })}
                            disabled={validateProof.isPending}
                          >
                            <CheckCircle2 size={14} className="mr-1" /> Mark valid
                          </Button>
                        )}
                        {proofUrl && order.proofValidationStatus !== 'INVALID' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-destructive/30 text-xs text-destructive hover:text-destructive"
                            onClick={() => setInvalidProofId(order.id)}
                            disabled={validateProof.isPending}
                          >
                            <XCircle size={14} className="mr-1" /> Mark invalid
                          </Button>
                        )}
                        <Button size="sm" className="h-8 text-xs" onClick={() => approve.mutate({ id: order.id })} disabled={approve.isPending}>
                          {approve.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={14} className="mr-1" />}
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 text-destructive hover:text-destructive" onClick={() => setRejectId(order.id)}>
                          <XCircle size={14} className="mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {order.status !== 'PENDING' && (
                      <span className="text-xs text-muted-foreground">{order.approvedAt ? format(new Date(order.approvedAt), 'MMM d') : '—'}</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this payment order.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            className="bg-black/50 min-h-[100px]"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || reject.isPending} onClick={() => rejectId && reject.mutate({ id: rejectId, data: { reason: rejectReason } })}>
              {reject.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invalidProofId} onOpenChange={(open) => !open && setInvalidProofId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Mark Proof Invalid</DialogTitle>
            <DialogDescription>Explain why this payment proof is invalid. The user can see this note.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="For example: transfer date does not match the subscribe date."
            className="bg-black/50 min-h-[100px]"
            value={invalidProofReason}
            onChange={e => setInvalidProofReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvalidProofId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!invalidProofReason.trim() || validateProof.isPending}
              onClick={() => invalidProofId && validateProof.mutate({ id: invalidProofId, data: { status: 'INVALID', reason: invalidProofReason.trim() } })}
            >
              {validateProof.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Mark Invalid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
