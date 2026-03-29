import { useState, useMemo } from 'react';
import { AppStep, OcrComparisonPair, Receipt, ReceiptItem, SplitItem } from './types';
import { createOcrService, createGoogleVisionOcrService } from './services/ocrService';
import { parseReceiptText } from './services/receiptParser';
import StepIndicator from './components/StepIndicator';
import ImageUpload from './components/ImageUpload';
import CapturePostScan from './components/CapturePostScan';
import ReceiptSplitWorkspace from './components/ReceiptSplitWorkspace';
import AppFooter from './components/AppFooter';
import './App.css';

const emptyReceipt: Receipt = {
  shopName: '',
  taxPercent: 0,
  serviceChargePercent: 0,
  items: [],
  rawText: '',
};

function splitRowsFromParsed(items: ReceiptItem[]): SplitItem[] {
  return items.map((item) => ({
    ...item,
    selected: false,
    yourQty: 0,
    sharedBy: 1,
  }));
}

function App() {
  const ocrService = useMemo(() => createOcrService(), []);
  const googleVisionService = useMemo(() => createGoogleVisionOcrService(), []);

  const [step, setStep] = useState<AppStep>('capture');
  /** After first successful OCR we show the integrated review layout (not a separate “step” to the user). */
  const [scanCommitted, setScanCommitted] = useState(false);
  /** Inline uploader in CapturePostScan left column — avoids jumping to the empty hero screen. */
  const [replacePhotosOpen, setReplacePhotosOpen] = useState(false);
  const [replaceUploadKey, setReplaceUploadKey] = useState(0);
  const [rawText, setRawText] = useState('');
  const [receipt, setReceipt] = useState<Receipt>(emptyReceipt);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  /** Saved default/enhanced pair when extracting from comparison; restored when returning from split. */
  const [ocrComparison, setOcrComparison] = useState<OcrComparisonPair | null>(null);
  /** Bumped to clear side-by-side UI in RawTextView after default OCR reset / new scan (per-instance effect). */
  const [compareInvalidateNonce, setCompareInvalidateNonce] = useState(0);

  const invalidateSavedComparisonUi = () => {
    setOcrComparison(null);
    setCompareInvalidateNonce((n) => n + 1);
  };

  const handleScanComplete = (text: string, previews: string[], files: File[]) => {
    setRawText(text);
    setImagePreviews(previews);
    setUploadedFiles(files);
    setScanCommitted(true);
    invalidateSavedComparisonUi();
  };

  const handleStartReplacePhotos = () => {
    setReplaceUploadKey((k) => k + 1);
    setReplacePhotosOpen(true);
  };

  const handleCancelReplacePhotos = () => {
    setReplacePhotosOpen(false);
  };

  const handleReplaceScanComplete = (text: string, previews: string[], files: File[]) => {
    setRawText(text);
    setImagePreviews(previews);
    setUploadedFiles(files);
    setReplacePhotosOpen(false);
    invalidateSavedComparisonUi();
  };

  const goToItemize = (parsed: Receipt) => {
    setReceipt(parsed);
    setSplitItems(splitRowsFromParsed(parsed.items));
    setStep('itemize');
  };

  const handleExtract = () => {
    invalidateSavedComparisonUi();
    goToItemize(parseReceiptText(rawText));
  };

  const handleUseAndParse = (text: string, comparisonPair?: OcrComparisonPair) => {
    if (comparisonPair) {
      setOcrComparison(comparisonPair);
    } else {
      setOcrComparison(null);
    }
    setRawText(text);
    goToItemize(parseReceiptText(text));
  };

  const handleItemsAndSplitChange = (items: ReceiptItem[], split: SplitItem[]) => {
    setReceipt((r) => ({ ...r, items }));
    setSplitItems(split);
  };

  const handleReset = () => {
    setStep('capture');
    setScanCommitted(false);
    setReplacePhotosOpen(false);
    setRawText('');
    setReceipt(emptyReceipt);
    setSplitItems([]);
    setImagePreviews([]);
    setUploadedFiles([]);
    invalidateSavedComparisonUi();
  };

  const splitPanel = (
    <ReceiptSplitWorkspace
      receipt={receipt}
      splitItems={splitItems}
      onReceiptMetaChange={(patch) => setReceipt((r) => ({ ...r, ...patch }))}
      onItemsAndSplitChange={handleItemsAndSplitChange}
      onBackToCapture={() => {
        setStep('capture');
        setReplacePhotosOpen(false);
        if (ocrComparison) {
          setRawText(ocrComparison.defaultText);
        }
      }}
      onStartOver={handleReset}
    />
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧾 Receipt Calculator</h1>
      </header>

      <StepIndicator currentStep={step} onStepClick={setStep} />

      <main className="app-main">
        {step === 'capture' && !scanCommitted && (
          <div className="capture-hero-wrap">
            <ImageUpload ocrService={ocrService} onScanComplete={handleScanComplete} />
          </div>
        )}

        {step === 'capture' && scanCommitted && (
          <CapturePostScan
            imagePreviews={imagePreviews}
            uploadedFiles={uploadedFiles}
            rawText={rawText}
            onRawTextChange={setRawText}
            ocrService={ocrService}
            googleVisionService={googleVisionService}
            onStartReplacePhotos={handleStartReplacePhotos}
            replacePhotosOpen={replacePhotosOpen}
            onCancelReplacePhotos={handleCancelReplacePhotos}
            onReplaceScanComplete={handleReplaceScanComplete}
            replaceUploadKey={replaceUploadKey}
            onExtract={handleExtract}
            onUseAndParse={handleUseAndParse}
            initialComparisonEnhanced={ocrComparison?.enhancedText ?? null}
            compareInvalidateNonce={compareInvalidateNonce}
            onSavedComparisonInvalidated={invalidateSavedComparisonUi}
            onComparisonDismiss={() => setOcrComparison(null)}
          />
        )}

        {step === 'itemize' && imagePreviews.length > 0 && (
          <div className="two-col two-col-itemize">
            <aside className="receipt-preview-panel">
              <h4 className="panel-title">Receipt</h4>
              <div className="preview-scroll">
                {imagePreviews.map((src, i) => (
                  <img key={i} src={src} alt="Receipt photo" className="preview-full" />
                ))}
              </div>
            </aside>
            <section className="step-content">{splitPanel}</section>
          </div>
        )}

        {step === 'itemize' && imagePreviews.length === 0 && splitPanel}
      </main>

      <AppFooter />
    </div>
  );
}

export default App;
