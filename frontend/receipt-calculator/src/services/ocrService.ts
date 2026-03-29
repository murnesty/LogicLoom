import Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
}

export interface OcrProgressCallback {
  (progress: number, status: string): void;
}

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

class GoogleVisionOcrService implements OcrService {
  constructor(private apiKey: string) {}

  async recognizeImages(files: File[], onProgress?: OcrProgressCallback): Promise<OcrResult> {
    const totalFiles = files.length;
    const texts: string[] = [];

    for (let i = 0; i < totalFiles; i++) {
      onProgress?.(i / totalFiles, `Sending image ${i + 1} of ${totalFiles} to Google Vision...`);

      const base64 = await fileToBase64(files[i]);

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64 },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            }],
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Google Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const annotation = data.responses?.[0]?.fullTextAnnotation?.text ?? '';
      texts.push(annotation.trim());
    }

    onProgress?.(1, 'Done');
    return {
      text: texts.join('\n\n'),
      confidence: 95,
    };
  }
}

export function createOcrService(): OcrService {
  return new TesseractOcrService();
}

export function createGoogleVisionOcrService(): OcrService | null {
  const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
  if (!apiKey) return null;
  return new GoogleVisionOcrService(apiKey);
}

export function isGoogleVisionAvailable(): boolean {
  return !!import.meta.env.VITE_GOOGLE_VISION_API_KEY;
}
