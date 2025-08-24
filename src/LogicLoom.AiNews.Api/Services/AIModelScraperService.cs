using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using LogicLoom.AiNews.Api.Data;
using LogicLoom.AiNews.Core.Models;

namespace LogicLoom.AiNews.Api.Services;

public interface IAIModelScraperService
{
    Task<List<AIModel>> FetchLatestModelsAsync();
}

public class AIModelScraperService : IAIModelScraperService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AIModelScraperService> _logger;

    // Hugging Face API endpoints
    private readonly string[] _modelSources = {
        "https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=20&filter=text-generation",
        "https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=10&filter=text-to-image", 
        "https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=10&filter=automatic-speech-recognition"
    };

    public AIModelScraperService(HttpClient httpClient, ILogger<AIModelScraperService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        // Set user agent to avoid rate limiting
        _httpClient.DefaultRequestHeaders.Add("User-Agent", 
            "LogicLoom-AINews/1.0 (AI News Aggregator)");
    }

    public async Task<List<AIModel>> FetchLatestModelsAsync()
    {
        var allModels = new List<AIModel>();
        
        try
        {
            foreach (var sourceUrl in _modelSources)
            {
                _logger.LogInformation($"🤖 Fetching AI models from Hugging Face: {GetModelType(sourceUrl)}...");
                
                var models = await FetchModelsFromSourceAsync(sourceUrl);
                allModels.AddRange(models);
                
                _logger.LogInformation($"✅ Got {models.Count} {GetModelType(sourceUrl)} models");
                
                // Be nice to the API
                await Task.Delay(1000);
            }

            _logger.LogInformation($"📊 Total AI models fetched: {allModels.Count}");
            return allModels;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error fetching AI models");
            return new List<AIModel>();
        }
    }

    private async Task<List<AIModel>> FetchModelsFromSourceAsync(string url)
    {
        var models = new List<AIModel>();
        
        try
        {
            var response = await _httpClient.GetStringAsync(url);
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
            var huggingFaceModels = JsonSerializer.Deserialize<HuggingFaceModel[]>(response, options);

            if (huggingFaceModels == null) return models;

            foreach (var hfModel in huggingFaceModels.Take(10)) // Limit to prevent spam
            {
                var modelId = hfModel.Id ?? hfModel.ModelId ?? "Unknown Model";
                
                // Ensure UTC DateTime
                var releaseDate = hfModel.LastModified.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(hfModel.LastModified, DateTimeKind.Utc)
                    : hfModel.LastModified.ToUniversalTime();
                
                var model = new AIModel
                {
                    Name = ExtractModelName(modelId),
                    Version = ExtractVersion(modelId),
                    Company = ExtractCompany(modelId),
                    Description = CleanDescription(modelId, hfModel.Tags),
                    ReleaseDate = releaseDate,
                    Capabilities = ExtractCapabilities(hfModel.Tags, url),
                    ContextWindow = ExtractContextWindow(modelId, hfModel.Tags),
                    Pricing = "Open Source", // Most HF models are open source
                    IsMultimodal = DetermineMultimodal(hfModel.Tags),
                    CreatedAt = DateTime.UtcNow
                };

                models.Add(model);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, $"⚠️ Failed to fetch from source: {url}");
        }

        return models;
    }

    private string GetModelType(string url)
    {
        if (url.Contains("text-generation")) return "Text Generation";
        if (url.Contains("text-to-image")) return "Text-to-Image";  
        if (url.Contains("automatic-speech-recognition")) return "Speech Recognition";
        return "General";
    }

    private string DetermineModelType(string[]? tags, string sourceUrl)
    {
        if (tags == null) return GetModelType(sourceUrl);
        
        var tagList = tags.ToList();
        
        if (tagList.Any(t => t.Contains("text-generation") || t.Contains("conversational") || t.Contains("text2text-generation")))
            return "Language Model";
        if (tagList.Any(t => t.Contains("text-to-image") || t.Contains("image-generation")))
            return "Image Generation";
        if (tagList.Any(t => t.Contains("automatic-speech-recognition") || t.Contains("audio")))
            return "Speech Recognition";
        if (tagList.Any(t => t.Contains("computer-vision") || t.Contains("image-classification")))
            return "Computer Vision";
        if (tagList.Any(t => t.Contains("multimodal")))
            return "Multimodal";
            
        return GetModelType(sourceUrl);
    }

    private string CleanDescription(string? modelId, string[]? tags)
    {
        if (string.IsNullOrEmpty(modelId)) return "AI Model";
        
        // Extract organization and model name
        var parts = modelId.Split('/');
        var org = parts.Length > 1 ? parts[0] : "Unknown";
        var name = parts.Length > 1 ? parts[1] : modelId;
        
        // Clean up model name for description
        name = Regex.Replace(name, @"[-_]", " ");
        name = Regex.Replace(name, @"\b\w", m => m.Value.ToUpper()); // Title case
        
        var description = $"{name} by {org}";
        
        // Add context based on tags
        if (tags != null)
        {
            if (tags.Any(t => t.Contains("instruct") || t.Contains("chat")))
                description += " - Instruction-tuned conversational AI model";
            else if (tags.Any(t => t.Contains("base") || t.Contains("foundation")))
                description += " - Foundation language model";
            else if (tags.Any(t => t.Contains("fine-tuned")))
                description += " - Fine-tuned AI model";
        }
        
        return description;
    }

    private string ExtractModelName(string modelId)
    {
        if (string.IsNullOrEmpty(modelId)) return "Unknown Model";
        
        // Extract just the model name part (after the slash)
        var parts = modelId.Split('/');
        var name = parts.Length > 1 ? parts[1] : modelId;
        
        // Clean up the name
        name = Regex.Replace(name, @"[-_]", " ");
        name = Regex.Replace(name, @"\b\w", m => m.Value.ToUpper()); // Title case
        
        return name;
    }

    private string ExtractVersion(string? modelId)
    {
        if (string.IsNullOrEmpty(modelId)) return "1.0";
        
        // Look for version patterns like v1.0, v2.5, etc.
        var versionMatch = Regex.Match(modelId.ToLower(), @"v?(\d+\.?\d*)");
        if (versionMatch.Success)
            return versionMatch.Groups[1].Value;
            
        return "1.0";
    }

    private string ExtractCompany(string modelId)
    {
        if (string.IsNullOrEmpty(modelId)) return "Unknown";
        
        // Extract organization name (before the slash)
        var parts = modelId.Split('/');
        if (parts.Length > 1)
        {
            var org = parts[0];
            // Clean up organization name
            return Regex.Replace(org, @"[-_]", " ")
                       .Replace("microsoft", "Microsoft")
                       .Replace("google", "Google")
                       .Replace("meta", "Meta")
                       .Replace("openai", "OpenAI")
                       .Replace("anthropic", "Anthropic");
        }
        
        return "Community";
    }

    private List<string> ExtractCapabilities(string[]? tags, string sourceUrl)
    {
        var capabilities = new List<string>();
        
        if (tags == null) return capabilities;
        
        foreach (var tag in tags.Take(5))
        {
            if (tag.Contains("text-generation") || tag.Contains("conversational")) 
                capabilities.Add("Text Generation");
            if (tag.Contains("text-to-image") || tag.Contains("image-generation")) 
                capabilities.Add("Image Generation");
            if (tag.Contains("automatic-speech-recognition") || tag.Contains("audio")) 
                capabilities.Add("Speech Recognition");
            if (tag.Contains("computer-vision") || tag.Contains("image-classification")) 
                capabilities.Add("Computer Vision");
            if (tag.Contains("multimodal")) 
                capabilities.Add("Multimodal");
            if (tag.Contains("instruct") || tag.Contains("chat")) 
                capabilities.Add("Instruction Following");
            if (tag.Contains("code")) 
                capabilities.Add("Code Generation");
            if (tag.Contains("reasoning")) 
                capabilities.Add("Reasoning");
        }
        
        // Add default capability if none found
        if (!capabilities.Any())
        {
            if (sourceUrl.Contains("text-generation")) capabilities.Add("Text Generation");
            else if (sourceUrl.Contains("text-to-image")) capabilities.Add("Image Generation");
            else if (sourceUrl.Contains("automatic-speech-recognition")) capabilities.Add("Speech Recognition");
            else capabilities.Add("General AI");
        }
        
        return capabilities.Distinct().ToList();
    }

    private string ExtractContextWindow(string? modelId, string[]? tags)
    {
        if (string.IsNullOrEmpty(modelId)) return "Unknown";
        
        // Look for context window indicators
        if (modelId.ToLower().Contains("32k")) return "32K tokens";
        if (modelId.ToLower().Contains("16k")) return "16K tokens";
        if (modelId.ToLower().Contains("8k")) return "8K tokens";
        if (modelId.ToLower().Contains("4k")) return "4K tokens";
        if (modelId.ToLower().Contains("2k")) return "2K tokens";
        
        // Default based on model type
        if (tags != null)
        {
            if (tags.Any(t => t.Contains("text-generation") || t.Contains("conversational")))
                return "4K tokens";
            if (tags.Any(t => t.Contains("instruct") || t.Contains("chat")))
                return "8K tokens";
        }
        
        return "2K tokens";
    }

    private bool DetermineMultimodal(string[]? tags)
    {
        if (tags == null) return false;
        
        return tags.Any(t => t.Contains("multimodal") || 
                            t.Contains("vision") || 
                            t.Contains("image-text"));
    }
}

// DTOs for Hugging Face API
public class HuggingFaceModel
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    
    [JsonPropertyName("modelId")]
    public string? ModelId { get; set; }
    
    [JsonPropertyName("tags")]
    public string[]? Tags { get; set; }
    
    [JsonPropertyName("lastModified")]
    public DateTime LastModified { get; set; }
    
    [JsonPropertyName("downloads")]
    public int? Downloads { get; set; }
    
    [JsonPropertyName("likes")]
    public int? Likes { get; set; }
}
