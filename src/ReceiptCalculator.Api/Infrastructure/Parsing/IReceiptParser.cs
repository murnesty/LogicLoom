using ReceiptCalculator.Api.Domain.Entities;

namespace ReceiptCalculator.Api.Infrastructure.Parsing;

public interface IReceiptParser
{
    Receipt Parse(string ocrText, string currency);
}
