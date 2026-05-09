using DrugPricing.Constants;
using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DrugPricing.Data.Repositories;

public class NadacRepository : INadacRepository
{
  private readonly DrugPricingContext _db;
  private readonly IMemoryCache _cache;
  private const double TrigramsSimilarityThreshold = 0.3;

  public NadacRepository(DrugPricingContext db, IMemoryCache cache)
  {
    _db = db;
    _cache = cache;
  }

  public async Task<List<DateOnly>> ListAsOfDatesAsync(
    CancellationToken cancellationToken = default
  )
  {
    if (_cache.TryGetValue(CacheKeys.NadacAsOfDates, out List<DateOnly>? cachedAsOfDates))
      return cachedAsOfDates!;

    var asOfDates = await _db
      .NadacPrices.AsNoTracking()
      .Select(p => p.AsOfDate)
      .Distinct()
      .OrderBy(p => p)
      .ToListAsync(cancellationToken);

    _cache.Set(CacheKeys.NadacAsOfDates, asOfDates, CacheDuration.Default);
    return asOfDates;
  }

  public async Task<List<NadacPrice>> ListSearchResultsAsync(
    string ndcDescription,
    string ndc,
    DateOnly minDate,
    DateOnly maxDate,
    CancellationToken cancellationToken = default
  )
  {
    var cacheKey = CacheKeys.NadacSearch(ndcDescription, ndc, minDate, maxDate);

    if (_cache.TryGetValue(cacheKey, out List<NadacPrice>? cachedResults))
      return cachedResults!;

    var query = _db.DrugPackages.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(ndcDescription))
    {
      var ndcDescriptionLower = ndcDescription.ToLower();

      query = query.Where(p =>
        EF.Functions.ILike(p.NdcDescriptionLower, $"%{ndcDescriptionLower}%")
      );
    }

    if (!string.IsNullOrWhiteSpace(ndc))
      query = query.Where(p => EF.Functions.ILike(p.Ndc, $"%{ndc}%"));

    var nadacPrices = await query
      .Join(_db.NadacPrices, drug => drug.Ndc, price => price.Ndc, (drug, price) => price)
      .Where(p => p.AsOfDate >= minDate && p.AsOfDate <= maxDate)
      .ToListAsync(cancellationToken);

    return nadacPrices;
  }

  public async Task<List<NadacPrice>> ListAdvancedSearchResultsAsync(
    List<string> ndcDescriptions,
    DateOnly minDate,
    DateOnly maxDate,
    CancellationToken cancellationToken = default
  )
  {
    var branches = ndcDescriptions.Select(term =>
      _db.NadacPrices.AsNoTracking()
        .Where(p =>
          EF.Functions.TrigramsWordSimilarity(p.NdcDescriptionLower, term)
            > TrigramsSimilarityThreshold
          && p.EffectiveDate >= minDate
          && p.EffectiveDate <= maxDate
        )
    );

    var query = branches.Aggregate((acc, branch) => acc.Union(branch));

    var nadacPrices = await query.ToListAsync(cancellationToken);

    return nadacPrices;
  }
}
