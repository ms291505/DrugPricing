using Microsoft.Extensions.Caching.Memory;

namespace DrugPricing.Data;

/// <summary>
/// The cache has a <c>SizeLimit</c> in rows (<c>Program.cs</c>), so every entry needs a
/// <c>Size</c>, and a <c>Set</c> without one throws. Every <c>Set</c> goes through
/// <see cref="SetList"/>, which sizes the entry by its row count.
/// </summary>
public static class CacheExtensions
{
  public static List<T> SetList<T>(
    this IMemoryCache cache,
    object key,
    List<T> list,
    TimeSpan duration
  )
  {
    return cache.Set(
      key,
      list,
      new MemoryCacheEntryOptions { Size = list.Count, AbsoluteExpirationRelativeToNow = duration }
    );
  }
}
