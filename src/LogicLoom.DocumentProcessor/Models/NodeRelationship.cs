using System;

namespace LogicLoom.DocumentProcessor.Models;

public class NodeRelationship
{
    public Guid Id { get; set; }
    public Guid SourceNodeId { get; set; }
    public Guid TargetNodeId { get; set; }
    public string Type { get; set; } = string.Empty;
    public Dictionary<string, string> Properties { get; set; } = new();
}
