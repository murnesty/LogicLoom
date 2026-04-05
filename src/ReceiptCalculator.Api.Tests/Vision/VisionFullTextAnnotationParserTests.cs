using System.Text.Json;
using ReceiptCalculator.Api.Infrastructure.Vision;
using Xunit;

namespace ReceiptCalculator.Api.Tests.Vision;

public class VisionFullTextAnnotationParserTests
{
    [Fact]
    public void ExtractText_ReturnsTrimmedFullTextAnnotationText()
    {
        using var doc = JsonDocument.Parse("""{"text":"  Hello\nWorld  "}""");
        var s = VisionFullTextAnnotationParser.ExtractText(doc.RootElement);
        Assert.Equal("Hello\nWorld", s);
    }
}
