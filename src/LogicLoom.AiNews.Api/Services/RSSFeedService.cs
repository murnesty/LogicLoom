using LogicLoom.AiNews.Core.Interfaces;
using LogicLoom.AiNews.Core.Models;
using System.ServiceModel.Syndication;
using System.Xml;

namespace LogicLoom.AiNews.Api.Services;

public class RSSFeedService : IContentScraperService
{
    private readonly HttpClient _httpClient;
    private readonly List<RSSSource> _rssSources;

    public RSSFeedService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _rssSources = new List<RSSSource>
        {
            new RSSSource 
            { 
                Name = "TechCrunch AI", 
                Url = "https://techcrunch.com/category/artificial-intelligence/feed/",
                Category = "AI News"
            },
            new RSSSource 
            { 
                Name = "VentureBeat AI", 
                Url = "https://venturebeat.com/ai/feed/",
                Category = "AI Business"
            },
            new RSSSource 
            { 
                Name = "The Verge AI", 
                Url = "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml",
                Category = "AI Technology"
            }
        };
    }

    public async Task<List<NewsArticle>> ScrapeLatestNewsAsync()
    {
        var allArticles = new List<NewsArticle>();

        foreach (var source in _rssSources)
        {
            try
            {
                Console.WriteLine($"📰 Fetching RSS from {source.Name}...");
                var articles = await FetchRSSFeedAsync(source);
                allArticles.AddRange(articles);
                Console.WriteLine($"✅ Got {articles.Count} articles from {source.Name}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to fetch from {source.Name}: {ex.Message}");
            }
        }

        // Sort by publish date and take latest 20
        return allArticles
            .OrderByDescending(a => a.PublishDate)
            .Take(20)
            .ToList();
    }

    private async Task<List<NewsArticle>> FetchRSSFeedAsync(RSSSource source)
    {
        var articles = new List<NewsArticle>();

        try
        {
            // Set user agent to avoid blocking
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", 
                "LogicLoom-NewsAggregator/1.0 (https://github.com/murnesty/LogicLoom)");

            var response = await _httpClient.GetStringAsync(source.Url);
            
            using var stringReader = new StringReader(response);
            using var xmlReader = XmlReader.Create(stringReader);
            
            var feed = SyndicationFeed.Load(xmlReader);

            foreach (var item in feed.Items.Take(10)) // Limit to 10 per source
            {
                // Ensure UTC DateTime for PostgreSQL compatibility
                var publishDate = item.PublishDate.DateTime != DateTime.MinValue ? 
                    (item.PublishDate.DateTime.Kind == DateTimeKind.Unspecified ? 
                        DateTime.SpecifyKind(item.PublishDate.DateTime, DateTimeKind.Utc) : 
                        item.PublishDate.DateTime.ToUniversalTime()) : 
                    DateTime.UtcNow;

                var article = new NewsArticle
                {
                    Title = CleanText(item.Title?.Text ?? "No Title"),
                    Content = CleanText(item.Summary?.Text ?? item.Content?.ToString() ?? "No Content"),
                    Source = source.Name,
                    SourceUrl = item.Links?.FirstOrDefault()?.Uri?.ToString() ?? "",
                    PublishDate = publishDate,
                    Category = source.Category,
                    Summary = GenerateSummary(item.Summary?.Text ?? item.Content?.ToString() ?? ""),
                    Tags = ExtractTags(item.Title?.Text ?? "", item.Summary?.Text ?? "")
                };

                articles.Add(article);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"RSS parsing error for {source.Name}: {ex.Message}");
        }

        return articles;
    }

    public async Task<List<AIModel>> ScrapeModelReleasesAsync()
    {
        // For now, return mock AI models - we'll implement real scraping in Phase 1.2
        await Task.Delay(100);
        
        return new List<AIModel>
        {
            new AIModel
            {
                Name = "GPT-5.0",
                Version = "5.0",
                Company = "OpenAI",
                ReleaseDate = new DateTime(2024, 12, 15, 0, 0, 0, DateTimeKind.Utc),
                Description = "Next-generation AI model with advanced reasoning, multimodal capabilities, and improved efficiency",
                Capabilities = new List<string> { "Advanced Reasoning", "Multimodal Processing", "Code Generation", "Scientific Analysis", "Creative Writing", "Complex Problem Solving" },
                ContextWindow = "256K tokens",
                Pricing = "$3/1M input tokens, $10/1M output tokens",
                IsMultimodal = true
            },
            new AIModel
            {
                Name = "Claude 3.5 Sonnet",
                Version = "3.5",
                Company = "Anthropic",
                ReleaseDate = new DateTime(2024, 6, 20, 0, 0, 0, DateTimeKind.Utc),
                Description = "Advanced language model with enhanced safety and code generation capabilities",
                Capabilities = new List<string> { "Text Generation", "Code Generation", "Analysis", "Creative Writing", "Safety Reasoning" },
                ContextWindow = "200K tokens",
                Pricing = "$3/1M input tokens, $15/1M output tokens",
                IsMultimodal = false
            }
        };
    }

    private string CleanText(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        
        // Remove HTML tags
        text = System.Text.RegularExpressions.Regex.Replace(text, "<.*?>", "");
        // Clean up whitespace
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ");
        return text.Trim();
    }

    private string GenerateSummary(string content)
    {
        if (string.IsNullOrEmpty(content)) return "";
        
        var cleaned = CleanText(content);
        // Take first 200 characters as summary
        return cleaned.Length > 200 ? cleaned.Substring(0, 200) + "..." : cleaned;
    }

    private List<string> ExtractTags(string title, string content)
    {
        var tags = new List<string>();
        var text = $"{title} {content}".ToLower();

        // Common AI/Tech tags
        var aiKeywords = new[] { "ai", "artificial intelligence", "machine learning", "ml", "gpt", "claude", "openai", 
            "anthropic", "google", "microsoft", "nvidia", "llm", "neural", "deep learning", "transformer", "chatbot" };

        foreach (var keyword in aiKeywords)
        {
            if (text.Contains(keyword) && !tags.Contains(keyword, StringComparer.OrdinalIgnoreCase))
            {
                tags.Add(char.ToUpper(keyword[0]) + keyword.Substring(1));
            }
        }

        return tags.Take(5).ToList(); // Limit to 5 tags
    }
}

public class RSSSource
{
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string Category { get; set; } = "";
}
