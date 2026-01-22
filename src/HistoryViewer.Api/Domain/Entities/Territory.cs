namespace HistoryViewer.Api.Domain.Entities;

/// <summary>
/// Represents territory boundaries at a specific point in time
/// </summary>
public class Territory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, string> NameI18n { get; set; } = new();
    
    /// <summary>
    /// Snapshot year for this territory boundary
    /// </summary>
    public int Year { get; set; }
    
    public Guid? EraId { get; set; }
    public string Civilization { get; set; } = string.Empty;
    
    /// <summary>
    /// GeoJSON polygon boundaries stored as JSONB
    /// </summary>
    public string? Boundaries { get; set; }
    
    /// <summary>
    /// Hex color for map display
    /// </summary>
    public string? Color { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Era? Era { get; set; }
    
    public string GetLocalizedName(string lang) => 
        lang == "en" || !NameI18n.TryGetValue(lang, out var t) ? Name : t;
}
