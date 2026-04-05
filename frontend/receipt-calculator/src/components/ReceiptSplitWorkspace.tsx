import { useState } from 'react';
import { Receipt, ReceiptItem, SplitItem } from '../types';
import { amountToEditDraft, formatMoney } from '../utils/money';

interface ReceiptSplitWorkspaceProps {
  receipt: Receipt;
  splitItems: SplitItem[];
  onReceiptMetaChange: (patch: Partial<Pick<Receipt, 'shopName' | 'taxPercent' | 'serviceChargePercent'>>) => void;
  onItemsAndSplitChange: (items: ReceiptItem[], split: SplitItem[]) => void;
  onStartOver: () => void;
}

function PriceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleFocus = () => {
    setEditing(true);
    setDraft(amountToEditDraft(value));
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseFloat(draft.replace(/,/g, ''));
    onChange(Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className="input-num"
      value={editing ? draft : formatMoney(value)}
      onFocus={handleFocus}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
    />
  );
}

let addCounter = 2000;

/**
 * One surface: fix parsed lines and mark your share — no separate “edit” vs “split” screens.
 */
export default function ReceiptSplitWorkspace({
  receipt,
  splitItems,
  onReceiptMetaChange,
  onItemsAndSplitChange,
  onStartOver,
}: ReceiptSplitWorkspaceProps) {
  /** Svc % and tax % each apply to pre-fee amounts only (additive, not tax-on-service). */
  const multiplier = 1 + receipt.serviceChargePercent / 100 + receipt.taxPercent / 100;

  const updateLine = (id: string, itemPatch: Partial<ReceiptItem>, splitPatch?: Partial<SplitItem>) => {
    const items = receipt.items.map((item) =>
      item.id === id ? { ...item, ...itemPatch } : item,
    );
    const split = splitItems.map((row) => {
      if (row.id !== id) return row;
      let next: SplitItem = { ...row, ...itemPatch, ...splitPatch };
      if (next.selected) {
        if (next.yourQty < 1) next = { ...next, yourQty: 1 };
        if (next.yourQty > next.quantity) next = { ...next, yourQty: next.quantity };
      }
      return next;
    });
    onItemsAndSplitChange(items, split);
  };

  const removeLine = (id: string) => {
    onItemsAndSplitChange(
      receipt.items.filter((i) => i.id !== id),
      splitItems.filter((s) => s.id !== id),
    );
  };

  const addLine = () => {
    const id = `new-${++addCounter}`;
    const item: ReceiptItem = { id, name: '', quantity: 1, unitPrice: 0 };
    const row: SplitItem = { ...item, selected: false, yourQty: 0, sharedBy: 1 };
    onItemsAndSplitChange([...receipt.items, item], [...splitItems, row]);
  };

  const toggleSelected = (row: SplitItem, checked: boolean) => {
    updateLine(
      row.id,
      {},
      {
        selected: checked,
        yourQty: checked ? 1 : 0,
      },
    );
  };

  const subtotal = receipt.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const svcAmount = subtotal * (receipt.serviceChargePercent / 100);
  const taxAmount = subtotal * (receipt.taxPercent / 100);
  const total = subtotal + svcAmount + taxAmount;

  const selectedItems = splitItems.filter((item) => item.selected);
  const yourSubtotal = selectedItems.reduce(
    (sum, item) => sum + (item.unitPrice * item.yourQty) / item.sharedBy,
    0,
  );
  const yourSvc = yourSubtotal * (receipt.serviceChargePercent / 100);
  const yourTax = yourSubtotal * (receipt.taxPercent / 100);
  const yourTotal = yourSubtotal + yourSvc + yourTax;

  const showExtraCol = receipt.serviceChargePercent > 0 || receipt.taxPercent > 0;

  return (
    <div className="split-workspace">
      <header className="split-workspace-intro">
        <h2 className="split-workspace-title">Your receipt</h2>
        <p className="section-hint split-workspace-hint">
          Upload a receipt on the left and run a local or cloud scan to fill lines. Then fix any mistakes, tick
          what you had, and set your quantity (and how many people shared it). Your total updates as you go.
        </p>
      </header>

      <div className="split-workspace-meta split-workspace-meta-shop-only">
        <label className="split-meta-field split-meta-shop-wide">
          <span>Shop</span>
          <input
            type="text"
            value={receipt.shopName}
            onChange={(e) => onReceiptMetaChange({ shopName: e.target.value })}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="table-wrapper unified-table-wrap">
        <table className="unified-receipt-table">
          <thead>
            <tr>
              <th className="th-mine">Mine</th>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th>
                <abbr title="Price for one item, before bill tax & service">Unit price</abbr>
              </th>
              <th>
                <abbr title="Qty × unit price, before bill tax & service">Line total</abbr>
              </th>
              {showExtraCol && (
                <th>
                  <abbr title="Svc % plus tax % of unit price each (on pre-fee amount only; not stacked)">
                    +Fee / unit
                  </abbr>
                </th>
              )}
              <th>
                <abbr title="Unit price plus svc % and tax % of that price (additive)">Unit w/ fees</abbr>
              </th>
              <th>My qty</th>
              <th>
                <abbr title="Split with this many people">÷</abbr>
              </th>
              <th>You pay</th>
              <th className="th-trash" aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {splitItems.map((row, index) => {
              const lineTotal = row.quantity * row.unitPrice;
              const unitAllIn = row.unitPrice * multiplier;
              const myCost = row.selected ? (unitAllIn * row.yourQty) / row.sharedBy : 0;

              return (
                <tr key={row.id} className={row.selected ? 'unified-row-active' : 'unified-row-idle'}>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) => toggleSelected(row, e.target.checked)}
                      aria-label="I had this"
                    />
                  </td>
                  <td className="cell-num">{index + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="input-name"
                      value={row.name}
                      onChange={(e) => updateLine(row.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      className="input-num input-qty"
                      value={row.quantity}
                      onChange={(e) =>
                        updateLine(row.id, { quantity: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </td>
                  <td>
                    <PriceInput
                      value={row.unitPrice}
                      onChange={(v) => updateLine(row.id, { unitPrice: v })}
                    />
                  </td>
                  <td className="cell-right">{formatMoney(lineTotal)}</td>
                  {showExtraCol && (
                    <td className="cell-right cell-extra">{formatMoney(unitAllIn - row.unitPrice)}</td>
                  )}
                  <td className="cell-right">{formatMoney(unitAllIn)}</td>
                  <td>
                    <div className="qty-stepper">
                      <button
                        type="button"
                        className="btn-step"
                        disabled={!row.selected || row.yourQty <= 1}
                        onClick={() => updateLine(row.id, {}, { yourQty: row.yourQty - 1 })}
                      >
                        −
                      </button>
                      <span className="qty-value">{row.selected ? row.yourQty : '—'}</span>
                      <button
                        type="button"
                        className="btn-step"
                        disabled={!row.selected || row.yourQty >= row.quantity}
                        onClick={() => updateLine(row.id, {}, { yourQty: row.yourQty + 1 })}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="input-shared"
                      value={row.sharedBy}
                      disabled={!row.selected}
                      onChange={(e) =>
                        updateLine(row.id, {}, { sharedBy: Math.max(1, parseInt(e.target.value, 10) || 1) })
                      }
                    />
                  </td>
                  <td className="cell-right cell-cost">{row.selected ? formatMoney(myCost) : '—'}</td>
                  <td>
                    <button type="button" className="btn-icon" onClick={() => removeLine(row.id)} title="Remove row">
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn btn-add unified-add-row" onClick={addLine}>
        + Add line
      </button>

      <div className="totals-split-row">
        <div className="totals-box totals-box-full-receipt">
          <div className="totals-box-label">Full receipt</div>
          <div
            className="totals-receipt-rates"
            aria-label="Svc and tax each apply to subtotal before fees (additive)"
          >
            <label className="totals-rate-field">
              <span>Svc %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={receipt.serviceChargePercent}
                onChange={(e) =>
                  onReceiptMetaChange({ serviceChargePercent: parseFloat(e.target.value) || 0 })
                }
              />
            </label>
            <label className="totals-rate-field">
              <span>Tax %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={receipt.taxPercent}
                onChange={(e) => onReceiptMetaChange({ taxPercent: parseFloat(e.target.value) || 0 })}
              />
            </label>
          </div>
          <div className="total-row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {receipt.serviceChargePercent > 0 && (
            <div className="total-row">
              <span>Service ({receipt.serviceChargePercent}%)</span>
              <span>{formatMoney(svcAmount)}</span>
            </div>
          )}
          {receipt.taxPercent > 0 && (
            <div className="total-row">
              <span>Tax ({receipt.taxPercent}%)</span>
              <span>{formatMoney(taxAmount)}</span>
            </div>
          )}
          <div className="total-row total-grand">
            <span>Bill total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        <div className="totals-box your-totals">
          <div className="totals-box-label">Your share</div>
          <div className="total-row">
            <span>Subtotal</span>
            <span>{formatMoney(yourSubtotal)}</span>
          </div>
          {receipt.serviceChargePercent > 0 && (
            <div className="total-row">
              <span>Your svc</span>
              <span>{formatMoney(yourSvc)}</span>
            </div>
          )}
          {receipt.taxPercent > 0 && (
            <div className="total-row">
              <span>Your tax</span>
              <span>{formatMoney(yourTax)}</span>
            </div>
          )}
          <div className="total-row total-grand">
            <span>You pay</span>
            <span>{formatMoney(yourTotal)}</span>
          </div>
        </div>
      </div>

      <div className="split-workspace-footer">
        <button type="button" className="btn btn-secondary" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  );
}
