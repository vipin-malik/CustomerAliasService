using InvestorDataApi.Data;
using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// JSON serialization — prevent circular references
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

// PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=investor_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<InvestorDbContext>(options =>
    options.UseNpgsql(connectionString));

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

// Ensure schema, tables, and seed data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<InvestorDbContext>();
    try
    {
        await DbSeeder.SeedAsync(db);
        Log.Information("Database schema and seed data ready");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to seed database");
    }
}

app.UseCors();

// ═══════════════════════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════════════════════
app.MapGet("/health", async (InvestorDbContext db) =>
{
    try
    {
        await db.Database.CanConnectAsync();
        return Results.Ok(new { status = "healthy", database = "connected" });
    }
    catch (Exception ex)
    {
        return Results.Json(new { status = "unhealthy", database = ex.Message }, statusCode: 503);
    }
});

// ═══════════════════════════════════════════════════════════════
// Bilateral Asset (source investor data)
// ═══════════════════════════════════════════════════════════════

app.MapGet("/api/v1/investors", async (
    InvestorDbContext db,
    int page = 1,
    int pageSize = 25,
    string? search = null) =>
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
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(a => new InvestorDto
        {
            Id = a.Id,
            Name = a.ObligorName ?? "",
            AssetClass = a.DataContext,
            Source = a.LoanType,
            CisCode = a.CisCode,
            NatwestId = a.NatWestUniqueId,
            Tranche = a.Tranche,
            Seniority = a.Seniority,
            Currency = a.NativeCurrency,
            Fx = a.Fx,
            Country = a.CountryReported,
            Industry = a.NwmIndustryGroup,
            CreatedAt = a.AsOfDate,
        })
        .ToListAsync();

    return Results.Ok(new PagedResult<InvestorDto>
    {
        Items = items,
        TotalCount = totalCount,
        PageNumber = page,
        PageSize = pageSize,
        TotalPages = totalPages,
    });
})
.WithName("GetInvestors");

app.MapGet("/api/v1/investors/{id:int}", async (int id, InvestorDbContext db) =>
{
    var asset = await db.BilateralAssets.FindAsync(id);
    if (asset is null)
        return Results.NotFound(new { message = $"Investor with ID {id} not found" });

    return Results.Ok(new InvestorDto
    {
        Id = asset.Id,
        Name = asset.ObligorName ?? "",
        AssetClass = asset.DataContext,
        Source = asset.LoanType,
        CisCode = asset.CisCode,
        NatwestId = asset.NatWestUniqueId,
        Tranche = asset.Tranche,
        Seniority = asset.Seniority,
        Currency = asset.NativeCurrency,
        Fx = asset.Fx,
        Country = asset.CountryReported,
        Industry = asset.NwmIndustryGroup,
        CreatedAt = asset.AsOfDate,
    });
})
.WithName("GetInvestorById");

// ═══════════════════════════════════════════════════════════════
// CustomerAliasMapping CRUD
// ═══════════════════════════════════════════════════════════════

app.MapGet("/api/v1/customer-alias-mappings", async (
    InvestorDbContext db, int page = 1, int pageSize = 25, string? search = null) =>
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

    var items = await query
        .OrderBy(m => m.OriginalCustomerName)
        .Skip((page - 1) * pageSize).Take(pageSize)
        .ToListAsync();

    return Results.Ok(new PagedResult<CustomerAliasMapping>
    {
        Items = items, TotalCount = totalCount,
        PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
    });
}).WithName("GetCustomerAliasMappings");

app.MapGet("/api/v1/customer-alias-mappings/{id:int}", async (int id, InvestorDbContext db) =>
{
    var m = await db.CustomerAliasMappings.Include(x => x.CustomerMaster).FirstOrDefaultAsync(x => x.Id == id);
    return m is null ? Results.NotFound(new { message = "Not found" }) : Results.Ok(m);
}).WithName("GetCustomerAliasMappingById");

