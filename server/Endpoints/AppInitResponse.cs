namespace DrugPricing.Endpoints;

public class AppInitResponse()
{
  public required bool Up { get; init; }
  public required DateOnly FirstNadacAsOfDate { get; init; }
  public required DateOnly LastNadacAsOfDate { get; set; }
  public required ICollection<string> RouteNames { get; set; } = [];
  public required ICollection<string> DosageFormNames { get; set; } = [];
}
