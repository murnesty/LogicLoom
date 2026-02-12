namespace ReceiptCalculator.Api.Domain.ValueObjects;

public enum ReceiptTaxType
{
    ServiceTax,
    Sst
}

public sealed class ReceiptTaxLine
{
    public ReceiptTaxType Type { get; }
    public Money Amount { get; }

    public ReceiptTaxLine(ReceiptTaxType type, Money amount)
    {
        Type = type;
        Amount = amount;
    }
}
