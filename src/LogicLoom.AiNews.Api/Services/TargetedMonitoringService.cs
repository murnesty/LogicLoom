using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using LogicLoom.AiNews.Core.Models;

namespace LogicLoom.AiNews.Api.Services;

public interface ITargetedMonitoringService
{
    Task<List<TargetedUpdate>> GetTargetedUpdatesAsync();
    Task<List<TargetUpdate>> GetModelUpdatesAsync();
    Task<List<TargetUpdate>> GetToolUpdatesAsync();
}

public class TargetedMonitoringService : ITargetedMonitoringService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TargetedMonitoringService> _logger;

    // Target AI Models to Monitor
    private readonly List<MonitorTarget> _modelTargets = new()
    {
        new("GPT", "OpenAI", new[] { "gpt", "openai", "chatgpt" }, "https://platform.openai.com/docs/models"),
        new("Claude", "Anthropic", new[] { "claude", "anthropic" }, "https://www.anthropic.com/news"),
        new("DeepSeek", "DeepSeek", new[] { "deepseek", "deepseek-ai" }, "https://github.com/deepseek-ai"),
        new("Gemini", "Google", new[] { "gemini", "google-ai", "bard" }, "https://blog.google/technology/ai/"),
        new("Llama", "Meta", new[] { "llama", "meta-llama", "meta-ai" }, "https://ai.meta.com/blog/"),
        new("Qwen", "Alibaba", new[] { "qwen", "qianwen", "alibaba" }, "https://github.com/QwenLM"),
        new("Mistral", "Mistral AI", new[] { "mistral", "mixtral", "mistral-ai" }, "https://mistral.ai/news/"),
        new("Phi", "Microsoft", new[] { "phi", "microsoft-phi", "microsoft" }, "https://www.microsoft.com/en-us/research/"),
    };

    // Target AI Tools/IDEs to Monitor  
    private readonly List<MonitorTarget> _toolTargets = new()
    {
        new("Cursor", "Cursor", new[] { "cursor-ide", "cursor.sh", "cursor editor" }, "https://www.cursor.sh/"),
        new("GitHub Copilot", "GitHub", new[] { "github-copilot", "copilot-chat", "copilot" }, "https://github.blog/"),
        new("VS Code", "Microsoft", new[] { "vscode", "visual-studio-code", "vs-code-ai" }, "https://code.visualstudio.com/updates"),
        new("Replit", "Replit", new[] { "replit-ai", "replit-ghostwriter", "replit" }, "https://blog.replit.com/"),
        new("CodeWhisperer", "Amazon", new[] { "codewhisperer", "amazon-q", "aws-ai" }, "https://aws.amazon.com/blogs/aws/"),
        new("Tabnine", "Tabnine", new[] { "tabnine", "tabnine-ai" }, "https://www.tabnine.com/blog/"),
        new("Codeium", "Codeium", new[] { "codeium", "codeium-ai" }, "https://codeium.com/blog"),
        new("JetBrains AI", "JetBrains", new[] { "jetbrains-ai", "intellij-ai", "jetbrains" }, "https://blog.jetbrains.com/"),
    };

    public TargetedMonitoringService(HttpClient httpClient, ILogger<TargetedMonitoringService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        _httpClient.DefaultRequestHeaders.Add("User-Agent", 
            "LogicLoom-TargetedMonitor/1.0 (AI Target Monitoring)");
    }

    public async Task<List<TargetedUpdate>> GetTargetedUpdatesAsync()
    {
        var updates = new List<TargetedUpdate>();
        
        try
        {
            var modelTask = GetModelUpdatesAsync();
            var toolTask = GetToolUpdatesAsync();
            
            await Task.WhenAll(modelTask, toolTask);
            
            var modelUpdates = await modelTask;
            var toolUpdates = await toolTask;
            
            updates.AddRange(modelUpdates.Select(m => new TargetedUpdate 
            { 
                Type = "Model", 
                Target = m.Target, 
                Company = m.Company, 
                Title = m.Title, 
                Description = m.Description, 
                UpdateDate = m.UpdateDate, 
                SourceUrl = m.SourceUrl,
                Priority = CalculatePriority(m.Target, m.Title),
                Tags = m.Tags
            }));
            
            updates.AddRange(toolUpdates.Select(t => new TargetedUpdate 
            { 
                Type = "Tool", 
                Target = t.Target, 
                Company = t.Company, 
                Title = t.Title, 
                Description = t.Description, 
                UpdateDate = t.UpdateDate, 
                SourceUrl = t.SourceUrl,
                Priority = CalculatePriority(t.Target, t.Title),
                Tags = t.Tags
            }));
            
            return updates.OrderByDescending(u => u.Priority)
                         .ThenByDescending(u => u.UpdateDate)
                         .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting targeted updates");
            return updates;
        }
    }

    public async Task<List<TargetUpdate>> GetModelUpdatesAsync()
    {
        var updates = new List<TargetUpdate>();
        
        foreach (var target in _modelTargets)
        {
            try
            {
                _logger.LogInformation($"🎯 Monitoring AI model: {target.Name}");
                
                // Search Hugging Face for target model
                var hfUpdates = await SearchHuggingFaceForTarget(target);
                updates.AddRange(hfUpdates);
                
                // Add delay to be nice to APIs
                await Task.Delay(500);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Failed to get updates for {target.Name}");
            }
        }
        
        return updates;
    }

    public async Task<List<TargetUpdate>> GetToolUpdatesAsync()
    {
        var updates = new List<TargetUpdate>();
        
        foreach (var target in _toolTargets)
        {
            try
            {
                _logger.LogInformation($"🛠️ Monitoring AI tool: {target.Name}");
                
                // Search GitHub for tool updates
                var githubUpdates = await SearchGitHubForTarget(target);
                updates.AddRange(githubUpdates);
                
                await Task.Delay(500);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Failed to get updates for {target.Name}");
            }
        }
        
        return updates;
    }

    private async Task<List<TargetUpdate>> SearchHuggingFaceForTarget(MonitorTarget target)
    {
        var updates = new List<TargetUpdate>();
        
        try
        {
            // Search for models using the primary keyword (more flexible for future versions)
            var primaryKeyword = target.Keywords.First();
            var url = $"https://huggingface.co/api/models?search={primaryKeyword}&sort=lastModified&direction=-1&limit=10";
            
            var response = await _httpClient.GetStringAsync(url);
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
            var models = JsonSerializer.Deserialize<HuggingFaceTargetModel[]>(response, options);
            
            if (models != null)
            {
                // Filter and rank by relevance, prioritizing newer versions
                var relevantModels = models
                    .Where(model => IsRelevantUpdate(model.Id ?? "", target))
                    .OrderByDescending(model => model.LastModified)
                    .ThenByDescending(model => ExtractVersionNumber(model.Id ?? ""))
                    .Take(3);
                    
                foreach (var model in relevantModels)
                {
                    var releaseDate = model.LastModified.Kind == DateTimeKind.Unspecified 
                        ? DateTime.SpecifyKind(model.LastModified, DateTimeKind.Utc)
                        : model.LastModified.ToUniversalTime();
                        
                    updates.Add(new TargetUpdate
                    {
                        Target = target.Name,
                        Company = target.Company,
                        Title = $"New {target.Name} Model: {ExtractModelName(model.Id ?? "")}",
                        Description = $"Latest {target.Name} model released on Hugging Face with {model.Downloads} downloads",
                        UpdateDate = releaseDate,
                        SourceUrl = $"https://huggingface.co/{model.Id}",
                        Tags = ExtractRelevantTags(model.Tags, target)
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, $"Failed to search Hugging Face for {target.Name}");
        }
        
        return updates;
    }

    private async Task<List<TargetUpdate>> SearchGitHubForTarget(MonitorTarget target)
    {
        var updates = new List<TargetUpdate>();
        
        try
        {
            // Use GitHub search API with broader terms to catch newer versions
            var primaryKeyword = target.Keywords.First();
            var url = $"https://api.github.com/search/repositories?q={primaryKeyword}+AI+machine+learning&sort=updated&order=desc&per_page=5";
            
            _httpClient.DefaultRequestHeaders.Remove("User-Agent");
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "LogicLoom-Monitor");
            
            var response = await _httpClient.GetStringAsync(url);
            var searchResult = JsonSerializer.Deserialize<GitHubSearchResult>(response);
            
            if (searchResult?.Items != null)
            {
                // Filter and rank results by relevance and recency
                var relevantRepos = searchResult.Items
                    .Where(repo => IsRelevantUpdate(repo.Name ?? "", target) || IsRelevantUpdate(repo.Description ?? "", target))
                    .OrderByDescending(repo => repo.UpdatedAt)
                    .Take(2);
                    
                foreach (var repo in relevantRepos)
                {
                    var updateDate = repo.UpdatedAt.Kind == DateTimeKind.Unspecified 
                        ? DateTime.SpecifyKind(repo.UpdatedAt, DateTimeKind.Utc)
                        : repo.UpdatedAt.ToUniversalTime();
                        
                    updates.Add(new TargetUpdate
                    {
                        Target = target.Name,
                        Company = target.Company,
                        Title = $"{target.Name} Update: {repo.Name}",
                        Description = $"{repo.Description} (⭐ {repo.StargazersCount} stars)",
                        UpdateDate = updateDate,
                        SourceUrl = repo.HtmlUrl ?? "",
                        Tags = new List<string> { "GitHub", "Repository", target.Name }
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, $"Failed to search GitHub for {target.Name}");
        }
        
        return updates;
    }

    private bool IsRelevantUpdate(string content, MonitorTarget target)
    {
        if (string.IsNullOrEmpty(content)) return false;
        
        var lowerContent = content.ToLower();
        return target.Keywords.Any(keyword => lowerContent.Contains(keyword.ToLower()));
    }

    private string ExtractModelName(string modelId)
    {
        var parts = modelId.Split('/');
        var name = parts.Length > 1 ? parts[1] : modelId;
        
        // Clean up and format the name
        name = Regex.Replace(name, @"[-_]", " ");
        
        // Capitalize first letters and preserve version numbers
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(name.ToLower());
    }

    private double ExtractVersionNumber(string modelId)
    {
        // Extract version numbers like 5.0, 4o, 3.5, etc.
        var versionMatch = Regex.Match(modelId.ToLower(), @"(\d+)\.?(\d*)");
        if (versionMatch.Success)
        {
            if (double.TryParse($"{versionMatch.Groups[1].Value}.{versionMatch.Groups[2].Value.PadRight(1, '0')}", out double version))
            {
                return version;
            }
        }
        
        // Special handling for versions like "4o" (treat as 4.1)
        var specialMatch = Regex.Match(modelId.ToLower(), @"(\d+)o");
        if (specialMatch.Success)
        {
            if (int.TryParse(specialMatch.Groups[1].Value, out int baseVersion))
            {
                return baseVersion + 0.1; // 4o becomes 4.1
            }
        }
        
        return 0.0; // Default for no version found
    }

    private List<string> ExtractRelevantTags(string[]? tags, MonitorTarget target)
    {
        var relevantTags = new List<string> { target.Name, "AI Model" };
        
        if (tags != null)
        {
            foreach (var tag in tags.Take(3))
            {
                if (tag.Contains("instruct")) relevantTags.Add("Instruction-Tuned");
                if (tag.Contains("chat")) relevantTags.Add("Conversational");
                if (tag.Contains("vision")) relevantTags.Add("Multimodal");
                if (tag.Contains("code")) relevantTags.Add("Code Generation");
            }
        }
        
        return relevantTags.Distinct().ToList();
    }

    private int CalculatePriority(string target, string title)
    {
        var priority = 1;
        var lowerTitle = title.ToLower();
        
        // High priority targets
        if (target.Contains("GPT") || target.Contains("Claude")) priority += 5;
        if (target.Contains("Cursor") || target.Contains("Copilot")) priority += 4;
        
        // High priority keywords
        if (lowerTitle.Contains("release") || lowerTitle.Contains("new")) priority += 3;
        if (lowerTitle.Contains("update") || lowerTitle.Contains("version")) priority += 2;
        if (lowerTitle.Contains("beta") || lowerTitle.Contains("preview")) priority += 1;
        
        // Detect and prioritize version numbers (higher versions get higher priority)
        var versionMatch = Regex.Match(lowerTitle, @"(\d+)\.(\d+)");
        if (versionMatch.Success)
        {
            if (int.TryParse(versionMatch.Groups[1].Value, out int majorVersion))
            {
                // Give higher priority to higher version numbers
                if (majorVersion >= 5) priority += 4; // GPT-5+, Claude 4+, etc.
                else if (majorVersion >= 4) priority += 3; // GPT-4+, Claude 3+
                else if (majorVersion >= 3) priority += 2;
            }
        }
        
        // Additional priority for breakthrough terms
        if (lowerTitle.Contains("breakthrough") || lowerTitle.Contains("revolutionary")) priority += 3;
        if (lowerTitle.Contains("advanced") || lowerTitle.Contains("next-generation")) priority += 2;
        
        return priority;
    }
}

// Data models
public class MonitorTarget
{
    public string Name { get; set; }
    public string Company { get; set; }
    public string[] Keywords { get; set; }
    public string SourceUrl { get; set; }

    public MonitorTarget(string name, string company, string[] keywords, string sourceUrl)
    {
        Name = name;
        Company = company;
        Keywords = keywords;
        SourceUrl = sourceUrl;
    }
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

public class TargetedUpdate : TargetUpdate
{
    public string Type { get; set; } = "";  // "Model" or "Tool"
    public int Priority { get; set; }
}

public class HuggingFaceTargetModel
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    
    [JsonPropertyName("tags")]
    public string[]? Tags { get; set; }
    
    [JsonPropertyName("lastModified")]
    public DateTime LastModified { get; set; }
    
    [JsonPropertyName("downloads")]
    public int? Downloads { get; set; }
}

public class GitHubSearchResult
{
    [JsonPropertyName("items")]
    public GitHubRepo[]? Items { get; set; }
}

public class GitHubRepo
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }
    
    [JsonPropertyName("stargazers_count")]
    public int StargazersCount { get; set; }
    
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
