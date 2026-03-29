interface RawTextViewProps {
  rawText: string;
  onRawTextChange: (text: string) => void;
  onParse: () => void;
  onBack: () => void;
}

export default function RawTextView({ rawText, onRawTextChange, onParse, onBack }: RawTextViewProps) {
  return (
    <div className="raw-text-section">
      <p className="section-hint">
        Review the OCR output below. You can edit any mistakes before parsing.
      </p>
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
    </div>
  );
}
