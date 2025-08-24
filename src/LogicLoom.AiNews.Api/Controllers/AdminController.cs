using LogicLoom.AiNews.Api.Data;
using LogicLoom.AiNews.Api.Services;
using LogicLoom.AiNews.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LogicLoom.AiNews.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly AiNewsDbContext _context;
    private readonly IContentScraperService _contentScraper;
    private readonly IAIModelScraperService _modelScraper;
    private readonly IContentProcessingService _processor;
    private readonly IDataStorageService _storage;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        AiNewsDbContext context,
        IContentScraperService contentScraper,
        IAIModelScraperService modelScraper,
        IContentProcessingService processor,
        IDataStorageService storage,
        ILogger<AdminController> logger)
    {
        _context = context;
        _contentScraper = contentScraper;
        _modelScraper = modelScraper;
        _processor = processor;
        _storage = storage;
        _logger = logger;
    }

    [HttpPost("reset-database")]
    public async Task<IActionResult> ResetDatabase([FromQuery] string? confirm)
    {
        if (confirm != "YES_DELETE_ALL")
        {
            return BadRequest("Must provide confirm=YES_DELETE_ALL to reset database");
        }

        try
        {
            _logger.LogWarning("🔥 RESETTING DATABASE - Deleting all data!");

            // Clear all existing data
            _context.NewsArticles.RemoveRange(_context.NewsArticles);
            _context.AIModels.RemoveRange(_context.AIModels);
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ Database cleared successfully");

            return Ok(new { message = "Database cleared. Call /refresh-data to reload with live data." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error clearing database");
            return StatusCode(500, "Error clearing database");
        }
    }

    [HttpPost("refresh-data")]
    public async Task<IActionResult> RefreshLiveData()
    {
        try
        {
            var results = new
            {
                NewsArticles = 0,
                AIModels = 0,
                Errors = new List<string>()
            };

            _logger.LogInformation("📰 Fetching fresh news articles...");
            
            // Fetch fresh news
            try
            {
                var articles = await _contentScraper.ScrapeLatestNewsAsync();
                foreach (var article in articles)
                {
                    try
                    {
                        var processed = await _processor.ProcessArticleAsync(article);
                        await _storage.SaveArticleAsync(processed);
                        results = results with { NewsArticles = results.NewsArticles + 1 };
                        _logger.LogInformation($"✅ Saved: {article.Title}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, $"⚠️ Failed to save article: {article.Title}");
                        ((List<string>)results.Errors).Add($"Article: {article.Title} - {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching news articles");
                ((List<string>)results.Errors).Add($"News fetch error: {ex.Message}");
            }

            _logger.LogInformation("🤖 Fetching fresh AI models...");
            
            // Fetch fresh models
            try
            {
                var models = await _modelScraper.FetchLatestModelsAsync();
                foreach (var model in models)
                {
                    try
                    {
                        await _storage.SaveModelAsync(model);
                        results = results with { AIModels = results.AIModels + 1 };
                        _logger.LogInformation($"✅ Saved: {model.Name}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, $"⚠️ Failed to save model: {model.Name}");
                        ((List<string>)results.Errors).Add($"Model: {model.Name} - {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching AI models");
                ((List<string>)results.Errors).Add($"Models fetch error: {ex.Message}");
            }

            _logger.LogInformation($"🎉 Refresh complete! News: {results.NewsArticles}, Models: {results.AIModels}");

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error refreshing data");
            return StatusCode(500, "Error refreshing data");
        }
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        try
        {
            var newsCount = await _context.NewsArticles.CountAsync();
            var modelsCount = await _context.AIModels.CountAsync();
            var latestNews = await _context.NewsArticles
                .OrderByDescending(n => n.CreatedAt)
                .Take(1)
                .Select(n => new { n.Title, n.Source, n.CreatedAt })
                .FirstOrDefaultAsync();
            var latestModel = await _context.AIModels
                .OrderByDescending(m => m.CreatedAt)
                .Take(1)
                .Select(m => new { m.Name, m.Company, m.CreatedAt })
                .FirstOrDefaultAsync();

            return Ok(new 
            {
                NewsCount = newsCount,
                ModelsCount = modelsCount,
                LatestNews = latestNews,
                LatestModel = latestModel,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting status");
            return StatusCode(500, "Error getting status");
        }
    }
}