app.MapPost("/api/v1/customer-alias-mappings", async (CreateMappingRequest input, InvestorDbContext db) =>
{
    var canonicalName = input.CanonicalCustomerName?.Trim()
        ?? input.CleanedCustomerName?.Trim()
        ?? input.OriginalCustomerName.Trim();

    int canonicalId;

    if (input.CanonicalCustomerId.HasValue && input.CanonicalCustomerId > 0)
    {
        // Update existing master with provided fields
        var existingMaster = await db.CustomerMasters.FindAsync(input.CanonicalCustomerId.Value);
        if (existingMaster != null)
        {
            if (!string.IsNullOrWhiteSpace(input.CanonicalCustomerName))
                existingMaster.CanonicalCustomerName = input.CanonicalCustomerName.Trim();
            if (!string.IsNullOrWhiteSpace(input.CisCode))
                existingMaster.CisCode = input.CisCode.Trim();
            if (!string.IsNullOrWhiteSpace(input.Mgs))
                existingMaster.Mgs = input.Mgs.Trim();
            if (!string.IsNullOrWhiteSpace(input.CountryOfOperation))
                existingMaster.CountryOfOperation = input.CountryOfOperation.Trim();
            if (!string.IsNullOrWhiteSpace(input.Region))
                existingMaster.Region = input.Region.Trim();
        }
        canonicalId = input.CanonicalCustomerId.Value;
    }
    else
    {
        // Find by name or create new
        var existingMaster = await db.CustomerMasters
            .Where(m => m.CanonicalCustomerName != null
                && m.CanonicalCustomerName.ToLower() == canonicalName.ToLower())
            .FirstOrDefaultAsync();

        if (existingMaster != null)
        {
            // Update fields on existing master
            if (!string.IsNullOrWhiteSpace(input.CisCode))
                existingMaster.CisCode = input.CisCode.Trim();
            if (!string.IsNullOrWhiteSpace(input.Mgs))
                existingMaster.Mgs = input.Mgs.Trim();
            if (!string.IsNullOrWhiteSpace(input.CountryOfOperation))
                existingMaster.CountryOfOperation = input.CountryOfOperation.Trim();
            if (!string.IsNullOrWhiteSpace(input.Region))
                existingMaster.Region = input.Region.Trim();
            canonicalId = existingMaster.CanonicalCustomerId;
        }
        else
        {
            var maxId = await db.CustomerMasters.MaxAsync(m => (int?)m.CanonicalCustomerId) ?? 0;
            var newMaster = new CustomerMaster
            {
                CanonicalCustomerId = maxId + 1,
                CanonicalCustomerName = canonicalName,
                CisCode = input.CisCode?.Trim(),
                Mgs = input.Mgs?.Trim(),
                CountryOfOperation = input.CountryOfOperation?.Trim(),
                Region = input.Region?.Trim(),
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

    var result = await db.CustomerAliasMappings
        .Include(m => m.CustomerMaster)
        .FirstOrDefaultAsync(m => m.Id == mapping.Id);

    return Results.Created($"/api/v1/customer-alias-mappings/{mapping.Id}", result);
}).WithName("CreateCustomerAliasMapping");

app.MapPut("/api/v1/customer-alias-mappings/{id:int}", async (int id, CustomerAliasMapping input, InvestorDbContext db) =>
{
    var m = await db.CustomerAliasMappings.FindAsync(id);
    if (m is null) return Results.NotFound(new { message = "Not found" });
    m.OriginalCustomerName = input.OriginalCustomerName;
    m.CleanedCustomerName = input.CleanedCustomerName;
    m.CanonicalCustomerId = input.CanonicalCustomerId;
    await db.SaveChangesAsync();
    return Results.Ok(m);
}).WithName("UpdateCustomerAliasMapping");

app.MapDelete("/api/v1/customer-alias-mappings/{id:int}", async (int id, InvestorDbContext db) =>
{
    var m = await db.CustomerAliasMappings.FindAsync(id);
    if (m is null) return Results.NotFound(new { message = "Not found" });
    db.CustomerAliasMappings.Remove(m);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).WithName("DeleteCustomerAliasMapping");

// ═══════════════════════════════════════════════════════════════
// CustomerMaster CRUD
// ═══════════════════════════════════════════════════════════════

app.MapGet("/api/v1/customer-masters", async (
    InvestorDbContext db, int page = 1, int pageSize = 25, string? search = null) =>
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

    var items = await query
        .OrderBy(c => c.CanonicalCustomerName)
        .Skip((page - 1) * pageSize).Take(pageSize)
        .ToListAsync();

    return Results.Ok(new PagedResult<CustomerMaster>
    {
        Items = items, TotalCount = totalCount,
        PageNumber = page, PageSize = pageSize, TotalPages = totalPages,
    });
}).WithName("GetCustomerMasters");

app.MapGet("/api/v1/customer-masters/{id:int}", async (int id, InvestorDbContext db) =>
{
    var c = await db.CustomerMasters.FindAsync(id);
    return c is null ? Results.NotFound(new { message = "Not found" }) : Results.Ok(c);
}).WithName("GetCustomerMasterById");

// ═══════════════════════════════════════════════════════════════
// Resolve Endpoints (using CustomerAliasMapping + CustomerMaster)
// ═══════════════════════════════════════════════════════════════

app.MapPost("/api/v1/investor/resolve", async (ResolveRequest request, InvestorDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.AliasName))
        return Results.BadRequest(new { message = "AliasName is required" });

    var aliasName = request.AliasName.Trim();
    var aliasLower = aliasName.ToLower();

    // Step 1: Exact match on OriginalCustomerName
    var exactMatch = await db.CustomerAliasMappings
        .Include(m => m.CustomerMaster)
        .Where(m => m.OriginalCustomerName.ToLower() == aliasLower)
        .FirstOrDefaultAsync();

    if (exactMatch != null)
    {
        return Results.Ok(new ResolveResponse
        {
            CustomerName = aliasName,
            CommonName = exactMatch.CleanedCustomerName,
            IsResolved = true,
            ConfidenceScore = 100,
            MatchedAlias = exactMatch.OriginalCustomerName,
            CanonicalCustomerId = exactMatch.CanonicalCustomerId,
            CanonicalCustomerName = exactMatch.CustomerMaster?.CanonicalCustomerName,
            CisCode = exactMatch.CustomerMaster?.CisCode,
            Country = exactMatch.CustomerMaster?.CountryOfOperation,
            Region = exactMatch.CustomerMaster?.Region,
            Mgs = exactMatch.CustomerMaster?.Mgs,
        });
    }

    // Step 2: Partial match on OriginalCustomerName or CleanedCustomerName
    var partialMatches = await db.CustomerAliasMappings
        .Include(m => m.CustomerMaster)
        .Where(m => m.OriginalCustomerName.ToLower().Contains(aliasLower)
                  || (m.CleanedCustomerName != null && m.CleanedCustomerName.ToLower().Contains(aliasLower)))
        .Take(10)
        .ToListAsync();

    if (partialMatches.Count > 0)
    {
        var best = partialMatches.First();
        var potentials = partialMatches
            .GroupBy(m => m.CleanedCustomerName)
            .Select(g => new PotentialMatch
            {
                CommonName = g.Key ?? "",
                MatchedAlias = g.First().OriginalCustomerName,
                ConfidenceScore = CalculateSimpleScore(aliasLower, g.First().OriginalCustomerName.ToLower()),
            })
            .OrderByDescending(p => p.ConfidenceScore)
            .ToList();

        return Results.Ok(new ResolveResponse
        {
            CustomerName = aliasName,
            CommonName = best.CleanedCustomerName,
            IsResolved = true,
            ConfidenceScore = potentials.First().ConfidenceScore,
            MatchedAlias = best.OriginalCustomerName,
            CanonicalCustomerId = best.CanonicalCustomerId,
            CanonicalCustomerName = best.CustomerMaster?.CanonicalCustomerName,
            CisCode = best.CustomerMaster?.CisCode,
            Country = best.CustomerMaster?.CountryOfOperation,
            Region = best.CustomerMaster?.Region,
            Mgs = best.CustomerMaster?.Mgs,
            PotentialMatches = potentials.Count > 1 ? potentials : null,
        });
    }

    // Step 3: Try CustomerMaster directly
    var masterMatch = await db.CustomerMasters
        .Where(c => c.CanonicalCustomerName != null && c.CanonicalCustomerName.ToLower().Contains(aliasLower))
        .FirstOrDefaultAsync();

    if (masterMatch != null)
    {
        return Results.Ok(new ResolveResponse
        {
            CustomerName = aliasName,
            CommonName = masterMatch.CanonicalCustomerName,
            IsResolved = true,
            ConfidenceScore = 70,
            MatchedAlias = aliasName,
            CanonicalCustomerId = masterMatch.CanonicalCustomerId,
            CanonicalCustomerName = masterMatch.CanonicalCustomerName,
            CisCode = masterMatch.CisCode,
            Country = masterMatch.CountryOfOperation,
            Region = masterMatch.Region,
            Mgs = masterMatch.Mgs,
        });
    }

    return Results.Ok(new ResolveResponse
    {
        CustomerName = aliasName,
        CommonName = aliasName, // Always return cleaned name (default to input)
        IsResolved = false,
        ConfidenceScore = 0,
    });
}).WithName("ResolveAlias");

// Bulk resolve
app.MapPost("/api/v1/investor/resolve-bulk", async (BulkResolveRequest request, InvestorDbContext db) =>
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

        var match = await db.CustomerAliasMappings
            .Include(m => m.CustomerMaster)
            .Where(m => m.OriginalCustomerName.ToLower() == aliasLower)
            .FirstOrDefaultAsync();

        if (match != null)
        {
            results.Add(new ResolveResponse
            {
                CustomerName = inputName,
                CommonName = match.CleanedCustomerName,
                IsResolved = true,
                ConfidenceScore = 100,
                MatchedAlias = match.OriginalCustomerName,
                CanonicalCustomerId = match.CanonicalCustomerId,
                CanonicalCustomerName = match.CustomerMaster?.CanonicalCustomerName,
                CisCode = match.CustomerMaster?.CisCode,
                Country = match.CustomerMaster?.CountryOfOperation,
                Region = match.CustomerMaster?.Region,
                Mgs = match.CustomerMaster?.Mgs,
            });
            continue;
        }

        var partial = await db.CustomerAliasMappings
            .Include(m => m.CustomerMaster)
            .Where(m => m.OriginalCustomerName.ToLower().Contains(aliasLower)
                      || (m.CleanedCustomerName != null && m.CleanedCustomerName.ToLower().Contains(aliasLower)))
            .FirstOrDefaultAsync();

        if (partial != null)
        {
            results.Add(new ResolveResponse
            {
                CustomerName = inputName,
                CommonName = partial.CleanedCustomerName,
                IsResolved = true,
                ConfidenceScore = CalculateSimpleScore(aliasLower, partial.OriginalCustomerName.ToLower()),
                MatchedAlias = partial.OriginalCustomerName,
                CanonicalCustomerId = partial.CanonicalCustomerId,
                CanonicalCustomerName = partial.CustomerMaster?.CanonicalCustomerName,
                CisCode = partial.CustomerMaster?.CisCode,
                Country = partial.CustomerMaster?.CountryOfOperation,
                Region = partial.CustomerMaster?.Region,
                Mgs = partial.CustomerMaster?.Mgs,
            });
            continue;
        }

        results.Add(new ResolveResponse { CustomerName = inputName, CommonName = inputName, IsResolved = false, ConfidenceScore = 0 });
    }

    return Results.Ok(results);
}).WithName("ResolveAliasesBulk");

