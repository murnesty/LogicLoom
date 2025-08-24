using System;
using LogicLoom.Shared.Models;
using Xunit;

namespace LogicLoom.Api.Tests
{
    public class UploadResultTests
    {
        [Fact]
        public void UploadResult_CanBeCreated_WithAllProperties()
        {
            // Arrange
            var documentId = Guid.NewGuid();
            var nodeCount = 5;
            var preview = "This is a test preview";
            var fileName = "test.docx";
            var contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            var createdAt = DateTime.UtcNow;

            // Act
            var result = new UploadResult
            {
                DocumentId = documentId,
                NodeCount = nodeCount,
                Preview = preview,
                FileName = fileName,
                ContentType = contentType,
                CreatedAt = createdAt
            };

            // Assert
            Assert.Equal(documentId, result.DocumentId);
            Assert.Equal(nodeCount, result.NodeCount);
            Assert.Equal(preview, result.Preview);
            Assert.Equal(fileName, result.FileName);
            Assert.Equal(contentType, result.ContentType);
            Assert.Equal(createdAt, result.CreatedAt);
        }

        [Fact]
        public void UploadResult_HasDefaultValues()
        {
            // Act
            var result = new UploadResult();

            // Assert
            Assert.Equal(Guid.Empty, result.DocumentId);
            Assert.Equal(0, result.NodeCount);
            Assert.Equal(string.Empty, result.Preview);
            Assert.Equal(string.Empty, result.FileName);
            Assert.Equal(string.Empty, result.ContentType);
            Assert.Equal(default(DateTime), result.CreatedAt);
        }
    }
}
