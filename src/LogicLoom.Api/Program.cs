using LogicLoom.DocumentProcessor.Services;
using LogicLoom.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerUI;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "LogicLoom API", Version = "v1" });
});

// Configure CORS for Blazor client
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                           ?? new[] { "http://localhost:5024", "https://localhost:7001" };

        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure database - prefer Railway PG* env vars, then DATABASE_URL, then appsettings
string? connectionString = null;

// 1) Prefer Railway's standard PG* variables (these are present when a Postgres service is linked)
var pgHost = Environment.GetEnvironmentVariable("PGHOST");
var pgPort = Environment.GetEnvironmentVariable("PGPORT");
var pgDb = Environment.GetEnvironmentVariable("PGDATABASE");
var pgUser = Environment.GetEnvironmentVariable("PGUSER");
var pgPass = Environment.GetEnvironmentVariable("PGPASSWORD");

if (!string.IsNullOrWhiteSpace(pgHost) &&
    !string.IsNullOrWhiteSpace(pgPort) &&
    !string.IsNullOrWhiteSpace(pgDb) &&
    !string.IsNullOrWhiteSpace(pgUser) &&
    !string.IsNullOrWhiteSpace(pgPass))
{
    connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPass};SSL Mode=Require;Trust Server Certificate=true;";
}

// 2) Else try DATABASE_URL
if (string.IsNullOrWhiteSpace(connectionString))
{
    var dbUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrWhiteSpace(dbUrl) && dbUrl != "$DATABASE_URL")
    {
        connectionString = dbUrl;
    }
}

// 3) Else fallback to appsettings (may be $DATABASE_URL in Production appsettings, we convert if needed)
if (string.IsNullOrWhiteSpace(connectionString))
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
}

// Handle Railway DATABASE_URL format
if (connectionString?.StartsWith("postgresql://") == true)
{
    connectionString = ConvertPostgresUrl(connectionString);
}

builder.Services.AddDbContext<DocumentDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// Add health checks
builder.Services.AddHealthChecks();

// Configure document processor services
builder.Services.AddScoped<IWordMLParser, WordMLParser>();

var app = builder.Build();

// Database connection updated - trigger redeploy
// Run database migrations automatically
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<DocumentDbContext>();
    try
    {
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

// Configure the HTTP request pipeline.
// Enable Swagger in all environments for API testing
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "LogicLoom API v1");
    c.DocExpansion(DocExpansion.None);
    c.RoutePrefix = "swagger"; // Swagger will be available at /swagger
});

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();

// Add health check endpoint
app.MapHealthChecks("/health");

app.MapControllers();

app.Run();

static string ConvertPostgresUrl(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var db = uri.LocalPath.TrimStart('/');
    var userInfo = uri.UserInfo.Split(':');
    return $"Host={uri.Host};Port={uri.Port};Database={db};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true;";
}
