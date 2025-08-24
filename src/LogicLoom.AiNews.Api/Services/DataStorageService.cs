using LogicLoom.AiNews.Api.Data;
using LogicLoom.AiNews.Core.Interfaces;
using LogicLoom.AiNews.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace LogicLoom.AiNews.Api.Services;

public class DataStorageService : IDataStorageService
{
    private readonly AiNewsDbContext _context;

    public DataStorageService(AiNewsDbContext context)
    {
        _context = context;
    }

    // Models
    public async Task<List<AIModel>> GetLatestModelsAsync(int count = 10)
    {
        return await _context.AIModels
            .OrderByDescending(m => m.ReleaseDate)
            .Take(count)
            .ToListAsync();
    }

    public async Task<AIModel?> GetModelByIdAsync(int id)
    {
        return await _context.AIModels.FindAsync(id);
    }

    public async Task<AIModel> SaveModelAsync(AIModel model)
    {
        if (model.Id == 0)
        {
            _context.AIModels.Add(model);
        }
        else
        {
            _context.AIModels.Update(model);
        }

        await _context.SaveChangesAsync();
        return model;
    }

    // Articles
    public async Task<List<NewsArticle>> GetLatestArticlesAsync(int count = 20)
    {
        return await _context.NewsArticles
            .OrderByDescending(a => a.PublishDate)
            .Take(count)
            .ToListAsync();
    }

    public async Task<NewsArticle?> GetArticleByIdAsync(int id)
    {
        return await _context.NewsArticles.FindAsync(id);
    }

    public async Task<NewsArticle> SaveArticleAsync(NewsArticle article)
    {
        if (article.Id == 0)
        {
            _context.NewsArticles.Add(article);
        }
        else
        {
            _context.NewsArticles.Update(article);
        }

        await _context.SaveChangesAsync();
        return article;
    }

    // Benchmarks
    public async Task<List<Benchmark>> GetModelBenchmarksAsync(int modelId)
    {
        return await _context.Benchmarks
            .Where(b => b.ModelId == modelId)
            .Include(b => b.Model)
            .OrderByDescending(b => b.TestDate)
            .ToListAsync();
    }

    public async Task<Benchmark> SaveBenchmarkAsync(Benchmark benchmark)
    {
        if (benchmark.Id == 0)
        {
            _context.Benchmarks.Add(benchmark);
        }
        else
        {
            _context.Benchmarks.Update(benchmark);
        }

        await _context.SaveChangesAsync();
        return benchmark;
    }
}
