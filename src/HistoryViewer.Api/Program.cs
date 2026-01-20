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

// Add Swagger for .NET 8
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Simple endpoint for proof of concept
app.MapGet("/api/hello", () => new { 
    message = "Hello from HistoryViewer API!", 
    project = "HistoryViewer",
    timestamp = DateTime.UtcNow 
});

app.MapGet("/api/health", () => Results.Ok("HistoryViewer API is running"));

app.Run();
