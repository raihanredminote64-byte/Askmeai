import { useState } from 'react';
import { useLocation } from 'wouter';
import { useListPackages, useListPaymentMethods, useCreateOrder } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PaymentInstructions } from '@/components/payments/PaymentInstructions';
import { PaymentProofUpload } from '@/components/payments/PaymentProofUpload';
import { Zap, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Pricing() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: packages, isLoading: loadingPackages } = useListPackages();
  const { data: paymentMethods } = useListPaymentMethods({ query: { queryKey: ['paymentMethods'], enabled: !!user } });
  
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const selectedPackageData = packages?.find((pkg) => pkg.id === selectedPackage);
  const selectedMethodData = paymentMethods?.find((method) => method.id === selectedMethod);

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        setCreatedOrderId(order.id);
        setIsSuccess(true);
        toast({ title: 'Order dibuat', description: 'Silakan transfer lalu kirim bukti pembayaran.' });
      },
      onError: (err: any) => {
        toast({ title: 'Failed to create order', description: err.message, variant: 'destructive' });
      }
    }
  });

  const handleBuy = (pkgId: string) => {
    if (!user) {
      setLocation('/register');
      return;
    }
    setSelectedPackage(pkgId);
    setIsSuccess(false);
    setSelectedMethod('');
  };

  const handleConfirmOrder = () => {
    if (!selectedPackage || !selectedMethod) return;
    createOrder.mutate({
      data: {
        packageId: selectedPackage,
        methodId: selectedMethod,
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight sm:text-5xl">Simple, transparent pricing</h1>
         <p className="mt-4 text-lg text-muted-foreground">Subscribe for credits and keep your AI workspace moving.</p>
      </div>

      {loadingPackages ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages?.filter(p => p.isActive).map((pkg) => (
            <div key={pkg.id} className="flex flex-col rounded-2xl border border-white/5 bg-card p-6 shadow-sm transition-transform hover:scale-105">
              <h3 className="font-medium text-muted-foreground">{pkg.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">Rp{pkg.price.toLocaleString('id-ID')}</span>
              </div>
              <div className="mt-6 flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-3 text-sm text-white">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Zap size={12} />
                  </div>
                  {pkg.credits.toLocaleString('id-ID')} Credits
                </div>
                {pkg.description && (
                  <p className="text-xs text-muted-foreground">{pkg.description}</p>
                )}
              </div>
              <Button onClick={() => handleBuy(pkg.id)} className="mt-8 w-full" variant={pkg.price > 20000 ? 'default' : 'secondary'}>
                 Subscribe
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedPackage} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          {!isSuccess ? (
            <>
              <DialogHeader>
                 <DialogTitle>Subscribe with credits</DialogTitle>
                <DialogDescription>
                   Choose a package, review the payment details, then submit your proof after paying.
                </DialogDescription>
              </DialogHeader>

              {selectedPackageData && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{selectedPackageData.name}</span>
                    <span className="font-bold text-primary">
                      Rp{selectedPackageData.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedPackageData.credits.toLocaleString('id-ID')} credits
                  </p>
                </div>
              )}
              
              <div className="py-4">
                <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-3">
                  {paymentMethods?.filter(m => m.isActive).map(method => (
                    <div key={method.id} className="flex items-center space-x-3 rounded-lg border border-white/10 p-4 transition-colors hover:bg-white/5">
                      <RadioGroupItem value={method.id} id={`method-${method.id}`} />
                      <Label htmlFor={`method-${method.id}`} className="flex-1 cursor-pointer font-medium">
                        {method.name}
                        <span className="block text-xs text-muted-foreground mt-1">{method.type}</span>
                      </Label>
                    </div>
                  ))}
                  {paymentMethods?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">No payment methods available.</p>
                  )}
                </RadioGroup>

                 {selectedMethodData && <PaymentInstructions method={selectedMethodData} />}
                 {selectedMethodData && (
                   <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                     <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span>Setelah transfer, lanjutkan untuk upload bukti pembayaran.</span>
                   </div>
                 )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPackage(null)}>Cancel</Button>
                <Button 
                  onClick={handleConfirmOrder} 
                  disabled={!selectedMethod || createOrder.isPending}
                >
                  {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Create Order
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                <CheckCircle2 size={32} />
              </div>
              <DialogTitle className="text-2xl">Order Created!</DialogTitle>
              <DialogDescription className="text-base">
                   Transfer sesuai QRIS di bawah, lalu upload bukti pembayaran dan tekan tombol kirim.
              </DialogDescription>
               {selectedMethodData && <PaymentInstructions method={selectedMethodData} />}
               {createdOrderId && (
                 <PaymentProofUpload
                   orderId={createdOrderId}
                   onSubmitted={() => setLocation('/profile?tab=orders')}
                 />
               )}
               <div className="pt-2">
                 <Button variant="outline" onClick={() => setLocation('/profile?tab=orders')} className="w-full">
                   Nanti saja, buka My Orders
                 </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
