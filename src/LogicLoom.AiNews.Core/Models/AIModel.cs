namespace LogicLoom.AiNews.Core.Models;

public class AIModel
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public DateTime ReleaseDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<string> Capabilities { get; set; } = new();
    public string ContextWindow { get; set; } = string.Empty;
    public string Pricing { get; set; } = string.Empty;
    public bool IsMultimodal { get; set; }
    public DateTime CreatedAt { get; set; }
}
