using LogicLoom.DocumentProcessor.Models;

namespace LogicLoom.DocumentProcessor.Services;

public interface IWordMLParser
{
    Task<IEnumerable<DocumentNode>> ParseDocumentAsync(Stream documentStream);
    Task<IEnumerable<NodeRelationship>> ExtractRelationshipsAsync(IEnumerable<DocumentNode> nodes);
}
