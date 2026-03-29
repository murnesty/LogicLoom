import { useState, useEffect, useRef, useCallback } from 'react';
import type { OcrService } from '../services/ocrService';
import type { OcrComparisonPair } from '../types';

function initialEnhancedToGoogleState(v: string | null | undefined): string | null {
  if (v == null || v === '') return null;
  return v;
}

const COOLDOWN_SECONDS = 30;
const SESSION_CAP = 10;
const SESSION_KEY = 'gv_ocr_count';

/** Session cap + cooldown only in production (hosted); off on Vite dev and localhost. */
function isGoogleOcrLimitsEnabled(): boolean {
  if (import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h !== 'localhost' && h !== '127.0.0.1';
}

interface RawTextViewProps {
  rawText: string;
  onRawTextChange: (text: string) => void;
  onParse: () => void;
  onUseAndParse: (text: string, comparisonPair?: OcrComparisonPair) => void;
  onBack: () => void;
  uploadedFiles: File[];
  googleVisionService: OcrService | null;
  /** Re-run default (in-browser) OCR — shown beside “Try enhanced OCR” when set. */
  onResetDefaultOcr?: () => void;
  resetDefaultOcrBusy?: boolean;
  defaultOcrError?: string;
  /** Defaults: review hint, “← Back”, “Parse Receipt →”, “Use & Parse →” */
  sectionHintText?: string;
  backButtonLabel?: string;
  extractButtonLabel?: string;
  comparisonPickLabel?: string;
  /** When true, omit the secondary/back row (e.g. parent groups “replace photo” with image panel). */
  hideBackButton?: boolean;
  /** Restore side-by-side view when returning from split after extracting from comparison. */
  initialComparisonEnhanced?: string | null;
  /** When parent bumps this (e.g. new scan / reset default OCR), close comparison UI. */
  compareInvalidateNonce?: number;
  /** User dismissed comparison — clear saved pair in parent. */
  onComparisonDismiss?: () => void;
}

function getSessionCount(): number {
  return parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
}

function incrementSessionCount(): number {
  const count = getSessionCount() + 1;
  sessionStorage.setItem(SESSION_KEY, String(count));
  return count;
}

export default function RawTextView({
  rawText,
  onRawTextChange,
  onParse,
  onUseAndParse,
  onBack,
  uploadedFiles,
  googleVisionService,
  onResetDefaultOcr,
  resetDefaultOcrBusy = false,
  defaultOcrError,
  sectionHintText = 'Review the OCR output below. You can edit any mistakes before parsing.',
  backButtonLabel = '← Back',
  extractButtonLabel = 'Parse Receipt →',
  comparisonPickLabel = 'Use & Parse →',
  hideBackButton = false,
  initialComparisonEnhanced = null,
  compareInvalidateNonce = 0,
  onComparisonDismiss,
}: RawTextViewProps) {
  const [googleText, setGoogleText] = useState<string | null>(() =>
    initialEnhancedToGoogleState(initialComparisonEnhanced),
  );
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showComparison = googleText !== null;
  const limitsEnabled = isGoogleOcrLimitsEnabled();
  const sessionCount = getSessionCount();
  const canCallGoogle =
    googleVisionService &&
    !scanning &&
    !resetDefaultOcrBusy &&
    (!limitsEnabled || (cooldown === 0 && sessionCount < SESSION_CAP));

  const showOcrToolsRow = !showComparison && (onResetDefaultOcr || googleVisionService);
  const resetDefaultDisabled =
    resetDefaultOcrBusy || scanning || uploadedFiles.length === 0;

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const compareNonceSeen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (compareNonceSeen.current === undefined) {
      compareNonceSeen.current = compareInvalidateNonce;
      return;
    }
    if (compareNonceSeen.current !== compareInvalidateNonce) {
      compareNonceSeen.current = compareInvalidateNonce;
      setGoogleText(null);
    }
  }, [compareInvalidateNonce]);

  const handleGoogleScan = async () => {
    if (!googleVisionService || uploadedFiles.length === 0) return;

    setScanning(true);
    setError('');
    setScanStatus('Running enhanced OCR...');

    try {
      const result = await googleVisionService.recognizeImages(uploadedFiles, (_p, status) => {
        setScanStatus(status);
      });
      setGoogleText(result.text);
      if (limitsEnabled) {
        incrementSessionCount();
        startCooldown();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhanced OCR failed');
    } finally {
      setScanning(false);
      setScanStatus('');
    }
  };

  const handleUseAndParse = (text: string, comparisonPair?: OcrComparisonPair) => {
    onUseAndParse(text, comparisonPair);
  };

  const remainingCalls = SESSION_CAP - sessionCount;

  const googleButtonLabel = scanning
    ? scanStatus || 'Scanning...'
    : limitsEnabled && cooldown > 0
      ? `Try again in ${cooldown}s`
      : 'Try enhanced OCR';

  return (
    <div className="raw-text-section">
      <p className="section-hint">{sectionHintText}</p>

      {showOcrToolsRow && (
        <div className="ocr-tool-group">
          <span className="ocr-tool-group-label">Re-read from current image</span>
          <div className="ocr-tool-group-buttons" role="group" aria-label="OCR options for current image">
            {onResetDefaultOcr && (
              <button
                type="button"
                className="btn-ocr-tool"
                onClick={onResetDefaultOcr}
                disabled={resetDefaultDisabled}
              >
                {resetDefaultOcrBusy ? 'Running…' : 'Reset default OCR'}
              </button>
            )}
            {googleVisionService && (
              <button
                type="button"
                className="btn-ocr-tool"
                onClick={handleGoogleScan}
                disabled={!canCallGoogle || uploadedFiles.length === 0}
              >
                {googleButtonLabel}
              </button>
            )}
          </div>
          {googleVisionService && (
            <p className="ocr-tool-group-meta">
              {limitsEnabled ? (
                <>
                  {remainingCalls} / {SESSION_CAP} enhanced uses left this session
                </>
              ) : (
                <>Dev: no enhanced OCR cap</>
              )}
            </p>
          )}
          {error && <p className="google-ocr-error">{error}</p>}
          {defaultOcrError && <p className="google-ocr-error">{defaultOcrError}</p>}
        </div>
      )}

      {showComparison ? (
        <>
          <div className="ocr-compare">
            <div className="ocr-compare-panel">
              <div className="ocr-compare-header">
                <h4>Default</h4>
                <button
                  type="button"
                  className="btn btn-use"
                  onClick={() =>
                    handleUseAndParse(rawText, { defaultText: rawText, enhancedText: googleText! })
                  }
                >
                  {comparisonPickLabel}
                </button>
              </div>
              <textarea
                className="raw-text-area"
                value={rawText}
                onChange={(e) => onRawTextChange(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="ocr-compare-panel">
              <div className="ocr-compare-header">
                <h4>Enhanced</h4>
                <button
                  type="button"
                  className="btn btn-use btn-use-google"
                  onClick={() =>
                    handleUseAndParse(googleText!, { defaultText: rawText, enhancedText: googleText! })
                  }
                >
                  {comparisonPickLabel}
                </button>
              </div>
              <textarea
                className="raw-text-area"
                value={googleText!}
                onChange={(e) => setGoogleText(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
          <div className={`btn-row${hideBackButton ? ' btn-row-end' : ''}`}>
            {!hideBackButton && (
              <button className="btn btn-secondary" onClick={onBack}>
                {backButtonLabel}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setGoogleText(null);
                onComparisonDismiss?.();
              }}
            >
              Dismiss comparison
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            className="raw-text-area"
            value={rawText}
            onChange={(e) => onRawTextChange(e.target.value)}
            rows={18}
            spellCheck={false}
          />
          <div className={`btn-row${hideBackButton ? ' btn-row-end' : ''}`}>
            {!hideBackButton && (
              <button className="btn btn-secondary" onClick={onBack}>
                {backButtonLabel}
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={onParse}
              disabled={!rawText.trim()}
            >
              {extractButtonLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
