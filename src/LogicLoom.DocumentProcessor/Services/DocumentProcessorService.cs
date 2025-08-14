using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LogicLoom.DocumentProcessor.Services;

public class DocumentProcessorService : BackgroundService
{
    private readonly ILogger<DocumentProcessorService> _logger;

    public DocumentProcessorService(ILogger<DocumentProcessorService> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            _logger.LogInformation("Document Processor Service starting at: {time}", DateTimeOffset.Now);

            while (!stoppingToken.IsCancellationRequested)
            {
                // TODO: Add document processing logic here
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "An error occurred in the Document Processor Service");
            throw;
        }
    }
}
