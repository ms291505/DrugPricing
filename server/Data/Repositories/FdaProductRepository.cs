using System.Data;
using DrugPricing.Constants;
using DrugPricing.Endpoints;
using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DrugPricing.Data.Repositories;

public class FdaProductRepository : IFdaProductRepository
{
  private readonly DrugPricingContext _db;
  private readonly IMemoryCache _cache;

  public FdaProductRepository(DrugPricingContext db, IMemoryCache cache)
  {
    _db = db;
    _cache = cache;
  }

  public async Task<List<string>> ListUniqueDosageFormNamesAsync()
  {
    var cacheKey = CacheKeys.DosageFormNames;
    if (_cache.TryGetValue(cacheKey, out List<string>? cachedResults))
      return cachedResults!;

    var query = _db.FdaProducts.AsNoTracking().Where(p => p.DelistedAt == null);

    var dosageFormNames = await query.Select(p => p.DosageFormName).Distinct().ToListAsync();

    return _cache.SetList(cacheKey, dosageFormNames, CacheDuration.Default);
  }

  public async Task<List<string>> ListUniqueRouteNamesAsync()
  {
    var cacheKey = CacheKeys.RouteNames;
    if (_cache.TryGetValue(cacheKey, out List<string>? cachedResults))
      return cachedResults!;

    var query = _db.FdaProducts.AsNoTracking().Where(p => p.DelistedAt == null);

    var routeNames = await query
      .SelectMany(p => p.RouteName)
      .Distinct()
      .OrderBy(r => r)
      .ToListAsync();

    return _cache.SetList(cacheKey, routeNames, CacheDuration.Default);
  }

  public async Task<List<LabelerGroup>> ListLabelerGroupsAsync(
    CancellationToken cancellationToken = default
  )
  {
    if (_cache.TryGetValue(CacheKeys.FdaLabelerGroups, out List<LabelerGroup>? cachedGroups))
      return cachedGroups!;

    // One row per labeler spelling and code over active products and their active packages.
    // Priced means a package's NDC is in DrugPackages (every NDC NADAC has priced), as the
    // autocomplete plan defines it; OTC as the client's isFdaProductOtc.
    var rows = await _db
      .Database.SqlQuery<LabelerRow>(
        $"""
        SELECT
          p."LabelerName" AS "LabelerName",
          split_part(p."ProductNdc", '-', 1) AS "LabelerCode",
          count(DISTINCT p."Id")::int AS "ProductCount",
          bool_or(lower(p."ProductTypeName") <> 'human otc drug') AS "HasRx",
          bool_or(d."Ndc" IS NOT NULL) AS "HasPrices",
          bool_or(lower(p."ProductTypeName") <> 'human otc drug' AND d."Ndc" IS NOT NULL) AS "HasRxPrices"
        FROM "FdaProducts" p
        LEFT JOIN "FdaPackages" k ON k."ProductNdc" = p."ProductNdc" AND k."DelistedAt" IS NULL
        LEFT JOIN "DrugPackages" d ON d."Ndc" = k."NdcPackageCodeStripped"
        WHERE p."DelistedAt" IS NULL
        GROUP BY p."LabelerName", split_part(p."ProductNdc", '-', 1)
        """
      )
      .ToListAsync(cancellationToken);

    // Grouping (regex normalization and a union-find over ~8,200 rows) is cached with the rows.
    return _cache.SetList(CacheKeys.FdaLabelerGroups, LabelerGroups.Group(rows), CacheDuration.Reference);
  }

