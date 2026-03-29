import { Receipt, ReceiptItem } from '../types';

let idCounter = 0;
function nextId(): string {
  return `item-${++idCounter}`;
}

export function resetIdCounter() {
  idCounter = 0;
}

/**
 * Attempts to parse raw receipt text into structured data.
 * This is a best-effort regex parser -- results should be user-editable.
 */
export function parseReceiptText(rawText: string): Receipt {
  resetIdCounter();
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  const shopName = extractShopName(lines);
  const { startIndex, endIndex } = findItemSection(lines);
  const itemLines = startIndex >= 0 ? lines.slice(startIndex, endIndex) : lines;
  const items = extractItems(itemLines);
  const taxPercent = extractTaxPercent(lines);
  const serviceChargePercent = extractServiceChargePercent(lines);

  return { shopName, taxPercent, serviceChargePercent, items, rawText };
}

function extractShopName(lines: string[]): string {
  for (const line of lines.slice(0, 5)) {
    const l = line.trim();
    if (l.length > 2 && !/^\d/.test(l) && !isMetaLine(l) && !isItemHeader(l)) {
      return l;
    }
  }
  return 'Unknown Shop';
}

function isItemHeader(line: string): boolean {
  const lower = line.toLowerCase();
  // Match common header patterns including OCR misreads:
  // "Qty Item Price", "Qty Item Amount", "Item Price Qty Amount", "Item Prien aty Amount"
  const hasItem = /\bitem\b/i.test(lower);
  const hasQty = /\b(qty|aty|quantity)\b/i.test(lower);
  const hasPrice = /\b(price|prien|amount|amt)\b/i.test(lower);
  return hasItem && (hasQty || hasPrice);
}

function isMetaLine(line: string): boolean {
  return /^(date|time|tel|phone|fax|address|receipt|invoice|order|cashier|server|table|check|registration|no\.|powered|guest check|staff|h\/p|register|company|compri)/i.test(line)
    || /\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/.test(line)
    || /^[+]\d/.test(line)
    || /@/.test(line)
    || /^\(CO\.?\s*NO/i.test(line)
    || /^PAX\s*:/i.test(line)
    || /^order\s*:/i.test(line);
}

/**
 * Find the boundaries of the item section.
 * Looks for a header line like "Qty Item Price/Amount" or "Item Price Qty Amount"
 * and ends at "Subtotal", "Total", or RM-prefixed summary lines.
 */
function findItemSection(lines: string[]): { startIndex: number; endIndex: number } {
  let startIndex = -1;
  let endIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (startIndex < 0 && isItemHeader(lines[i])) {
      startIndex = i + 1;
      continue;
    }

    if (startIndex >= 0 && isEndOfItemsLine(lines[i])) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
}

const END_OF_ITEMS = /^(subtotal|sub\s*total|sub-total|total|bill rounding|rounding|ounding|so\s+\d|\d+\s+qty|RM\s+\d)/i;

function isEndOfItemsLine(line: string): boolean {
  return END_OF_ITEMS.test(line.trim());
}

/**
 * Common OCR misreads of the digit "1" at the start of item lines.
 * E.g., "to", "Lo", "lo", "1o", "Io", "l " followed by item text.
 */
function fixOcrQtyPrefix(line: string): string {
  return line.replace(/^(to|To|lo|Lo|1o|Io|l\s)\s+/, '1 ');
}

function extractItems(lines: string[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isEndOfItemsLine(line)) break;

    const fixed = fixOcrQtyPrefix(line);
    const result = tryParseItemLine(fixed);
    if (result) {
      if (result.nameUncertain) {
        const betterName = findEnglishName(lines, i + 1);
        if (betterName) {
          result.item.name = betterName;
        }
      }
      items.push(result.item);
      continue;
    }

    // Multi-line pattern: "qty name" on this line, standalone price on next line.
    // Common in Google Vision OCR output where prices are on separate lines.
    const multiResult = tryParseMultiLineItem(lines, i);
    if (multiResult) {
      items.push(multiResult.item);
      i += multiResult.linesConsumed;
      continue;
    }

    // Tesseract / narrow receipts: item name on one line, tabular columns on the next:
    //   77. Kimchi Jjigae (Lunch) 김치 찌개
    //   21.00 1 0.00 21.00   (unit price, qty, discount, line amount)
    const splitCols = tryParseNameThenNumericColumns(lines, i);
    if (splitCols) {
      items.push(splitCols.item);
      i += splitCols.linesConsumed;
    }
  }

  return items;
}

