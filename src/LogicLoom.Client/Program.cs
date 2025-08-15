using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using LogicLoom.Client;
using LogicLoom.Client.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// Configure HTTP clients for different APIs
var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? "http://localhost:5022";
builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(apiBaseUrl) });
builder.Services.AddHttpClient("LogicLoomAPI", client => client.BaseAddress = new Uri(apiBaseUrl));
builder.Services.AddHttpClient("IdentityAPI", client => client.BaseAddress = new Uri(builder.Configuration["IdentityApiUrl"] ?? "http://localhost:5200"));

// Register services
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IDocumentCache, DocumentCache>();

await builder.Build().RunAsync();
