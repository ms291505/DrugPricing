namespace DrugPricing.Models;

public class FdaImport
{
  public int Id { get; set; }
  public string? SourceUrl { get; set; } = null!;
  public int? RetrievedProductsCount { get; set; }
  public int? InsertedProductsCount { get; set; }
  public int? RetrievedPackagesCount { get; set; }
  public int? InsertedPackagesCount { get; set; }
  public string? LogPath { get; set; } = null!;
  public string[] Errors { get; set; } = [];

  public DateTime? LoadedAt { get; set; }
  public DateTime CreatedAt { get; set; }
}
