using LogicLoom.AiNews.Core.Models;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace LogicLoom.AiNews.UI.Client.Services;

public class AiNewsApiService
{
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly string _apiBaseUrl;

    public AiNewsApiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiBaseUrl = configuration["ApiBaseUrl"] ?? "http://localhost:5282";
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    // Models
    public async Task<List<AIModel>> GetLatestModelsAsync(int count = 10)
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/models/latest?count={count}");
            return JsonSerializer.Deserialize<List<AIModel>>(response, _jsonOptions) ?? new List<AIModel>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching models: {ex.Message}");
            return new List<AIModel>();
        }
    }

    public async Task<AIModel?> GetModelByIdAsync(int id)
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/models/{id}");
            return JsonSerializer.Deserialize<AIModel>(response, _jsonOptions);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching model {id}: {ex.Message}");
            return null;
        }
    }

    // News
    public async Task<List<NewsArticle>> GetLatestNewsAsync(int count = 20)
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/news/latest?count={count}");
            return JsonSerializer.Deserialize<List<NewsArticle>>(response, _jsonOptions) ?? new List<NewsArticle>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching news: {ex.Message}");
            return new List<NewsArticle>();
        }
    }

    public async Task<List<NewsArticle>> GetTrendingNewsAsync(int count = 10)
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/news/trending?count={count}");
            return JsonSerializer.Deserialize<List<NewsArticle>>(response, _jsonOptions) ?? new List<NewsArticle>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching trending news: {ex.Message}");
            return new List<NewsArticle>();
        }
    }

    // Benchmarks (mock for now)
    public async Task<object[]> GetModelBenchmarksAsync(int modelId)
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/benchmarks/mock/{modelId}");
            return JsonSerializer.Deserialize<object[]>(response, _jsonOptions) ?? Array.Empty<object>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching benchmarks for model {modelId}: {ex.Message}");
            return Array.Empty<object>();
        }
    }

    // Admin functionality for data refresh
    public async Task<AdminStatus> GetAdminStatusAsync()
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/admin/status");
            return JsonSerializer.Deserialize<AdminStatus>(response, _jsonOptions) ?? new AdminStatus();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching admin status: {ex.Message}");
            return new AdminStatus { Error = ex.Message };
        }
    }

    public async Task<RefreshResult> RefreshLiveDataAsync()
    {
        try
        {
            // First reset the database
            var resetResponse = await _httpClient.PostAsync($"{_apiBaseUrl}/api/admin/reset-database?confirm=YES_DELETE_ALL", null);
            if (!resetResponse.IsSuccessStatusCode)
            {
                var errorContent = await resetResponse.Content.ReadAsStringAsync();
                return new RefreshResult { Success = false, Message = $"Reset failed: {errorContent}" };
            }

            // Then refresh with live data
            var refreshResponse = await _httpClient.PostAsync($"{_apiBaseUrl}/api/admin/refresh-data", null);
            if (!refreshResponse.IsSuccessStatusCode)
            {
                var errorContent = await refreshResponse.Content.ReadAsStringAsync();
                return new RefreshResult { Success = false, Message = $"Refresh failed: {errorContent}" };
            }

            var responseContent = await refreshResponse.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<RefreshDataResponse>(responseContent, _jsonOptions);
            
            return new RefreshResult 
            { 
                Success = true, 
                Message = $"✅ Successfully refreshed! News: {result?.NewsArticles ?? 0}, Models: {result?.AIModels ?? 0}",
                NewsArticles = result?.NewsArticles ?? 0,
                AIModels = result?.AIModels ?? 0,
                Errors = result?.Errors ?? new List<string>()
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error refreshing data: {ex.Message}");
            return new RefreshResult { Success = false, Message = $"❌ Error: {ex.Message}" };
        }
    }

    // Targeted monitoring endpoints
    public async Task<List<TargetedUpdate>> GetTargetedUpdatesAsync()
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/targets/all");
            return JsonSerializer.Deserialize<List<TargetedUpdate>>(response, _jsonOptions) ?? new List<TargetedUpdate>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching targeted updates: {ex.Message}");
            return new List<TargetedUpdate>();
        }
    }

    public async Task<List<TargetUpdate>> GetModelTargetsAsync()
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/targets/models");
            return JsonSerializer.Deserialize<List<TargetUpdate>>(response, _jsonOptions) ?? new List<TargetUpdate>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching model targets: {ex.Message}");
            return new List<TargetUpdate>();
        }
    }

    public async Task<List<TargetUpdate>> GetToolTargetsAsync()
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/targets/tools");
            return JsonSerializer.Deserialize<List<TargetUpdate>>(response, _jsonOptions) ?? new List<TargetUpdate>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching tool targets: {ex.Message}");
            return new List<TargetUpdate>();
        }
    }

    public async Task<TargetingSummary> GetTargetingSummaryAsync()
    {
        try
        {
            var response = await _httpClient.GetStringAsync($"{_apiBaseUrl}/api/targets/summary");
            return JsonSerializer.Deserialize<TargetingSummary>(response, _jsonOptions) ?? new TargetingSummary();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching targeting summary: {ex.Message}");
            return new TargetingSummary();
        }
    }
}

// DTOs for admin functionality
public class AdminStatus
{
    public int NewsCount { get; set; }
    public int ModelsCount { get; set; }
    public object? LatestNews { get; set; }
    public object? LatestModel { get; set; }
    public DateTime Timestamp { get; set; }
    public string? Error { get; set; }
}

public class RefreshResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public int NewsArticles { get; set; }
    public int AIModels { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class RefreshDataResponse
{
    public int NewsArticles { get; set; }
    public int AIModels { get; set; }
    public List<string> Errors { get; set; } = new();
}

// Targeted monitoring DTOs
public class TargetedUpdate
{
    public string Type { get; set; } = "";  // "Model" or "Tool"
    public string Target { get; set; } = "";
    public string Company { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime UpdateDate { get; set; }
    public string SourceUrl { get; set; } = "";
    public int Priority { get; set; }
    public List<string> Tags { get; set; } = new();
}

public class TargetUpdate
{
    public string Target { get; set; } = "";
    public string Company { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime UpdateDate { get; set; }
    public string SourceUrl { get; set; } = "";
    public List<string> Tags { get; set; } = new();
}

public class TargetingSummary
{
    public int TotalUpdates { get; set; }
    public int ModelUpdates { get; set; }
    public int ToolUpdates { get; set; }
    public int HighPriority { get; set; }
    public List<TargetCount> TopTargets { get; set; } = new();
    public DateTime? LatestUpdate { get; set; }
}

public class TargetCount
{
    public string Target { get; set; } = "";
    public int Count { get; set; }
}
