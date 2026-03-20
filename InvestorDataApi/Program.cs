using InvestorDataApi.Data;
using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// JSON — prevent circular references
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

// Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// ─── Dual Database Setup ───────────────────────────────────────
// SQL Server = PRIMARY (CustomerAliasMapping + CustomerMaster)
var sqlConn = builder.Configuration.GetConnectionString("SqlServer")
    ?? "Server=localhost;Database=CustomerAliasDb;Trusted_Connection=True;TrustServerCertificate=True;";

builder.Services.AddDbContext<SqlServerDbContext>(options =>
    options.UseSqlServer(sqlConn));

// PostgreSQL = SOURCE DATA (bilateral_asset_level) + PUSH TARGET
var pgConn = builder.Configuration.GetConnectionString("Postgres")
    ?? "Host=localhost;Port=5432;Database=investor_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<PostgresDbContext>(options =>
    options.UseNpgsql(pgConn));

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

// ─── Seed databases ────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    try
    {
        var sqlDb = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();
        await DbSeeder.SeedSqlServerAsync(sqlDb);
        Log.Information("SQL Server schema and seed data ready");

        var pgDb = scope.ServiceProvider.GetRequiredService<PostgresDbContext>();
        await DbSeeder.EnsurePostgresSchemaAsync(pgDb);
        Log.Information("PostgreSQL push target schema ready");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to seed databases");
    }
}

app.UseCors();

// ═══════════════════════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════════════════════
app.MapGet("/health", async (SqlServerDbContext sqlDb, PostgresDbContext pgDb) =>
{
    var sqlOk = false;
    var pgOk = false;
    try { sqlOk = await sqlDb.Database.CanConnectAsync(); } catch { }
    try { pgOk = await pgDb.Database.CanConnectAsync(); } catch { }
    return Results.Ok(new
    {
        status = sqlOk && pgOk ? "healthy" : "degraded",
        sqlServer = sqlOk ? "connected" : "unavailable",
        postgres = pgOk ? "connected" : "unavailable",
    });
});

// ═══════════════════════════════════════════════════════════════
// Customers (source data from PostgreSQL — read-only)
// ═══════════════════════════════════════════════════════════════

app.MapGet("/api/v1/investors", async (
    PostgresDbContext db, int page = 1, int pageSize = 25, string? search = null) =>
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

    var items = await query
        .OrderBy(a => a.ObligorName)
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

    return Results.Ok(new PagedResult<InvestorDto>
    {
        Items = items, TotalCount = totalCount,
        PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
    });
}).WithName("GetInvestors");

app.MapGet("/api/v1/investors/{id:int}", async (int id, PostgresDbContext db) =>
{
    var a = await db.BilateralAssets.FindAsync(id);
    if (a is null) return Results.NotFound(new { message = "Not found" });
    return Results.Ok(new InvestorDto
    {
        Id = a.Id, Name = a.ObligorName ?? "", AssetClass = a.DataContext,
        Source = a.LoanType, CisCode = a.CisCode, NatwestId = a.NatWestUniqueId,
        Tranche = a.Tranche, Seniority = a.Seniority,
        Currency = a.NativeCurrency, Fx = a.Fx,
        Country = a.CountryReported, Industry = a.NwmIndustryGroup,
        CreatedAt = a.AsOfDate,
    });
}).WithName("GetInvestorById");

// ═══════════════════════════════════════════════════════════════
// CustomerAliasMapping CRUD (SQL Server — PRIMARY)
// ═══════════════════════════════════════════════════════════════

app.MapGet("/api/v1/customer-alias-mappings", async (
    SqlServerDbContext db, int page = 1, int pageSize = 25, string? search = null) =>
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

    return Results.Ok(new PagedResult<CustomerAliasMapping>
    {
        Items = items, TotalCount = totalCount,
        PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
    });
}).WithName("GetCustomerAliasMappings");

app.MapGet("/api/v1/customer-alias-mappings/{id:int}", async (int id, SqlServerDbContext db) =>
{
    var m = await db.CustomerAliasMappings.Include(x => x.CustomerMaster).FirstOrDefaultAsync(x => x.Id == id);
    return m is null ? Results.NotFound(new { message = "Not found" }) : Results.Ok(m);
}).WithName("GetCustomerAliasMappingById");

