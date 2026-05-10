using DrugPricing.Data;
using DrugPricing.Data.Repositories;
using DrugPricing.Endpoints;
using DrugPricing.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var devClientHost =
  builder.Configuration["DevClientHost"]
  ?? throw new Exception("devClientHost not defined in confiuration file.");

// Cors

builder.Services.AddCors(options =>
{
  options.AddPolicy(
    "AllowViteDev",
    policy =>
    {
      policy.WithOrigins(devClientHost).AllowAnyMethod().AllowAnyHeader().AllowCredentials();
    }
  );
});

builder.Services.AddCors(options =>
{
  options.AddPolicy(
    "AllowFrontend",
    policy =>
    {
      policy
        .WithOrigins("https://client-production-c6ff.up.railway.app")
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    }
  );
});

// Memory Cache

builder.Services.AddMemoryCache();

// Database Context

builder.Services.AddDbContext<DrugPricingContext>(options =>
{
  if (builder.Environment.IsDevelopment())
  {
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"));
  }
  else
  {
    var host = Environment.GetEnvironmentVariable("PGHOST");
    var port = Environment.GetEnvironmentVariable("PGPORT");
    var db = Environment.GetEnvironmentVariable("PGDATABASE");
    var user = Environment.GetEnvironmentVariable("PGUSER");
    var pass = Environment.GetEnvironmentVariable("PGPASSWORD");

    var connectionString =
      $"Host={host};Port={port};Database={db};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
    options.UseNpgsql(connectionString);
  }
});

// Repositories

builder.Services.AddScoped<INadacRepository, NadacRepository>();
builder.Services.AddScoped<IFdaProductRepository, FdaProductRepository>();

// Cache Warming

builder.Services.AddHostedService<CacheWarmingService>();

// Services

builder.Services.AddScoped<NadacService>();
builder.Services.AddScoped<FdaProductService>();

// Swagger

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Build App

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
  app.UseCors("AllowViteDev");
  app.UseSwagger();
  app.UseSwaggerUI();
}
else
{
  app.UseCors("AllowFrontend");
}

// Map Endpoints

app.MapGet("/", () => "Hello World!");

var api = app.MapGroup("/api");

api.MapGet("/up", () => TypedResults.Ok(new { up = true }));

api.MapNadacEndpoints();
api.MapFdaProductEndpoints();
api.MapAppInitEndpoints();

// Run

app.Run();