  public async Task<LimitedRows<List<FdaProductDetail>>> ListAdvancedSearchResultsAsync(
    AdvancedFdaSearchRequest request,
    int limit,
    CancellationToken cancellationToken = default
  )
  {
    var (productQuery, packageQuery, priceQuery) = AdvancedSearchQuery(request);

    // The count and the load read one snapshot, so an ETL load committing between them can't
    // push a search that passed the count past the limit.
    await using var transaction = await _db.Database.BeginTransactionAsync(
      IsolationLevel.RepeatableRead,
      cancellationToken
    );

    // A row is a package (packages without prices ship too) or one of its prices, counted the
    // way the load nests them: each package's prices, by its stripped NDC.
    var packages = packageQuery.Where(package =>
      productQuery.Any(product => product.ProductNdc == package.ProductNdc)
    );
    var packageCount = await packages.Take(limit + 1).CountAsync(cancellationToken);
    if (packageCount > limit)
      return LimitedRows<List<FdaProductDetail>>.TooManyRows();

    var priceLimit = limit - packageCount;
    var priceCount = await packages
      .Join(
        priceQuery,
        package => package.NdcPackageCodeStripped,
        price => price.Ndc,
        (package, price) => price.Id
      )
      .Take(priceLimit + 1)
      .CountAsync(cancellationToken);
    if (priceCount > priceLimit)
      return LimitedRows<List<FdaProductDetail>>.TooManyRows();

    var products = await productQuery
      .Select(product => new FdaProductDetail
      {
        Id = product.Id,
        ProductNdc = product.ProductNdc,
        ProductTypeName = product.ProductTypeName,
        ProprietaryNameSuffix = product.ProprietaryNameSuffix,
        NonProprietaryName = product.NonProprietaryName,
        DosageFormName = product.DosageFormName,
        RouteName = product.RouteName,
        StartMarketingDate = product.StartMarketingDate,
        EndMarketingDate = product.EndMarketingDate,
        MarketingCategoryName = product.MarketingCategoryName,
        LabelerName = product.LabelerName,
        SubstanceName = product.SubstanceName,
        StrengthNumber = product.StrengthNumber,
        StrengthUnit = product.StrengthUnit,
        PharmClasses = product.PharmClasses,
        DeaSchedule = product.DeaSchedule,
        ListingRecordCertifiedThrough = product.ListingRecordCertifiedThrough,
        ProprietaryName = product.ProprietaryName,

        FdaPackageDetails = packageQuery
          .Where(package => package.ProductNdc == product.ProductNdc)
          .Select(package => new FdaPackageDetail
          {
            Id = package.Id,
            NdcPackageCode = package.NdcPackageCode,
            NdcPackageCodeStripped = package.NdcPackageCodeStripped,
            PackageDescription = package.PackageDescription,
            StartMarketingDate = package.StartMarketingDate,
            EndMarketingDate = package.EndMarketingDate,
            SamplePackage = package.SamplePackage,

            NadacPrices = priceQuery
              .Where(price => price.Ndc == package.NdcPackageCodeStripped)
              .ToList(),
          })
          .ToList(),
      })
      .Where(product => product.FdaPackageDetails.Count > 0)
      .ToListAsync(cancellationToken);

    await transaction.CommitAsync(cancellationToken);
    return LimitedRows<List<FdaProductDetail>>.Loaded(products);
  }

  /// <summary>
  /// The search's products, their packages and those packages' prices in the dates: what the
  /// count and the load both read.
  /// </summary>
  private AdvancedSearchQueries AdvancedSearchQuery(AdvancedFdaSearchRequest request)
  {
    var productQuery = _db.FdaProducts.AsNoTracking().Where(p => p.DelistedAt == null);

    if (!string.IsNullOrWhiteSpace(request.ProprietaryName))
    {
      var pattern = LikePattern.Contains(request.ProprietaryName);
      productQuery = productQuery.Where(p =>
        EF.Functions.ILike(p.ProprietaryName, pattern, LikePattern.EscapeCharacter)
      );
    }

    if (!string.IsNullOrWhiteSpace(request.NonProprietaryName))
    {
      var pattern = LikePattern.Contains(request.NonProprietaryName);
      productQuery = productQuery.Where(p =>
        p.NonProprietaryName.Any(a => EF.Functions.ILike(a, pattern, LikePattern.EscapeCharacter))
      );
    }

    if (!string.IsNullOrWhiteSpace(request.ProductNdc))
    {
      var pattern = LikePattern.Contains(request.ProductNdc);
      productQuery = productQuery.Where(p =>
        EF.Functions.ILike(p.ProductNdc, pattern, LikePattern.EscapeCharacter)
      );
    }

    if (request.DosageFormNames?.Count > 0)
    {
      productQuery = productQuery.Where(p => request.DosageFormNames.Contains(p.DosageFormName));
    }

    if (request.RouteNames?.Count > 0)
    {
      productQuery = productQuery.Where(p => p.RouteName.Any(r => request.RouteNames.Contains(r)));
    }

    if (request.LabelerCodes?.Count > 0)
    {
      // Codes are digits only (FdaProductService.ValidateLabelerCodes), so they need no
      // LikePattern escaping. Npgsql sends the patterns as one array: LIKE ANY.
      var patterns = request.LabelerCodes.Distinct().Select(code => code + "-%").ToArray();
      productQuery = productQuery.Where(p =>
        patterns.Any(pattern => EF.Functions.Like(p.ProductNdc, pattern))
      );
    }

    // NADAC Price Query
    var nadacQuery = _db.NadacPrices.AsNoTracking();

    if (request.PriceAsOfDateStart.HasValue)
    {
      nadacQuery = nadacQuery.Where(price => price.AsOfDate >= request.PriceAsOfDateStart);
    }

    if (request.PriceAsOfDateEnd.HasValue)
    {
      nadacQuery = nadacQuery.Where(price => price.AsOfDate <= request.PriceAsOfDateEnd);
    }

    // FDA Package Query
    var packageQuery = _db.FdaPackages.AsNoTracking().Where(package => package.DelistedAt == null);

    if (request.IncludeSamplePackages != true)
    {
      packageQuery = packageQuery.Where(package => package.SamplePackage != true);
    }

    if (!request.IncludeResultsWNoPrices)
    {
      packageQuery = packageQuery.Where(package =>
        nadacQuery.Any(price => price.Ndc == package.NdcPackageCodeStripped)
      );
    }

    return new AdvancedSearchQueries(productQuery, packageQuery, nadacQuery);
  }

  private sealed record AdvancedSearchQueries(
    IQueryable<FdaProduct> Products,
    IQueryable<FdaPackage> Packages,
    IQueryable<NadacPrice> Prices
  );
}
