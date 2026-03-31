using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using OperationNexus.Api.Configuration;
using OperationNexus.Api.Data;
using OperationNexus.Api.Services;
using Scalar.AspNetCore;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

var configuredBackendPort = builder.Configuration["BACKEND_PORT"] ?? builder.Configuration["Server:Port"];
var backendPort = int.TryParse(configuredBackendPort, out var parsedBackendPort) ? parsedBackendPort : 5002;
builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(backendPort));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.Configure<UpstreamSettings>(builder.Configuration.GetSection("Upstream"));
builder.Services.Configure<CatalogSettings>(builder.Configuration.GetSection("Catalog"));

builder.Services.AddHttpClient<UpstreamApiService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
});
builder.Services.AddHttpClient<CatalogService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
});
builder.Services.AddScoped<IUpstreamApiService, UpstreamApiService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<ISyncOrchestrator, SyncOrchestrator>();

builder.Services.Configure<VoyageSettings>(builder.Configuration.GetSection("Voyage"));
builder.Services.AddHttpClient<VoyageEmbeddingService>();
builder.Services.AddScoped<IVoyageEmbeddingService, VoyageEmbeddingService>();
builder.Services.AddSingleton<IResumeTextExtractor, ResumeTextExtractor>();
builder.Services.AddSingleton<MatchSearchCoordinator>();
builder.Services.AddScoped<IProcessingOrchestrator, ProcessingOrchestrator>();
builder.Services.AddSingleton<IResumeSessionVectorizer, ResumeSessionVectorizer>();
builder.Services.AddSingleton<IEmbeddingJobQueue, EmbeddingJobQueue>();
builder.Services.AddHostedService<EmbeddingBackgroundService>();

builder.Services.Configure<ClaudeProxySettings>(builder.Configuration.GetSection("ClaudeProxy"));
builder.Services.AddHttpClient<IClaudeProxyService, ClaudeProxyService>((sp, client) =>
{
    var settings = sp.GetRequiredService<IOptions<ClaudeProxySettings>>().Value;
    client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", settings.ApiKey);
});
builder.Services.AddScoped<IMatchEngineService, MatchEngineService>();
builder.Services.AddScoped<BenchBurnService>();
builder.Services.AddScoped<IDatabaseSharingService, DatabaseSharingService>();

var connectionString = builder.Configuration.GetConnectionString("NexusDb");
builder.Services.AddDbContext<NexusDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions => npgsqlOptions.UseVector())
           .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

var app = builder.Build();

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors("Frontend");
app.MapOpenApi();
app.MapScalarApiReference();
app.MapControllers();

app.Run();

public partial class Program { }
