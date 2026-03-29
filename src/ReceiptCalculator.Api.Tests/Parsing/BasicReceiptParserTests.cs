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

		var parser = new BasicReceiptParser();

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

		var parser = new BasicReceiptParser();

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

		var parser = new BasicReceiptParser();

		var receipt = parser.Parse(ocrText, "MYR");

		Assert.NotNull(receipt.Summary);
		Assert.Equal(new Money(4.00m, "MYR"), receipt.Summary!.Subtotal);
		Assert.Equal(2, receipt.TaxBreakdown.Count);
		Assert.Equal(ReceiptTaxType.ServiceTax, receipt.TaxBreakdown[0].Type);
		Assert.Equal(ReceiptTaxType.Sst, receipt.TaxBreakdown[1].Type);
	}
}
