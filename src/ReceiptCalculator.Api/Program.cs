using ReceiptCalculator.Api.Application.UseCases;
using ReceiptCalculator.Api.DTOs;
using ReceiptCalculator.Api.Domain.Services;
using ReceiptCalculator.Api.Infrastructure.Ocr;
using ReceiptCalculator.Api.Infrastructure.Parsing;
using Microsoft.Extensions.Options;
using ReceiptCalculator.Api.Infrastructure.Vision;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<VisionOptions>(builder.Configuration.GetSection(VisionOptions.SectionName));
builder.Services.AddSingleton<SqliteVisionUsageLimiter>();
builder.Services.AddHttpClient<GoogleVisionDocumentClient>();

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

builder.Services.AddSingleton<IOcrService, DummyOcrService>();
builder.Services.AddSingleton<IReceiptParser, BasicReceiptParser>();
builder.Services.AddSingleton<ReceiptTotalsCalculator>();
builder.Services.AddSingleton<AnalyzeReceiptUseCase>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Simple endpoint for proof of concept
app.MapGet("/api/hello", () => new { 
    message = "Hello from ReceiptCalculator API!", 
    project = "ReceiptCalculator",
    timestamp = DateTime.UtcNow 
});

app.MapGet("/api/health", () => Results.Ok("ReceiptCalculator API is running"));

app.MapPost("/api/receipt/analyze", async (
    AnalyzeReceiptRequestDto request,
    AnalyzeReceiptUseCase useCase,
    CancellationToken cancellationToken) =>
{
    var response = await useCase.ExecuteAsync(request, cancellationToken);
    return Results.Ok(response);
})
.WithTags("Receipt")
.WithName("AnalyzeReceipt")
.Accepts<AnalyzeReceiptRequestDto>("application/json")
.Produces<AnalyzeReceiptResponseDto>(StatusCodes.Status200OK);

app.MapPost("/api/receipt/analyze-test", (
    AnalyzeReceiptTextRequestDto request,
    IReceiptParser receiptParser,
    ReceiptTotalsCalculator totalsCalculator) =>
{
    var currency = string.IsNullOrWhiteSpace(request.Currency) ? "MYR" : request.Currency.Trim().ToUpperInvariant();
    var receipt = receiptParser.Parse(request.OcrText ?? string.Empty, currency);
    var summary = totalsCalculator.EnsureSummary(receipt.Items, receipt.Summary, currency);
    receipt.UpdateSummary(summary);

    var allocations = totalsCalculator.AllocateTaxesProportionally(receipt.Items, summary);
    var items = receipt.Items.Select(item =>
    {
        var tax = allocations[item.Id];
        var taxedPrice = item.LineAmount.Add(tax);
        return new ReceiptItemDto
        {
            Name = item.Name,
            Quantity = item.Quantity.Value,
            OriginalPrice = item.LineAmount.Amount,
            TaxedPrice = taxedPrice.Amount,
            TotalPrice = taxedPrice.Amount
        };
    }).ToList();

    var response = new AnalyzeReceiptResponseDto
    {
        Currency = currency,
        Items = items,
        Summary = new ReceiptSummaryDto
        {
            Subtotal = summary.Subtotal.Amount,
            ServiceTax = summary.ServiceTax.Amount,
            SstTax = summary.SstTax.Amount,
            Total = summary.Total.Amount
        },
        Warnings = new List<string> { "Test endpoint: OCR text provided directly." }
    };

    return Results.Ok(response);
})
.WithTags("Receipt")
.WithName("AnalyzeReceiptTest")
.Accepts<AnalyzeReceiptTextRequestDto>("application/json")
.Produces<AnalyzeReceiptResponseDto>(StatusCodes.Status200OK);

app.MapPost("/api/vision/document-text", async (
    VisionDocumentTextRequestDto request,
    SqliteVisionUsageLimiter limiter,
    GoogleVisionDocumentClient vision,
    IOptions<VisionOptions> visionOptions,
    CancellationToken cancellationToken) =>
{
    var opt = visionOptions.Value;
    if (string.IsNullOrWhiteSpace(opt.ApiKey))
    {
        return Results.Json(
            new { error = "Vision proxy is not configured (missing server API key)." },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    var images = request.Images ?? new List<string>();
    images = images.Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
    if (images.Count == 0)
        return Results.BadRequest(new { error = "At least one base64 image is required." });

    if (images.Count > opt.MaxImagesPerRequest)
    {
        return Results.BadRequest(new
        {
            error = $"At most {opt.MaxImagesPerRequest} images per request.",
        });
    }

    var consume = images.Count;
    var quota = await limiter.TryConsumeAsync(consume, cancellationToken);
    if (!quota.Allowed)
    {
        var err = quota.BlockedBy == "monthly"
            ? "Monthly enhanced OCR limit reached for this server (UTC calendar month)."
            : "Daily enhanced OCR limit reached for this server (UTC).";
        return Results.Json(
            new
            {
                error = err,
                blockedBy = quota.BlockedBy,
                scansUsedToday = quota.ScansUsedToday,
                dailyLimit = quota.DailyLimit,
                scansUsedThisMonth = quota.ScansUsedThisMonth,
                monthlyLimit = quota.MonthlyLimit,
            },
            statusCode: StatusCodes.Status429TooManyRequests);
    }

    try
    {
        var text = await vision.AnnotateDocumentsAsync(images, cancellationToken);
        return Results.Ok(new VisionDocumentTextResponseDto
        {
            Text = text,
            ScansUsedToday = quota.ScansUsedToday,
            DailyLimit = quota.DailyLimit,
            ScansUsedThisMonth = quota.ScansUsedThisMonth,
            MonthlyLimit = quota.MonthlyLimit,
        });
    }
    catch (Exception ex)
    {
        return Results.Json(
            new { error = ex.Message },
            statusCode: StatusCodes.Status502BadGateway);
    }
})
.WithTags("Vision")
.WithName("VisionDocumentText")
.Accepts<VisionDocumentTextRequestDto>("application/json")
.Produces<VisionDocumentTextResponseDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status429TooManyRequests)
.Produces(StatusCodes.Status502BadGateway);

app.Run();
