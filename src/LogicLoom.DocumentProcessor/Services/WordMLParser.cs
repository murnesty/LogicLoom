using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using LogicLoom.DocumentProcessor.Models;
using Microsoft.Extensions.Logging;

namespace LogicLoom.DocumentProcessor.Services;

public class WordMLParser : IWordMLParser
{
    private readonly ILogger<WordMLParser> _logger;

    public WordMLParser(ILogger<WordMLParser> logger)
    {
        _logger = logger;
    }

    public Task<IEnumerable<DocumentNode>> ParseDocumentAsync(Stream documentStream)
    {
        var nodes = new List<DocumentNode>();
        var documentId = Guid.NewGuid();

        try
        {
            using var wordDocument = WordprocessingDocument.Open(documentStream, false);
            var body = wordDocument.MainDocumentPart?.Document.Body;

            if (body == null)
            {
                _logger.LogWarning("Document body is empty");
                return Task.FromResult(nodes.AsEnumerable());
            }

            var position = 0;
            var currentLevel = 0;
            Stack<(DocumentNode Node, int Level)> nodeStack = new();

            foreach (var element in body.Elements())
            {
                if (element is not Paragraph paragraph) continue;

                var node = new DocumentNode
                {
                    Id = Guid.NewGuid(),
                    DocumentId = documentId,
                    Position = position++,
                    Level = currentLevel
                };

                // Extract style information
                var style = paragraph.ParagraphProperties?.ParagraphStyleId?.Val?.Value;
                node.StyleName = style ?? string.Empty;

                // Handle list information
                var numPr = paragraph.ParagraphProperties?.NumberingProperties;
                if (numPr?.NumberingLevelReference?.Val != null)
                {
                    var levelVal = numPr.NumberingLevelReference.Val;
                    node.ListLevel = levelVal.Value;
                    node.Type = "ListItem";
                }
                else
                {
                    node.Type = "Paragraph";
                }

                // Extract text and formatting
                var text = new System.Text.StringBuilder();
                bool hasBold = false;
                bool hasItalic = false;

                foreach (var run in paragraph.Elements<Run>())
                {
                    var runProperties = run.RunProperties;
                    if (runProperties != null)
                    {
                        hasBold |= runProperties.Bold != null;
                        hasItalic |= runProperties.Italic != null;
                    }

                    foreach (var textElement in run.Elements<Text>())
                    {
                        text.Append(textElement.Text);
                    }
                }

                node.Content = text.ToString();
                node.IsBold = hasBold;
                node.IsItalic = hasItalic;

                // Handle document hierarchy based on styles and list levels
                while (nodeStack.Count > 0 &&
                       ((node.ListLevel.HasValue && nodeStack.Peek().Node.ListLevel.HasValue && node.ListLevel <= nodeStack.Peek().Node.ListLevel) ||
                        (!node.ListLevel.HasValue && nodeStack.Peek().Level >= currentLevel)))
                {
                    nodeStack.Pop();
                }

                if (nodeStack.Count > 0)
                {
                    node.ParentId = nodeStack.Peek().Node.Id;
                }

                nodeStack.Push((node, currentLevel));
                nodes.Add(node);
            }

            return Task.FromResult(nodes.AsEnumerable());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing document. Stream length: {Length}, Stream position: {Position}, Stream can seek: {CanSeek}",
                documentStream.Length,
                documentStream.Position,
                documentStream.CanSeek);
            throw;
        }
    }

    public Task<IEnumerable<NodeRelationship>> ExtractRelationshipsAsync(IEnumerable<DocumentNode> nodes)
    {
        var relationships = new List<NodeRelationship>();
        var nodesList = nodes.ToList();

        for (int i = 0; i < nodesList.Count; i++)
        {
            var currentNode = nodesList[i];

            if (currentNode.ParentId.HasValue)
            {
                relationships.Add(new NodeRelationship
                {
                    Id = Guid.NewGuid(),
                    SourceNodeId = currentNode.ParentId.Value,
                    TargetNodeId = currentNode.Id,
                    Type = "Parent-Child"
                });
            }

            // Add sequential relationship if there's a next node
            if (i < nodesList.Count - 1)
            {
                relationships.Add(new NodeRelationship
                {
                    Id = Guid.NewGuid(),
                    SourceNodeId = currentNode.Id,
                    TargetNodeId = nodesList[i + 1].Id,
                    Type = "Sequential"
                });
            }
        }

        return Task.FromResult(relationships.AsEnumerable());
    }
}
