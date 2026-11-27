using System.Diagnostics.CodeAnalysis;

namespace DrugPricing.Data;

/// <summary>
/// A search that either loaded its rows or matched more than its row limit and loaded nothing.
/// Not a <c>null</c>, which could be read as "no results".
/// </summary>
public sealed class LimitedRows<T>
  where T : class
{
  private readonly T? _rows;

  private LimitedRows(T? rows) => _rows = rows;

  public static LimitedRows<T> Loaded(T rows) => new(rows);

  public static LimitedRows<T> TooManyRows() => new(null);

  public bool IsTooManyRows => _rows is null;

  public bool TryGetRows([NotNullWhen(true)] out T? rows)
  {
    rows = _rows;
    return rows is not null;
  }

  public LimitedRows<TResult> Map<TResult>(Func<T, TResult> map)
    where TResult : class =>
    _rows is null ? LimitedRows<TResult>.TooManyRows() : LimitedRows<TResult>.Loaded(map(_rows));
}
