using System.Text.Json.Serialization;

namespace DrugPricing.Endpoints;

/// <summary>
/// The body of a NADAC search (POST <c>nadac-prices/search</c>). Both dates are required, as
/// they were as query parameters: a body without one is a 400.
/// </summary>
public record NadacSearchRequest(
  string? NdcDescription,
  string? Ndc,
  [property: JsonRequired] DateOnly MinDate,
  [property: JsonRequired] DateOnly MaxDate
);
