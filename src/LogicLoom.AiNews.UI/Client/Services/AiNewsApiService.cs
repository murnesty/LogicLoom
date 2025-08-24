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
}
