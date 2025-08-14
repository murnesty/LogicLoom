using System;
using System.Threading.Tasks;
using LogicLoom.DocumentProcessor.Models;
using LogicLoom.DocumentProcessor.Services;
using LogicLoom.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LogicLoom.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly IWordMLParser _parser;
    private readonly DocumentDbContext _dbContext;
    private readonly ILogger<DocumentController> _logger;

    public DocumentController(
        IWordMLParser parser,
        DocumentDbContext dbContext,
        ILogger<DocumentController> logger)
    {
        _parser = parser;
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadDocument(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        if (!file.FileName.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only .docx files are supported");
        }

        try
        {
            // Copy to memory stream to ensure it's seekable
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            _logger.LogInformation("Processing document {FileName} with size {Size} bytes", file.FileName, file.Length);
            var nodes = await _parser.ParseDocumentAsync(memoryStream);
            var relationships = await _parser.ExtractRelationshipsAsync(nodes);

            // Store nodes and relationships in the database
            await _dbContext.Nodes.AddRangeAsync(nodes);
            await _dbContext.Relationships.AddRangeAsync(relationships);
            await _dbContext.SaveChangesAsync();

            return Ok(new { DocumentId = nodes.First().DocumentId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing document {FileName}", file.FileName);
            return StatusCode(500, "Error processing document");
        }
    }

    [HttpGet("{documentId}")]
    public async Task<IActionResult> GetDocument(Guid documentId)
    {
        var nodes = await _dbContext.Nodes
            .Where(n => n.DocumentId == documentId)
            .OrderBy(n => n.Position)
            .ToListAsync();

        if (!nodes.Any())
        {
            return NotFound();
        }

        var relationships = await _dbContext.Relationships
            .Where(r => nodes.Select(n => n.Id).Contains(r.SourceNodeId))
            .ToListAsync();

        return Ok(new
        {
            DocumentId = documentId,
            Nodes = nodes,
            Relationships = relationships
        });
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchDocuments([FromQuery] string query)
    {
        var nodes = await _dbContext.Nodes
            .Where(n => EF.Functions.ILike(n.Content, $"%{query}%"))
            .OrderBy(n => n.Position)
            .Take(100)
            .ToListAsync();

        var documentIds = nodes.Select(n => n.DocumentId).Distinct();
        var documents = await _dbContext.Nodes
            .Where(n => documentIds.Contains(n.DocumentId))
            .OrderBy(n => n.Position)
            .ToListAsync();

        var results = documents
            .GroupBy(n => n.DocumentId)
            .Select(g => new
            {
                DocumentId = g.Key,
                Preview = string.Join(" ", g.Take(3).Select(n => n.Content)),
                MatchCount = nodes.Count(n => n.DocumentId == g.Key),
                Matches = nodes
                    .Where(n => n.DocumentId == g.Key)
                    .Select(n => new { n.Content, n.Position, n.Level })
            });

        return Ok(results);
    }

    [HttpDelete("{documentId}")]
    public async Task<IActionResult> DeleteDocument(Guid documentId)
    {
        // Use a transaction to ensure atomicity
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            // Delete relationships first due to foreign key constraints
            await _dbContext.Relationships
                .Where(r => _dbContext.Nodes
                    .Where(n => n.DocumentId == documentId)
                    .Select(n => n.Id)
                    .Contains(r.SourceNodeId))
                .ExecuteDeleteAsync();

            // Then delete nodes
            await _dbContext.Nodes
                .Where(n => n.DocumentId == documentId)
                .ExecuteDeleteAsync();

            await transaction.CommitAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error deleting document {DocumentId}", documentId);
            return StatusCode(500, "Error deleting document");
        }
    }

    [HttpGet("{documentId}/structure")]
    public async Task<IActionResult> GetDocumentStructure(Guid documentId)
    {
        var nodes = await _dbContext.Nodes
            .Where(n => n.DocumentId == documentId)
            .OrderBy(n => n.Position)
            .ToListAsync();

        if (!nodes.Any())
        {
            return NotFound();
        }

        var relationships = await _dbContext.Relationships
            .Where(r => nodes.Select(n => n.Id).Contains(r.SourceNodeId))
            .ToListAsync();

        // Build hierarchical structure
        var rootNodes = nodes.Where(n => !n.ParentId.HasValue).ToList();
        var structure = BuildDocumentStructure(rootNodes, nodes, relationships);

        return Ok(structure);
    }

    private IEnumerable<object> BuildDocumentStructure(
        List<DocumentNode> nodes,
        List<DocumentNode> allNodes,
        List<NodeRelationship> relationships)
    {
        var result = new List<object>();

        foreach (var node in nodes)
        {
            var children = allNodes
                .Where(n => n.ParentId == node.Id)
                .OrderBy(n => n.Position)
                .ToList();

            var nodeStructure = new
            {
                node.Id,
                node.Type,
                node.Content,
                node.Level,
                node.StyleName,
                node.IsBold,
                node.IsItalic,
                node.ListLevel,
                Children = BuildDocumentStructure(children, allNodes, relationships)
            };

            result.Add(nodeStructure);
        }

        return result;
    }
}
