import { useState, type ChangeEvent } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListAdminPaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2, Wallet, Upload, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getToken } from '@/lib/auth-token';
import { getQrisImageUrl, isQrisImagePath, LEGACY_QRIS_DETAIL_KEYS } from '@/lib/qris-image';

type Form = { name: string; type: string; accountNumber: string; accountName: string; isActive: boolean };
type PaymentForm = Form & {
  bank: string;
  merchantName: string;
  qrisImagePath: string;
  instructions: string;
  details: Record<string, unknown>;
};
const EMPTY: PaymentForm = {
  name: '', type: '', accountNumber: '', accountName: '', bank: '', merchantName: '',
  qrisImagePath: '', instructions: '', isActive: true, details: {},
};

export default function AdminPaymentMethods() {
  const queryClient = useQueryClient();
  const { data: methods, isLoading } = useListAdminPaymentMethods();
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; id?: string; form: PaymentForm }>(null);
  const [isUploadingQris, setIsUploadingQris] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods'] });

  const create = useCreatePaymentMethod({ mutation: { onSuccess: () => { invalidate(); setModal(null); toast({ title: 'Payment method created' }); } } });
  const update = useUpdatePaymentMethod({ mutation: { onSuccess: () => { invalidate(); setModal(null); toast({ title: 'Updated' }); } } });
  const del = useDeletePaymentMethod({ mutation: { onSuccess: () => { invalidate(); toast({ title: 'Deleted' }); } } });

  const updateForm = <K extends keyof PaymentForm>(field: K, value: PaymentForm[K]) => {
    setModal((current) => current && { ...current, form: { ...current.form, [field]: value } });
  };

  const handleQrisUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !modal) return;

    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      toast({ title: 'PNG file required', description: 'Please choose a QRIS image in PNG format.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File is too large', description: 'QRIS PNG must be 5 MB or smaller.', variant: 'destructive' });
      return;
    }

    setIsUploadingQris(true);
    try {
      const basePath = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
      const token = getToken();
      const response = await fetch(`${basePath}api/storage/uploads/request-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: 'image/png', purpose: 'qris' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not prepare the upload.');

      const uploadResponse = await fetch(payload.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error('Could not upload the QRIS PNG to storage.');

      updateForm('qrisImagePath', payload.objectPath);
      toast({ title: 'QRIS PNG uploaded', description: 'Save the payment method to make it visible to users.' });
    } catch (error) {
      toast({
        title: 'QRIS upload failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingQris(false);
    }
  };

  const handleSave = () => {
    if (!modal) return;
    const details: Record<string, string> = Object.fromEntries(
      Object.entries(modal.form.details)
        .filter(([key, value]) => !LEGACY_QRIS_DETAIL_KEYS.includes(key as typeof LEGACY_QRIS_DETAIL_KEYS[number]) && key !== 'qrisImagePath' && typeof value === 'string' && value.trim())
        .map(([key, value]) => [key, String(value)]),
    );
    const fields = ['accountNumber', 'accountName', 'bank', 'merchantName', 'qrisImagePath', 'instructions'] as const;
    for (const field of fields) {
      if (modal.form[field].trim()) details[field] = modal.form[field].trim();
      else delete details[field];
    }
    const payload = { name: modal.form.name, type: modal.form.type, details, isActive: modal.form.isActive };
    if (modal.mode === 'create') create.mutate({ data: payload });
    else update.mutate({ id: modal.id!, data: payload });
  };

  const openEdit = (m: any) => setModal({
    mode: 'edit', id: m.id, form: {
      name: m.name, type: m.type, isActive: m.isActive,
      accountNumber: m.details?.accountNumber || '',
      accountName: m.details?.accountName || '',
      bank: m.details?.bank || '',
      merchantName: m.details?.merchantName || '',
      qrisImagePath: isQrisImagePath(m.details?.qrisImagePath) ? m.details.qrisImagePath : '',
      instructions: m.details?.instructions || m.details?.info || '',
      details: m.details || {},
    }
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
          <p className="text-muted-foreground mt-1">Configure how users can pay</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create', form: EMPTY })}>
          <Plus size={16} className="mr-2" /> Add Method
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : methods?.map(m => (
          <div key={m.id} className={`rounded-2xl border p-5 flex flex-col gap-3 ${m.isActive ? 'border-white/10 bg-card' : 'border-white/5 bg-card/30 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.type}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-muted-foreground'}`}>
                {m.isActive ? 'Active' : 'Hidden'}
              </span>
            </div>
             {m.details && Object.keys(m.details).some((key) => !LEGACY_QRIS_DETAIL_KEYS.includes(key as typeof LEGACY_QRIS_DETAIL_KEYS[number]) && key !== 'qrisImagePath') && (
              <div className="rounded-lg bg-black/30 p-3 text-xs text-muted-foreground space-y-1">
                 {Object.entries(m.details).filter(([key]) => !LEGACY_QRIS_DETAIL_KEYS.includes(key as typeof LEGACY_QRIS_DETAIL_KEYS[number]) && key !== 'qrisImagePath').map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="font-mono text-white">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-auto">
              <Button variant="outline" size="sm" className="flex-1 border-white/10" onClick={() => openEdit(m)}>
                <Pencil size={14} className="mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="border-white/10 text-destructive hover:text-destructive" onClick={() => del.mutate({ id: m.id })}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!modal} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{modal?.mode === 'create' ? 'Add Payment Method' : 'Edit Payment Method'}</DialogTitle>
          </DialogHeader>
          {modal && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="bg-black/50" value={modal.form.name} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, name: e.target.value } }))} placeholder="QRIS / Bank BCA / GoPay" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input className="bg-black/50" value={modal.form.type} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, type: e.target.value } }))} placeholder="QRIS / Bank Transfer / E-Wallet" />
              </div>
               <div className="space-y-2">
                 <Label>Account Number / Phone (optional)</Label>
                <Input className="bg-black/50" value={modal.form.accountNumber} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, accountNumber: e.target.value } }))} placeholder="081234567890" />
              </div>
              <div className="space-y-2">
                <Label>Account Name (optional)</Label>
                <Input className="bg-black/50" value={modal.form.accountName} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, accountName: e.target.value } }))} placeholder="PT AskMeAI Indonesia" />
              </div>
               <div className="grid gap-4 sm:grid-cols-2">
                 <div className="space-y-2">
                   <Label>Bank (optional)</Label>
                   <Input className="bg-black/50" value={modal.form.bank} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, bank: e.target.value } }))} placeholder="BCA" />
                 </div>
                 <div className="space-y-2">
                   <Label>Merchant Name (optional)</Label>
                   <Input className="bg-black/50" value={modal.form.merchantName} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, merchantName: e.target.value } }))} placeholder="AskMeAI Indonesia" />
                 </div>
               </div>
                <div className="space-y-2">
                  <Label>QRIS PNG Image</Label>
                  <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                    {modal.form.qrisImagePath && (
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-white p-1">
                          <img src={getQrisImageUrl(modal.form.qrisImagePath)} alt="Current QRIS" className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-sm font-medium text-white">
                            <CheckCircle2 size={14} className="text-primary" /> QRIS image ready
                          </p>
                          <p className="truncate text-xs text-muted-foreground">Choose another PNG to replace it.</p>
                        </div>
                      </div>
                    )}
                    <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white transition-colors hover:bg-black/50 ${isUploadingQris ? 'pointer-events-none opacity-60' : ''}`}>
                      {isUploadingQris ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} className="text-primary" />}
                      {isUploadingQris ? 'Uploading PNG...' : modal.form.qrisImagePath ? 'Replace QRIS PNG' : 'Choose QRIS PNG'}
                      <input type="file" accept="image/png,.png" className="sr-only" onChange={handleQrisUpload} disabled={isUploadingQris} />
                    </label>
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon size={12} /> PNG only, maximum 5 MB. Users will scan this image.
                    </p>
                  </div>
                </div>
               <div className="space-y-2">
                 <Label>Payment Instructions (optional)</Label>
                 <textarea className="min-h-20 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value={modal.form.instructions} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, instructions: e.target.value } }))} placeholder="Scan the QRIS code, pay the exact amount, then upload your proof." />
               </div>
              <div className="flex items-center gap-3">
                <Switch checked={modal.form.isActive} onCheckedChange={v => setModal(m => m && ({ ...m, form: { ...m.form, isActive: v } }))} />
                <Label>Active (visible to users)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
              {(create.isPending || update.isPending) && <Loader2 size={14} className="mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
