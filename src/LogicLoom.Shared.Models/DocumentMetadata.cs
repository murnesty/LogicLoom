using System;
using System.Collections.Generic;

namespace LogicLoom.Shared.Models
{
    public class DocumentMetadata
    {
        public Guid DocumentId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastModified { get; set; }
        public string Author { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public string Category { get; set; } = string.Empty;
        public long Size { get; set; }
        public string Version { get; set; } = "1.0";
    }

    public class DocumentVersionInfo
    {
        public Guid VersionId { get; set; }
        public string Version { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Author { get; set; } = string.Empty;
        public string ChangeDescription { get; set; } = string.Empty;
    }
}
