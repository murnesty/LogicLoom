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

