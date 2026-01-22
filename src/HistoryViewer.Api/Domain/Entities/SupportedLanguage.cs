namespace HistoryViewer.Api.Domain.Entities;

/// <summary>
/// Supported languages for localization
/// </summary>
public class SupportedLanguage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string NameNative { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsRtl { get; set; } = false;
}
