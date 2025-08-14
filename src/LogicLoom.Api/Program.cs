using LogicLoom.DocumentProcessor.Services;
using LogicLoom.Storage;
using Microsoft.EntityFrameworkCore;
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
    options.AddPolicy("AllowBlazor",
        policy => policy
            .WithOrigins("http://localhost:5024")
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Configure database
builder.Services.AddDbContext<DocumentDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

// Configure document processor services
builder.Services.AddScoped<IWordMLParser, WordMLParser>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LogicLoom API v1");
        c.DocExpansion(DocExpansion.None);
    });
}

app.UseCors("AllowBlazor");
app.UseHttpsRedirection();

app.MapControllers();

app.Run();
