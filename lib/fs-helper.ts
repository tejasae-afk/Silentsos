import { Platform } from 'react-native';
import { readAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';

/**
 * Read a local file as a base64 string.
 * On web, imageUri may be a data URL — we strip the prefix.
 */
export async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return uri.includes(',') ? uri.split(',')[1] : uri;
  }
  // If already base64 (no URI scheme), return as-is
  if (!uri.includes('://')) return uri;
  return await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

/**
 * Delete a local file, ignoring errors if it doesn't exist.
 */
export async function deleteFile(uri: string): Promise<void> {
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
