using System.Data;
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

    return _cache.SetList(CacheKeys.NadacAsOfDates, asOfDates, CacheDuration.Default);
  }

  public async Task<LimitedRows<List<NadacPrice>>> ListSearchResultsAsync(
    string ndcDescription,
    string ndc,
    DateOnly minDate,
    DateOnly maxDate,
    int limit,
    CancellationToken cancellationToken = default
  )
  {
    var cacheKey = CacheKeys.NadacSearch(ndcDescription, ndc, minDate, maxDate);

    // Only results within the limit are ever cached.
    if (_cache.TryGetValue(cacheKey, out List<NadacPrice>? cachedResults))
      return LimitedRows<List<NadacPrice>>.Loaded(cachedResults!);

    var query = SearchQuery(ndcDescription, ndc, minDate, maxDate);

    // The count and the load read one snapshot, so an ETL load committing between them can't
    // push a search that passed the count past the limit.
    await using var transaction = await _db.Database.BeginTransactionAsync(
      IsolationLevel.RepeatableRead,
      cancellationToken
    );

    var count = await query.Take(limit + 1).CountAsync(cancellationToken);
    if (count > limit)
      return LimitedRows<List<NadacPrice>>.TooManyRows();

    var nadacPrices = await query.ToListAsync(cancellationToken);

    await transaction.CommitAsync(cancellationToken);
    return LimitedRows<List<NadacPrice>>.Loaded(nadacPrices);
  }

  /// <summary>The search's price rows: what the count and the load both read.</summary>
  private IQueryable<NadacPrice> SearchQuery(
    string ndcDescription,
    string ndc,
    DateOnly minDate,
    DateOnly maxDate
  )
  {
    var query = _db.DrugPackages.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(ndcDescription))
    {
      var pattern = LikePattern.Contains(ndcDescription.ToLower());

      query = query.Where(p =>
        EF.Functions.ILike(p.NdcDescriptionLower, pattern, LikePattern.EscapeCharacter)
      );
    }

    if (!string.IsNullOrWhiteSpace(ndc))
    {
      var pattern = LikePattern.Contains(ndc);
      query = query.Where(p => EF.Functions.ILike(p.Ndc, pattern, LikePattern.EscapeCharacter));
    }

    return query
      .Join(_db.NadacPrices, drug => drug.Ndc, price => price.Ndc, (drug, price) => price)
      .Where(p => p.AsOfDate >= minDate && p.AsOfDate <= maxDate);
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
