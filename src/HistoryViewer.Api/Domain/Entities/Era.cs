namespace HistoryViewer.Api.Domain.Entities;

/// <summary>
/// Represents a historical era/dynasty (e.g., Qin Dynasty, Han Dynasty)
/// </summary>
public class Era
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Default name in English
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Translations stored as JSONB: {"zh": "??", "ja": "???", ...}
    /// </summary>
    public Dictionary<string, string> NameI18n { get; set; } = new();
    
    /// <summary>
    /// Description in English (default)
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Description translations
    /// </summary>
    public Dictionary<string, string> DescriptionI18n { get; set; } = new();
    
    /// <summary>
    /// Start year (negative for BC, e.g., -221 for 221 BC)
    /// </summary>
    public int StartYear { get; set; }
    
    /// <summary>
    /// End year (negative for BC)
    /// </summary>
    public int EndYear { get; set; }
    
    /// <summary>
    /// Civilization identifier (e.g., "Chinese", "Roman")
    /// </summary>
    public string Civilization { get; set; } = string.Empty;
    
    /// <summary>
    /// Capital city latitude
    /// </summary>
    public decimal? CapitalLat { get; set; }
    
    /// <summary>
    /// Capital city longitude
    /// </summary>
    public decimal? CapitalLng { get; set; }
    
    /// <summary>
    /// Hex color for UI display (e.g., "#8B4513")
    /// </summary>
    public string? Color { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public ICollection<Event> Events { get; set; } = new List<Event>();
    public ICollection<Territory> Territories { get; set; } = new List<Territory>();
    
    /// <summary>
    /// Get localized name with fallback to English
    /// </summary>
    public string GetLocalizedName(string lang)
    {
        if (lang == "en" || !NameI18n.TryGetValue(lang, out var translation))
            return Name;
        return translation;
    }
    
    /// <summary>
    /// Get localized description with fallback to English
    /// </summary>
    public string? GetLocalizedDescription(string lang)
    {
        if (lang == "en" || !DescriptionI18n.TryGetValue(lang, out var translation))
            return Description;
        return translation;
    }
}
