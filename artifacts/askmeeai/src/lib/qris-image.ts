export const LEGACY_QRIS_DETAIL_KEYS = [
  'qrisImageUrl',
  'qrImageUrl',
  'qrisCodeUrl',
  'qrCodeUrl',
  'imageUrl',
  'qrUrl',
] as const;

export function isQrisImagePath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/objects/');
}

export function getQrisImageUrl(imagePath: string): string {
  return getStorageObjectUrl(imagePath);
}

export function getStorageObjectUrl(objectPath: string): string {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${basePath}api/storage${objectPath}`;
}