using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using LogicLoom.DocumentProcessor.Services;

var builder = Host.CreateDefaultBuilder(args)
    .ConfigureServices((hostContext, services) =>
    {
        services.AddHostedService<DocumentProcessorService>();
        // Add other services here
    });

await builder.Build().RunAsync();
