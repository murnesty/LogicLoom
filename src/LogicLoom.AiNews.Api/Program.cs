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
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var isProduction = !string.IsNullOrEmpty(databaseUrl);

if (isProduction)
{
    // Production: Use PostgreSQL from Railway
    string connectionString;

    if (databaseUrl.StartsWith("postgres://") || databaseUrl.StartsWith("postgresql://"))
    {
        // Convert Railway DATABASE_URL to Npgsql connection string
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo?.Split(':');

        if (userInfo != null && userInfo.Length >= 2)
        {
            connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true;";
            Console.WriteLine("Converted Railway DATABASE_URL to Npgsql format");
        }
        else
        {
            throw new InvalidOperationException("Invalid DATABASE_URL format - missing username or password");
        }
    }
    else
    {
        // Already in Npgsql format
        connectionString = databaseUrl;
    }

    builder.Services.AddDbContext<AiNewsDbContext>(options =>
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure();
        }));

    Console.WriteLine("🐘 Using PostgreSQL from Railway DATABASE_URL");
}
else
{
    // Local Development: Use In-Memory Database
    builder.Services.AddDbContext<AiNewsDbContext>(options =>
        options.UseInMemoryDatabase("LogicLoomLocalDb"));

    Console.WriteLine("� Using In-Memory database for local development");
}

// Register application services
builder.Services.AddScoped<IContentScraperService, MockContentScraperService>();
builder.Services.AddScoped<IContentProcessingService, MockContentProcessingService>();
builder.Services.AddScoped<IDataStorageService, DataStorageService>();

// Add health checks
builder.Services.AddHealthChecks();

// Add CORS for development and production
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",           // Local Blazor dev
                "http://localhost:5000",           // Local Blazor alt port
                "https://murnesty.github.io"       // GitHub Pages
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
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

// Add CORS headers for debugging
app.Use(async (context, next) =>
{
    context.Response.Headers["Access-Control-Allow-Origin"] = "https://murnesty.github.io";
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    await next();
});

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

        Console.WriteLine("Starting database initialization...");

        // Create database and run migrations
        await context.Database.EnsureCreatedAsync();
        Console.WriteLine("Database created successfully");

        // Only seed if we have no data
        if (!await context.AIModels.AnyAsync())
        {
            Console.WriteLine("Seeding AI models...");
            var scraper = scope.ServiceProvider.GetRequiredService<IContentScraperService>();
            var storage = scope.ServiceProvider.GetRequiredService<IDataStorageService>();

            var models = await scraper.ScrapeModelReleasesAsync();
            int successCount = 0;
            foreach (var model in models)
            {
                try
                {
                    await storage.SaveModelAsync(model);
                    successCount++;
                    Console.WriteLine($"Successfully saved model: {model.Name}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to save model {model.Name}: {ex.Message}");
                }
            }
            Console.WriteLine($"Seeded {successCount} AI models");
        }

        if (!await context.NewsArticles.AnyAsync())
        {
            Console.WriteLine("Seeding news articles...");
            var scraper = scope.ServiceProvider.GetRequiredService<IContentScraperService>();
            var processor = scope.ServiceProvider.GetRequiredService<IContentProcessingService>();
            var storage = scope.ServiceProvider.GetRequiredService<IDataStorageService>();

            var articles = await scraper.ScrapeLatestNewsAsync();
            int successCount = 0;
            foreach (var article in articles)
            {
                try
                {
                    var processedArticle = await processor.ProcessArticleAsync(article);
                    await storage.SaveArticleAsync(processedArticle);
                    successCount++;
                    Console.WriteLine($"Successfully saved article: {article.Title}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to save article {article.Title}: {ex.Message}");
                }
            }
            Console.WriteLine($"Seeded {successCount} news articles");
        }

        Console.WriteLine("Database initialization completed successfully");
    }
}
catch (Exception ex)
{
    // Log error but don't crash the app
    Console.WriteLine($"Database initialization failed: {ex.Message}");
    Console.WriteLine($"Stack trace: {ex.StackTrace}");
    // Continue without seeded data - API will still work
}

app.Run();