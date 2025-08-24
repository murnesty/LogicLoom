using LogicLoom.AiNews.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LogicLoom.AiNews.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NewsController : ControllerBase
{
    private readonly IDataStorageService _dataStorage;
    private readonly ILogger<NewsController> _logger;

    public NewsController(IDataStorageService dataStorage, ILogger<NewsController> logger)
    {
        _dataStorage = dataStorage;
        _logger = logger;
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestNews([FromQuery] int count = 20)
    {
        try
        {
            var articles = await _dataStorage.GetLatestArticlesAsync(count);
            return Ok(articles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest news");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetArticleById(int id)
    {
        try
        {
            var article = await _dataStorage.GetArticleByIdAsync(id);
            if (article == null)
                return NotFound();

            return Ok(article);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving article {ArticleId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("trending")]
    public async Task<IActionResult> GetTrendingNews([FromQuery] int count = 10)
    {
        try
        {
            // For now, just return latest news as "trending"
            // In a real implementation, this would use engagement metrics, etc.
            var articles = await _dataStorage.GetLatestArticlesAsync(count);

            // Simple mock trending logic - prioritize model releases
            var trending = articles
                .OrderByDescending(a => a.Category == "Model Release" ? 1 : 0)
                .ThenByDescending(a => a.PublishDate)
                .ToList();

            return Ok(trending);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving trending news");
            return StatusCode(500, "Internal server error");
        }
    }
}