/**
 * Item description line immediately followed by: price qty discount amount (4 decimals).
 * Common when OCR wraps long dish names above a numeric row.
 */
function tryParseNameThenNumericColumns(
  lines: string[],
  index: number,
): { item: ReceiptItem; linesConsumed: number } | null {
  const nameLine = lines[index].trim();
  if (index + 1 >= lines.length) return null;

  const numLine = lines[index + 1].trim();
  const m = numLine.match(/^(\d+\.\d{2})\s+(\d+)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s*$/);
  if (!m) return null;

  const unitPrice = parseFloat(m[1]);
  const quantity = parseInt(m[2], 10);
  const discount = parseFloat(m[3]);
  const amount = parseFloat(m[4]);

  if (quantity <= 0 || quantity >= 100 || unitPrice <= 0 || amount <= 0) return null;

  const expectedLine = unitPrice * quantity - discount;
  if (Math.abs(amount - expectedLine) > 0.08) return null;

  if (nameLine.length < 3) return null;
  if (isFooterLine(nameLine) || isItemHeader(nameLine)) return null;
  // Must not look like the numeric row itself
  if (/^\d+\.\d{2}\s+\d/.test(nameLine)) return null;

  let name = cleanItemName(nameLine.replace(/^\d+\.\s*/, ''));
  if (name.length < 2) name = cleanItemName(nameLine);

  return {
    item: { id: nextId(), name, quantity, unitPrice },
    linesConsumed: 1,
  };
}

/**
 * Handle items where price is on a separate line (common with Google Vision OCR).
 *
 * Case 1 (two-line): qty+name on one line, price on next:
 *   1 芙蓉蛋饭 $2
 *   10.90
 *   Fu Yong Egg Rice S2     ← English name (optional)
 *
 * Case 2 (three-line): qty alone, name on next line, price after that:
 *   1
 *   肉碎番茄豆腐汤泡饭 $3
 *   11.90
 *   Mince Pk Tomato Sp Rice S3  ← English name (optional)
 */
