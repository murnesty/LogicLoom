using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using LogicLoom.Shared.Models;

namespace LogicLoom.Client.Services;

public interface IDocumentService
{
    Task<DocumentProcessingResult> UploadDocumentAsync(MultipartFormDataContent content);
    Task<DocumentView> GetDocumentAsync(Guid documentId);
    Task<DocumentStructureView> GetDocumentStructureAsync(Guid documentId);
    Task DeleteDocumentAsync(Guid documentId);
    Task<IEnumerable<DocumentSearchResult>> SearchDocumentsAsync(string query);
    Task<IEnumerable<DocumentSearchResult>> ListDocumentsAsync(int pageNumber = 1, int pageSize = 10);
    Task<DocumentTreeView> GetDocumentTreeAsync(Guid documentId);
}

public class DocumentService : IDocumentService
{
    private readonly HttpClient _httpClient;

    public DocumentService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<DocumentProcessingResult> UploadDocumentAsync(MultipartFormDataContent content)
    {
        var response = await _httpClient.PostAsync("api/document/upload", content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<DocumentProcessingResult>()
            ?? throw new Exception("Failed to parse response");
    }

    public async Task<DocumentView> GetDocumentAsync(Guid documentId)
    {
        return await _httpClient.GetFromJsonAsync<DocumentView>($"api/document/{documentId}")
            ?? throw new Exception("Failed to load document");
    }

    public async Task<DocumentStructureView> GetDocumentStructureAsync(Guid documentId)
    {
        return await _httpClient.GetFromJsonAsync<DocumentStructureView>($"api/document/{documentId}/structure")
            ?? throw new Exception("Failed to load document structure");
    }

    public async Task DeleteDocumentAsync(Guid documentId)
    {
        var response = await _httpClient.DeleteAsync($"api/document/{documentId}");
        response.EnsureSuccessStatusCode();
    }

    public async Task<IEnumerable<DocumentSearchResult>> SearchDocumentsAsync(string query)
    {
        return await _httpClient.GetFromJsonAsync<IEnumerable<DocumentSearchResult>>($"api/document/search?query={Uri.EscapeDataString(query)}")
            ?? throw new Exception("Failed to search documents");
    }

    public async Task<IEnumerable<DocumentSearchResult>> ListDocumentsAsync(int pageNumber = 1, int pageSize = 10)
    {
        return await _httpClient.GetFromJsonAsync<IEnumerable<DocumentSearchResult>>($"api/document/list?pageNumber={pageNumber}&pageSize={pageSize}")
            ?? throw new Exception("Failed to list documents");
    }

    public async Task<DocumentTreeView> GetDocumentTreeAsync(Guid documentId)
    {
        var document = await GetDocumentAsync(documentId);
        var rootNodes = document.Nodes.Where(n => !n.ParentId.HasValue).OrderBy(n => n.Position);

        TreeNodeViewModel BuildTree(DocumentNode node)
        {
            var children = document.Nodes
                .Where(n => n.ParentId == node.Id)
                .OrderBy(n => n.Position)
                .Select(BuildTree);

            return new TreeNodeViewModel(
                node.Id,
                node.Content.Length > 50 ? node.Content[..47] + "..." : node.Content,
                node.Type,
                children);
        }

        return new DocumentTreeView(
            documentId,
            rootNodes.Select(BuildTree));
    }
}

public record DocumentProcessingResult(Guid DocumentId);

public record DocumentStructureView(IEnumerable<DocumentNodeView> Nodes);

public record DocumentNodeView(
    Guid Id,
    string Type,
    string Content,
    int Level,
    string StyleName,
    bool IsBold,
    bool IsItalic,
    int? ListLevel,
    IEnumerable<DocumentNodeView> Children);



public record DocumentTreeView(
    Guid DocumentId,
    IEnumerable<TreeNodeViewModel> Nodes);

public record TreeNodeViewModel(
    Guid Id,
    string Label,
    string Type,
    IEnumerable<TreeNodeViewModel> Children);
