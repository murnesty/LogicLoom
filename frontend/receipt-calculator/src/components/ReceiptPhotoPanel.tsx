import type { OcrService } from '../services/ocrService';
import ImageUpload from './ImageUpload';

interface ReceiptPhotoPanelProps {
  ocrService: OcrService;
  googleVisionService: OcrService | null;
  imagePreviews: string[];
  rawText: string;
  replacePhotosOpen: boolean;
  replaceUploadKey: number;
  onImageReady: (previews: string[], files: File[]) => void;
  onStartReplacePhotos: () => void;
  onCancelReplacePhotos: () => void;
  onReplaceImageReady: (previews: string[], files: File[]) => void;
  onTesseractOcr: () => void;
  onGoogleOcr: () => void;
  ocrBusy: boolean;
  ocrEngine: 'tesseract' | 'google' | null;
  tesseractError: string;
  googleError: string;
  onOpenRawModal: () => void;
}

export default function ReceiptPhotoPanel({
  ocrService,
  googleVisionService,
  imagePreviews,
  rawText,
  replacePhotosOpen,
  replaceUploadKey,
  onImageReady,
  onStartReplacePhotos,
  onCancelReplacePhotos,
  onReplaceImageReady,
  onTesseractOcr,
  onGoogleOcr,
  ocrBusy,
  ocrEngine,
  tesseractError,
  googleError,
  onOpenRawModal,
}: ReceiptPhotoPanelProps) {
  const hasImage = imagePreviews.length > 0;
  const canRunOcr = hasImage && !ocrBusy;
  const googleAvailable = googleVisionService !== null;

  return (
    <aside className="receipt-preview-panel receipt-photo-panel">
      {replacePhotosOpen ? (
        <div className="capture-replace-panel">
          <h4 className="capture-panel-title">New photo</h4>
          <p className="capture-replace-lead">
            Pick one image — it appears on the left when ready. Then choose local or cloud scan below.
          </p>
          <button type="button" className="btn btn-text capture-replace-cancel" onClick={onCancelReplacePhotos}>
            Cancel — keep current photo
          </button>
          <ImageUpload
            key={replaceUploadKey}
            compact
            scanOnUpload={false}
            ocrService={ocrService}
            onImageReady={onReplaceImageReady}
          />
        </div>
      ) : !hasImage ? (
        <>
          <h4 className="panel-title">Receipt photo</h4>
          <ImageUpload scanOnUpload={false} ocrService={ocrService} onImageReady={onImageReady} />
        </>
      ) : (
        <>
          <h4 className="panel-title">Receipt photo</h4>
          <div className="preview-scroll capture-preview-stack">
            {imagePreviews.map((src, i) => (
              <img key={i} src={src} alt="Receipt" className="preview-full" />
            ))}
          </div>
          <div className="capture-photo-toolbox" aria-label="Photo actions">
            <p className="capture-toolbox-title">Photo</p>
            <div className="capture-visual-actions">
              <button type="button" className="btn btn-outline btn-compact" onClick={onStartReplacePhotos}>
                Use a different photo
              </button>
            </div>
          </div>

          <div className="ocr-engine-block" aria-label="Extract text from image">
            <p className="ocr-engine-block-label">Extract text</p>
            <p className="ocr-engine-block-hint">
              Pick one option. Line items appear on the right after a successful run.
            </p>
            <div className="ocr-engine-buttons">
              <button
                type="button"
                className="btn-ocr-engine"
                onClick={onTesseractOcr}
                disabled={!canRunOcr}
              >
                <span className="btn-ocr-engine-title">Local scan</span>
                <span className="btn-ocr-engine-badge">Free · runs in your browser</span>
                {ocrBusy && ocrEngine === 'tesseract' && (
                  <span className="btn-ocr-engine-status">Working…</span>
                )}
              </button>
              <button
                type="button"
                className="btn-ocr-engine btn-ocr-engine--cloud"
                onClick={onGoogleOcr}
                disabled={!canRunOcr || !googleAvailable}
              >
                <span className="btn-ocr-engine-title">Cloud scan</span>
                <span className="btn-ocr-engine-badge">
                  {googleAvailable ? 'Cloud · quota on server (may be limited)' : 'Not configured'}
                </span>
                {ocrBusy && ocrEngine === 'google' && (
                  <span className="btn-ocr-engine-status">Working…</span>
                )}
              </button>
            </div>
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
