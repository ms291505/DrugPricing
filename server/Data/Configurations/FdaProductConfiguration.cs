using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrugPricing.Data.Configurations;

public class FdaProductConfiguration : IEntityTypeConfiguration<FdaProduct>
{
  public void Configure(EntityTypeBuilder<FdaProduct> e)
  {
    e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");

    e.HasIndex(p => p.ProductNdc).IsUnique();

    e.HasIndex(p => p.ProductId);

    e.HasMany(p => p.FdaPackages)
      .WithOne(p => p.FdaProduct)
      .HasForeignKey(p => p.ProductNdc)
      .HasPrincipalKey(p => p.ProductNdc)
      .IsRequired(false);
  }
}
