import { readAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';

export async function readFileAsBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

export async function deleteFile(uri: string): Promise<void> {
  await deleteAsync(uri, { idempotent: true }).catch(() => {});
}
