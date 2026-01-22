namespace HistoryViewer.Api.Domain.Entities;

/// <summary>
/// Role of a historical figure (e.g., Emperor, General) in a specific era
/// </summary>
public class FigureRole
{
    public Guid Id { get; set; }
    public Guid FigureId { get; set; }
    public string Role { get; set; } = string.Empty;
    public Guid? EraId { get; set; }
    public string? TitleEn { get; set; }
    public string? TitleZh { get; set; }
    
    public HistoricalFigure Figure { get; set; } = null!;
    public Era? Era { get; set; }
}
