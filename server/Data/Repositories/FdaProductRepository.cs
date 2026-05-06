using DrugPricing.Constants;
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

  public async Task<List<FdaProductDetail>> ListSearchResultsAsync(
    string proprietaryName,
    CancellationToken cancellationToken = default
  )
  {
    var cacheKey = CacheKeys.DrugProductSearch(proprietaryName);
    if (_cache.TryGetValue(cacheKey, out List<FdaProductDetail>? cachedResults))
      return cachedResults!;

    var query = _db.FdaProducts.AsNoTracking();

    var products = await _db
      .FdaProducts.AsNoTracking()
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
          .FdaPackages.Select(package => new FdaPackageDetail
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

    Console.WriteLine(products);

    return products;
  }
}
