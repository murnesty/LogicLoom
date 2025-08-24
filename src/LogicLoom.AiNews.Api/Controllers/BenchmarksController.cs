using LogicLoom.AiNews.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LogicLoom.AiNews.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BenchmarksController : ControllerBase
{
    private readonly IDataStorageService _dataStorage;
    private readonly ILogger<BenchmarksController> _logger;

    public BenchmarksController(IDataStorageService dataStorage, ILogger<BenchmarksController> logger)
    {
        _dataStorage = dataStorage;
        _logger = logger;
    }

    [HttpGet("model/{modelId}")]
    public async Task<IActionResult> GetModelBenchmarks(int modelId)
    {
        try
        {
            var benchmarks = await _dataStorage.GetModelBenchmarksAsync(modelId);
            return Ok(benchmarks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving benchmarks for model {ModelId}", modelId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("mock/{modelId}")]
    public async Task<IActionResult> GetMockBenchmarks(int modelId)
    {
        try
        {
            // Return mock benchmark data for testing
            await Task.Delay(50); // Simulate async operation

            var mockBenchmarks = new[]
            {
                new { Id = 1, ModelId = modelId, TestName = "MMLU", Score = 85.2m, Unit = "%", TestDate = DateTime.Now.AddDays(-5), Description = "Massive Multitask Language Understanding" },
                new { Id = 2, ModelId = modelId, TestName = "HumanEval", Score = 72.8m, Unit = "%", TestDate = DateTime.Now.AddDays(-5), Description = "Code Generation Benchmark" },
                new { Id = 3, ModelId = modelId, TestName = "HellaSwag", Score = 89.1m, Unit = "%", TestDate = DateTime.Now.AddDays(-5), Description = "Commonsense Reasoning" },
                new { Id = 4, ModelId = modelId, TestName = "GSM8K", Score = 78.5m, Unit = "%", TestDate = DateTime.Now.AddDays(-5), Description = "Mathematical Problem Solving" },
                new { Id = 5, ModelId = modelId, TestName = "TruthfulQA", Score = 66.3m, Unit = "%", TestDate = DateTime.Now.AddDays(-5), Description = "Truthfulness in Question Answering" }
            };

            return Ok(mockBenchmarks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving mock benchmarks for model {ModelId}", modelId);
            return StatusCode(500, "Internal server error");
        }
    }
}
