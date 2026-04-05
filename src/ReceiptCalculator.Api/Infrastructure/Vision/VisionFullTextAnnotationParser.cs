using System.Text.Json;

namespace ReceiptCalculator.Api.Infrastructure.Vision;

/// <summary>
/// Reads the Vision <c>fullTextAnnotation.text</c> field (Google’s canonical UTF-8 string for the document).
/// </summary>
public static class VisionFullTextAnnotationParser
{
    public static string ExtractText(JsonElement fullTextAnnotation)
    {
        if (fullTextAnnotation.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return string.Empty;
        }

        if (fullTextAnnotation.TryGetProperty("text", out var flat) && flat.ValueKind == JsonValueKind.String)
        {
            return (flat.GetString() ?? string.Empty).Trim();
        }

        return string.Empty;
    }
}
