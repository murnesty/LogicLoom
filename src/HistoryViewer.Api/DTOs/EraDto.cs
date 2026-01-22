namespace HistoryViewer.Api.DTOs;

/// <summary>
/// Era summary for list views
/// </summary>
public record EraDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int StartYear { get; init; }
    public int EndYear { get; init; }
    public string Civilization { get; init; } = string.Empty;
    public string? Color { get; init; }
    public int EventCount { get; init; }
}

/// <summary>
/// Detailed era response
/// </summary>
public record EraDetailDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int StartYear { get; init; }
    public int EndYear { get; init; }
    public string Civilization { get; init; } = string.Empty;
    public decimal? CapitalLat { get; init; }
    public decimal? CapitalLng { get; init; }
    public string? Color { get; init; }
    public int EventCount { get; init; }
    public List<EventSummaryDto> RecentEvents { get; init; } = new();
}
