using Xunit;
using ReceiptCalculator.Api.Domain.ValueObjects;
using ReceiptCalculator.Api.Infrastructure.Parsing;

namespace ReceiptCalculator.Api.Tests.Parsing;

public sealed class BasicReceiptParserTests
{
	[Fact]
	public void Parse_IgnoresShopNameAndDateTimeLines_ReturnsItemsAndSummary()
	{
		var ocrText = """
KEDAI MAKMUR
2025-01-31 14:23
NASI LEMAK 6.50
TEH TARIK 3.00
TOTAL 9.50
""";

		var parser = new BasicReceiptParser(new TestParserRulesProvider());

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.Equal(2, receipt.Items.Count);
		Assert.Equal("NASI LEMAK", receipt.Items[0].Name);
		Assert.Equal(new Money(6.50m, "MYR"), receipt.Items[0].LineAmount);
		Assert.Equal(new Money(9.50m, "MYR"), receipt.Summary!.Total);
	}

	[Fact]
	public void Parse_WhenItemHasDescriptionOnPriorLines_UsesAmountLine()
	{
		var ocrText = """
MY CAFE
12/01/2025 09:15
ICED LATTE
COLD
QTY PRICE DISC AMOUNT
ICED LATTE 2 6.50 0.00 6.50
SUBTOTAL 6.50
TOTAL 6.50
""";

		var parser = new BasicReceiptParser(new TestParserRulesProvider());

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.Single(receipt.Items);
		Assert.Equal("ICED LATTE 2 6.50 0.00", receipt.Items[0].Name);
		Assert.Equal(new Money(6.50m, "MYR"), receipt.Items[0].LineAmount);
	}

	[Fact]
	public void Parse_WhenSummaryIncludesTaxes_BuildsTaxBreakdown()
	{
		var ocrText = """
KEDAI MINUM
KOPI 4.00
SUBTOTAL 4.00
SERVICE TAX 0.24
SST 0.24
TOTAL 4.48
""";

		var parser = new BasicReceiptParser(new TestParserRulesProvider());

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.NotNull(receipt.Summary);
		Assert.Equal(new Money(4.00m, "MYR"), receipt.Summary!.Subtotal);
		Assert.Equal(2, receipt.TaxBreakdown.Count);
		Assert.Equal(ReceiptTaxType.ServiceTax, receipt.TaxBreakdown[0].Type);
		Assert.Equal(ReceiptTaxType.Sst, receipt.TaxBreakdown[1].Type);
	}

	[Fact]
	public void Parse_TesseractNameLineThenNumericRow_ParsesStoreHubStyleItems()
	{
		var ocrText = """
Twins DakGalBi Restaurant
Item Price Qty Discount Amount
77. Kimchi Jjigae (Lunch) Z| M7H (4 oi)
21.00 1 0.00 21.00
89. Dak Kal Guksu (Lunch) B& == (Hd Ol)
15.00 5 0.00 75.00
Total Sales (Exc. Tax) RM 126.00
TOTAL RM 126.00
""";

		var parser = new BasicReceiptParser(new TestParserRulesProvider());

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.Equal(2, receipt.Items.Count);
		Assert.Contains("Kimchi", receipt.Items[0].Name);
		Assert.Equal(new Money(21.00m, "MYR"), receipt.Items[0].LineAmount);
		Assert.Contains("Dak Kal Guksu", receipt.Items[1].Name);
		Assert.Equal(5, receipt.Items[1].Quantity.Value);
		Assert.Equal(new Money(75.00m, "MYR"), receipt.Items[1].LineAmount);
		Assert.NotNull(receipt.Summary);
		Assert.Equal(new Money(126.00m, "MYR"), receipt.Summary!.Total);
	}

	[Fact]
	public void Parse_OcrDiscount000_StillParsesNumericRow()
	{
		var ocrText = """
SHOP
91. Kimchi Kalguksu (Lunch)
15.00 1 000 15.00
TOTAL 15.00
""";

		var parser = new BasicReceiptParser(new TestParserRulesProvider());

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.Single(receipt.Items);
		Assert.Contains("Kimchi", receipt.Items[0].Name);
		Assert.Equal(new Money(15.00m, "MYR"), receipt.Items[0].LineAmount);
	}

	[Fact]
	public void Parse_JengPanMeeStyle_OnlyParsesLinesBetweenQtyHeaderAndSubtotal()
	{
		var ocrText = """
JENG PAN MEE SS15
+60165931134
jengpanmee@gmail.com
Cashier: staff D2
Table Pax: 1
Qty Item Price (MYR)
1 PM10 Loh Pan Mee Thin 14.00
1 SETA Set A (13.00/ea) 13.00
1 SETB Set B (14.50/ea) 14.50
Subtotal 93.50
Total (MYR) 93.50
""";

		var parser = new BasicReceiptParser(new TestParserRulesProvider());

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.Equal(3, receipt.Items.Count);
		Assert.DoesNotContain(receipt.Items, i => i.Name.Contains("60165931134"));
		Assert.DoesNotContain(receipt.Items, i => i.Name.Contains("Cashier", StringComparison.OrdinalIgnoreCase));
		Assert.Equal(new Money(93.50m, "MYR"), receipt.Summary!.Total);
	}

	[Fact]
	public void Parse_GoogleVisionSplitsQtyNameAndAmountAcrossLines()
	{
		var ocrText = """
JENG PAN MEE
Qty
Item Price (MYR)
1 PM10 Loh Pan Mee Thin
14.00
1 SETA Set A (13.00/ea)
13.00
Subtotal 27.00
""";

		var parser = new BasicReceiptParser(new TestParserRulesProvider());

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.Equal(2, receipt.Items.Count);
		Assert.Contains("PM10", receipt.Items[0].Name);
		Assert.Equal(new Money(14.00m, "MYR"), receipt.Items[0].LineAmount);
		Assert.Contains("SETA", receipt.Items[1].Name);
		Assert.Equal(new Money(13.00m, "MYR"), receipt.Items[1].LineAmount);
	}
}
