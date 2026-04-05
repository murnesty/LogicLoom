/** Windows / phones sometimes use odd extensions or empty MIME — still valid images. */
export function isLikelyImageFile(f: File): boolean {
  if (f.type.startsWith('image/')) return true;
  return /\.(jpe?g|jfif|png|gif|webp|bmp|heic|heif)$/i.test(f.name);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
