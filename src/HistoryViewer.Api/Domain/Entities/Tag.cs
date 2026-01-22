namespace HistoryViewer.Api.Domain.Entities;

/// <summary>
/// Tag for categorizing events
/// </summary>
public class Tag
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, string> NameI18n { get; set; } = new();
    public string? Category { get; set; }
    
    public ICollection<EventTag> EventTags { get; set; } = new List<EventTag>();
    
    public string GetLocalizedName(string lang) => 
        lang == "en" || !NameI18n.TryGetValue(lang, out var t) ? Name : t;
}
