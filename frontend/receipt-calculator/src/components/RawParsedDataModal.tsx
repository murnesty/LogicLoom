import { useEffect } from 'react';

interface RawParsedDataModalProps {
  open: boolean;
  onClose: () => void;
  rawText: string;
  onRawTextChange: (text: string) => void;
  onApplyLineItems: () => void;
}

/**
 * Full-screen dialog for OCR text. Main UI keeps the split table; raw text is optional.
 */
export default function RawParsedDataModal({
  open,
  onClose,
  rawText,
  onRawTextChange,
  onApplyLineItems,
}: RawParsedDataModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="raw-parsed-title"
      >
        <div className="modal-header">
          <h2 id="raw-parsed-title" className="modal-title">
            Raw parsed text
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-lead">
          This is what OCR returned. Edit if needed, then apply to rebuild the line-item table.
        </p>
        <textarea
          className="raw-text-area raw-text-area--modal"
          value={rawText}
          onChange={(e) => onRawTextChange(e.target.value)}
          spellCheck={false}
          rows={18}
        />
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onApplyLineItems();
              onClose();
            }}
            disabled={!rawText.trim()}
          >
            Apply line items from text
          </button>
        </div>
      </div>
    </div>
  );
}
