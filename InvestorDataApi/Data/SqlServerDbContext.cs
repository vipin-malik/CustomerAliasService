using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InvestorDataApi.Data;

/// <summary>
/// Primary database (SQL Server) — owns CustomerAliasMapping and CustomerMaster.
/// All CRUD and resolve operations go through this context.
/// </summary>
public class SqlServerDbContext : DbContext
{
    public SqlServerDbContext(DbContextOptions<SqlServerDbContext> options) : base(options) { }

    public DbSet<CustomerAliasMapping> CustomerAliasMappings => Set<CustomerAliasMapping>();
    public DbSet<CustomerMaster> CustomerMasters => Set<CustomerMaster>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
