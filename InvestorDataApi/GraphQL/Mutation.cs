using InvestorDataApi.Data;
using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InvestorDataApi.GraphQL;

public class Mutation
{
    // ─── Create Customer Alias Mapping ───────────────────────────
    public async Task<CustomerAliasMapping> CreateCustomerAliasMapping(
        [Service] SqlServerDbContext db,
        [Service] MappingsCacheService cache,
        CreateMappingInput input)
    {
        var canonicalName = input.CanonicalCustomerName?.Trim()
            ?? input.CleanedCustomerName?.Trim()
            ?? input.OriginalCustomerName.Trim();

        int canonicalId;
        if (input.CanonicalCustomerId.HasValue && input.CanonicalCustomerId > 0)
        {
            var existing = await db.CustomerMasters.FindAsync(input.CanonicalCustomerId.Value);
            if (existing != null)
            {
                if (!string.IsNullOrWhiteSpace(input.CanonicalCustomerName)) existing.CanonicalCustomerName = input.CanonicalCustomerName.Trim();
                if (!string.IsNullOrWhiteSpace(input.CisCode)) existing.CisCode = input.CisCode.Trim();
                if (!string.IsNullOrWhiteSpace(input.Mgs)) existing.Mgs = input.Mgs.Trim();
                if (!string.IsNullOrWhiteSpace(input.CountryOfOperation)) existing.CountryOfOperation = input.CountryOfOperation.Trim();
                if (!string.IsNullOrWhiteSpace(input.Region)) existing.Region = input.Region.Trim();
            }
            canonicalId = input.CanonicalCustomerId.Value;
        }
        else
        {
            var existing = await db.CustomerMasters
                .Where(m => m.CanonicalCustomerName != null && m.CanonicalCustomerName.ToLower() == canonicalName.ToLower())
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                if (!string.IsNullOrWhiteSpace(input.CisCode)) existing.CisCode = input.CisCode.Trim();
                if (!string.IsNullOrWhiteSpace(input.Mgs)) existing.Mgs = input.Mgs.Trim();
                if (!string.IsNullOrWhiteSpace(input.CountryOfOperation)) existing.CountryOfOperation = input.CountryOfOperation.Trim();
                if (!string.IsNullOrWhiteSpace(input.Region)) existing.Region = input.Region.Trim();
                canonicalId = existing.CanonicalCustomerId;
            }
            else
            {
                var maxId = await db.CustomerMasters.MaxAsync(m => (int?)m.CanonicalCustomerId) ?? 0;
                var newMaster = new CustomerMaster
                {
                    CanonicalCustomerId = maxId + 1, CanonicalCustomerName = canonicalName,
                    CisCode = input.CisCode?.Trim(), Mgs = input.Mgs?.Trim(),
                    CountryOfOperation = input.CountryOfOperation?.Trim(), Region = input.Region?.Trim(),
                };
                db.CustomerMasters.Add(newMaster);
                await db.SaveChangesAsync();
                canonicalId = newMaster.CanonicalCustomerId;
            }
        }

        var mapping = new CustomerAliasMapping
        {
            OriginalCustomerName = input.OriginalCustomerName.Trim(),
            CleanedCustomerName = input.CleanedCustomerName?.Trim() ?? input.OriginalCustomerName.Trim(),
            CanonicalCustomerId = canonicalId,
        };
        db.CustomerAliasMappings.Add(mapping);
        await db.SaveChangesAsync();

