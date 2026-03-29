import { useState } from 'react';
import { Receipt, ReceiptItem } from '../types';
import { amountToEditDraft, formatMoney } from '../utils/money';

interface ReceiptEditorProps {
  receipt: Receipt;
  onReceiptChange: (receipt: Receipt) => void;
  onNext: () => void;
  onBack: () => void;
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

let addCounter = 1000;

export default function ReceiptEditor({ receipt, onReceiptChange, onNext, onBack }: ReceiptEditorProps) {
  const updateItem = (id: string, field: keyof ReceiptItem, value: string | number) => {
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const removeItem = (id: string) => {
    onReceiptChange({
      ...receipt,
      items: receipt.items.filter((item) => item.id !== id),
    });
  };

  const addItem = () => {
    onReceiptChange({
      ...receipt,
      items: [
        ...receipt.items,
        { id: `new-${++addCounter}`, name: '', quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const subtotal = receipt.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const svcAmount = subtotal * (receipt.serviceChargePercent / 100);
  const taxAmount = subtotal * (receipt.taxPercent / 100);
  const total = subtotal + svcAmount + taxAmount;

  return (
    <div className="editor-section">
      <p className="section-hint">
        Review and correct the parsed items. Add or remove rows as needed.
      </p>

      <div className="editor-header">
        <label>
          Shop Name
          <input
            type="text"
            value={receipt.shopName}
            onChange={(e) => onReceiptChange({ ...receipt, shopName: e.target.value })}
          />
        </label>
      </div>

      <div className="table-wrapper">
        <table className="receipt-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, index) => {
              const lineTotal = item.quantity * item.unitPrice;
              return (
                <tr key={item.id}>
                  <td className="cell-num">{index + 1}</td>
                  <td>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="input-name"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="input-num"
                    />
                  </td>
                  <td>
                    <PriceInput
                      value={item.unitPrice}
                      onChange={(v) => updateItem(item.id, 'unitPrice', v)}
                    />
                  </td>
                  <td className="cell-right">{formatMoney(lineTotal)}</td>
                  <td>
                    <button className="btn-icon" onClick={() => removeItem(item.id)} title="Remove">
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="add-and-charges">
        <button className="btn btn-add" onClick={addItem}>+ Add Item</button>
        <div className="charge-inputs">
          <label>
            Svc Charge %
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={receipt.serviceChargePercent}
              onChange={(e) => onReceiptChange({ ...receipt, serviceChargePercent: parseFloat(e.target.value) || 0 })}
            />
          </label>
          <label>
            Tax %
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={receipt.taxPercent}
              onChange={(e) => onReceiptChange({ ...receipt, taxPercent: parseFloat(e.target.value) || 0 })}
            />
          </label>
        </div>
      </div>

      <div className="totals-box">
        <div className="total-row">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        {receipt.serviceChargePercent > 0 && (
          <div className="total-row">
            <span>Service Charge ({receipt.serviceChargePercent}%)</span>
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
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={receipt.items.length === 0}
        >
          Split Bill →
        </button>
      </div>
    </div>
  );
}
