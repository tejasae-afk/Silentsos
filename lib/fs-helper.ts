import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Read a local file as a base64 string.
 * On web, imageUri may be a data URL — we strip the prefix.
 */
export async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return uri.includes(',') ? uri.split(',')[1] : uri;
  }
  return await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as any,
  });
}

/**
 * Delete a local file, ignoring errors if it doesn't exist.
 */
export async function deleteFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