app.MapPost("/api/v1/customer-alias-mappings", async (CreateMappingRequest input, SqlServerDbContext db) =>
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

    var result = await db.CustomerAliasMappings.Include(m => m.CustomerMaster).FirstOrDefaultAsync(m => m.Id == mapping.Id);
    return Results.Created($"/api/v1/customer-alias-mappings/{mapping.Id}", result);
}).WithName("CreateCustomerAliasMapping");

app.MapPut("/api/v1/customer-alias-mappings/{id:int}", async (int id, CustomerAliasMapping input, SqlServerDbContext db) =>
{
    var m = await db.CustomerAliasMappings.FindAsync(id);
    if (m is null) return Results.NotFound(new { message = "Not found" });
    m.OriginalCustomerName = input.OriginalCustomerName;
    m.CleanedCustomerName = input.CleanedCustomerName;
    m.CanonicalCustomerId = input.CanonicalCustomerId;
    await db.SaveChangesAsync();
    return Results.Ok(m);
}).WithName("UpdateCustomerAliasMapping");

app.MapDelete("/api/v1/customer-alias-mappings/{id:int}", async (int id, SqlServerDbContext db) =>
{
    var m = await db.CustomerAliasMappings.FindAsync(id);
    if (m is null) return Results.NotFound(new { message = "Not found" });
    db.CustomerAliasMappings.Remove(m);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).WithName("DeleteCustomerAliasMapping");

// ═══════════════════════════════════════════════════════════════
// CustomerMaster (SQL Server — PRIMARY)
// ═══════════════════════════════════════════════════════════════

app.MapGet("/api/v1/customer-masters", async (
    SqlServerDbContext db, int page = 1, int pageSize = 25, string? search = null) =>
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

    return Results.Ok(new PagedResult<CustomerMaster>
    {
        Items = items, TotalCount = totalCount,
        PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
    });
}).WithName("GetCustomerMasters");

app.MapGet("/api/v1/customer-masters/{id:int}", async (int id, SqlServerDbContext db) =>
{
    var c = await db.CustomerMasters.FindAsync(id);
    return c is null ? Results.NotFound(new { message = "Not found" }) : Results.Ok(c);
}).WithName("GetCustomerMasterById");

// Joined view: CustomerMaster + child AliasMappings
app.MapGet("/api/v1/customer-masters-with-aliases", async (
    SqlServerDbContext db, int page = 1, int pageSize = 25, string? search = null) =>
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

    return Results.Ok(new PagedResult<CustomerMaster>
    {
        Items = items, TotalCount = totalCount,
        PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
    });
}).WithName("GetCustomerMastersWithAliases");

// ═══════════════════════════════════════════════════════════════
// Resolve (SQL Server — PRIMARY)
// ═══════════════════════════════════════════════════════════════

app.MapPost("/api/v1/investor/resolve", async (ResolveRequest request, SqlServerDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.AliasName))
        return Results.BadRequest(new { message = "AliasName is required" });

    var aliasName = request.AliasName.Trim();
    var aliasLower = aliasName.ToLower();

    var exactMatch = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
        .Where(m => m.OriginalCustomerName.ToLower() == aliasLower).FirstOrDefaultAsync();

    if (exactMatch != null)
        return Results.Ok(BuildResolveResponse(aliasName, exactMatch, 100));

    var partialMatches = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
        .Where(m => m.OriginalCustomerName.ToLower().Contains(aliasLower)
                  || (m.CleanedCustomerName != null && m.CleanedCustomerName.ToLower().Contains(aliasLower)))
        .Take(10).ToListAsync();

    if (partialMatches.Count > 0)
    {
        var best = partialMatches.First();
        var score = CalculateSimpleScore(aliasLower, best.OriginalCustomerName.ToLower());
        var potentials = partialMatches.GroupBy(m => m.CleanedCustomerName)
            .Select(g => new PotentialMatch
            {
                CommonName = g.Key ?? "", MatchedAlias = g.First().OriginalCustomerName,
                ConfidenceScore = CalculateSimpleScore(aliasLower, g.First().OriginalCustomerName.ToLower()),
            }).OrderByDescending(p => p.ConfidenceScore).ToList();

        var resp = BuildResolveResponse(aliasName, best, potentials.First().ConfidenceScore);
        resp.PotentialMatches = potentials.Count > 1 ? potentials : null;
        return Results.Ok(resp);
    }

    var masterMatch = await db.CustomerMasters
        .Where(c => c.CanonicalCustomerName != null && c.CanonicalCustomerName.ToLower().Contains(aliasLower))
        .FirstOrDefaultAsync();

    if (masterMatch != null)
        return Results.Ok(new ResolveResponse
        {
            CustomerName = aliasName, CommonName = masterMatch.CanonicalCustomerName,
            IsResolved = true, ConfidenceScore = 70, MatchedAlias = aliasName,
            CanonicalCustomerId = masterMatch.CanonicalCustomerId,
            CanonicalCustomerName = masterMatch.CanonicalCustomerName,
            CisCode = masterMatch.CisCode, Country = masterMatch.CountryOfOperation,
            Region = masterMatch.Region, Mgs = masterMatch.Mgs,
        });

    return Results.Ok(new ResolveResponse
    {
        CustomerName = aliasName, CommonName = aliasName,
        IsResolved = false, ConfidenceScore = 0,
    });
}).WithName("ResolveAlias");

