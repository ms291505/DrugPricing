namespace DrugPricing.Endpoints;

public class AppInitResponse()
{
  public required bool Up { get; init; }
  public required DateOnly FirstNadacAsOfDate { get; init; }
  public required DateOnly LastNadacAsOfDate { get; set; }
}
