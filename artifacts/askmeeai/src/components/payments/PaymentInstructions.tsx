import { useEffect, useState } from 'react';
import { Image as ImageIcon, Landmark, QrCode } from 'lucide-react';
import { getQrisImageUrl, isQrisImagePath, LEGACY_QRIS_DETAIL_KEYS } from '@/lib/qris-image';

type PaymentMethodLike = {
  name: string;
  type: string;
  details?: Record<string, unknown>;
};

type PaymentInstructionsProps = {
  method?: PaymentMethodLike;
  compact?: boolean;
};

const HIDDEN_KEYS = new Set([
  'qrisImagePath', ...LEGACY_QRIS_DETAIL_KEYS,
  'instructions', 'info', 'merchantName', 'accountName',
]);

function getDetail(details: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

export function PaymentInstructions({ method, compact = false }: PaymentInstructionsProps) {
  const [imageError, setImageError] = useState(false);

  const details = method?.details ?? {};
  const imagePath = isQrisImagePath(details.qrisImagePath) ? details.qrisImagePath : undefined;
  const imageUrl = imagePath ? getQrisImageUrl(imagePath) : undefined;
  const merchantName = getDetail(details, ['merchantName', 'accountName']);
  const instructions = getDetail(details, ['instructions', 'info']);
  const isQris = method ? `${method.name} ${method.type}`.toLowerCase().includes('qris') : false;

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  if (!method) return null;

  const visibleDetails = Object.entries(details).filter(([key, value]) => {
    return !HIDDEN_KEYS.has(key) && value !== null && value !== undefined && String(value).trim() !== '';
  });

  return (
    <div className={`rounded-xl border border-white/10 bg-black/25 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3 flex items-center gap-2">
        {isQris ? <QrCode size={16} className="text-primary" /> : <Landmark size={16} className="text-primary" />}
        <p className="text-sm font-semibold text-white">Payment details</p>
      </div>

      {imageUrl && !imageError ? (
        <div className={`mb-4 flex flex-col items-center rounded-lg bg-white p-3 ${compact ? 'max-w-[180px]' : 'mx-auto max-w-[230px]'}`}>
          <img
            src={imageUrl}
            alt={`QRIS payment code${merchantName ? ` for ${merchantName}` : ''}`}
            className="aspect-square w-full object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      ) : isQris ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/5 p-3 text-xs text-yellow-200">
          <ImageIcon size={15} className="shrink-0" />
          <span>{imageError ? 'The QRIS PNG could not be loaded.' : 'Upload a QRIS PNG from the admin dashboard.'}</span>
        </div>
      ) : null}

      {merchantName && (
        <div className="mb-2 flex items-start justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Merchant</span>
          <span className="text-right font-medium text-white">{merchantName}</span>
        </div>
      )}

      {visibleDetails.length > 0 && (
        <div className="space-y-2 text-sm">
          {visibleDetails.map(([key, value]) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">{formatLabel(key)}</span>
              <span className="max-w-[65%] text-right font-mono text-white break-words">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {instructions && (
        <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">How to pay</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{instructions}</p>
        </div>
      )}
    </div>
  );
}