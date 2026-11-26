namespace DrugPricing.Models;

public class NadacImport
{
  public int Id { get; set; }
  public DateOnly? AsOfDate { get; set; }
  public string? SourceUrl { get; set; } = null!;
  public int? RetrievedCount { get; set; }
  public int? InsertedCount { get; set; }
  public string? LogPath { get; set; } = null!;
  public string[] Erros { get; set; } = [];

  public DateTime? LoadedAt { get; set; }
  public DateTime CreatedAt { get; set; }
}
