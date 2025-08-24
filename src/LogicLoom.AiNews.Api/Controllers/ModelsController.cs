using LogicLoom.AiNews.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LogicLoom.AiNews.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModelsController : ControllerBase
{
    private readonly IDataStorageService _dataStorage;
    private readonly ILogger<ModelsController> _logger;

    public ModelsController(IDataStorageService dataStorage, ILogger<ModelsController> logger)
    {
        _dataStorage = dataStorage;
        _logger = logger;
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestModels([FromQuery] int count = 10)
    {
        try
        {
            var models = await _dataStorage.GetLatestModelsAsync(count);
            return Ok(models);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest models");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetModelById(int id)
    {
        try
        {
            var model = await _dataStorage.GetModelByIdAsync(id);
            if (model == null)
                return NotFound();

            return Ok(model);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving model {ModelId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("compare")]
    public async Task<IActionResult> GetModelComparison([FromQuery] int[] modelIds)
    {
        try
        {
            var models = new List<object>();

            foreach (var id in modelIds.Take(5)) // Limit to 5 models for comparison
            {
                var model = await _dataStorage.GetModelByIdAsync(id);
                if (model != null)
                {
                    models.Add(new
                    {
                        model.Id,
                        model.Name,
                        model.Company,
                        model.Version,
                        model.ReleaseDate,
                        model.Capabilities,
                        model.ContextWindow,
                        model.Pricing,
                        model.IsMultimodal
                    });
                }
            }

            return Ok(models);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comparing models");
            return StatusCode(500, "Internal server error");
        }
    }
}
