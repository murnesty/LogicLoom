namespace HistoryViewer.Api.Domain.Entities;

/// <summary>
/// Junction table linking events to tags
/// </summary>
public class EventTag
{
    public Guid EventId { get; set; }
    public Guid TagId { get; set; }
    
    public Event Event { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