function tryParseMultiLineItem(
  lines: string[],
  index: number,
): { item: ReceiptItem; linesConsumed: number } | null {
  const line = fixOcrQtyPrefix(lines[index]);

  // Case 1: "qty name" on same line, standalone price on next line
  const qtyNameMatch = line.match(/^(\d+)\s+(.+)$/);
  if (qtyNameMatch) {
    const qty = parseInt(qtyNameMatch[1]);
    const rawName = qtyNameMatch[2].trim();
    if (qty > 0 && qty < 100 && !isFooterLine(rawName) && rawName.length >= 2) {
      const priceIndex = index + 1;
      if (priceIndex < lines.length) {
        const priceMatch = lines[priceIndex].trim().match(/^(\d+\.\d{2})$/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          if (price > 0) {
            let name = cleanItemName(rawName);
            const englishName = findEnglishName(lines, priceIndex + 1);
            if (englishName) name = englishName;
            return {
              item: { id: nextId(), name, quantity: qty, unitPrice: price / qty },
              linesConsumed: 1,
            };
          }
        }
      }
    }
  }

  // Case 2: standalone qty on this line, name on next, price on the line after
  const standaloneQtyMatch = line.match(/^(\d+)$/);
  if (standaloneQtyMatch) {
    const qty = parseInt(standaloneQtyMatch[1]);
    if (qty > 0 && qty < 100) {
      const nameIndex = index + 1;
      const priceIndex = index + 2;
      if (priceIndex < lines.length) {
        const nameLine = lines[nameIndex].trim();
        const priceLine = lines[priceIndex].trim();
        const priceMatch = priceLine.match(/^(\d+\.\d{2})$/);
        if (
          priceMatch &&
          nameLine.length >= 2 &&
          !isFooterLine(nameLine) &&
          !/^\d+\.\d{2}$/.test(nameLine)
        ) {
          const price = parseFloat(priceMatch[1]);
          if (price > 0) {
            let name = cleanItemName(nameLine);
            const englishName = findEnglishName(lines, priceIndex + 1);
            if (englishName) name = englishName;
            return {
              item: { id: nextId(), name, quantity: qty, unitPrice: price / qty },
              linesConsumed: 2,
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * After parsing an item line, scan the next few lines for an English translation.
 * Many receipts print the Chinese name (garbled by OCR) on one line and the
 * English name on the next. Use the English line as the display name if found.
 */
function findEnglishName(lines: string[], fromIndex: number): string | null {
  for (let i = fromIndex; i < Math.min(fromIndex + 3, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (isEndOfItemsLine(line)) return null;

    const fixedLine = fixOcrQtyPrefix(line);
    // Stop if this line is another priced item (any format)
    if (/^\d+\s+.+\s+\d+\.\d{2}\s*$/.test(fixedLine)) return null;
    if (/^[A-Za-z].+\s+\d+\.\d{2}\s+\d+\s+\d+\.\d{2}/.test(line)) return null;
    if (/^[A-Za-z].+\s+\d+\.\d{2}\s+\d+\s+/.test(line)) return null;

    // Skip lines that are per-unit info like "(14.00/ea)" or start with stray brackets
    if (/\(\d+\.?\d*\/(ea|ca)\)/i.test(line)) return null;
    if (/^[)\]}]/.test(line)) return null;

    // Skip lines that are just a qty + short text with no price (drink line like "1 RA")
    if (/^\d+\s+\S{1,4}$/.test(fixedLine)) continue;

    // A good English name: starts with a letter, has reasonable length, multiple chars
    if (/^[A-Z][a-zA-Z]/.test(line) && line.length > 3 && !isFooterLine(line)) {
      return line;
    }
  }
  return null;
}

interface ParseResult {
  item: ReceiptItem;
  nameUncertain: boolean;
}

/**
 * Common OCR misreads of single digits in qty fields.
 */
function fixOcrQty(raw: string): number {
  const map: Record<string, number> = { a: 3, A: 3, o: 0, O: 0, s: 5, S: 5, l: 1, I: 1, i: 1, b: 6, B: 8, g: 9 };
  if (/^\d+$/.test(raw)) return parseInt(raw);
  if (raw.length === 1 && raw in map) return map[raw];
  return -1;
}

function tryParseItemLine(line: string): ParseResult | null {
  // Clean up common OCR artifacts at end of line
  const cleaned = line.replace(/[|§&/\s]+$/, '').trim();

  // Pattern A: "1 ItemName ... 14.00" (qty at start, price at end)
  // Name may be garbled Chinese OCR -- mark as uncertain so we can look for English translation
  let match = cleaned.match(/^(\d+)\s+(.+?)\s+(\d+\.?\d{2})\s*(?:[)}\]i]*)$/);
  if (match) {
    const qty = parseInt(match[1]);
    const price = parseFloat(match[3]);
    const name = cleanItemName(match[2]);
    if (qty > 0 && qty < 100 && price > 0 && name.length > 0 && !isFooterLine(name)) {
      return { item: { id: nextId(), name, quantity: qty, unitPrice: price / qty }, nameUncertain: true };
    }
  }

  // Pattern B: "2 x Chicken Rice 12.00" or "2x Chicken Rice 12.00"
  match = cleaned.match(/^(\d+)\s*[xX]\s+(.+?)\s+(\d+\.?\d{2})\s*$/);
  if (match) {
    const qty = parseInt(match[1]);
    return {
      item: { id: nextId(), name: cleanItemName(match[2]), quantity: qty, unitPrice: parseFloat(match[3]) / qty },
      nameUncertain: false,
    };
  }

  // Pattern D: "ItemName price qty amount" (name first, then unit price, qty, line total)
  // Also handles OCR misread qty like 'a' for '3'
  match = cleaned.match(/^([A-Za-z][A-Za-z ']+?)\s+(\d+\.?\d{2})\s+(\S+)\s+(\d+\.?\d{2})\s*$/);
  if (match && !isFooterLine(match[1])) {
    const name = cleanItemName(match[1]);
    const qty = fixOcrQty(match[3]);
    const lineTotal = parseFloat(match[4]);
    if (qty > 0 && qty < 100 && name.length > 1) {
      const bestUnitPrice = qty > 0 ? lineTotal / qty : parseFloat(match[2]);
      return { item: { id: nextId(), name, quantity: qty, unitPrice: bestUnitPrice }, nameUncertain: false };
    }
  }

  // Pattern E: "ItemName price qty garbled" (name first, price, qty, but total is garbled by OCR)
  match = cleaned.match(/^([A-Za-z][A-Za-z ']+?)\s+(\d+\.?\d{2})\s+(\d+)\s+\S+\s*$/);
  if (match && !isFooterLine(match[1])) {
    const name = cleanItemName(match[1]);
    const unitPrice = parseFloat(match[2]);
    const qty = parseInt(match[3]);
    if (qty > 0 && qty < 100 && name.length > 1 && unitPrice > 0) {
      return { item: { id: nextId(), name, quantity: qty, unitPrice }, nameUncertain: false };
    }
  }

  // Pattern F: "ItemName price qty" (no line total column)
  match = cleaned.match(/^([A-Za-z][A-Za-z ']+?)\s+(\d+\.?\d{2})\s+(\d+)\s*$/);
  if (match && !isFooterLine(match[1])) {
    const name = cleanItemName(match[1]);
    const unitPrice = parseFloat(match[2]);
    const qty = parseInt(match[3]);
    if (qty > 0 && qty < 100 && name.length > 1 && unitPrice > 0) {
      return { item: { id: nextId(), name, quantity: qty, unitPrice }, nameUncertain: false };
    }
  }

  // Pattern G: "...junk... qty amount" (fallback: grab qty and total from end of line)
  // Handles heavily garbled lines like "Fish Chill Sauce 1% 6) 1 15.90" or "gig0 1 15.90"
  match = cleaned.match(/^(.+?)\s+(\d+)\s+(\d+\.\d{2})\s*$/);
  if (match && !isFooterLine(match[1])) {
    const rawName = match[1].replace(/\s+\S*\d\S*$/, '').trim();
    const name = cleanItemName(rawName || match[1]);
    const qty = parseInt(match[2]);
    const total = parseFloat(match[3]);
    if (qty > 0 && qty < 100 && total > 0 && name.length > 1) {
      return { item: { id: nextId(), name, quantity: qty, unitPrice: total / qty }, nameUncertain: false };
    }
  }

  // Pattern C: "Chicken Rice   12.00" (name + price, no leading qty)
  match = cleaned.match(/^([A-Za-z].+?)\s{2,}(\d+\.?\d{2})\s*$/);
  if (match && !isFooterLine(match[1])) {
    const name = cleanItemName(match[1]);
    if (name.length > 1) {
      return { item: { id: nextId(), name, quantity: 1, unitPrice: parseFloat(match[2]) }, nameUncertain: false };
    }
  }

  return null;
}

function cleanItemName(raw: string): string {
  return raw
    .replace(/\(\d+\.?\d*\/ea\)/gi, '')   // remove "(14.00/ea)"
    .replace(/\(\d+\.?\d*\/ca\)/gi, '')   // remove "(14.50/ca)" (OCR misread)
    .replace(/\{[^}]*\}/g, '')            // remove OCR artifacts like {5 E}
    .replace(/[()[\]{}]/g, '')            // remove stray brackets
    .replace(/\s+/g, ' ')
    .trim();
}

const FOOTER_KEYWORDS = /^(subtotal|sub\s*total|sub-total|total|tax|gst|sst|service|tip|discount|change|cash|card|balance|rounding|ounding|amount|tendered|visa|master|qr payment|bill rounding|qty|rm\b)/i;

function isFooterLine(text: string): boolean {
  return FOOTER_KEYWORDS.test(text.trim());
}

function extractTaxPercent(lines: string[]): number {
  for (const line of lines) {
    const match = line.match(/(?:tax|gst|sst|vat)\s*[(@:]*\s*(\d+\.?\d*)\s*%/i);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  // Calculate from subtotal vs total
  let subtotal = 0;
  let total = 0;
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    // Match: "Subtotal 93.50", "So 116.10" (OCR misread), "Subtotal: 93.50", "RM 147.90" after subtotal label
    const subMatch = lower.match(/^(?:subtotal|sub\s*total|sub-total|so)\s*:?\s+(?:rm\s*)?(\d+\.?\d*)/);
    if (subMatch) subtotal = parseFloat(subMatch[1]);
    // Match "Total (MYR) 93.50", "Total 93.50", "TOTAL : 116.10", "TOTAL RM 162.70"
    const totalMatch = lower.match(/^total\s*(?:\([^)]*\))?\s*:?\s*(?:rm\s*)?(\d+\.?\d*)/);
    if (totalMatch) total = parseFloat(totalMatch[1]);
  }

  if (subtotal > 0 && total > subtotal) {
    return Math.round(((total - subtotal) / subtotal) * 10000) / 100;
  }

  return 0;
}

function extractServiceChargePercent(lines: string[]): number {
  for (const line of lines) {
    // Match "Service Charge (10%)" or "Service charge 10%" or "Svc Chg 10%"
    const match = line.match(/(?:service\s*charge|svc\s*ch(?:a?r)?ge?)\s*[(@:]*\s*(\d+\.?\d*)\s*%/i);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return 0;
}
