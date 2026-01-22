namespace HistoryViewer.Api.Domain.Entities;

/// <summary>
/// Junction table linking events to historical figures with their role
/// </summary>
public class EventFigure
{
    public Guid EventId { get; set; }
    public Guid FigureId { get; set; }
    
    /// <summary>
    /// Role in this event (e.g., "commander", "founder", "victim")
    /// </summary>
    public string? Role { get; set; }
    
    public Event Event { get; set; } = null!;
    public HistoricalFigure Figure { get; set; } = null!;
}
