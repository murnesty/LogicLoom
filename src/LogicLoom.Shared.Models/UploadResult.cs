using System;

namespace LogicLoom.Shared.Models;

public class UploadResult
{
    public Guid DocumentId { get; set; }
    public int NodeCount { get; set; }
    public string Preview { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
