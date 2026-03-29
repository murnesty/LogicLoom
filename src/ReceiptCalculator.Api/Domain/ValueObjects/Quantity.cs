namespace ReceiptCalculator.Api.Domain.ValueObjects;

public readonly record struct Quantity
{
    public decimal Value { get; }

    public Quantity(decimal value)
    {
        if (value <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(value), "Quantity must be greater than zero.");
        }

        Value = value;
    }

    public static Quantity One() => new(1m);
}
