import { describe, expect, it } from 'vitest';
import { amountToEditDraft, formatMoney, roundMoneyHalfUp } from './money';

describe('roundMoneyHalfUp', () => {
  it('rounds half up at cent boundary', () => {
    expect(roundMoneyHalfUp(2.064)).toBe(2.06);
    expect(roundMoneyHalfUp(2.065)).toBe(2.07);
    expect(roundMoneyHalfUp(2.055)).toBe(2.06);
  });

  it('handles float noise from additive tax example', () => {
    const fee = 12.9 * 0.1 + 12.9 * 0.06;
    expect(formatMoney(fee)).toBe('2.06');
  });

  it('handles 0.1 + 0.2', () => {
    expect(formatMoney(0.1 + 0.2)).toBe('0.30');
  });

  it('negative amounts round half away from zero', () => {
    expect(roundMoneyHalfUp(-2.065)).toBe(-2.07);
  });
});

describe('amountToEditDraft', () => {
  it('keeps fractional precision for editing (not display rounding)', () => {
    expect(amountToEditDraft(12.905)).toBe('12.905');
    expect(amountToEditDraft(12.9)).toBe('12.9');
  });
});
