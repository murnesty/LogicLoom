/**
 * Display-only: half-up rounding to cents (2 decimals), stable for typical float noise.
 * Do not use this to persist amounts — keep full precision in state and only format for UI.
 */
export function roundMoneyHalfUp(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  if (amount === 0) return 0;
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  return sign * Number(Math.round(Number(`${abs}e+2`)) + 'e-2');
}

/** Read-only display: half-up to cents, 2 decimal places. */
export function formatMoney(amount: number): string {
  return roundMoneyHalfUp(amount).toFixed(2);
}

/**
 * String shown when focusing a price field — reflects stored value with up to 8 dp (trimmed),
 * so editing does not snap to the rounded display value.
 */
export function amountToEditDraft(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  const s = amount.toFixed(8).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  if (s === '-0') return '0';
  return s;
}
