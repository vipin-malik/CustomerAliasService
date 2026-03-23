using InvestorDataApi.Data;
using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InvestorDataApi.GraphQL;

public class Query
{
    // ─── Health ───────────────────────────────────────────────────
    public async Task<HealthResult> GetHealth(
        [Service] SqlServerDbContext sqlDb,
        [Service] PostgresDbContext pgDb)
    {
        bool sqlOk = false, pgOk = false;
        try { sqlOk = await sqlDb.Database.CanConnectAsync(); } catch { }
        try { pgOk = await pgDb.Database.CanConnectAsync(); } catch { }
        return new HealthResult
        {
            Status = sqlOk && pgOk ? "healthy" : "degraded",
            SqlServer = sqlOk ? "connected" : "unavailable",
            Postgres = pgOk ? "connected" : "unavailable",
        };
    }

    // ─── Investors (Postgres bilateral_asset_level) ──────────────
    public async Task<PagedResult<InvestorDto>> GetInvestors(
        [Service] PostgresDbContext db,
        int page = 1, int pageSize = 25, string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 25;
        if (pageSize > 10000) pageSize = 10000;

        var query = db.BilateralAssets.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(a => a.ObligorName != null && a.ObligorName.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        if (totalPages < 1) totalPages = 1;

        var items = await query.OrderBy(a => a.ObligorName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new InvestorDto
            {
                Id = a.Id, Name = a.ObligorName ?? "",
                AssetClass = a.DataContext, Source = a.LoanType,
                CisCode = a.CisCode, NatwestId = a.NatWestUniqueId,
                Tranche = a.Tranche, Seniority = a.Seniority,
                Currency = a.NativeCurrency, Fx = a.Fx,
                Country = a.CountryReported, Industry = a.NwmIndustryGroup,
                CreatedAt = a.AsOfDate,
            }).ToListAsync();

        return new PagedResult<InvestorDto>
        {
            Items = items, TotalCount = totalCount,
            PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
        };
    }

    // ─── Customer Alias Mappings ─────────────────────────────────
    public async Task<PagedResult<CustomerAliasMapping>> GetCustomerAliasMappings(
        [Service] SqlServerDbContext db,
        int page = 1, int pageSize = 25, string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 25;
        if (pageSize > 10000) pageSize = 10000;

        var query = db.CustomerAliasMappings.Include(m => m.CustomerMaster).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(m =>
                m.OriginalCustomerName.ToLower().Contains(term) ||
                (m.CleanedCustomerName != null && m.CleanedCustomerName.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        if (totalPages < 1) totalPages = 1;

        var items = await query.OrderBy(m => m.OriginalCustomerName)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<CustomerAliasMapping>
        {
            Items = items, TotalCount = totalCount,
            PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
        };
    }

    // ─── Customer Masters ────────────────────────────────────────
    public async Task<PagedResult<CustomerMaster>> GetCustomerMasters(
        [Service] SqlServerDbContext db,
        int page = 1, int pageSize = 25, string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 25;
        if (pageSize > 10000) pageSize = 10000;

        var query = db.CustomerMasters.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                (c.CanonicalCustomerName != null && c.CanonicalCustomerName.ToLower().Contains(term)) ||
                (c.CisCode != null && c.CisCode.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        if (totalPages < 1) totalPages = 1;

        var items = await query.OrderBy(c => c.CanonicalCustomerName)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<CustomerMaster>
        {
            Items = items, TotalCount = totalCount,
            PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
        };
    }

    // ─── Customer Masters with Aliases (joined) ──────────────────
    public async Task<PagedResult<CustomerMaster>> GetCustomerMastersWithAliases(
        [Service] SqlServerDbContext db,
        int page = 1, int pageSize = 25, string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 25;
        if (pageSize > 10000) pageSize = 10000;

        var query = db.CustomerMasters.Include(m => m.AliasMappings).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                (c.CanonicalCustomerName != null && c.CanonicalCustomerName.ToLower().Contains(term)) ||
                (c.CisCode != null && c.CisCode.ToLower().Contains(term)) ||
                c.AliasMappings!.Any(a => a.OriginalCustomerName.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        if (totalPages < 1) totalPages = 1;

        var items = await query.OrderBy(c => c.CanonicalCustomerName)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<CustomerMaster>
        {
            Items = items, TotalCount = totalCount,
            PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
        };
    }

    // ─── Resolve (single) ────────────────────────────────────────
    public async Task<ResolveResponse> ResolveAlias(
        [Service] SqlServerDbContext db,
        string aliasName, string? assetClass = null)
    {
        if (string.IsNullOrWhiteSpace(aliasName))
            return new ResolveResponse { CustomerName = aliasName, IsResolved = false, ConfidenceScore = 0 };

        var name = aliasName.Trim();
        var lower = name.ToLower();

        var exact = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
            .Where(m => m.OriginalCustomerName.ToLower() == lower).FirstOrDefaultAsync();
        if (exact != null)
            return BuildResponse(name, exact, 100);

        var partials = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
            .Where(m => m.OriginalCustomerName.ToLower().Contains(lower)
                      || (m.CleanedCustomerName != null && m.CleanedCustomerName.ToLower().Contains(lower)))
            .Take(10).ToListAsync();

        if (partials.Count > 0)
        {
            var best = partials.First();
            var potentials = partials.GroupBy(m => m.CleanedCustomerName)
                .Select(g => new PotentialMatch
                {
                    CommonName = g.Key ?? "", MatchedAlias = g.First().OriginalCustomerName,
                    ConfidenceScore = CalcScore(lower, g.First().OriginalCustomerName.ToLower()),
                }).OrderByDescending(p => p.ConfidenceScore).ToList();

            var resp = BuildResponse(name, best, potentials.First().ConfidenceScore);
            resp.PotentialMatches = potentials.Count > 1 ? potentials : null;
            return resp;
        }

        var master = await db.CustomerMasters
            .Where(c => c.CanonicalCustomerName != null && c.CanonicalCustomerName.ToLower().Contains(lower))
            .FirstOrDefaultAsync();

        if (master != null)
            return new ResolveResponse
            {
                CustomerName = name, CommonName = master.CanonicalCustomerName,
                IsResolved = true, ConfidenceScore = 70, MatchedAlias = name,
                CanonicalCustomerId = master.CanonicalCustomerId,
                CanonicalCustomerName = master.CanonicalCustomerName,
                CisCode = master.CisCode, Country = master.CountryOfOperation,
                Region = master.Region, Mgs = master.Mgs,
            };

        return new ResolveResponse { CustomerName = name, CommonName = name, IsResolved = false, ConfidenceScore = 0 };
    }

    // ─── Resolve (bulk) ──────────────────────────────────────────
    public async Task<List<ResolveResponse>> ResolveAliasesBulk(
        [Service] SqlServerDbContext db,
        List<AliasInput> aliases)
    {
        var results = new List<ResolveResponse>();
        foreach (var alias in aliases)
        {
            var inputName = alias.AliasName?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(inputName))
            {
                results.Add(new ResolveResponse { CustomerName = inputName, CommonName = inputName, IsResolved = false, ConfidenceScore = 0 });
                continue;
            }

            var lower = inputName.ToLower();

            var match = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
                .Where(m => m.OriginalCustomerName.ToLower() == lower).FirstOrDefaultAsync();
            if (match != null) { results.Add(BuildResponse(inputName, match, 100)); continue; }

            var partial = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
                .Where(m => m.OriginalCustomerName.ToLower().Contains(lower)
                          || (m.CleanedCustomerName != null && m.CleanedCustomerName.ToLower().Contains(lower)))
                .FirstOrDefaultAsync();
            if (partial != null)
            {
                results.Add(BuildResponse(inputName, partial, CalcScore(lower, partial.OriginalCustomerName.ToLower())));
                continue;
            }

            var master = await db.CustomerMasters
                .Where(c => c.CanonicalCustomerName != null && c.CanonicalCustomerName.ToLower().Contains(lower))
                .FirstOrDefaultAsync();
            if (master != null)
            {
                results.Add(new ResolveResponse
                {
                    CustomerName = inputName, CommonName = master.CanonicalCustomerName,
                    IsResolved = true, ConfidenceScore = 70, MatchedAlias = inputName,
                    CanonicalCustomerId = master.CanonicalCustomerId,
                    CanonicalCustomerName = master.CanonicalCustomerName,
                    CisCode = master.CisCode, Country = master.CountryOfOperation,
                    Region = master.Region, Mgs = master.Mgs,
                });
                continue;
            }

            results.Add(new ResolveResponse { CustomerName = inputName, CommonName = inputName, IsResolved = false, ConfidenceScore = 0 });
        }
        return results;
    }

    // ─── Helpers ─────────────────────────────────────────────────
    private static ResolveResponse BuildResponse(string inputName, CustomerAliasMapping match, double confidence) => new()
    {
        CustomerName = inputName, CommonName = match.CleanedCustomerName,
        IsResolved = true, ConfidenceScore = confidence,
        MatchedAlias = match.OriginalCustomerName,
        CanonicalCustomerId = match.CanonicalCustomerId,
        CanonicalCustomerName = match.CustomerMaster?.CanonicalCustomerName,
        CisCode = match.CustomerMaster?.CisCode,
        Country = match.CustomerMaster?.CountryOfOperation,
        Region = match.CustomerMaster?.Region,
        Mgs = match.CustomerMaster?.Mgs,
    };

    private static double CalcScore(string a, string b)
    {
        if (a == b) return 100;
        if (a.Contains(b) || b.Contains(a))
        {
            double shorter = Math.Min(a.Length, b.Length);
            double longer = Math.Max(a.Length, b.Length);
            return Math.Round(shorter / longer * 100, 1);
        }
        var setA = new HashSet<char>(a);
        var setB = new HashSet<char>(b);
        var intersection = new HashSet<char>(setA);
        intersection.IntersectWith(setB);
        var union = new HashSet<char>(setA);
        union.UnionWith(setB);
        return Math.Round((double)intersection.Count / union.Count * 100, 1);
    }
}

// ─── Input / result types for GraphQL ────────────────────────────

public class AliasInput
{
    public string AliasName { get; set; } = string.Empty;
    public string? AssetClass { get; set; }
}

public class HealthResult
{
    public string Status { get; set; } = string.Empty;
    public string SqlServer { get; set; } = string.Empty;
    public string Postgres { get; set; } = string.Empty;
}
