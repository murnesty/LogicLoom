using ReceiptCalculator.Api.Domain.Entities;
using ReceiptCalculator.Api.Domain.ValueObjects;

namespace ReceiptCalculator.Api.Infrastructure.Parsing;

public sealed class DummyReceiptParser : IReceiptParser
{
    public Receipt Parse(string ocrText, string currency)
    {
        var items = new List<ReceiptItem>
        {
            new(Guid.NewGuid(), "Nasi Lemak", Quantity.One(), new Money(6.50m, currency), new Money(6.50m, currency)),
            new(Guid.NewGuid(), "Teh Tarik", Quantity.One(), new Money(3.00m, currency), new Money(3.00m, currency))
        };

        var summary = new ReceiptSummary(
            new Money(9.50m, currency),
            Money.Zero(currency),
            new Money(0.57m, currency),
            new Money(10.07m, currency));

        var taxes = new List<ReceiptTaxLine>
        {
            new(ReceiptTaxType.Sst, new Money(0.57m, currency))
        };

        return new Receipt(Guid.NewGuid(), items, summary, taxes, 0.85m);
    }
}
