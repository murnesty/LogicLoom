import { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  onScanComplete: (rawText: string, previews: string[], files: File[]) => void;
  ocrService: { recognizeImages(files: File[], onProgress?: (progress: number, status: string) => void): Promise<{ text: string; confidence: number }> };
  /** Narrow sidebar layout (e.g. replace flow without leaving the step). */
  compact?: boolean;
}

/** One receipt image per session; a new pick replaces the previous. Scan runs as soon as an image is chosen. */
export default function ImageUpload({ onScanComplete, ocrService, compact = false }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [scanFailed, setScanFailed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanGenerationRef = useRef(0);

  const runScan = useCallback(
    async (scanFiles: File[], scanPreviews: string[]) => {
      if (scanFiles.length === 0) return;
      const gen = ++scanGenerationRef.current;
      setScanning(true);
      setProgress(0);
      setStatusText('Initializing OCR...');
      setScanFailed(false);

      try {
        const result = await ocrService.recognizeImages(scanFiles, (p, status) => {
          setProgress(Math.round(p * 100));
          setStatusText(status);
        });
        if (gen !== scanGenerationRef.current) return;
        onScanComplete(result.text, scanPreviews, scanFiles);
      } catch {
        if (gen !== scanGenerationRef.current) return;
        setStatusText('OCR failed. Please try again.');
        setScanFailed(true);
      } finally {
        if (gen === scanGenerationRef.current) {
          setScanning(false);
        }
      }
    },
    [ocrService, onScanComplete],
  );

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const file = imageFiles[0];
      setFiles([file]);
      setScanFailed(false);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviews([dataUrl]);
        void runScan([file], [dataUrl]);
      };
      reader.readAsDataURL(file);
    },
    [runScan],
  );

  const removeFile = (index: number) => {
    scanGenerationRef.current += 1;
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setScanFailed(false);
    setStatusText('');
    setScanning(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleRetry = () => {
    if (files.length === 0 || previews.length === 0) return;
    void runScan(files, previews);
  };

  return (
    <div className={`upload-section${compact ? ' upload-section--compact' : ''}`}>
      <div
        className={['drop-zone', compact ? 'drop-zone--compact' : '', dragOver ? 'drag-over' : '']
          .filter(Boolean)
          .join(' ')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="drop-zone-content">
          <span className="drop-icon">📷</span>
          <p>Drag & drop a receipt photo here</p>
          <p className="drop-hint">or click to browse — we scan it right away (one image)</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="preview-grid">
          {previews.map((src, i) => (
            <div key={i} className="preview-item">
              <img src={src} alt="Receipt preview" />
              <button
                type="button"
                className="remove-btn"
                disabled={scanning}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {scanning && (
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-text">
            {statusText} ({progress}%)
          </p>
        </div>
      )}

      {scanFailed && files.length > 0 && !scanning && (
        <button type="button" className="btn btn-secondary upload-retry-btn" onClick={handleRetry}>
          Retry scan
        </button>
      )}
    </div>
  );
}
