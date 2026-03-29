namespace ReceiptCalculator.Api.DTOs;

public class VisionDocumentTextRequestDto
{
    /// <summary>Base64-encoded image bytes (no data: URL prefix), one entry per image.</summary>
    public List<string> Images { get; set; } = new();
}
