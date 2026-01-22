using Microsoft.EntityFrameworkCore;
using HistoryViewer.Api.Infrastructure;
using HistoryViewer.Api.DTOs;

var builder = WebApplication.CreateBuilder(args);

// Add CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add Database (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=historyviewer;Username=postgres;Password=postgres";

builder.Services.AddDbContext<HistoryDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add Swagger for .NET 8
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "History Viewer API", Version = "v1" });
});

var app = builder.Build();

// Initialize database and seed data
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<HistoryDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    logger.LogInformation("Starting database initialization...");
    db.Database.EnsureCreated();
    logger.LogInformation("Database created/verified successfully");
    
    ChineseHistorySeeder.Seed(db);
    logger.LogInformation("Database seeding completed successfully");
}
catch (Exception ex)
{
    Console.WriteLine($"Database initialization failed: {ex.Message}");
    Console.WriteLine($"Stack trace: {ex.StackTrace}");
    throw;
}

// Enable Swagger in all environments for debugging
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();

// ============================================
// API Endpoints
// ============================================

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", project = "HistoryViewer", timestamp = DateTime.UtcNow }))
   .WithTags("System");

// ============================================
// Languages
// ============================================
app.MapGet("/api/languages", async (HistoryDbContext db) =>
{
    var languages = await db.SupportedLanguages
        .Where(l => l.IsActive)
        .OrderBy(l => l.SortOrder)
        .Select(l => new LanguageDto
        {
            Code = l.Code,
            NameNative = l.NameNative,
            NameEn = l.NameEn,
            IsRtl = l.IsRtl
        })
        .ToListAsync();
    
    return Results.Ok(languages);
})
.WithTags("Languages")
.WithName("GetLanguages");

// ============================================
// Eras
// ============================================
app.MapGet("/api/eras", async (HistoryDbContext db, string? lang, string? civilization) =>
{
    lang ??= "en";
    
    var query = db.Eras.AsQueryable();
    
    if (!string.IsNullOrEmpty(civilization))
    {
        query = query.Where(e => e.Civilization.ToLower() == civilization.ToLower());
    }
    
    var eras = await query
        .OrderBy(e => e.StartYear)
        .Select(e => new EraDto
        {
            Id = e.Id,
            Name = lang == "en" || !e.NameI18n.ContainsKey(lang) ? e.Name : e.NameI18n[lang],
            StartYear = e.StartYear,
            EndYear = e.EndYear,
            Civilization = e.Civilization,
            Color = e.Color,
            EventCount = e.Events.Count
        })
        .ToListAsync();
    
    return Results.Ok(eras);
})
.WithTags("Eras")
.WithName("GetEras");

app.MapGet("/api/eras/{id:guid}", async (Guid id, HistoryDbContext db, string? lang) =>
{
    lang ??= "en";
    
    var era = await db.Eras
        .Include(e => e.Events.OrderByDescending(ev => ev.Significance).Take(10))
        .FirstOrDefaultAsync(e => e.Id == id);
    
    if (era == null)
        return Results.NotFound();
    
    var dto = new EraDetailDto
    {
        Id = era.Id,
        Name = era.GetLocalizedName(lang),
        Description = era.GetLocalizedDescription(lang),
        StartYear = era.StartYear,
        EndYear = era.EndYear,
        Civilization = era.Civilization,
        CapitalLat = era.CapitalLat,
        CapitalLng = era.CapitalLng,
        Color = era.Color,
        EventCount = era.Events.Count,
        RecentEvents = era.Events.Select(e => new EventSummaryDto
        {
            Id = e.Id,
            Title = e.GetLocalizedTitle(lang),
            Year = e.StartYear,
            Lat = e.Latitude,
            Lng = e.Longitude,
            Category = e.Category,
            Significance = e.Significance,
            ThumbnailUrl = e.ImageUrl,
            EraName = era.GetLocalizedName(lang),
            EraColor = era.Color
        }).ToList()
    };
    
    return Results.Ok(dto);
})
.WithTags("Eras")
.WithName("GetEraById");

