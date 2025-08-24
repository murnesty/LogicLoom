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

builder.Services.AddDbContext<AiNewsDbContext>(options =>
    options.UseSqlite(connectionString));

// Register application services
builder.Services.AddScoped<IContentScraperService, MockContentScraperService>();
builder.Services.AddScoped<IContentProcessingService, MockContentProcessingService>();
builder.Services.AddScoped<IDataStorageService, DataStorageService>();

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

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

// Ensure database is created and seed data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AiNewsDbContext>();
    var scraper = scope.ServiceProvider.GetRequiredService<IContentScraperService>();
    var processor = scope.ServiceProvider.GetRequiredService<IContentProcessingService>();
    var storage = scope.ServiceProvider.GetRequiredService<IDataStorageService>();

    // Create database
    context.Database.EnsureCreated();

    // Seed data if empty
    if (!context.AIModels.Any())
    {
        var models = await scraper.ScrapeModelReleasesAsync();
        foreach (var model in models)
        {
            await storage.SaveModelAsync(model);
        }
    }

    if (!context.NewsArticles.Any())
    {
        var articles = await scraper.ScrapeLatestNewsAsync();
        foreach (var article in articles)
        {
            var processedArticle = await processor.ProcessArticleAsync(article);
            await storage.SaveArticleAsync(processedArticle);
        }
    }
}

app.Run();
