import Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
}

export type OcrProgressCallback = (progress: number, status: string) => void;

export interface OcrService {
  recognizeImages(files: File[], onProgress?: OcrProgressCallback): Promise<OcrResult>;
}

class TesseractOcrService implements OcrService {
  async recognizeImages(files: File[], onProgress?: OcrProgressCallback): Promise<OcrResult> {
    const results: { text: string; confidence: number }[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            const fileProgress = (i + m.progress) / totalFiles;
            onProgress(fileProgress, `Scanning image ${i + 1} of ${totalFiles}...`);
          }
        },
      });

      results.push({
        text: result.data.text,
        confidence: result.data.confidence,
      });
    }

    const combinedText = results.map((r) => r.text.trim()).join('\n\n');
    const avgConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return { text: combinedText, confidence: avgConfidence };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Enhanced OCR always goes through ReceiptCalculator.Api `POST /api/vision/document-text`
 * (local and production). Google key + quotas live on the server only.
 */
class ProxiedVisionOcrService implements OcrService {
  constructor(private baseUrl: string) {}

  async recognizeImages(files: File[], onProgress?: OcrProgressCallback): Promise<OcrResult> {
    const base64s: string[] = [];
    const totalFiles = files.length;
    for (let i = 0; i < totalFiles; i++) {
      onProgress?.(i / totalFiles, `Preparing image ${i + 1} of ${totalFiles}...`);
      base64s.push(await fileToBase64(files[i]));
    }

    const url = `${this.baseUrl}/api/vision/document-text`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: base64s }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string; text?: string };
    if (!res.ok) {
      throw new Error(data.error || `Enhanced OCR proxy failed (${res.status})`);
    }

    onProgress?.(1, 'Done');
    return {
      text: (data.text ?? '').trim(),
      confidence: 95,
    };
  }
}

export function createOcrService(): OcrService {
  return new TesseractOcrService();
}

/** Returns null if `VITE_VISION_PROXY_URL` is unset (same for local and prod). */
export function createGoogleVisionOcrService(): OcrService | null {
  const proxy = (import.meta.env.VITE_VISION_PROXY_URL as string | undefined)?.trim().replace(/\/$/, '');
  if (!proxy) return null;
  return new ProxiedVisionOcrService(proxy);
}

export function isGoogleVisionAvailable(): boolean {
  return !!((import.meta.env.VITE_VISION_PROXY_URL as string | undefined)?.trim());
}
