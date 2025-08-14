using System;
using System.Collections.Generic;

namespace LogicLoom.Shared.Models;

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

public class NodeRelationship
{
    public Guid Id { get; set; }
    public Guid SourceNodeId { get; set; }
    public Guid TargetNodeId { get; set; }
    public string Type { get; set; } = string.Empty;
    public Dictionary<string, string> Properties { get; set; } = new();
}

public record DocumentView(
    Guid DocumentId,
    IEnumerable<DocumentNode> Nodes,
    IEnumerable<NodeRelationship> Relationships);

public record SearchMatch(string Content, int Position, int Level);

public record DocumentSearchResult(
    Guid DocumentId,
    string Preview,
    int MatchCount,
    IEnumerable<SearchMatch> Matches);
