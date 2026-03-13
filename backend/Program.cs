using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using OperationNexus.Api.Configuration;
using OperationNexus.Api.Data;
using OperationNexus.Api.Services;
using Scalar.AspNetCore;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(5002));

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

builder.Services.AddHttpClient<UpstreamApiService>();
builder.Services.AddHttpClient<CatalogService>();
builder.Services.AddScoped<IUpstreamApiService, UpstreamApiService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<ISyncOrchestrator, SyncOrchestrator>();

builder.Services.Configure<VoyageSettings>(builder.Configuration.GetSection("Voyage"));
builder.Services.AddHttpClient<VoyageEmbeddingService>();
builder.Services.AddScoped<IVoyageEmbeddingService, VoyageEmbeddingService>();
builder.Services.AddSingleton<IResumeTextExtractor, ResumeTextExtractor>();
builder.Services.AddScoped<IProcessingOrchestrator, ProcessingOrchestrator>();

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
