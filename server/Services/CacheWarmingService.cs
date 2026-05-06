using DrugPricing.Constants;
using DrugPricing.Data.Repositories;
using DrugPricing.Models;
using Microsoft.Extensions.Caching.Memory;

namespace DrugPricing.Services;

public class CacheWarmingService : IHostedService
{
  private readonly IServiceScopeFactory _scopeFactory;

  public CacheWarmingService(IServiceScopeFactory scopeFactory)
  {
    _scopeFactory = scopeFactory;
  }

  public async Task StartAsync(CancellationToken cancellationToken)
  {
    using var scope = _scopeFactory.CreateScope();
    var nadacRepo = scope.ServiceProvider.GetRequiredService<INadacRepository>();
    var cache = scope.ServiceProvider.GetRequiredService<IMemoryCache>();
    var nadacService = scope.ServiceProvider.GetRequiredService<NadacService>();

    await WarmAsOfDates(nadacRepo, cancellationToken);
    await WarmDefaultSearches(nadacRepo, cache, nadacService, cancellationToken);
  }

  private async Task WarmAsOfDates(INadacRepository nadacRepo, CancellationToken cancellationToken)
  {
    // This method caches its own results.
    // TODO: Figure out where caching should live.
    await nadacRepo.ListAsOfDatesAsync(cancellationToken);
  }

  private async Task WarmDefaultSearches(
    INadacRepository nadacRepo,
    IMemoryCache cache,
    NadacService nadacService,
    CancellationToken cancellationToken
  )
  {
    // default searches here
    List<string> searchTerms =
    [
      "wegovy",
      "ozempic",
      "rybelsus",
      "mounjaro",
      "zepbound",
      "trulicity",
      "eliquis",
      "stelara",
    ];

    var today = DateOnly.FromDateTime(DateTime.Today);

    var maxDate = await nadacService.SnapMaxSearchDateAsync(today);
    var minDate = await nadacService.SnapMinSearchDateAsync(maxDate.AddYears(-1));

    foreach (var searchTerm in searchTerms)
    {
      var cacheKey = CacheKeys.NadacSearch(searchTerm, "", minDate, maxDate);
      var prices = await nadacRepo.ListSearchResultsAsync(searchTerm, "", minDate, maxDate);
      cache.Set<List<NadacPrice>>(cacheKey, prices, CacheDuration.Default);
    }
  }

  public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