// Simple string similarity score
// ═══════════════════════════════════════════════════════════════
// Push resolved data to DB (upsert both tables)
// ═══════════════════════════════════════════════════════════════

app.MapPost("/api/v1/push-to-db", async (PushToDbRequest request, InvestorDbContext db) =>
{
    var response = new PushToDbResponse();
    var errors = new List<string>();

    foreach (var record in request.Records)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(record.OriginalCustomerName))
            {
                errors.Add($"Skipped: empty OriginalCustomerName");
                continue;
            }

            var originalName = record.OriginalCustomerName.Trim();
            var cleanedName = record.CleanedCustomerName?.Trim() ?? originalName;

            // ─── Step 1: Upsert CustomerMaster ──────────────────
            int canonicalId;

            if (record.CanonicalCustomerId.HasValue && record.CanonicalCustomerId > 0)
            {
                // Update existing master if provided
                var existingMaster = await db.CustomerMasters.FindAsync(record.CanonicalCustomerId.Value);
                if (existingMaster != null)
                {
                    // Update fields if provided
                    if (!string.IsNullOrWhiteSpace(record.CanonicalCustomerName))
                        existingMaster.CanonicalCustomerName = record.CanonicalCustomerName;
                    if (!string.IsNullOrWhiteSpace(record.CisCode))
                        existingMaster.CisCode = record.CisCode;
                    if (!string.IsNullOrWhiteSpace(record.CountryOfOperation))
                        existingMaster.CountryOfOperation = record.CountryOfOperation;
                    if (!string.IsNullOrWhiteSpace(record.Region))
                        existingMaster.Region = record.Region;
                    if (!string.IsNullOrWhiteSpace(record.Mgs))
                        existingMaster.Mgs = record.Mgs;

                    response.MastersUpdated++;
                    canonicalId = existingMaster.CanonicalCustomerId;
                }
                else
                {
                    // Create with the specified ID
                    var newMaster = new CustomerMaster
                    {
                        CanonicalCustomerId = record.CanonicalCustomerId.Value,
                        CanonicalCustomerName = record.CanonicalCustomerName ?? cleanedName,
                        CisCode = record.CisCode,
                        CountryOfOperation = record.CountryOfOperation,
                        Region = record.Region,
                        Mgs = record.Mgs,
                    };
                    db.CustomerMasters.Add(newMaster);
                    response.MastersCreated++;
                    canonicalId = newMaster.CanonicalCustomerId;
                }
            }
            else
            {
                // Find or create by canonical name
                var masterByName = await db.CustomerMasters
                    .Where(m => m.CanonicalCustomerName != null
                        && m.CanonicalCustomerName.ToLower() == cleanedName.ToLower())
                    .FirstOrDefaultAsync();

                if (masterByName != null)
                {
                    canonicalId = masterByName.CanonicalCustomerId;
                }
                else
                {
                    var maxId = await db.CustomerMasters
                        .MaxAsync(m => (int?)m.CanonicalCustomerId) ?? 0;
                    var newMaster = new CustomerMaster
                    {
                        CanonicalCustomerId = maxId + 1,
                        CanonicalCustomerName = record.CanonicalCustomerName ?? cleanedName,
                        CisCode = record.CisCode,
                        CountryOfOperation = record.CountryOfOperation,
                        Region = record.Region,
                        Mgs = record.Mgs,
                    };
                    db.CustomerMasters.Add(newMaster);
                    await db.SaveChangesAsync();
                    response.MastersCreated++;
                    canonicalId = newMaster.CanonicalCustomerId;
                }
            }

            // ─── Step 2: Upsert CustomerAliasMapping ────────────
            var existingMapping = await db.CustomerAliasMappings
                .Where(m => m.OriginalCustomerName.ToLower() == originalName.ToLower())
                .FirstOrDefaultAsync();

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
                    OriginalCustomerName = originalName,
                    CleanedCustomerName = cleanedName,
                    CanonicalCustomerId = canonicalId,
                });
                response.MappingsCreated++;
            }

            response.TotalProcessed++;
        }
        catch (Exception ex)
        {
            errors.Add($"Error processing '{record.OriginalCustomerName}': {ex.Message}");
        }
    }

    await db.SaveChangesAsync();
    response.Errors = errors;

    return Results.Ok(response);
}).WithName("PushToDb");

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

Log.Information("Investor Data API starting on port 5001");
app.Run();
