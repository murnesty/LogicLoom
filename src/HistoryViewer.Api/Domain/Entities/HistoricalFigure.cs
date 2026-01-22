namespace HistoryViewer.Api.Domain.Entities;

public class HistoricalFigure
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, string> NameI18n { get; set; } = new();
    public string? Biography { get; set; }
    public Dictionary<string, string> BiographyI18n { get; set; } = new();
    public int? BirthYear { get; set; }
    public int? DeathYear { get; set; }
    public decimal? BirthPlaceLat { get; set; }
    public decimal? BirthPlaceLng { get; set; }
    public string? PortraitUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<EventFigure> EventFigures { get; set; } = new List<EventFigure>();
    public ICollection<FigureRole> Roles { get; set; } = new List<FigureRole>();
    public string GetLocalizedName(string lang) => lang == "en" || !NameI18n.TryGetValue(lang, out var t) ? Name : t;
    public string? GetLocalizedBiography(string lang) => lang == "en" || !BiographyI18n.TryGetValue(lang, out var t) ? Biography : t;
}