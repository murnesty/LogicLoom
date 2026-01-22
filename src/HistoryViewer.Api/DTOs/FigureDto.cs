namespace HistoryViewer.Api.DTOs;

/// <summary>
/// Historical figure summary
/// </summary>
public record FigureSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Role { get; init; }
    public string? PortraitUrl { get; init; }
}

/// <summary>
/// Detailed historical figure response
/// </summary>
public record FigureDetailDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Biography { get; init; }
    public int? BirthYear { get; init; }
    public int? DeathYear { get; init; }
    public GeoPointDto? BirthPlace { get; init; }
    public string? PortraitUrl { get; init; }
    public List<FigureRoleDto> Roles { get; init; } = new();
    public List<EventSummaryDto> Events { get; init; } = new();
}

/// <summary>
/// Role of a historical figure in a specific era
/// </summary>
public record FigureRoleDto
{
    public string Role { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string? EraName { get; init; }
}
