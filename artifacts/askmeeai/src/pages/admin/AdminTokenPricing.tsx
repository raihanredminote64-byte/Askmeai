import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListTokenPricing, useCreateTokenPricing, useUpdateTokenPricing } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type Form = { model: string; inputPrice: string; outputPrice: string; tokenUnit: string; minimumCharge: string; rounding: 'floor' | 'ceil' | 'round'; isActive: boolean };
const EMPTY: Form = { model: '', inputPrice: '2', outputPrice: '10', tokenUnit: '1000', minimumCharge: '1', rounding: 'ceil', isActive: true };

export default function AdminTokenPricing() {
  const queryClient = useQueryClient();
  const { data: pricings, isLoading } = useListTokenPricing();
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; id?: string; form: Form }>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'token-pricing'] });

  const create = useCreateTokenPricing({ mutation: { onSuccess: () => { invalidate(); setModal(null); toast({ title: 'Pricing created' }); } } });
  const update = useUpdateTokenPricing({ mutation: { onSuccess: () => { invalidate(); setModal(null); toast({ title: 'Pricing updated' }); } } });

  const handleSave = () => {
    if (!modal) return;
    const payload = {
      model: modal.form.model,
      inputPrice: parseFloat(modal.form.inputPrice),
      outputPrice: parseFloat(modal.form.outputPrice),
      tokenUnit: parseInt(modal.form.tokenUnit),
      minimumCharge: parseFloat(modal.form.minimumCharge),
      rounding: modal.form.rounding,
      isActive: modal.form.isActive,
    };
    if (modal.mode === 'create') create.mutate({ data: payload });
    else update.mutate({ id: modal.id!, data: payload });
  };

  const openEdit = (p: any) => setModal({ mode: 'edit', id: p.id, form: { model: p.model, inputPrice: String(p.inputPrice), outputPrice: String(p.outputPrice), tokenUnit: String(p.tokenUnit), minimumCharge: String(p.minimumCharge), rounding: p.rounding, isActive: p.isActive } });

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Token Pricing</h1>
          <p className="text-muted-foreground mt-1">Credit cost per token by model</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create', form: EMPTY })}>
          <Plus size={16} className="mr-2" /> Add Pricing
        </Button>
      </div>

      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Input (per 1k)</th>
                <th className="px-4 py-3 font-medium">Output (per 1k)</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Min Charge</th>
                <th className="px-4 py-3 font-medium">Rounding</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr>
              ) : pricings?.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No pricing configured.</td></tr>
              ) : pricings?.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-white">{p.model}</td>
                  <td className="px-4 py-3 font-mono">{p.inputPrice} credits</td>
                  <td className="px-4 py-3 font-mono">{p.outputPrice} credits</td>
                  <td className="px-4 py-3 font-mono">{p.tokenUnit.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{p.minimumCharge}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{p.rounding}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-muted-foreground'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => openEdit(p)}>
                      <Pencil size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!modal} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{modal?.mode === 'create' ? 'Add Token Pricing' : 'Edit Token Pricing'}</DialogTitle>
            <DialogDescription>Credits charged per token unit for this model.</DialogDescription>
          </DialogHeader>
          {modal && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Model ID</Label>
                <Input className="bg-black/50 font-mono" value={modal.form.model} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, model: e.target.value } }))} placeholder="deepseek-v4-pro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Input Credits (per unit)</Label>
                  <Input className="bg-black/50" type="number" value={modal.form.inputPrice} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, inputPrice: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Output Credits (per unit)</Label>
                  <Input className="bg-black/50" type="number" value={modal.form.outputPrice} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, outputPrice: e.target.value } }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Token Unit</Label>
                  <Input className="bg-black/50" type="number" value={modal.form.tokenUnit} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, tokenUnit: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Min Charge</Label>
                  <Input className="bg-black/50" type="number" value={modal.form.minimumCharge} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, minimumCharge: e.target.value } }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rounding</Label>
                <Select value={modal.form.rounding} onValueChange={v => setModal(m => m && ({ ...m, form: { ...m.form, rounding: v as any } }))}>
                  <SelectTrigger className="bg-black/50 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
                    <SelectItem value="ceil">Ceil (round up)</SelectItem>
                    <SelectItem value="floor">Floor (round down)</SelectItem>
                    <SelectItem value="round">Round (nearest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={modal.form.isActive} onCheckedChange={v => setModal(m => m && ({ ...m, form: { ...m.form, isActive: v } }))} />
                <Label>Active (used for cost calculations)</Label>
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
