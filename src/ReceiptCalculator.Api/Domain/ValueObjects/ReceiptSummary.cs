namespace ReceiptCalculator.Api.Domain.ValueObjects;

public sealed class ReceiptSummary
{
    public Money Subtotal { get; }
    public Money ServiceTax { get; }
    public Money SstTax { get; }
    public Money Total { get; }

    public ReceiptSummary(Money subtotal, Money serviceTax, Money sstTax, Money total)
    {
        Subtotal = subtotal;
        ServiceTax = serviceTax;
        SstTax = sstTax;
        Total = total;
    }
}