// Bulk resolve
app.MapPost("/api/v1/investor/resolve-bulk", async (BulkResolveRequest request, SqlServerDbContext db) =>
{
    var results = new List<ResolveResponse>();
    foreach (var alias in request.Aliases)
    {
        var inputName = alias.AliasName?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(inputName))
        {
            results.Add(new ResolveResponse { CustomerName = inputName, CommonName = inputName, IsResolved = false, ConfidenceScore = 0 });
            continue;
        }

        var aliasLower = inputName.ToLower();

        var match = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
            .Where(m => m.OriginalCustomerName.ToLower() == aliasLower).FirstOrDefaultAsync();

        if (match != null)
        {
            results.Add(BuildResolveResponse(inputName, match, 100));
            continue;
        }

        var partial = await db.CustomerAliasMappings.Include(m => m.CustomerMaster)
            .Where(m => m.OriginalCustomerName.ToLower().Contains(aliasLower)
                      || (m.CleanedCustomerName != null && m.CleanedCustomerName.ToLower().Contains(aliasLower)))
            .FirstOrDefaultAsync();

        if (partial != null)
        {
            results.Add(BuildResolveResponse(inputName, partial,
                CalculateSimpleScore(aliasLower, partial.OriginalCustomerName.ToLower())));
            continue;
        }

        results.Add(new ResolveResponse { CustomerName = inputName, CommonName = inputName, IsResolved = false, ConfidenceScore = 0 });
    }
    return Results.Ok(results);
}).WithName("ResolveAliasesBulk");

// ═══════════════════════════════════════════════════════════════
// Push to PostgreSQL (SQL Server → Postgres)
// ═══════════════════════════════════════════════════════════════

app.MapPost("/api/v1/push-to-postgres", async (SqlServerDbContext sqlDb, PostgresDbContext pgDb) =>
{
    var response = new PushToDbResponse();

    try
    {
        // ─── Push CustomerMaster ────────────────────────────────
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
                    CisCode = master.CisCode,
                    CountryOfOperation = master.CountryOfOperation,
                    Mgs = master.Mgs,
                    CountryOfIncorporation = master.CountryOfIncorporation,
                    Region = master.Region,
                });
                response.MastersCreated++;
            }
        }
        await pgDb.SaveChangesAsync();

        // ─── Push CustomerAliasMapping ──────────────────────────
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
    catch (Exception ex)
    {
        response.Errors.Add($"Push failed: {ex.Message}");
    }

    return Results.Ok(response);
}).WithName("PushToPostgres");

// Keep the old push-to-db for backward compatibility (saves to SQL Server)
app.MapPost("/api/v1/push-to-db", async (PushToDbRequest request, SqlServerDbContext db) =>
{
    var response = new PushToDbResponse();
    foreach (var record in request.Records)
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
    return Results.Ok(response);
}).WithName("PushToDb");

// ─── Helpers ───────────────────────────────────────────────────

static ResolveResponse BuildResolveResponse(string inputName, CustomerAliasMapping match, double confidence) => new()
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

static double CalculateSimpleScore(string a, string b)
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

Log.Information("Customer Alias Manager API starting on port 5001");
app.Run();
