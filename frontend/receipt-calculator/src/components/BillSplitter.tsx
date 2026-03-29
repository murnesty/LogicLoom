import { SplitItem } from '../types';

interface BillSplitterProps {
  items: SplitItem[];
  taxPercent: number;
  serviceChargePercent: number;
  shopName: string;
  onItemsChange: (items: SplitItem[]) => void;
  onBack: () => void;
  onReset: () => void;
}

export default function BillSplitter({
  items,
  taxPercent,
  serviceChargePercent,
  shopName,
  onItemsChange,
  onBack,
  onReset,
}: BillSplitterProps) {
  const updateItem = (id: string, updates: Partial<SplitItem>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Markup multiplier: (1 + svc%) * (1 + tax%)
  const multiplier = (1 + serviceChargePercent / 100) * (1 + taxPercent / 100);

  const selectedItems = items.filter((item) => item.selected);
  const yourSubtotal = selectedItems.reduce((sum, item) => {
    return sum + (item.unitPrice * item.yourQty) / item.sharedBy;
  }, 0);
  const yourSvc = yourSubtotal * (serviceChargePercent / 100);
  const yourTax = (yourSubtotal + yourSvc) * (taxPercent / 100);
  const yourTotal = yourSubtotal + yourSvc + yourTax;

  return (
    <div className="splitter-section">
      <h3 className="shop-title">{shopName}</h3>
      <p className="section-hint">
        Tick items you had, set your quantity, and if shared enter how many people split it.
      </p>

      <div className="table-wrapper">
        <table className="split-table">
          <thead>
            <tr>
              <th>Mine?</th>
              <th>#</th>
              <th>Item</th>
              <th>Unit Price</th>
              {(serviceChargePercent > 0 || taxPercent > 0) && <th>+ Svc/Tax</th>}
              <th>All-in</th>
              <th>My Qty</th>
              <th>Shared By</th>
              <th>My Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const unitAllIn = item.unitPrice * multiplier;
              const myCost = item.selected
                ? (unitAllIn * item.yourQty) / item.sharedBy
                : 0;

              return (
                <tr key={item.id} className={item.selected ? 'row-selected' : 'row-dim'}>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        updateItem(item.id, {
                          selected: e.target.checked,
                          yourQty: e.target.checked ? 1 : 0,
                        })
                      }
                    />
                  </td>
                  <td className="cell-num">{index + 1}</td>
                  <td>
                    {item.name}
                    <span className="item-meta"> x{item.quantity}</span>
                  </td>
                  <td className="cell-right">{item.unitPrice.toFixed(2)}</td>
                  {(serviceChargePercent > 0 || taxPercent > 0) && (
                    <td className="cell-right cell-extra">{(unitAllIn - item.unitPrice).toFixed(2)}</td>
                  )}
                  <td className="cell-right">{unitAllIn.toFixed(2)}</td>
                  <td>
                    <div className="qty-stepper">
                      <button
                        className="btn-step"
                        disabled={!item.selected || item.yourQty <= 1}
                        onClick={() => updateItem(item.id, { yourQty: item.yourQty - 1 })}
                      >
                        −
                      </button>
                      <span className="qty-value">{item.selected ? item.yourQty : '-'}</span>
                      <button
                        className="btn-step"
                        disabled={!item.selected || item.yourQty >= item.quantity}
                        onClick={() => updateItem(item.id, { yourQty: item.yourQty + 1 })}
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
                      value={item.sharedBy}
                      disabled={!item.selected}
                      onChange={(e) =>
                        updateItem(item.id, { sharedBy: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="input-shared"
                    />
                  </td>
                  <td className="cell-right cell-cost">
                    {item.selected ? myCost.toFixed(2) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="totals-box your-totals">
        <div className="total-row">
          <span>Your Subtotal</span>
          <span>{yourSubtotal.toFixed(2)}</span>
        </div>
        {serviceChargePercent > 0 && (
          <div className="total-row">
            <span>Your Svc Charge ({serviceChargePercent}%)</span>
            <span>{yourSvc.toFixed(2)}</span>
          </div>
        )}
        {taxPercent > 0 && (
          <div className="total-row">
            <span>Your Tax ({taxPercent}%)</span>
            <span>{yourTax.toFixed(2)}</span>
          </div>
        )}
        <div className="total-row total-grand">
          <span>You Pay</span>
          <span>{yourTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-secondary" onClick={onReset}>Start Over</button>
      </div>
    </div>
  );
}
