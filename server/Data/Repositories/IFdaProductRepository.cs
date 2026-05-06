namespace DrugPricing.Data.Repositories;

public interface IFdaProductRepository
{
  Task<List<FdaProductDetail>> ListSearchResultsAsync(
    string proprietaryName,
    CancellationToken cancellationToken = default
  );
}
