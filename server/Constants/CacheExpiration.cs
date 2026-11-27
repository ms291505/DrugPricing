namespace DrugPricing.Constants;

public static class CacheDuration
{
  public static readonly TimeSpan Default = TimeSpan.FromMinutes(5);

  /// <summary>Reference lists the FDA load changes at most once a day, such as the labelers.</summary>
  public static readonly TimeSpan Reference = TimeSpan.FromHours(1);
}
