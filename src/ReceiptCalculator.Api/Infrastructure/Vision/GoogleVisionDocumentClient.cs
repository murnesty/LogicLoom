using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace ReceiptCalculator.Api.Infrastructure.Vision;

public sealed class GoogleVisionDocumentClient
{
    private readonly HttpClient _http;
    private readonly IOptions<VisionOptions> _options;

    public GoogleVisionDocumentClient(HttpClient http, IOptions<VisionOptions> options)
    {
        _http = http;
        _options = options;
    }

    public async Task<string> AnnotateDocumentsAsync(IReadOnlyList<string> base64Images, CancellationToken cancellationToken)
    {
        var key = _options.Value.ApiKey?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(key))
            throw new InvalidOperationException("Vision API key is not configured on the server.");

        var payload = new
        {
            requests = base64Images.Select(b64 => new
            {
                image = new { content = b64 },
                features = new[] { new { type = "DOCUMENT_TEXT_DETECTION" } },
            }).ToArray(),
        };

        var body = JsonSerializer.Serialize(payload);
        var url = $"https://vision.googleapis.com/v1/images:annotate?key={Uri.EscapeDataString(key)}";

        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        using var response = await _http.PostAsync(url, content, cancellationToken);
        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            string? message = null;
            try
            {
                using var doc = JsonDocument.Parse(responseJson);
                if (doc.RootElement.TryGetProperty("error", out var err) &&
                    err.TryGetProperty("message", out var msg))
                    message = msg.GetString();
            }
            catch
            {
                /* ignore */
            }

            throw new HttpRequestException(message ?? $"Vision API error ({(int)response.StatusCode})");
        }

        using var parsed = JsonDocument.Parse(responseJson);
        var texts = new List<string>();
        if (parsed.RootElement.TryGetProperty("responses", out var responses))
        {
            foreach (var item in responses.EnumerateArray())
            {
                if (item.TryGetProperty("error", out var err))
                {
                    var m = err.TryGetProperty("message", out var em) ? em.GetString() : "Vision response error";
                    throw new InvalidOperationException(m);
                }

                if (item.TryGetProperty("fullTextAnnotation", out var fta) &&
                    fta.TryGetProperty("text", out var t))
                {
                    var s = t.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                        texts.Add(s.Trim());
                }
            }
        }

        return string.Join("\n\n", texts);
    }
}
