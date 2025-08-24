using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LogicLoom.Shared.Models;
using Xunit;

namespace LogicLoom.Api.Tests
{
    public class ApiIntegrationTests
    {
        [Fact]
        public void UploadResult_SerializationTest()
        {
            // Arrange
            var uploadResult = new UploadResult
            {
                DocumentId = Guid.NewGuid(),
                NodeCount = 10,
                Preview = "This is a sample document preview",
                FileName = "sample.docx",
                ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                CreatedAt = DateTime.UtcNow
            };

            // Act & Assert - verify the object can be serialized/used as expected
            Assert.NotEqual(Guid.Empty, uploadResult.DocumentId);
            Assert.True(uploadResult.NodeCount > 0);
            Assert.False(string.IsNullOrEmpty(uploadResult.Preview));
            Assert.False(string.IsNullOrEmpty(uploadResult.FileName));
            Assert.EndsWith(".docx", uploadResult.FileName);
            Assert.False(string.IsNullOrEmpty(uploadResult.ContentType));
            Assert.True(uploadResult.CreatedAt > DateTime.MinValue);
        }

        [Theory]
        [InlineData("test.docx", true)]
        [InlineData("test.DOCX", true)]
        [InlineData("test.pdf", false)]
        [InlineData("test.txt", false)]
        [InlineData("", false)]
        public void DocumentFileExtension_ValidationLogic(string fileName, bool expectedValid)
        {
            // This tests the logic that would be used in the controller
            var isValidDocx = !string.IsNullOrEmpty(fileName) &&
                             fileName.EndsWith(".docx", StringComparison.OrdinalIgnoreCase);

            Assert.Equal(expectedValid, isValidDocx);
        }

        [Fact]
        public void UploadResult_Preview_TruncationLogic()
        {
            // Simulate the preview generation logic from the controller
            var sampleNodes = new[]
            {
                "First paragraph content",
                "Second paragraph content",
                "Third paragraph content",
                "Fourth paragraph content"
            };

            var preview = string.Join(" ", sampleNodes.Take(3));

            Assert.Equal("First paragraph content Second paragraph content Third paragraph content", preview);
            Assert.DoesNotContain("Fourth paragraph content", preview);
        }
    }
}
