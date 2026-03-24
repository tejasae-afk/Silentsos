import { readAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';

export async function readFileAsBase64(uri: string): Promise<string> {
  // If already base64 (no URI scheme), return as-is
  if (!uri.includes('://')) return uri;
  return readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

export async function deleteFile(uri: string): Promise<void> {
  await deleteAsync(uri, { idempotent: true }).catch(() => {});
}
