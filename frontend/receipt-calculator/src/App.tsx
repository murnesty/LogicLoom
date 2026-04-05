import { useMemo, useState } from 'react';
import { Receipt, ReceiptItem, SplitItem } from './types';
import { createOcrService, createGoogleVisionOcrService } from './services/ocrService';
import { parseReceiptText } from './services/receiptParser';
import ReceiptPhotoPanel from './components/ReceiptPhotoPanel';
import ReceiptSplitWorkspace from './components/ReceiptSplitWorkspace';
import RawParsedDataModal from './components/RawParsedDataModal';
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

  const [replacePhotosOpen, setReplacePhotosOpen] = useState(false);
  const [replaceUploadKey, setReplaceUploadKey] = useState(0);
  const [rawText, setRawText] = useState('');
  const [receipt, setReceipt] = useState<Receipt>(emptyReceipt);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [rawModalOpen, setRawModalOpen] = useState(false);

  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrEngine, setOcrEngine] = useState<'tesseract' | 'google' | null>(null);
  const [tesseractError, setTesseractError] = useState('');
  const [googleError, setGoogleError] = useState('');

  const applyParsed = (parsed: Receipt) => {
    setReceipt(parsed);
    setSplitItems(splitRowsFromParsed(parsed.items));
  };

  const clearParsedFromNewImage = () => {
    setRawText('');
    setReceipt(emptyReceipt);
    setSplitItems([]);
  };

  const handleImageReady = (previews: string[], files: File[]) => {
    setImagePreviews(previews);
    setUploadedFiles(files);
    clearParsedFromNewImage();
    setTesseractError('');
    setGoogleError('');
  };

  const handleStartReplacePhotos = () => {
    setReplaceUploadKey((k) => k + 1);
    setReplacePhotosOpen(true);
  };

  const handleCancelReplacePhotos = () => {
    setReplacePhotosOpen(false);
  };

  const handleReplaceImageReady = (previews: string[], files: File[]) => {
    setImagePreviews(previews);
    setUploadedFiles(files);
    setReplacePhotosOpen(false);
    clearParsedFromNewImage();
    setTesseractError('');
    setGoogleError('');
  };

  const handleTesseractOcr = async () => {
    if (uploadedFiles.length === 0) return;
    setOcrBusy(true);
    setOcrEngine('tesseract');
    setTesseractError('');
    setGoogleError('');
    try {
      const result = await ocrService.recognizeImages(uploadedFiles);
      setRawText(result.text);
      applyParsed(parseReceiptText(result.text));
    } catch {
      setTesseractError('Local scan failed. Try again or use a clearer photo.');
    } finally {
      setOcrBusy(false);
      setOcrEngine(null);
    }
  };

  const handleGoogleOcr = async () => {
    if (!googleVisionService || uploadedFiles.length === 0) return;
    setOcrBusy(true);
    setOcrEngine('google');
    setTesseractError('');
    setGoogleError('');
    try {
      const result = await googleVisionService.recognizeImages(uploadedFiles);
      setRawText(result.text);
      applyParsed(parseReceiptText(result.text));
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : 'Cloud scan failed.');
    } finally {
      setOcrBusy(false);
      setOcrEngine(null);
    }
  };

  const handleApplyLineItemsFromModal = () => {
    applyParsed(parseReceiptText(rawText));
  };

  const handleItemsAndSplitChange = (items: ReceiptItem[], split: SplitItem[]) => {
    setReceipt((r) => ({ ...r, items }));
    setSplitItems(split);
  };

  const handleReset = () => {
    setReplacePhotosOpen(false);
    setRawText('');
    setReceipt(emptyReceipt);
    setSplitItems([]);
    setImagePreviews([]);
    setUploadedFiles([]);
    setRawModalOpen(false);
    setTesseractError('');
    setGoogleError('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧾 Receipt Calculator</h1>
        <p className="app-tagline">Upload a receipt, extract text, then split the bill — one screen.</p>
      </header>

      <main className="app-main">
        <div className="two-col two-col-itemize single-page-workspace">
          <ReceiptPhotoPanel
            ocrService={ocrService}
            googleVisionService={googleVisionService}
            imagePreviews={imagePreviews}
            rawText={rawText}
            replacePhotosOpen={replacePhotosOpen}
            replaceUploadKey={replaceUploadKey}
            onImageReady={handleImageReady}
            onStartReplacePhotos={handleStartReplacePhotos}
            onCancelReplacePhotos={handleCancelReplacePhotos}
            onReplaceImageReady={handleReplaceImageReady}
            onTesseractOcr={handleTesseractOcr}
            onGoogleOcr={handleGoogleOcr}
            ocrBusy={ocrBusy}
            ocrEngine={ocrEngine}
            tesseractError={tesseractError}
            googleError={googleError}
            onOpenRawModal={() => setRawModalOpen(true)}
          />
          <section className="step-content">
            <ReceiptSplitWorkspace
              receipt={receipt}
              splitItems={splitItems}
              onReceiptMetaChange={(patch) => setReceipt((r) => ({ ...r, ...patch }))}
              onItemsAndSplitChange={handleItemsAndSplitChange}
              onStartOver={handleReset}
            />
          </section>
        </div>
      </main>

      <RawParsedDataModal
        open={rawModalOpen}
        onClose={() => setRawModalOpen(false)}
        rawText={rawText}
        onRawTextChange={setRawText}
        onApplyLineItems={handleApplyLineItemsFromModal}
      />

      <AppFooter />
    </div>
  );
}

export default App;
