import { describe, it, expect, beforeEach } from 'vitest';
import { parseReceiptText, resetIdCounter } from './receiptParser';

beforeEach(() => {
  resetIdCounter();
});

describe('receiptParser', () => {
  describe('Jeng Pan Mee receipt', () => {
    const rawText = `JENG PAN MEE S515
JENG PAN MEE
REGISTRATION NO: 202103147240 (AS0430840-V)
NO.30(GF), JALAN S515/4B, 47500, SUBANG JAYA,
SELANGOR, MALAYSIA
+60165931134
a Jengpanmee@gmail.com
Invoice no: 4935 a Ca
A ORDER
Date: 25/03/2026 12:23
Cashier: staff D2
Table Pax: 1
Qty Item Price (MYR)
1 PM10 {5 ELoh Pan Mee (Y (4) 14.00 i)
Thin) (14.00/ea)
1 SETASetA (13.00/ea) 13.00
1 SETB Set B (14.50/ca) 14.50
1 SETA Set A (13.00/ea) 13.00
1 SETA Set A (13 00/ea) 13.00 &§
1 PM09 FIZ AEClaypot Yee Mee 11.50 §
(11.50/ea)
1 SETBSetB (14.50/ca) 14.50
| 7 ay
ey Subtotal 93.50
Bill rounding 0.00
| Total (MYR) 93.50
| QR Payment 93.50
Change oe Ooo
to rate us! [OFS0
Hh or it {0 let us know how you enjoyed iE
with us. ues |
pank you for visiing us.
Te see you again 500! [of
Tris sn offical eset
POWEHED BY FEEOME SAR] HOS`;

    it('should extract shop name', () => {
      const result = parseReceiptText(rawText);
      expect(result.shopName).toBe('JENG PAN MEE S515');
    });

    it('should extract 7 items', () => {
      const result = parseReceiptText(rawText);
      expect(result.items).toHaveLength(7);
    });

    it('should parse item names correctly', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name);
      expect(names).toEqual([
        expect.stringContaining('Loh Pan Mee'),
        expect.stringContaining('SETA'),
        expect.stringContaining('SETB'),
        expect.stringContaining('SETA'),
        expect.stringContaining('SETA'),
        expect.stringContaining('Claypot Yee Mee'),
        expect.stringContaining('SETB'),
      ]);
    });

    it('should parse all quantities as 1', () => {
      const result = parseReceiptText(rawText);
      result.items.forEach((item) => {
        expect(item.quantity).toBe(1);
      });
    });

    it('should parse unit prices correctly', () => {
      const result = parseReceiptText(rawText);
      const prices = result.items.map((i) => i.unitPrice);
      expect(prices).toEqual([14.00, 13.00, 14.50, 13.00, 13.00, 11.50, 14.50]);
    });

    it('should calculate 0% tax (subtotal equals total)', () => {
      const result = parseReceiptText(rawText);
      expect(result.taxPercent).toBe(0);
    });

    it('item prices should sum to 93.50', () => {
      const result = parseReceiptText(rawText);
      const sum = result.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      expect(sum).toBeCloseTo(93.50, 2);
    });

    it('should not include continuation lines as items', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name);
      names.forEach((name) => {
        expect(name).not.toMatch(/^Thin/);
        expect(name).not.toMatch(/^\(11\.50/);
      });
    });

    it('should not include footer lines as items', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name.toLowerCase());
      names.forEach((name) => {
        expect(name).not.toContain('subtotal');
        expect(name).not.toContain('total');
        expect(name).not.toContain('change');
        expect(name).not.toContain('payment');
        expect(name).not.toContain('rounding');
      });
    });

    it('should strip OCR artifacts from item names', () => {
      const result = parseReceiptText(rawText);
      result.items.forEach((item) => {
        expect(item.name).not.toContain('{');
        expect(item.name).not.toContain('}');
        expect(item.name).not.toContain('§');
        expect(item.name).not.toMatch(/\(\d+\.\d+\/ea\)/);
        expect(item.name).not.toMatch(/\(\d+\.\d+\/ca\)/);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle receipt with explicit tax percentage', () => {
      const rawText = `SOME SHOP
Qty Item Price
1 Nasi Lemak 8.00
1 Teh Tarik 3.50
Subtotal 11.50
SST @ 6% 0.69
Total 12.19`;
      const result = parseReceiptText(rawText);
      expect(result.taxPercent).toBe(6);
    });

    it('should calculate tax from subtotal vs total when no explicit %', () => {
      const rawText = `SOME SHOP
Qty Item Price
1 Burger 10.00
Subtotal 10.00
Tax 1.00
Total 11.00`;
      const result = parseReceiptText(rawText);
      expect(result.taxPercent).toBe(10);
    });

    it('should handle "2 x item" format', () => {
      const rawText = `SOME SHOP
Qty Item Price
2 x Chicken Rice 24.00
1 x Milo 3.50`;
      const result = parseReceiptText(rawText);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].unitPrice).toBe(12.00);
      expect(result.items[1].quantity).toBe(1);
      expect(result.items[1].unitPrice).toBe(3.50);
    });

    it('should return Unknown Shop when no shop name found', () => {
      const rawText = `Date: 25/03/2026
Qty Item Price
1 Roti Canai 2.50`;
      const result = parseReceiptText(rawText);
      expect(result.shopName).toBe('Unknown Shop');
    });

    it('should preserve raw text in result', () => {
      const rawText = 'Some raw text here';
      const result = parseReceiptText(rawText);
      expect(result.rawText).toBe(rawText);
    });
  });

  describe('ITK Fabulous receipt (OCR qty misreads)', () => {
    const rawText = `ITK FABULOUS SDN BHD
(CO.NO. 202101013336) (1413635-K)
NO.19-G,JALAN §§15/48,
47500 SUBANG JAYA, SELANGOR
H/P: +6018-3994 180 /TEL: 03-5613 4516
GUEST CHECK
Table: 11 PAX: 9
Order: ORD0O006
Staff: KK Date: 16-03-2026
Qty Item Amount
1 TAINS Hh SA i tN S3 11.90
Mince Pk Tomato Sp Rice $3
1 RA
Herbal Tea Hot
1 EUNARIRE S5 12.90
ThaiBMincedPorkRiceEggss
1 RS
Herbal Tea Cold
1 BAM SS 12.90
ThaiBMincedPorkRiceEggS5
RET 8
Herbal Tea Cold
1 RANGEL s5 12.90
ThaiBMincedPorkRiceEggS5
1 mA
Herbal Tea Cold
to HBAMRRE ss 12.90
ThaiBMincedPorkRiceEggSs
Lo RARA
Herbal Tea Cold
1 BAAREE Ss 12.90
ThaiBMincedPorkRiceEggSs
1 EHA
Herbal Tea Cold
to BEANIE Ss 12.90
ThaiBMincedPorkRiceEggss
Lo RE
Herbal Tea Cold
Lo BAM E ss 12.90
ThaiBMincedPorkRiceEggss
Lomas
Herbal Tea Cold
Lo HEBAR SB 13.90
KamHeong Chicken Rice S68
Ludi :
Herbal Tea Hot
So 116.10
ounding Adj. 0.00
TOTAL : 116.10`;

    it('should extract shop name', () => {
      const result = parseReceiptText(rawText);
      expect(result.shopName).toBe('ITK FABULOUS SDN BHD');
    });

    it('should extract 9 items (handling OCR "to"/"Lo" as qty 1)', () => {
      const result = parseReceiptText(rawText);
      expect(result.items).toHaveLength(9);
    });

    it('should parse all quantities as 1', () => {
      const result = parseReceiptText(rawText);
      result.items.forEach((item) => {
        expect(item.quantity).toBe(1);
      });
    });

    it('should parse unit prices correctly', () => {
      const result = parseReceiptText(rawText);
      const prices = result.items.map((i) => i.unitPrice);
      expect(prices).toEqual([11.90, 12.90, 12.90, 12.90, 12.90, 12.90, 12.90, 12.90, 13.90]);
    });

    it('item prices should sum to 116.10', () => {
      const result = parseReceiptText(rawText);
      const sum = result.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      expect(sum).toBeCloseTo(116.10, 2);
    });

    it('should calculate 0% tax (subtotal equals total)', () => {
      const result = parseReceiptText(rawText);
      expect(result.taxPercent).toBe(0);
    });

    it('should use English translation lines as item names', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name);
      expect(names[0]).toBe('Mince Pk Tomato Sp Rice $3');
      expect(names[8]).toBe('KamHeong Chicken Rice S68');
      // Items 1-7 are all ThaiBMincedPorkRiceEgg variants
      for (let i = 1; i <= 7; i++) {
        expect(names[i]).toMatch(/^ThaiBMincedPorkRiceEgg/);
      }
    });

    it('should not include drink lines or footer lines as items', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name.toLowerCase());
      names.forEach((name) => {
        expect(name).not.toContain('herbal tea');
        expect(name).not.toContain('subtotal');
        expect(name).not.toContain('total');
        expect(name).not.toContain('rounding');
      });
    });
  });

  describe('Noodle Mansion receipt (Item Price Qty Amount format)', () => {
    const rawText = `Moelle Mansion
Address: Growl floc, 14 57, Jalan $518/6A SUBANG
JAVA Eolangor 47500
Phas 60164276796
Compriy Name
Teblo #
-
| r9
Receipt Date: 0.20107 15 18:20:66
Receipt ¥: 5001 ::0:34714 346
Cashier. Kelis vg
Register # ; | a
Item Prien aty Amount /
Spoclal Soup 19.90 1 los
Fish Ball, Thict , Extra, Normal, Dine in
Signature 18.90 1 13.90
Sauce
Minced Pork, Thick, Normal, Signalure sauce, | ess
salty, Pork Lare Loss Dire in
Special Soup 14.90 a 41.70
Minced Pork, Thick, Isom al, Normal, Din in Mi
Signature 18.80 1 13.90
'Sauce
Minced Pork, Thick, Normal, Signature sauce, Less
salty, Pork Larc, Less Dire in
Fish Chill Sauce 1% 6) 1 15.90
Fish Ball, Thick, Normal, Extra, Dine in, Egg
Fried Wantan 2.90 1 9.90
1 Fuzuk Bon 1 8.90
gig0 1 15.90
il 13.80
CE
i RM 147.90
AM 1479
L RM 0.00
1 RM 0.01
RM 162.70
RM 162.70
ore`;

    it('should extract shop name', () => {
      const result = parseReceiptText(rawText);
      expect(result.shopName).toBe('Moelle Mansion');
    });

    it('should detect "Item Prien aty Amount" as a valid header', () => {
      const result = parseReceiptText(rawText);
      // Should find items (not 0), meaning header was detected
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should parse items in Name-Price-Qty-Amount format', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name);
      // Should find key items from the receipt
      expect(names).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Signature'),
          expect.stringContaining('Fried Wantan'),
        ])
      );
    });

    it('should not include description lines as items', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name.toLowerCase());
      names.forEach((name) => {
        expect(name).not.toContain('fish ball');
        expect(name).not.toContain('minced pork');
        expect(name).not.toContain('pork lare');
        expect(name).not.toContain('salty');
      });
    });

    it('should not include RM footer lines as items', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name.toLowerCase());
      names.forEach((name) => {
        expect(name).not.toBe('rm');
      });
    });

    it('should extract 8 items', () => {
      const result = parseReceiptText(rawText);
      expect(result.items).toHaveLength(8);
    });

    it('should parse item names correctly', () => {
      const result = parseReceiptText(rawText);
      const names = result.items.map((i) => i.name);
      expect(names[0]).toBe('Spoclal Soup');
      expect(names[1]).toBe('Signature');
      expect(names[2]).toBe('Special Soup');
      expect(names[3]).toBe('Signature');
      expect(names[4]).toContain('Fish Chill Sauce');
      expect(names[5]).toBe('Fried Wantan');
      // OCR garbled items -- user can edit
      expect(names[6]).toContain('Fuzuk Bon');
      expect(names[7]).toBe('gig0');
    });

    it('should parse quantities correctly (OCR "a" -> 3)', () => {
      const result = parseReceiptText(rawText);
      const qtys = result.items.map((i) => i.quantity);
      expect(qtys[0]).toBe(1);  // Spoclal Soup
      expect(qtys[1]).toBe(1);  // Signature
      expect(qtys[2]).toBe(3);  // Special Soup (OCR 'a' -> 3)
      expect(qtys[3]).toBe(1);  // Signature
      expect(qtys[4]).toBe(1);  // Fish Chill Sauce
      expect(qtys[5]).toBe(1);  // Fried Wantan
      expect(qtys[6]).toBe(1);  // Fuzuk Bon
      expect(qtys[7]).toBe(1);  // gig0
    });

    it('should parse unit prices correctly', () => {
      const result = parseReceiptText(rawText);
      const prices = result.items.map((i) => i.unitPrice);
      expect(prices[0]).toBeCloseTo(19.90, 2);  // Spoclal Soup
      expect(prices[1]).toBeCloseTo(13.90, 2);  // Signature (line total 13.90 / qty 1)
      expect(prices[2]).toBeCloseTo(13.90, 2);  // Special Soup (41.70 / 3)
      expect(prices[3]).toBeCloseTo(13.90, 2);  // Signature (line total 13.90 / qty 1)
      expect(prices[4]).toBeCloseTo(15.90, 2);  // Fish Chill Sauce
      expect(prices[5]).toBeCloseTo(9.90, 2);   // Fried Wantan
      expect(prices[6]).toBeCloseTo(8.90, 2);   // Fuzuk Bon
      expect(prices[7]).toBeCloseTo(15.90, 2);  // gig0
    });

    it('should calculate 0% tax', () => {
      const result = parseReceiptText(rawText);
      expect(result.taxPercent).toBe(0);
    });

    it('should calculate 0% service charge', () => {
      const result = parseReceiptText(rawText);
      expect(result.serviceChargePercent).toBe(0);
    });
  });
});
