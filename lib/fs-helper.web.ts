export async function readFileAsBase64(uri: string): Promise<string> {
  // On web, uri may be a data URL or blob URL
  if (uri.startsWith('data:')) {
    return uri.includes(',') ? uri.split(',')[1] : uri;
  }
  const blob = await fetch(uri).then((r) => r.blob());
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(blob);
  });
}

export async function deleteFile(_uri: string): Promise<void> {
  // No-op on web — blob URLs are GC'd automatically
}
