using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrugPricing.Data.Configurations;

public class FdaProductConfiguration : IEntityTypeConfiguration<FdaProduct>
{
  public void Configure(EntityTypeBuilder<FdaProduct> e)
  {
    e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");

    e.HasIndex(p => p.ProductId).IsUnique();

    e.HasMany(p => p.FdaPackages)
      .WithOne(p => p.FdaProduct)
      .HasForeignKey(p => p.ProductId)
      .HasPrincipalKey(p => p.ProductId)
      .IsRequired(false);
  }
}
