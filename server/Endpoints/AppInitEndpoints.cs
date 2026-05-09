using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;

namespace DrugPricing.Endpoints;

public static class AppInitEndpoints
{
  public static RouteGroupBuilder MapAppInitEndpoints(this RouteGroupBuilder api)
  {
    var appInitGroup = api.MapGroup("/app-init");

    appInitGroup.MapGet("/", GetAppInit);

    return appInitGroup;
  }

  private static async Task<IResult> GetAppInit([FromServices] NadacService nadacService)
  {
    var nadacDates = await nadacService.AsOfDateRangeAsync();

    var response = new AppInitResponse
    {
      Up = true,
      FirstNadacAsOfDate = nadacDates.firstDate,
      LastNadacAsOfDate = nadacDates.lastDate,
    };

    return TypedResults.Ok(response);
  }
}
