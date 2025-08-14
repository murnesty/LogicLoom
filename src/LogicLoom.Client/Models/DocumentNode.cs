using System;
using System.Collections.Generic;

namespace LogicLoom.Client.Models;

public class DocumentNode
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int Level { get; set; }
    public int Position { get; set; }
    public string StyleName { get; set; } = string.Empty;
    public bool IsBold { get; set; }
    public bool IsItalic { get; set; }
    public int? ListLevel { get; set; }
    public string? ListType { get; set; }
    public Dictionary<string, string> Properties { get; set; } = new();
    public Guid? ParentId { get; set; }
}
