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

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

// Simple endpoint for proof of concept
app.MapGet("/api/hello", () => new { 
    message = "Hello from ReceiptCalculator API!", 
    project = "ReceiptCalculator",
    timestamp = DateTime.UtcNow 
});

app.MapGet("/api/health", () => Results.Ok("ReceiptCalculator API is running"));

app.Run();
