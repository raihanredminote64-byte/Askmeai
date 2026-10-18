import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useGetAdminSettings, useUpdateAdminSettings } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const [form, setForm] = useState({ appName: '', defaultCredits: 50, registrationEnabled: true, maintenanceMode: false });

  useEffect(() => {
    if (settings) {
      setForm({
        appName: settings.appName || 'AskMeAI',
        defaultCredits: settings.defaultCredits ?? 50,
        registrationEnabled: settings.registrationEnabled ?? true,
        maintenanceMode: settings.maintenanceMode ?? false,
      });
    }
  }, [settings]);

  const save = useUpdateAdminSettings({
    mutation: {
      onSuccess: () => toast({ title: 'Settings saved' }),
      onError: (err: any) => toast({ title: 'Failed to save', description: err.message, variant: 'destructive' }),
    }
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-muted-foreground mt-1">Global platform configuration</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="max-w-xl space-y-8">
          <div className="rounded-2xl border border-white/5 bg-card p-6 space-y-6">
            <h3 className="font-semibold text-white">General</h3>

            <div className="space-y-2">
              <Label>App Name</Label>
              <Input className="bg-black/50" value={form.appName} onChange={e => setForm(f => ({ ...f, appName: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Default Credits for New Users</Label>
              <Input className="bg-black/50" type="number" min={0} value={form.defaultCredits} onChange={e => setForm(f => ({ ...f, defaultCredits: parseInt(e.target.value) || 0 }))} />
              <p className="text-xs text-muted-foreground">Credits given automatically upon registration.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-4">
              <div>
                <p className="font-medium text-white">User Registration</p>
                <p className="text-sm text-muted-foreground">Allow new users to sign up</p>
              </div>
              <Switch checked={form.registrationEnabled} onCheckedChange={v => setForm(f => ({ ...f, registrationEnabled: v }))} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div>
                <p className="font-medium text-white">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Block all non-admin access to the app</p>
              </div>
              <Switch checked={form.maintenanceMode} onCheckedChange={v => setForm(f => ({ ...f, maintenanceMode: v }))} />
            </div>
          </div>

          <Button onClick={() => save.mutate({ data: form as any })} disabled={save.isPending} className="w-full">
            {save.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            Save Settings
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
