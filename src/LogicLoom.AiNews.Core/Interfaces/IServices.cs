using LogicLoom.AiNews.Core.Models;

namespace LogicLoom.AiNews.Core.Interfaces;

public interface IContentScraperService
{
    Task<List<NewsArticle>> ScrapeLatestNewsAsync();
    Task<List<AIModel>> ScrapeModelReleasesAsync();
}

public interface IContentProcessingService
{
    Task<NewsArticle> ProcessArticleAsync(NewsArticle rawArticle);
    Task<AIModel> ProcessModelAsync(AIModel rawModel);
    string ClassifyContent(string title, string content);
    string GenerateSummary(string content);
}

public interface IDataStorageService
{
    // Models
    Task<List<AIModel>> GetLatestModelsAsync(int count = 10);
    Task<AIModel?> GetModelByIdAsync(int id);
    Task<AIModel> SaveModelAsync(AIModel model);

    // Articles
    Task<List<NewsArticle>> GetLatestArticlesAsync(int count = 20);
    Task<NewsArticle?> GetArticleByIdAsync(int id);
    Task<NewsArticle> SaveArticleAsync(NewsArticle article);

    // Benchmarks
    Task<List<Benchmark>> GetModelBenchmarksAsync(int modelId);
    Task<Benchmark> SaveBenchmarkAsync(Benchmark benchmark);
}
