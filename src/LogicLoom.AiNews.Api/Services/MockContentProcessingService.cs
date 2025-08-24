using LogicLoom.AiNews.Core.Interfaces;
using LogicLoom.AiNews.Core.Models;

namespace LogicLoom.AiNews.Api.Services;

public class MockContentProcessingService : IContentProcessingService
{
    public async Task<NewsArticle> ProcessArticleAsync(NewsArticle rawArticle)
    {
        // Simulate async processing
        await Task.Delay(50);

        // Simple mock processing - in real implementation this would do NLP
        rawArticle.Category = ClassifyContent(rawArticle.Title, rawArticle.Content);
        rawArticle.Summary = GenerateSummary(rawArticle.Content);

        return rawArticle;
    }

    public async Task<AIModel> ProcessModelAsync(AIModel rawModel)
    {
        // Simulate async processing
        await Task.Delay(50);

        // Mock processing - extract additional metadata, validate data, etc.
        return rawModel;
    }

    public string ClassifyContent(string title, string content)
    {
        var text = $"{title} {content}".ToLower();

        // Simple keyword-based classification
        if (ContainsAny(text, "gpt", "claude", "gemini", "deepseek", "released", "announced", "launch"))
            return "Model Release";

        if (ContainsAny(text, "research", "paper", "study", "experiment", "arxiv"))
            return "Research";

        if (ContainsAny(text, "benchmark", "performance", "test", "score", "evaluation"))
            return "Benchmark";

        if (ContainsAny(text, "funding", "acquisition", "investment", "company", "startup"))
            return "Industry News";

        return "General";
    }

    public string GenerateSummary(string content)
    {
        if (string.IsNullOrEmpty(content))
            return "";

        // Simple mock summary - take first sentence or first 150 characters
        var sentences = content.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (sentences.Length > 0)
        {
            var firstSentence = sentences[0].Trim();
            return firstSentence.Length > 150 ? firstSentence.Substring(0, 150) + "..." : firstSentence + ".";
        }

        return content.Length > 150 ? content.Substring(0, 150) + "..." : content;
    }

    private static bool ContainsAny(string text, params string[] keywords)
    {
        return keywords.Any(keyword => text.Contains(keyword, StringComparison.OrdinalIgnoreCase));
    }
}
