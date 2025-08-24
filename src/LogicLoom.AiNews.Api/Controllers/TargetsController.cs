using LogicLoom.AiNews.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogicLoom.AiNews.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TargetsController : ControllerBase
{
    private readonly ITargetedMonitoringService _monitoringService;
    private readonly ILogger<TargetsController> _logger;

    public TargetsController(ITargetedMonitoringService monitoringService, ILogger<TargetsController> logger)
    {
        _monitoringService = monitoringService;
        _logger = logger;
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllTargetedUpdates()
    {
        try
        {
            var updates = await _monitoringService.GetTargetedUpdatesAsync();
            return Ok(updates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving targeted updates");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("models")]
    public async Task<IActionResult> GetModelUpdates()
    {
        try
        {
            var updates = await _monitoringService.GetModelUpdatesAsync();
            return Ok(updates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving model updates");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("tools")]
    public async Task<IActionResult> GetToolUpdates()
    {
        try
        {
            var updates = await _monitoringService.GetToolUpdatesAsync();
            return Ok(updates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tool updates");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetTargetingSummary()
    {
        try
        {
            var allUpdates = await _monitoringService.GetTargetedUpdatesAsync();
            
            var summary = new
            {
                TotalUpdates = allUpdates.Count,
                ModelUpdates = allUpdates.Count(u => u.Type == "Model"),
                ToolUpdates = allUpdates.Count(u => u.Type == "Tool"),
                HighPriority = allUpdates.Count(u => u.Priority >= 5),
                TopTargets = allUpdates.GroupBy(u => u.Target)
                                      .OrderByDescending(g => g.Count())
                                      .Take(5)
                                      .Select(g => new { Target = g.Key, Count = g.Count() })
                                      .ToList(),
                LatestUpdate = allUpdates.OrderByDescending(u => u.UpdateDate).FirstOrDefault()?.UpdateDate
            };
            
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving targeting summary");
            return StatusCode(500, "Internal server error");
        }
    }
}
