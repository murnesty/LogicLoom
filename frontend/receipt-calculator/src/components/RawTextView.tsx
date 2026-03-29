import { useState, useEffect, useRef, useCallback } from 'react';
import type { OcrService } from '../services/ocrService';

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
  onUseAndParse: (text: string) => void;
  onBack: () => void;
  uploadedFiles: File[];
  googleVisionService: OcrService | null;
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
}: RawTextViewProps) {
  const [googleText, setGoogleText] = useState<string | null>(null);
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
    (!limitsEnabled || (cooldown === 0 && sessionCount < SESSION_CAP));

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

  const handleUseAndParse = (text: string) => {
    onUseAndParse(text);
  };

  const remainingCalls = SESSION_CAP - sessionCount;

  const googleButtonLabel = scanning
    ? scanStatus || 'Scanning...'
    : limitsEnabled && cooldown > 0
      ? `Try again in ${cooldown}s`
      : 'Try enhanced OCR';

  return (
    <div className="raw-text-section">
      <p className="section-hint">
        Review the OCR output below. You can edit any mistakes before parsing.
      </p>

      {googleVisionService && !showComparison && (
        <div className="google-ocr-bar">
          <button
            className="btn btn-google"
            onClick={handleGoogleScan}
            disabled={!canCallGoogle || uploadedFiles.length === 0}
          >
            {googleButtonLabel}
          </button>
          {limitsEnabled ? (
            <span className="google-ocr-meta">
              {remainingCalls} / {SESSION_CAP} uses left this session
            </span>
          ) : (
            <span className="google-ocr-meta google-ocr-meta-dev">Dev: no session cap or cooldown</span>
          )}
          {error && <p className="google-ocr-error">{error}</p>}
        </div>
      )}

      {showComparison ? (
        <>
          <div className="ocr-compare">
            <div className="ocr-compare-panel">
              <div className="ocr-compare-header">
                <h4>Default</h4>
                <button className="btn btn-use" onClick={() => handleUseAndParse(rawText)}>
                  Use & Parse →
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
                <button className="btn btn-use btn-use-google" onClick={() => handleUseAndParse(googleText!)}>
                  Use & Parse →
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
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={onBack}>
              ← Back
            </button>
            <button className="btn btn-secondary" onClick={() => setGoogleText(null)}>
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
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={onBack}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              onClick={onParse}
              disabled={!rawText.trim()}
            >
              Parse Receipt →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
