namespace DrugPricing.Models;

public class NadacImport
{
    public int Id { get; set; }
    public DateOnly AsOfDate { get; set; }
    public string SourceUrl { get; set; } = null!;
    public int RecordCount { get; set; }
    public DateTime LoadedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
