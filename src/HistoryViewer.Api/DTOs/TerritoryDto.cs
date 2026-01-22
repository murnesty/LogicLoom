namespace HistoryViewer.Api.DTOs;

/// <summary>
/// Territory for map overlay
/// </summary>
public record TerritoryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int Year { get; init; }
    public string Civilization { get; init; } = string.Empty;
    public object? Boundaries { get; init; }  // GeoJSON
    public string? Color { get; init; }
}

/// <summary>
/// Supported language information
/// </summary>
public record LanguageDto
{
    public string Code { get; init; } = string.Empty;
    public string NameNative { get; init; } = string.Empty;
    public string NameEn { get; init; } = string.Empty;
    public bool IsRtl { get; init; }
}
