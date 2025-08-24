using LogicLoom.AiNews.Api.Data;
using LogicLoom.AiNews.Api.Services;
using LogicLoom.AiNews.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=ainews.db";

// Check for Railway PostgreSQL
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(databaseUrl))
{
    // Railway PostgreSQL connection
    builder.Services.AddDbContext<AiNewsDbContext>(options =>
        options.UseNpgsql(databaseUrl));
}
else
{
    // SQLite for local development
    builder.Services.AddDbContext<AiNewsDbContext>(options =>
        options.UseSqlite(connectionString));
}

// Register application services
builder.Services.AddScoped<IContentScraperService, MockContentScraperService>();
builder.Services.AddScoped<IContentProcessingService, MockContentProcessingService>();
builder.Services.AddScoped<IDataStorageService, DataStorageService>();

// Add health checks
builder.Services.AddHealthChecks();

// Add CORS for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Don't redirect HTTPS in Railway (Railway handles SSL termination)
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseAuthorization();
app.MapControllers();

// Add health check endpoint
app.MapHealthChecks("/health");

// Simple health check endpoint for Railway
app.MapGet("/", () => "LogicLoom AI News API is running!");

// Ensure database is created and seed data
try
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<AiNewsDbContext>();
        var scraper = scope.ServiceProvider.GetRequiredService<IContentScraperService>();
        var processor = scope.ServiceProvider.GetRequiredService<IContentProcessingService>();
        var storage = scope.ServiceProvider.GetRequiredService<IDataStorageService>();

        // Create database
        await context.Database.EnsureCreatedAsync();

        // Seed data if empty
        if (!await context.AIModels.AnyAsync())
        {
            var models = await scraper.ScrapeModelReleasesAsync();
            foreach (var model in models)
            {
                await storage.SaveModelAsync(model);
            }
        }

        if (!await context.NewsArticles.AnyAsync())
        {
            var articles = await scraper.ScrapeLatestNewsAsync();
            foreach (var article in articles)
            {
                var processedArticle = await processor.ProcessArticleAsync(article);
                await storage.SaveArticleAsync(processedArticle);
            }
        }
    }
}
catch (Exception ex)
{
    // Log error but don't crash the app
    Console.WriteLine($"Database seeding failed: {ex.Message}");
}

app.Run();
