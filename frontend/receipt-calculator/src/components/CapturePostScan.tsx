import { useState } from 'react';
import type { OcrService } from '../services/ocrService';
import type { OcrComparisonPair } from '../types';
import ImageUpload from './ImageUpload';
import RawTextView from './RawTextView';

interface CapturePostScanProps {
  imagePreviews: string[];
  uploadedFiles: File[];
  rawText: string;
  onRawTextChange: (text: string) => void;
  ocrService: OcrService;
  googleVisionService: OcrService | null;
  /** Opens inline uploader in the left column (same screen). */
  onStartReplacePhotos: () => void;
  replacePhotosOpen: boolean;
  onCancelReplacePhotos: () => void;
  onReplaceScanComplete: (text: string, previews: string[], files: File[]) => void;
  replaceUploadKey: number;
  onExtract: () => void;
  onUseAndParse: (text: string, comparisonPair?: OcrComparisonPair) => void;
  /** When set, RawTextView opens in default vs enhanced comparison (returning from split). */
  initialComparisonEnhanced: string | null;
  compareInvalidateNonce: number;
  /** After successful Reset default OCR — clear saved pair and comparison pane. */
  onSavedComparisonInvalidated: () => void;
  /** User dismissed comparison — drop saved pair only (no nonce bump). */
  onComparisonDismiss: () => void;
}

/**
 * After the first scan: photo + text on one screen. Replacing the photo uses the same layout
 * with an inline uploader — no jump to a separate empty “step”.
 */
export default function CapturePostScan({
  imagePreviews,
  uploadedFiles,
  rawText,
  onRawTextChange,
  ocrService,
  googleVisionService,
  onStartReplacePhotos,
  replacePhotosOpen,
  onCancelReplacePhotos,
  onReplaceScanComplete,
  replaceUploadKey,
  onExtract,
  onUseAndParse,
  initialComparisonEnhanced,
  compareInvalidateNonce,
  onSavedComparisonInvalidated,
  onComparisonDismiss,
}: CapturePostScanProps) {
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState('');

  const handleRescan = async () => {
    if (uploadedFiles.length === 0) return;
    setRescanning(true);
    setRescanError('');
    try {
      const result = await ocrService.recognizeImages(uploadedFiles);
      onRawTextChange(result.text);
      onSavedComparisonInvalidated();
    } catch {
      setRescanError('Scan failed. Try again.');
    } finally {
      setRescanning(false);
    }
  };

  return (
    <div className="capture-post-scan">
      <aside className="capture-post-scan__visual">
        {replacePhotosOpen ? (
          <div className="capture-replace-panel">
            <h4 className="capture-panel-title">New photo</h4>
            <p className="capture-replace-lead">
              Add one image and scan — you stay on this step. Your text updates after a successful scan.
            </p>
            <button type="button" className="btn btn-text capture-replace-cancel" onClick={onCancelReplacePhotos}>
              Cancel — keep current photo
            </button>
            <ImageUpload
              key={replaceUploadKey}
              compact
              ocrService={ocrService}
              onScanComplete={onReplaceScanComplete}
            />
          </div>
        ) : (
          <>
            <h4 className="capture-panel-title">Receipt photo</h4>
            <div className="preview-scroll capture-preview-stack">
              {imagePreviews.map((src, i) => (
                <img key={i} src={src} alt="Receipt photo" className="preview-full" />
              ))}
            </div>
            <div className="capture-photo-toolbox" aria-label="Photo actions">
              <p className="capture-toolbox-title">Photo actions</p>
              <div className="capture-visual-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-compact"
                  onClick={onStartReplacePhotos}
                >
                  Use a different photo
                </button>
              </div>
              <p className="capture-toolbox-hint">
                Opens the uploader in this column — same screen as your text. To re-read the{' '}
                <em>same</em> image, use <strong>Reset default OCR</strong> or <strong>Try enhanced OCR</strong>{' '}
                beside the text.
              </p>
            </div>
          </>
        )}
      </aside>

      <section className="capture-post-scan__editor">
        {replacePhotosOpen ? (
          <div className="capture-replace-hold">
            <p className="section-hint">
              Current text stays until you finish a new scan on the left. Cancel there to keep editing this version.
            </p>
            <label className="capture-replace-readonly-label" htmlFor="capture-hold-text">
              Current text (read-only for now)
            </label>
            <textarea
              id="capture-hold-text"
              className="raw-text-area raw-text-area--hold"
              value={rawText}
              readOnly
              rows={16}
              spellCheck={false}
            />
          </div>
        ) : (
          <RawTextView
            rawText={rawText}
            onRawTextChange={onRawTextChange}
            onParse={onExtract}
            onUseAndParse={onUseAndParse}
            onBack={onStartReplacePhotos}
            uploadedFiles={uploadedFiles}
            googleVisionService={googleVisionService}
            onResetDefaultOcr={handleRescan}
            resetDefaultOcrBusy={rescanning}
            defaultOcrError={rescanError}
            hideBackButton
            sectionHintText="Edit the text, or run Reset default OCR / Try enhanced OCR on the same image, then extract line items."
            extractButtonLabel="Extract line items →"
            comparisonPickLabel="Extract with this text →"
            initialComparisonEnhanced={initialComparisonEnhanced}
            compareInvalidateNonce={compareInvalidateNonce}
            onComparisonDismiss={onComparisonDismiss}
          />
        )}
      </section>
    </div>
  );
}
