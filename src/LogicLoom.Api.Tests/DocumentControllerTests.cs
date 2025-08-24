using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LogicLoom.Api.Controllers;
using LogicLoom.DocumentProcessor.Models;
using LogicLoom.DocumentProcessor.Services;
using LogicLoom.Shared.Models;
using LogicLoom.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace LogicLoom.Api.Tests
{
    public class DocumentControllerTests
    {
        private class FakeParser : IWordMLParser
        {
            private readonly IEnumerable<LogicLoom.DocumentProcessor.Models.DocumentNode> _nodes;
            public FakeParser(IEnumerable<LogicLoom.DocumentProcessor.Models.DocumentNode> nodes) => _nodes = nodes;
            public Task<IEnumerable<LogicLoom.DocumentProcessor.Models.DocumentNode>> ParseDocumentAsync(Stream documentStream) => Task.FromResult(_nodes);
            public Task<IEnumerable<LogicLoom.DocumentProcessor.Models.NodeRelationship>> ExtractRelationshipsAsync(IEnumerable<LogicLoom.DocumentProcessor.Models.DocumentNode> nodes) => Task.FromResult(Enumerable.Empty<LogicLoom.DocumentProcessor.Models.NodeRelationship>());
        }

        private DocumentDbContext CreateInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<DocumentDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new DocumentDbContext(options);
        }

        private IFormFile CreateFormFile(string content, string fileName = "test.docx")
        {
            var bytes = Encoding.UTF8.GetBytes(content);
            var stream = new MemoryStream(bytes);
            return new FormFile(stream, 0, bytes.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            };
        }

        [Fact]
        public async Task UploadDocument_Returns_UploadResult_With_DocumentId()
        {
            // Arrange
            // Create a simple fake IWordMLParser to avoid Moq/Castle dependency in tests
            var documentId = Guid.NewGuid();
            var nodes = new List<LogicLoom.DocumentProcessor.Models.DocumentNode>
            {
                new LogicLoom.DocumentProcessor.Models.DocumentNode { Id = Guid.NewGuid(), DocumentId = documentId, Content = "Hello", Position = 1 },
                new LogicLoom.DocumentProcessor.Models.DocumentNode { Id = Guid.NewGuid(), DocumentId = documentId, Content = "World", Position = 2 }
            };

            var parserFake = new FakeParser(nodes);

            using var db = CreateInMemoryContext();
            var logger = new NullLogger<DocumentController>();
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string>()).Build();

            var controller = new DocumentController(parserFake, db, logger, config);

            var formFile = CreateFormFile("dummy content");

            // Act
            var result = await controller.UploadDocument(formFile);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result);
            var uploadResult = Assert.IsType<UploadResult>(ok.Value);
            Assert.Equal(documentId, uploadResult.DocumentId);
            Assert.Equal(2, uploadResult.NodeCount);
            Assert.NotNull(uploadResult.Preview);
            Assert.Equal(formFile.FileName, uploadResult.FileName);
        }
    }
}
