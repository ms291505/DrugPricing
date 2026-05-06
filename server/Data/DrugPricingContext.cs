using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;

namespace DrugPricing.Data;

public class DrugPricingContext(DbContextOptions<DrugPricingContext> options) : DbContext(options)
{
  public DbSet<NadacPrice> NadacPrices => Set<NadacPrice>();
  public DbSet<NadacImport> NadacImports => Set<NadacImport>();
  public DbSet<DrugPackage> DrugPackages => Set<DrugPackage>();

  public DbSet<FdaPackage> FdaPackages => Set<FdaPackage>();
  public DbSet<FdaProduct> FdaProducts => Set<FdaProduct>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(DrugPricingContext).Assembly);
  }
}
