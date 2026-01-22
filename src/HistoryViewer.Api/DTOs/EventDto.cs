namespace HistoryViewer.Api.DTOs;

/// <summary>
/// Event summary for list/map views (smaller payload)
/// </summary>
public record EventSummaryDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public int Year { get; init; }
    public decimal Lat { get; init; }
    public decimal Lng { get; init; }
    public string Category { get; init; } = string.Empty;
    public int Significance { get; init; }
    public string? ThumbnailUrl { get; init; }
    public string? EraName { get; init; }
    public string? EraColor { get; init; }
}

/// <summary>
/// Detailed event response
/// </summary>
public record EventDetailDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int StartYear { get; init; }
    public int? EndYear { get; init; }
    public string DatePrecision { get; init; } = "year";
    public GeoPointDto Location { get; init; } = new();
    public string Category { get; init; } = string.Empty;
    public int Significance { get; init; }
    public string? ImageUrl { get; init; }
    public string? SourceUrl { get; init; }
    public EraDto? Era { get; init; }
    public List<FigureSummaryDto> Figures { get; init; } = new();
    public List<string> Tags { get; init; } = new();
    public List<EventSummaryDto> RelatedEvents { get; init; } = new();
}

/// <summary>
/// Geographic point
/// </summary>
public record GeoPointDto
{
    public decimal Lat { get; init; }
    public decimal Lng { get; init; }
}
