namespace DrugPricing.Models;

public class PartDSpend
{
    public int Id { get; set; }

    public required string BrandName { get; set; }
    public required string GenericName { get; set; }
    public required string ManufacturerName { get; set; }

    public int Year { get; set; }

    public decimal TotalSpending { get; set; }
    public int TotalDosageUnits { get; set; }
    public int TotalClaims { get; set; }
    public int TotalBenes { get; set; }
    public decimal AvgSpendPerDosageUnitWghtd { get; set; }
    public decimal AvgSpendPerClaim { get; set; }
    public decimal AvgSpendPerBene { get; set; }

    public bool OutlierFlag { get; set; }

    public DateTime LoadedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
