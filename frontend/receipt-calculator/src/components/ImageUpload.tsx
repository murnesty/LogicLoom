import { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  onScanComplete: (rawText: string, previews: string[], files: File[]) => void;
  ocrService: { recognizeImages(files: File[], onProgress?: (progress: number, status: string) => void): Promise<{ text: string; confidence: number }> };
}

export default function ImageUpload({ onScanComplete, ocrService }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setFiles((prev) => [...prev, ...imageFiles]);
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleScan = async () => {
    if (files.length === 0) return;
    setScanning(true);
    setProgress(0);
    setStatusText('Initializing OCR...');

    try {
      const result = await ocrService.recognizeImages(files, (p, status) => {
        setProgress(Math.round(p * 100));
        setStatusText(status);
      });
      onScanComplete(result.text, previews, files);
    } catch {
      setStatusText('OCR failed. Please try again.');
      setScanning(false);
    }
  };

  return (
    <div className="upload-section">
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="drop-zone-content">
          <span className="drop-icon">📷</span>
          <p>Drag & drop receipt images here</p>
          <p className="drop-hint">or click to browse</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="preview-grid">
          {previews.map((src, i) => (
            <div key={i} className="preview-item">
              <img src={src} alt={`Receipt ${i + 1}`} />
              <button
                className="remove-btn"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
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
          <p className="progress-text">{statusText} ({progress}%)</p>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleScan}
        disabled={files.length === 0 || scanning}
      >
        {scanning ? 'Scanning...' : `Scan Receipt (${files.length} image${files.length !== 1 ? 's' : ''})`}
      </button>
    </div>
  );
}
