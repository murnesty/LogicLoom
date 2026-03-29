export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Receipt {
  shopName: string;
  taxPercent: number;
  serviceChargePercent: number;
  items: ReceiptItem[];
  rawText: string;
}

export interface SplitItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selected: boolean;
  yourQty: number;
  sharedBy: number;
}

/** Two-step flow: scan/review OCR text, then edit line items and split in one screen. */
export type AppStep = 'capture' | 'itemize';

/** Saved when user extracts from default vs enhanced comparison; used to restore side-by-side on back. */
export interface OcrComparisonPair {
  defaultText: string;
  enhancedText: string;
}
