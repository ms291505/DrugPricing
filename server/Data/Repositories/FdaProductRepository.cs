using DrugPricing.Constants;
using DrugPricing.Endpoints;
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

    _cache.Set(cacheKey, dosageFormNames, CacheDuration.Default);
    return dosageFormNames;
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

    _cache.Set(cacheKey, routeNames, CacheDuration.Default);
    return routeNames;
  }

  public async Task<List<FdaProductDetail>> ListSearchResultsAsync(
    string proprietaryName,
    CancellationToken cancellationToken = default
  )
  {
    var cacheKey = CacheKeys.DrugProductSearch(proprietaryName);
    if (_cache.TryGetValue(cacheKey, out List<FdaProductDetail>? cachedResults))
      return cachedResults!;

    var products = await _db
      .FdaProducts.AsNoTracking()
      .Where(product => product.DelistedAt == null)
      .Where(product => EF.Functions.ILike(product.ProprietaryName, $"%{proprietaryName}%"))
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

        FdaPackageDetails = product
          .FdaPackages.Where(package => package.DelistedAt == null)
          .Select(package => new FdaPackageDetail
          {
            Id = package.Id,
            NdcPackageCode = package.NdcPackageCode,
            NdcPackageCodeStripped = package.NdcPackageCodeStripped,
            PackageDescription = package.PackageDescription,
            StartMarketingDate = package.StartMarketingDate,
            EndMarketingDate = package.EndMarketingDate,
            SamplePackage = package.SamplePackage,

            NadacPrices = _db
              .NadacPrices.Where(price => price.Ndc == package.NdcPackageCodeStripped)
              .ToList(),
          })
          .ToList(),
      })
      .ToListAsync();

    _cache.Set(cacheKey, products, CacheDuration.Default);
    return products;
  }

  public async Task<List<FdaProductDetail>> ListAdvancedSearchResultsAsync(
    AdvancedFdaSearchRequest request,
    CancellationToken cancellationToken = default
  )
  {
    var productQuery = _db.FdaProducts.AsNoTracking().Where(p => p.DelistedAt == null);

    if (!string.IsNullOrWhiteSpace(request.ProprietaryName))
    {
      productQuery = productQuery.Where(p =>
        EF.Functions.ILike(p.ProprietaryName, $"%{request.ProprietaryName}%")
      );
    }

    if (!string.IsNullOrWhiteSpace(request.NonProprietaryName))
    {
      productQuery = productQuery.Where(p =>
        p.NonProprietaryName.Any(a => EF.Functions.ILike(a, $"%{request.NonProprietaryName}%"))
      );
    }

    if (!string.IsNullOrWhiteSpace(request.ProductNdc))
    {
      productQuery = productQuery.Where(p =>
        EF.Functions.ILike(p.ProductNdc, $"%{request.ProductNdc}%")
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

    if (!string.IsNullOrWhiteSpace(request.LabelerName))
    {
      productQuery = productQuery.Where(p =>
        EF.Functions.ILike(p.LabelerName, $"%{request.LabelerName}%")
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

            NadacPrices = nadacQuery
              .Where(price => price.Ndc == package.NdcPackageCodeStripped)
              .ToList(),
          })
          .ToList(),
      })
      .ToListAsync(cancellationToken);

    return products;
  }
}
