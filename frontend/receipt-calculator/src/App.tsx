import { useState, useMemo } from 'react';
import { AppStep, Receipt, SplitItem } from './types';
import { createOcrService } from './services/ocrService';
import { parseReceiptText } from './services/receiptParser';
import StepIndicator from './components/StepIndicator';
import ImageUpload from './components/ImageUpload';
import RawTextView from './components/RawTextView';
import ReceiptEditor from './components/ReceiptEditor';
import BillSplitter from './components/BillSplitter';
import './App.css';

const emptyReceipt: Receipt = {
  shopName: '',
  taxPercent: 0,
  serviceChargePercent: 0,
  items: [],
  rawText: '',
};

function App() {
  const ocrService = useMemo(() => createOcrService(), []);

  const [step, setStep] = useState<AppStep>('upload');
  const [rawText, setRawText] = useState('');
  const [receipt, setReceipt] = useState<Receipt>(emptyReceipt);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleScanComplete = (text: string, previews: string[]) => {
    setRawText(text);
    setImagePreviews(previews);
    setStep('rawText');
  };

  const handleParse = () => {
    const parsed = parseReceiptText(rawText);
    setReceipt(parsed);
    setStep('editItems');
  };

  const handleGoToSplit = () => {
    setSplitItems(
      receipt.items.map((item) => ({
        ...item,
        selected: false,
        yourQty: 0,
        sharedBy: 1,
      }))
    );
    setStep('split');
  };

  const handleReset = () => {
    setStep('upload');
    setRawText('');
    setReceipt(emptyReceipt);
    setSplitItems([]);
    setImagePreviews([]);
  };

  const showSideImage = step !== 'upload' && imagePreviews.length > 0;

  const stepContent = (
    <>
      {step === 'rawText' && (
        <RawTextView
          rawText={rawText}
          onRawTextChange={setRawText}
          onParse={handleParse}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'editItems' && (
        <ReceiptEditor
          receipt={receipt}
          onReceiptChange={setReceipt}
          onNext={handleGoToSplit}
          onBack={() => setStep('rawText')}
        />
      )}

      {step === 'split' && (
        <BillSplitter
          items={splitItems}
          taxPercent={receipt.taxPercent}
          serviceChargePercent={receipt.serviceChargePercent}
          shopName={receipt.shopName}
          onItemsChange={setSplitItems}
          onBack={() => setStep('editItems')}
          onReset={handleReset}
        />
      )}
    </>
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧾 Receipt Calculator</h1>
      </header>

      <StepIndicator currentStep={step} onStepClick={setStep} />

      <main className="app-main">
        {step === 'upload' && (
          <ImageUpload ocrService={ocrService} onScanComplete={handleScanComplete} />
        )}

        {showSideImage && (
          <div className="two-col">
            <aside className="receipt-preview-panel">
              <h4 className="panel-title">Receipt Image</h4>
              <div className="preview-scroll">
                {imagePreviews.map((src, i) => (
                  <img key={i} src={src} alt={`Receipt ${i + 1}`} className="preview-full" />
                ))}
              </div>
            </aside>
            <section className="step-content">
              {stepContent}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
