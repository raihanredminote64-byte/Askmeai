import { useState, type ChangeEvent } from 'react';
import { Loader2, Upload, Image as ImageIcon, Send } from 'lucide-react';
import { useUploadOrderProof } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth-token';

type PaymentProofUploadProps = {
  orderId: string;
  onSubmitted: () => void;
};

const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function PaymentProofUpload({ orderId, onSubmitted }: PaymentProofUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadProof = useUploadOrderProof();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!selectedFile) return;

    if (!SUPPORTED_TYPES.includes(selectedFile.type)) {
      toast({
        title: 'File gambar diperlukan',
        description: 'Pilih bukti pembayaran PNG, JPEG, atau WebP.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'Ukuran file terlalu besar',
        description: 'Bukti pembayaran maksimal 10 MB.',
        variant: 'destructive',
      });
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || isUploading || uploadProof.isPending) return;

    setIsUploading(true);
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
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
          purpose: 'payment-proof',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Gagal menyiapkan upload.');

      const uploadResponse = await fetch(payload.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error('Gagal mengupload bukti pembayaran.');

      await uploadProof.mutateAsync({
        id: orderId,
        data: { proofPath: payload.objectPath },
      });
      toast({
        title: 'Bukti pembayaran terkirim',
        description: 'Top up sedang menunggu pemeriksaan admin.',
      });
      setFile(null);
      onSubmitted();
    } catch (error) {
      toast({
        title: 'Bukti pembayaran gagal dikirim',
        description: error instanceof Error ? error.message : 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isBusy = isUploading || uploadProof.isPending;

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="mb-2 text-sm font-medium text-white">Upload bukti pembayaran</p>
      <label className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10 ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
        {isBusy ? <Loader2 size={17} className="shrink-0 animate-spin text-primary" /> : <Upload size={17} className="shrink-0 text-primary" />}
        <span className="min-w-0 truncate text-sm text-white">
          {isBusy ? 'Mengirim dan memeriksa...' : file?.name || 'Pilih gambar bukti pembayaran'}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isBusy}
        />
      </label>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <ImageIcon size={13} /> PNG, JPEG, atau WebP maksimal 10 MB.
      </p>
      <Button className="mt-3 w-full" onClick={handleSubmit} disabled={!file || isBusy}>
        {isBusy ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Send size={15} className="mr-2" />}
        Kirim Bukti Pembayaran
      </Button>
    </div>
  );
}