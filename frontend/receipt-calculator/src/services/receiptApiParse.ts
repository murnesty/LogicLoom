import type { Receipt, ReceiptItem } from '../types';

/** Same base as vision proxy when `VITE_RECEIPT_API_URL` is unset — one API host for both. */
export function getReceiptApiBaseUrl(): string | null {
  const explicit = (import.meta.env.VITE_RECEIPT_API_URL as string | undefined)?.trim();
  const vision = (import.meta.env.VITE_VISION_PROXY_URL as string | undefined)?.trim();
  const base = (explicit || vision || '').replace(/\/$/, '');
  return base.length > 0 ? base : null;
}

interface AnalyzeReceiptResponseDto {
  currency: string;
  items: {
    name: string;
    quantity: number;
    originalPrice: number;
    taxedPrice: number;
    totalPrice: number;
  }[];
  summary: {
    subtotal: number;
    serviceTax: number;
    sstTax: number;
    total: number;
  };
  warnings?: string[];
}

/**
 * Parses OCR text using ReceiptCalculator.Api (`BasicReceiptParser` + SQLite rules when configured server-side).
 */
export async function parseReceiptViaApi(ocrText: string, rawTextForReceipt: string, currency: string): Promise<Receipt> {
  const base = getReceiptApiBaseUrl();
  if (!base) {
    throw new Error('Receipt API base URL is not configured.');
  }

  const res = await fetch(`${base}/api/receipt/analyze-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ocrText, currency }),
  });

  const bodyText = await res.text();

  if (!res.ok) {
    let msg = `Server returned ${res.status}`;
    try {
      const j = JSON.parse(bodyText) as { error?: string; title?: string; detail?: string };
      msg = j.detail || j.title || j.error || msg;
    } catch {
      if (bodyText) msg = bodyText.slice(0, 300);
    }
    throw new Error(msg);
  }

  const data = JSON.parse(bodyText) as AnalyzeReceiptResponseDto;
  const sub = data.summary.subtotal;
  const svcPct = sub > 0 ? (data.summary.serviceTax / sub) * 100 : 0;
  const taxPct = sub > 0 ? (data.summary.sstTax / sub) * 100 : 0;

  const items: ReceiptItem[] = data.items.map((row) => {
    const qty = row.quantity > 0 ? row.quantity : 1;
    const lineAmount = row.originalPrice;
    const unitPrice = lineAmount / qty;
    return {
      id: crypto.randomUUID(),
      name: row.name,
      quantity: qty,
      unitPrice: Math.round(unitPrice * 10000) / 10000,
    };
  });

  return {
    shopName: '',
    taxPercent: Math.round(taxPct * 1000) / 1000,
    serviceChargePercent: Math.round(svcPct * 1000) / 1000,
    items,
    rawText: rawTextForReceipt,
  };
}
