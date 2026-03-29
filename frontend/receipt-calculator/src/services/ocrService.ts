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

// Swap this factory to change OCR implementation (e.g., BackendOcrService)
export function createOcrService(): OcrService {
  return new TesseractOcrService();
}