// ============================================
// Events
// ============================================
app.MapGet("/api/events", async (
    HistoryDbContext db,
    string? lang,
    int? startYear,
    int? endYear,
    string? category,
    string? civilization,
    int? significance,
    int? limit) =>
{
    lang ??= "en";
    limit ??= 100;
    
    var query = db.Events
        .Include(e => e.Era)
        .AsQueryable();
    
    if (startYear.HasValue)
        query = query.Where(e => e.StartYear >= startYear.Value);
    
    if (endYear.HasValue)
        query = query.Where(e => e.StartYear <= endYear.Value);
    
    if (!string.IsNullOrEmpty(category))
    {
        var categories = category.Split(',').Select(c => c.Trim().ToLower());
        query = query.Where(e => categories.Contains(e.Category.ToLower()));
    }
    
    if (!string.IsNullOrEmpty(civilization))
    {
        query = query.Where(e => e.Era != null && e.Era.Civilization.ToLower() == civilization.ToLower());
    }
    
    if (significance.HasValue)
        query = query.Where(e => e.Significance >= significance.Value);
    
    var events = await query
        .OrderByDescending(e => e.Significance)
        .ThenBy(e => e.StartYear)
        .Take(limit.Value)
        .Select(e => new EventSummaryDto
        {
            Id = e.Id,
            Title = lang == "en" || !e.TitleI18n.ContainsKey(lang) ? e.Title : e.TitleI18n[lang],
            Year = e.StartYear,
            Lat = e.Latitude,
            Lng = e.Longitude,
            Category = e.Category,
            Significance = e.Significance,
            ThumbnailUrl = e.ImageUrl,
            EraName = e.Era != null ? (lang == "en" || !e.Era.NameI18n.ContainsKey(lang) ? e.Era.Name : e.Era.NameI18n[lang]) : null,
            EraColor = e.Era != null ? e.Era.Color : null
        })
        .ToListAsync();
    
    return Results.Ok(events);
})
.WithTags("Events")
.WithName("GetEvents");

app.MapGet("/api/events/{id:guid}", async (Guid id, HistoryDbContext db, string? lang) =>
{
    lang ??= "en";
    
    var evt = await db.Events
        .Include(e => e.Era)
        .Include(e => e.EventFigures)
            .ThenInclude(ef => ef.Figure)
        .Include(e => e.EventTags)
            .ThenInclude(et => et.Tag)
        .FirstOrDefaultAsync(e => e.Id == id);
    
    if (evt == null)
        return Results.NotFound();
    
    // Get related events (same era, close in time)
    var relatedEvents = await db.Events
        .Where(e => e.Id != id && e.EraId == evt.EraId)
        .OrderBy(e => Math.Abs(e.StartYear - evt.StartYear))
        .Take(5)
        .Select(e => new EventSummaryDto
        {
            Id = e.Id,
            Title = lang == "en" || !e.TitleI18n.ContainsKey(lang) ? e.Title : e.TitleI18n[lang],
            Year = e.StartYear,
            Lat = e.Latitude,
            Lng = e.Longitude,
            Category = e.Category,
            Significance = e.Significance
        })
        .ToListAsync();
    
    var dto = new EventDetailDto
    {
        Id = evt.Id,
        Title = evt.GetLocalizedTitle(lang),
        Description = evt.GetLocalizedDescription(lang),
        StartYear = evt.StartYear,
        EndYear = evt.EndYear,
        DatePrecision = evt.DatePrecision,
        Location = new GeoPointDto { Lat = evt.Latitude, Lng = evt.Longitude },
        Category = evt.Category,
        Significance = evt.Significance,
        ImageUrl = evt.ImageUrl,
        SourceUrl = evt.SourceUrl,
        Era = evt.Era != null ? new EraDto
        {
            Id = evt.Era.Id,
            Name = evt.Era.GetLocalizedName(lang),
            StartYear = evt.Era.StartYear,
            EndYear = evt.Era.EndYear,
            Civilization = evt.Era.Civilization,
            Color = evt.Era.Color
        } : null,
        Figures = evt.EventFigures.Select(ef => new FigureSummaryDto
        {
            Id = ef.Figure.Id,
            Name = ef.Figure.GetLocalizedName(lang),
            Role = ef.Role,
            PortraitUrl = ef.Figure.PortraitUrl
        }).ToList(),
        Tags = evt.EventTags.Select(et => lang == "en" || !et.Tag.NameI18n.ContainsKey(lang) 
            ? et.Tag.Name 
            : et.Tag.NameI18n[lang]).ToList(),
        RelatedEvents = relatedEvents
    };
    
    return Results.Ok(dto);
})
.WithTags("Events")
.WithName("GetEventById");

// ============================================
// Historical Figures
// ============================================
app.MapGet("/api/figures", async (HistoryDbContext db, string? lang, Guid? era, string? role, int? limit) =>
{
    lang ??= "en";
    limit ??= 50;
    
    var query = db.HistoricalFigures
        .Include(f => f.EventFigures)
        .Include(f => f.Roles)
        .AsQueryable();
    
    if (era.HasValue)
    {
        query = query.Where(f => f.EventFigures.Any(ef => ef.Event.EraId == era.Value));
    }
    
    if (!string.IsNullOrEmpty(role))
    {
        query = query.Where(f => f.Roles.Any(r => r.Role.ToLower() == role.ToLower()));
    }
    
    var figures = await query
        .Take(limit.Value)
        .Select(f => new FigureSummaryDto
        {
            Id = f.Id,
            Name = lang == "en" || !f.NameI18n.ContainsKey(lang) ? f.Name : f.NameI18n[lang],
            PortraitUrl = f.PortraitUrl
        })
        .ToListAsync();
    
    return Results.Ok(figures);
})
.WithTags("Figures")
.WithName("GetFigures");

