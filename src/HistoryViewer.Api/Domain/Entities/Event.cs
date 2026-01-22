namespace HistoryViewer.Api.Domain.Entities;

public class Event
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public Dictionary<string, string> TitleI18n { get; set; } = new();
    public string? Description { get; set; }
    public Dictionary<string, string> DescriptionI18n { get; set; } = new();
    public int StartYear { get; set; }
    public int? EndYear { get; set; }
    public string DatePrecision { get; set; } = "year";
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string Category { get; set; } = string.Empty;
    public int Significance { get; set; }
    public string? ImageUrl { get; set; }
    public string? SourceUrl { get; set; }
    public Guid? EraId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Era? Era { get; set; }
    public ICollection<EventFigure> EventFigures { get; set; } = new List<EventFigure>();
    public ICollection<EventTag> EventTags { get; set; } = new List<EventTag>();
    public string GetLocalizedTitle(string lang) => lang == "en" || !TitleI18n.TryGetValue(lang, out var t) ? Title : t;
    public string? GetLocalizedDescription(string lang) => lang == "en" || !DescriptionI18n.TryGetValue(lang, out var t) ? Description : t;
}