using System;

namespace LogicLoom.Client.Models;

public class NodeRelationship
{
    public Guid Id { get; set; }
    public Guid SourceNodeId { get; set; }
    public Guid TargetNodeId { get; set; }
    public string Type { get; set; } = string.Empty;
}