        var result = (await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
            .FirstOrDefaultAsync(m => m.Id == mapping.Id))!;
        await cache.RefreshAsync();
        return result;
    }

    // ─── Delete Customer Alias Mapping ───────────────────────────
    public async Task<bool> DeleteCustomerAliasMapping(
        [Service] SqlServerDbContext db,
        [Service] MappingsCacheService cache,
        int id)
    {
        var m = await db.CustomerAliasMappings.FindAsync(id);
        if (m is null) return false;
        db.CustomerAliasMappings.Remove(m);
        await db.SaveChangesAsync();
        await cache.RefreshAsync();
        return true;
    }

    // ─── Update Customer Master ───────────────────────────────────
    public async Task<CustomerMaster?> UpdateCustomerMaster(
        [Service] SqlServerDbContext db,
        [Service] MappingsCacheService cache,
        int canonicalCustomerId, UpdateCustomerMasterInput input)
    {
        var master = await db.CustomerMasters.FindAsync(canonicalCustomerId);
        if (master is null) return null;

        if (input.CanonicalCustomerName != null) master.CanonicalCustomerName = input.CanonicalCustomerName.Trim();
        if (input.CisCode != null) master.CisCode = input.CisCode.Trim();
        if (input.Mgs != null) master.Mgs = input.Mgs.Trim();
        if (input.CountryOfOperation != null) master.CountryOfOperation = input.CountryOfOperation.Trim();
        if (input.CountryOfIncorporation != null) master.CountryOfIncorporation = input.CountryOfIncorporation.Trim();
        if (input.Region != null) master.Region = input.Region.Trim();

        await db.SaveChangesAsync();
        await cache.RefreshAsync();
        return master;
    }

    // ─── Push to SQL Server (save resolve results) ───────────────
    public async Task<PushToDbResponse> PushToDb(
        [Service] MappingsCacheService cache,
        [Service] SqlServerDbContext db,
        List<PushRecordInput> records)
    {
        var response = new PushToDbResponse();
        foreach (var record in records)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(record.OriginalCustomerName)) continue;
                var originalName = record.OriginalCustomerName.Trim();
                var cleanedName = record.CleanedCustomerName?.Trim() ?? originalName;
                int canonicalId;

                if (record.CanonicalCustomerId.HasValue && record.CanonicalCustomerId > 0)
                {
                    var existing = await db.CustomerMasters.FindAsync(record.CanonicalCustomerId.Value);
                    if (existing != null)
                    {
                        if (!string.IsNullOrWhiteSpace(record.CanonicalCustomerName)) existing.CanonicalCustomerName = record.CanonicalCustomerName;
                        if (!string.IsNullOrWhiteSpace(record.CisCode)) existing.CisCode = record.CisCode;
                        if (!string.IsNullOrWhiteSpace(record.CountryOfOperation)) existing.CountryOfOperation = record.CountryOfOperation;
                        if (!string.IsNullOrWhiteSpace(record.Region)) existing.Region = record.Region;
                        if (!string.IsNullOrWhiteSpace(record.Mgs)) existing.Mgs = record.Mgs;
                        response.MastersUpdated++;
                    }
                    canonicalId = record.CanonicalCustomerId.Value;
                }
                else
                {
                    var masterByName = await db.CustomerMasters
                        .Where(m => m.CanonicalCustomerName != null && m.CanonicalCustomerName.ToLower() == cleanedName.ToLower())
                        .FirstOrDefaultAsync();

                    if (masterByName != null) { canonicalId = masterByName.CanonicalCustomerId; }
                    else
                    {
                        var maxId = await db.CustomerMasters.MaxAsync(m => (int?)m.CanonicalCustomerId) ?? 0;
                        var newMaster = new CustomerMaster
                        {
                            CanonicalCustomerId = maxId + 1, CanonicalCustomerName = record.CanonicalCustomerName ?? cleanedName,
                            CisCode = record.CisCode, CountryOfOperation = record.CountryOfOperation,
                            Region = record.Region, Mgs = record.Mgs,
                        };
                        db.CustomerMasters.Add(newMaster);
                        await db.SaveChangesAsync();
                        response.MastersCreated++;
                        canonicalId = newMaster.CanonicalCustomerId;
                    }
                }

                var existingMapping = await db.CustomerAliasMappings
                    .Where(m => m.OriginalCustomerName.ToLower() == originalName.ToLower()).FirstOrDefaultAsync();

                if (existingMapping != null)
                {
                    existingMapping.CleanedCustomerName = cleanedName;
                    existingMapping.CanonicalCustomerId = canonicalId;
                    response.MappingsUpdated++;
                }
                else
                {
                    db.CustomerAliasMappings.Add(new CustomerAliasMapping
                    {
                        OriginalCustomerName = originalName, CleanedCustomerName = cleanedName,
                        CanonicalCustomerId = canonicalId,
                    });
                    response.MappingsCreated++;
                }
                response.TotalProcessed++;
            }
            catch (Exception ex) { response.Errors.Add($"Error: {record.OriginalCustomerName}: {ex.Message}"); }
        }
        await db.SaveChangesAsync();
        await cache.RefreshAsync();
        return response;
    }

    // ─── Push SQL Server → Postgres ──────────────────────────────
    public async Task<PushToDbResponse> PushToPostgres(
        [Service] SqlServerDbContext sqlDb,
        [Service] PostgresDbContext pgDb)
    {
        var response = new PushToDbResponse();
        try
        {
            var allMasters = await sqlDb.CustomerMasters.ToListAsync();
            foreach (var master in allMasters)
            {
                var existing = await pgDb.CustomerMasters.FindAsync(master.CanonicalCustomerId);
                if (existing != null)
                {
                    existing.CanonicalCustomerName = master.CanonicalCustomerName;
                    existing.CisCode = master.CisCode;
                    existing.CountryOfOperation = master.CountryOfOperation;
                    existing.Mgs = master.Mgs;
                    existing.CountryOfIncorporation = master.CountryOfIncorporation;
                    existing.Region = master.Region;
                    response.MastersUpdated++;
                }
                else
                {
                    pgDb.CustomerMasters.Add(new CustomerMaster
                    {
                        CanonicalCustomerId = master.CanonicalCustomerId,
                        CanonicalCustomerName = master.CanonicalCustomerName,
                        CisCode = master.CisCode, CountryOfOperation = master.CountryOfOperation,
                        Mgs = master.Mgs, CountryOfIncorporation = master.CountryOfIncorporation,
                        Region = master.Region,
                    });
                    response.MastersCreated++;
                }
            }
            await pgDb.SaveChangesAsync();

            var allMappings = await sqlDb.CustomerAliasMappings.ToListAsync();
            foreach (var mapping in allMappings)
            {
                var existing = await pgDb.CustomerAliasMappings
                    .Where(m => m.OriginalCustomerName.ToLower() == mapping.OriginalCustomerName.ToLower())
                    .FirstOrDefaultAsync();

                if (existing != null)
                {
                    existing.CleanedCustomerName = mapping.CleanedCustomerName;
                    existing.CanonicalCustomerId = mapping.CanonicalCustomerId;
                    response.MappingsUpdated++;
                }
                else
                {
                    pgDb.CustomerAliasMappings.Add(new CustomerAliasMapping
                    {
                        OriginalCustomerName = mapping.OriginalCustomerName,
                        CleanedCustomerName = mapping.CleanedCustomerName,
                        CanonicalCustomerId = mapping.CanonicalCustomerId,
                    });
                    response.MappingsCreated++;
                }
            }
            await pgDb.SaveChangesAsync();
            response.TotalProcessed = allMasters.Count + allMappings.Count;
        }
        catch (Exception ex) { response.Errors.Add($"Push failed: {ex.Message}"); }
        return response;
    }
}

// ─── Input types ─────────────────────────────────────────────────

public class CreateMappingInput
{
    public string OriginalCustomerName { get; set; } = string.Empty;
    public string? CleanedCustomerName { get; set; }
    public int? CanonicalCustomerId { get; set; }
    public string? CanonicalCustomerName { get; set; }
    public string? CisCode { get; set; }
    public string? Mgs { get; set; }
    public string? CountryOfOperation { get; set; }
    public string? Region { get; set; }
}

public class UpdateCustomerMasterInput
{
    public string? CanonicalCustomerName { get; set; }
    public string? CisCode { get; set; }
    public string? Mgs { get; set; }
    public string? CountryOfOperation { get; set; }
    public string? CountryOfIncorporation { get; set; }
    public string? Region { get; set; }
}

public class PushRecordInput
{
    public string OriginalCustomerName { get; set; } = string.Empty;
    public string? CleanedCustomerName { get; set; }
    public int? CanonicalCustomerId { get; set; }
    public string? CanonicalCustomerName { get; set; }
    public string? CisCode { get; set; }
    public string? CountryOfOperation { get; set; }
    public string? Region { get; set; }
    public string? Mgs { get; set; }
}
