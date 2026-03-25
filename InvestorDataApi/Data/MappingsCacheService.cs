using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InvestorDataApi.Data;

/// <summary>
/// Singleton in-memory cache of all alias mappings and customer masters.
/// Provides O(1) exact-match resolve and fast in-memory partial matching.
/// Refreshed on any mutation (create, update, delete).
/// </summary>
public class MappingsCacheService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ReaderWriterLockSlim _lock = new();

    // Exact match: lowercased OriginalCustomerName → mapping entry
    private Dictionary<string, CachedMapping> _exactIndex = new();

    // All mappings for partial search (lowercased keys precomputed)
    private List<CachedMapping> _allMappings = [];

    // All masters for fallback search
    private List<CachedMaster> _allMasters = [];

    // Master lookup by ID
    private Dictionary<int, CachedMaster> _masterById = new();

    public MappingsCacheService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>Load all data from DB into memory. Called at startup and after mutations.</summary>
    public async Task RefreshAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();

        var masters = await db.CustomerMasters.AsNoTracking().ToListAsync();
        var mappings = await db.CustomerAliasMappings.AsNoTracking().ToListAsync();

        var masterDict = masters.ToDictionary(m => m.CanonicalCustomerId, m => new CachedMaster
        {
            CanonicalCustomerId = m.CanonicalCustomerId,
            CanonicalCustomerName = m.CanonicalCustomerName,
            CanonicalCustomerNameLower = m.CanonicalCustomerName?.ToLowerInvariant(),
            CisCode = m.CisCode,
            CountryOfOperation = m.CountryOfOperation,
            Mgs = m.Mgs,
            Region = m.Region,
        });

        var cachedMappings = mappings.Select(m =>
        {
            masterDict.TryGetValue(m.CanonicalCustomerId ?? 0, out var master);
            return new CachedMapping
            {
                Id = m.Id,
                OriginalCustomerName = m.OriginalCustomerName,
                OriginalCustomerNameLower = m.OriginalCustomerName.ToLowerInvariant(),
                CleanedCustomerName = m.CleanedCustomerName,
                CleanedCustomerNameLower = m.CleanedCustomerName?.ToLowerInvariant(),
                CanonicalCustomerId = m.CanonicalCustomerId,
                Master = master,
            };
        }).ToList();

        var exactIndex = new Dictionary<string, CachedMapping>(cachedMappings.Count, StringComparer.Ordinal);
        foreach (var cm in cachedMappings)
        {
            exactIndex.TryAdd(cm.OriginalCustomerNameLower, cm);
        }

        _lock.EnterWriteLock();
        try
        {
            _exactIndex = exactIndex;
            _allMappings = cachedMappings;
            _allMasters = masterDict.Values.ToList();
            _masterById = masterDict;
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    /// <summary>O(1) exact match by original customer name.</summary>
    public CachedMapping? ExactMatch(string lowerName)
    {
        _lock.EnterReadLock();
        try
        {
            return _exactIndex.GetValueOrDefault(lowerName);
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    /// <summary>In-memory partial match: find mappings where original or cleaned name contains the input.</summary>
    public List<CachedMapping> PartialMatch(string lowerInput, int maxResults = 10)
    {
        _lock.EnterReadLock();
        try
        {
            var results = new List<CachedMapping>(maxResults);
            foreach (var m in _allMappings)
            {
                if (m.OriginalCustomerNameLower.Contains(lowerInput)
                    || (m.CleanedCustomerNameLower != null && m.CleanedCustomerNameLower.Contains(lowerInput)))
                {
                    results.Add(m);
                    if (results.Count >= maxResults) break;
                }
            }
            return results;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    /// <summary>In-memory master fallback: find master where canonical name contains the input.</summary>
    public CachedMaster? MasterFallback(string lowerInput)
    {
        _lock.EnterReadLock();
        try
        {
            foreach (var m in _allMasters)
            {
                if (m.CanonicalCustomerNameLower != null && m.CanonicalCustomerNameLower.Contains(lowerInput))
                    return m;
            }
            return null;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }
}

// ─── Cached data structures (flat, no EF tracking overhead) ──────

public class CachedMapping
{
    public int Id { get; init; }
    public string OriginalCustomerName { get; init; } = "";
    public string OriginalCustomerNameLower { get; init; } = "";
    public string? CleanedCustomerName { get; init; }
    public string? CleanedCustomerNameLower { get; init; }
    public int? CanonicalCustomerId { get; init; }
    public CachedMaster? Master { get; init; }
}

public class CachedMaster
{
    public int CanonicalCustomerId { get; init; }
    public string? CanonicalCustomerName { get; init; }
    public string? CanonicalCustomerNameLower { get; init; }
    public string? CisCode { get; init; }
    public string? CountryOfOperation { get; init; }
    public string? Mgs { get; init; }
    public string? Region { get; init; }
}
