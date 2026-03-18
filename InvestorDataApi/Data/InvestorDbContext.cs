using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InvestorDataApi.Data;

public class InvestorDbContext : DbContext
{
    public InvestorDbContext(DbContextOptions<InvestorDbContext> options) : base(options) { }

    public DbSet<BilateralAsset> BilateralAssets => Set<BilateralAsset>();
    public DbSet<CustomerAliasMapping> CustomerAliasMappings => Set<CustomerAliasMapping>();
    public DbSet<CustomerMaster> CustomerMasters => Set<CustomerMaster>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BilateralAsset>(entity =>
        {
            entity.ToTable("bilateral_asset_level");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<CustomerMaster>(entity =>
        {
            entity.ToTable("CustomerMaster", "InvestorAlias");
            entity.HasKey(e => e.CanonicalCustomerId);
        });

        modelBuilder.Entity<CustomerAliasMapping>(entity =>
        {
            entity.ToTable("CustomerAliasMapping", "InvestorAlias");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OriginalCustomerName);
            entity.HasIndex(e => e.CleanedCustomerName);
            entity.HasIndex(e => e.CanonicalCustomerId);

            entity.HasOne(e => e.CustomerMaster)
                .WithMany(m => m.AliasMappings)
                .HasForeignKey(e => e.CanonicalCustomerId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
