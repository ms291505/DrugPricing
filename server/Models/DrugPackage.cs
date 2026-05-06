namespace DrugPricing.Models;

public class DrugPackage
{
  public int Id { get; set; }

  public required string NdcDescription { get; set; }
  public required string NdcDescriptionLower { get; set; }
  public required string Ndc { get; set; }

  public DateTime CreatedAt { get; set; }
}
