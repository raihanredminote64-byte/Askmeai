import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListAdminPackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type PkgForm = { name: string; price: string; credits: string; description: string; isActive: boolean };
const EMPTY: PkgForm = { name: '', price: '', credits: '', description: '', isActive: true };

export default function AdminPackages() {
  const queryClient = useQueryClient();
  const { data: packages, isLoading } = useListAdminPackages();
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; id?: string; form: PkgForm }>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });

  const create = useCreatePackage({ mutation: { onSuccess: () => { invalidate(); setModal(null); toast({ title: 'Package created' }); } } });
  const update = useUpdatePackage({ mutation: { onSuccess: () => { invalidate(); setModal(null); toast({ title: 'Package updated' }); } } });
  const del = useDeletePackage({ mutation: { onSuccess: () => { invalidate(); toast({ title: 'Package deleted' }); } } });

  const handleSave = () => {
    if (!modal) return;
    const payload = {
      name: modal.form.name,
      price: parseFloat(modal.form.price),
      credits: parseInt(modal.form.credits),
      description: modal.form.description || undefined,
      isActive: modal.form.isActive,
    };
    if (modal.mode === 'create') {
      create.mutate({ data: payload });
    } else {
      update.mutate({ id: modal.id!, data: payload });
    }
  };

  const openEdit = (pkg: any) => setModal({ mode: 'edit', id: pkg.id, form: { name: pkg.name, price: String(pkg.price), credits: String(pkg.credits), description: pkg.description || '', isActive: pkg.isActive } });

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit Packages</h1>
          <p className="text-muted-foreground mt-1">Manage available credit packages</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create', form: EMPTY })}>
          <Plus size={16} className="mr-2" /> Add Package
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-4 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : packages?.map(pkg => (
          <div key={pkg.id} className={`rounded-2xl border p-6 flex flex-col gap-4 ${pkg.isActive ? 'border-white/10 bg-card' : 'border-white/5 bg-card/30 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">{pkg.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pkg.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-muted-foreground'}`}>
                {pkg.isActive ? 'Active' : 'Hidden'}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Rp{pkg.price.toLocaleString('id-ID')}</p>
              <p className="text-sm text-muted-foreground mt-1">{pkg.credits.toLocaleString()} credits</p>
              {pkg.description && <p className="text-xs text-muted-foreground mt-2">{pkg.description}</p>}
            </div>
            <div className="flex gap-2 mt-auto">
              <Button variant="outline" size="sm" className="flex-1 border-white/10" onClick={() => openEdit(pkg)}>
                <Pencil size={14} className="mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="border-white/10 text-destructive hover:text-destructive" onClick={() => del.mutate({ id: pkg.id })}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!modal} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{modal?.mode === 'create' ? 'Create Package' : 'Edit Package'}</DialogTitle>
          </DialogHeader>
          {modal && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="bg-black/50" value={modal.form.name} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, name: e.target.value } }))} placeholder="Starter Pack" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (IDR)</Label>
                  <Input className="bg-black/50" type="number" value={modal.form.price} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, price: e.target.value } }))} placeholder="15000" />
                </div>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input className="bg-black/50" type="number" value={modal.form.credits} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, credits: e.target.value } }))} placeholder="500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input className="bg-black/50" value={modal.form.description} onChange={e => setModal(m => m && ({ ...m, form: { ...m.form, description: e.target.value } }))} placeholder="Great for beginners" />
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
              Save Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