app.MapGet("/api/figures/{id:guid}", async (Guid id, HistoryDbContext db, string? lang) =>
{
    lang ??= "en";
    
    var figure = await db.HistoricalFigures
        .Include(f => f.Roles)
            .ThenInclude(r => r.Era)
        .Include(f => f.EventFigures)
            .ThenInclude(ef => ef.Event)
                .ThenInclude(e => e.Era)
        .FirstOrDefaultAsync(f => f.Id == id);
    
    if (figure == null)
        return Results.NotFound();
    
    var dto = new FigureDetailDto
    {
        Id = figure.Id,
        Name = figure.GetLocalizedName(lang),
        Biography = figure.GetLocalizedBiography(lang),
        BirthYear = figure.BirthYear,
        DeathYear = figure.DeathYear,
        BirthPlace = figure.BirthPlaceLat.HasValue && figure.BirthPlaceLng.HasValue
            ? new GeoPointDto { Lat = figure.BirthPlaceLat.Value, Lng = figure.BirthPlaceLng.Value }
            : null,
        PortraitUrl = figure.PortraitUrl,
        Roles = figure.Roles.Select(r => new FigureRoleDto
        {
            Role = r.Role,
            Title = lang == "en" ? r.TitleEn : (r.TitleZh ?? r.TitleEn),
            EraName = r.Era?.GetLocalizedName(lang)
        }).ToList(),
        Events = figure.EventFigures.Select(ef => new EventSummaryDto
        {
            Id = ef.Event.Id,
            Title = ef.Event.GetLocalizedTitle(lang),
            Year = ef.Event.StartYear,
            Lat = ef.Event.Latitude,
            Lng = ef.Event.Longitude,
            Category = ef.Event.Category,
            Significance = ef.Event.Significance,
            EraName = ef.Event.Era?.GetLocalizedName(lang),
            EraColor = ef.Event.Era?.Color
        }).OrderBy(e => e.Year).ToList()
    };
    
    return Results.Ok(dto);
})
.WithTags("Figures")
.WithName("GetFigureById");

// ============================================
// Territories
// ============================================
app.MapGet("/api/territories", async (HistoryDbContext db, string? lang, int? year, string? civilization) =>
{
    lang ??= "en";
    
    var query = db.Territories.Include(t => t.Era).AsQueryable();
    
    if (year.HasValue)
    {
        // Find territories that exist at this year
        query = query.Where(t => t.Year <= year.Value);
    }
    
    if (!string.IsNullOrEmpty(civilization))
    {
        query = query.Where(t => t.Civilization.ToLower() == civilization.ToLower());
    }
    
    // Get the most recent territory snapshot for each era up to the specified year
    var territories = await query
        .GroupBy(t => t.EraId)
        .Select(g => g.OrderByDescending(t => t.Year).First())
        .Select(t => new TerritoryDto
        {
            Id = t.Id,
            Name = lang == "en" || !t.NameI18n.ContainsKey(lang) ? t.Name : t.NameI18n[lang],
            Year = t.Year,
            Civilization = t.Civilization,
            Boundaries = t.Boundaries,
            Color = t.Color ?? t.Era!.Color
        })
        .ToListAsync();
    
    return Results.Ok(territories);
})
.WithTags("Territories")
.WithName("GetTerritories");

// ============================================
// Timeline (aggregated view)
// ============================================
app.MapGet("/api/timeline", async (HistoryDbContext db, string? lang, int? startYear, int? endYear) =>
{
    lang ??= "en";
    startYear ??= -500;
    endYear ??= 2000;
    
    var eras = await db.Eras
        .Where(e => e.EndYear >= startYear && e.StartYear <= endYear)
        .OrderBy(e => e.StartYear)
        .Select(e => new EraDto
        {
            Id = e.Id,
            Name = lang == "en" || !e.NameI18n.ContainsKey(lang) ? e.Name : e.NameI18n[lang],
            StartYear = e.StartYear,
            EndYear = e.EndYear,
            Civilization = e.Civilization,
            Color = e.Color,
            EventCount = e.Events.Count(ev => ev.StartYear >= startYear && ev.StartYear <= endYear)
        })
        .ToListAsync();
    
    var events = await db.Events
        .Include(e => e.Era)
        .Where(e => e.StartYear >= startYear && e.StartYear <= endYear && e.Significance >= 7)
        .OrderBy(e => e.StartYear)
        .Select(e => new EventSummaryDto
        {
            Id = e.Id,
            Title = lang == "en" || !e.TitleI18n.ContainsKey(lang) ? e.Title : e.TitleI18n[lang],
            Year = e.StartYear,
            Lat = e.Latitude,
            Lng = e.Longitude,
            Category = e.Category,
            Significance = e.Significance,
            EraName = e.Era != null ? (lang == "en" || !e.Era.NameI18n.ContainsKey(lang) ? e.Era.Name : e.Era.NameI18n[lang]) : null,
            EraColor = e.Era != null ? e.Era.Color : null
        })
        .ToListAsync();
    
    return Results.Ok(new { eras, events });
})
.WithTags("Timeline")
.WithName("GetTimeline");

app.Run();
