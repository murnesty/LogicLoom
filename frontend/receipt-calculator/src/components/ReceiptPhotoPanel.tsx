import { useRef, useState, useCallback } from 'react';
import type { OcrService } from '../services/ocrService';
import ImageUpload from './ImageUpload';
import { isLikelyImageFile, readFileAsDataUrl } from '../utils/imageFiles';

interface ReceiptPhotoPanelProps {
  ocrService: OcrService;
  googleVisionService: OcrService | null;
  imagePreviews: string[];
  rawText: string;
  onImageReady: (previews: string[], files: File[]) => void;
  onReplaceImageReady: (previews: string[], files: File[]) => void;
  onTesseractOcr: () => void;
  onGoogleOcr: () => void;
  ocrBusy: boolean;
  ocrEngine: 'tesseract' | 'google' | null;
  tesseractError: string;
  googleError: string;
  onOpenRawModal: () => void;
  /** Server/browser line-item parse in progress after OCR */
  parseBusy?: boolean;
}

export default function ReceiptPhotoPanel({
  ocrService,
  googleVisionService,
  imagePreviews,
  rawText,
  onImageReady,
  onReplaceImageReady,
  onTesseractOcr,
  onGoogleOcr,
  ocrBusy,
  ocrEngine,
  tesseractError,
  googleError,
  onOpenRawModal,
  parseBusy = false,
}: ReceiptPhotoPanelProps) {
  const hasImage = imagePreviews.length > 0;
  const canRunOcr = hasImage && !ocrBusy && !parseBusy;
  const googleAvailable = googleVisionService !== null;

  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [dragOverReceipt, setDragOverReceipt] = useState(false);

  const applyReplacementFile = useCallback(
    async (file: File) => {
      if (!isLikelyImageFile(file)) return;
      const dataUrl = await readFileAsDataUrl(file);
      onReplaceImageReady([dataUrl], [file]);
    },
    [onReplaceImageReady],
  );

  const handleReplaceFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void applyReplacementFile(file);
  };

  const handleReceiptDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverReceipt(false);
    const file = Array.from(e.dataTransfer.files).find(isLikelyImageFile);
    if (file) void applyReplacementFile(file);
  };

  return (
    <aside className="receipt-preview-panel receipt-photo-panel">
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        hidden
        aria-hidden
        onChange={handleReplaceFileInputChange}
      />

      {!hasImage ? (
        <>
          <h4 className="panel-title">Receipt photo</h4>
          <ImageUpload scanOnUpload={false} ocrService={ocrService} onImageReady={onImageReady} />
        </>
      ) : (
        <>
          <h4 className="panel-title">Receipt photo</h4>
          <div
            className={['capture-preview-stack', 'receipt-photo-drop-zone', dragOverReceipt ? 'drag-over' : '']
              .filter(Boolean)
              .join(' ')}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setDragOverReceipt(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverReceipt(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOverReceipt(false);
            }}
            onDrop={handleReceiptDrop}
            role="region"
            aria-label="Receipt preview — drop an image file here to replace"
          >
            {imagePreviews.map((src, i) => (
              <img key={i} src={src} alt="Receipt" className="preview-full" draggable={false} />
            ))}
          </div>
          <div className="capture-photo-toolbox" aria-label="Photo actions">
            <p className="capture-toolbox-title">Photo</p>
            <div className="capture-visual-actions">
              <button
                type="button"
                className="btn btn-outline btn-compact"
                onClick={() => replaceInputRef.current?.click()}
              >
                Use a different photo
              </button>
              <p className="capture-toolbox-hint">
                Opens the file picker immediately. You can also <strong>drag and drop</strong> a new image onto the
                receipt above.
              </p>
            </div>
          </div>

          <div className="ocr-engine-block" aria-label="Extract text from image">
            <p className="ocr-engine-block-label">Extract text</p>
            <p className="ocr-engine-block-hint">
              Pick one option. Cloud scan usually reads line items more reliably than local scan when the server is
              configured. Line items appear on the right after a successful run.
            </p>
            <div className="ocr-engine-buttons">
              <button
                type="button"
                className="btn-ocr-engine btn-ocr-engine--cloud"
                onClick={onGoogleOcr}
                disabled={!canRunOcr || !googleAvailable}
              >
                <span className="btn-ocr-engine-title">Cloud scan</span>
                <span className="btn-ocr-engine-badge">
                  {googleAvailable ? 'Cloud scan · Google Vision on server (quota may apply in production)' : 'Not configured'}
                </span>
                {ocrBusy && ocrEngine === 'google' && (
                  <span className="btn-ocr-engine-status">Working…</span>
                )}
              </button>
              <button
                type="button"
                className="btn-ocr-engine"
                onClick={onTesseractOcr}
                disabled={!canRunOcr}
              >
                <span className="btn-ocr-engine-title">Local scan</span>
                <span className="btn-ocr-engine-badge">Free · Tesseract in your browser</span>
                {ocrBusy && ocrEngine === 'tesseract' && (
                  <span className="btn-ocr-engine-status">Working…</span>
                )}
              </button>
            </div>
            {parseBusy && <p className="parse-inline-status">Building line items…</p>}
            {tesseractError && <p className="google-ocr-error">{tesseractError}</p>}
            {googleError && <p className="google-ocr-error">{googleError}</p>}
          </div>

          <div className="raw-data-actions">
            <button
              type="button"
              className="btn btn-secondary btn-compact btn-view-raw"
              onClick={onOpenRawModal}
              disabled={!rawText.trim()}
            >
              View raw parsed data
            </button>
            <p className="raw-data-actions-hint">OCR output is not shown here — open to review or edit, then apply line items.</p>
          </div>
        </>
      )}
    </aside>
  );
}
