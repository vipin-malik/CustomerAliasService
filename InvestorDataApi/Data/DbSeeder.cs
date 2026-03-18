using InvestorDataApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InvestorDataApi.Data;

public static class DbSeeder
{
    /// <summary>
    /// Seed SQL Server (primary) with CustomerAliasMapping and CustomerMaster data.
    /// </summary>
    public static async Task SeedSqlServerAsync(SqlServerDbContext db)
    {
        // Ensure database and tables exist (EF creates from model)
        await db.Database.EnsureCreatedAsync();

        // Seed CustomerMaster
        if (!await db.CustomerMasters.AnyAsync())
        {
            var masters = new List<CustomerMaster>
            {
                new() { CanonicalCustomerId = 1,  CanonicalCustomerName = "Alliance Animal Health LLC",           CisCode = "X32EOUS", CountryOfOperation = "United States",  Mgs = "Healthcare",           CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 2,  CanonicalCustomerName = "Pinnacle Dermatology Management LLC",  CisCode = "P91DERM", CountryOfOperation = "United States",  Mgs = "Healthcare",           CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 3,  CanonicalCustomerName = "OJ Limited",                           CisCode = "OJ3LTDX", CountryOfOperation = "United Kingdom", Mgs = "Consumer Services",    CountryOfIncorporation = "United Kingdom", Region = "Europe" },
                new() { CanonicalCustomerId = 4,  CanonicalCustomerName = "Apex Group Ltd",                       CisCode = "A45BKLS", CountryOfOperation = "Luxembourg",      Mgs = "Financial Services",   CountryOfIncorporation = "Luxembourg",     Region = "Europe" },
                new() { CanonicalCustomerId = 5,  CanonicalCustomerName = "Ardonagh Group Ltd",                   CisCode = "B78CKJD", CountryOfOperation = "United Kingdom", Mgs = "Insurance",            CountryOfIncorporation = "United Kingdom", Region = "Europe" },
                new() { CanonicalCustomerId = 6,  CanonicalCustomerName = "Athenahealth Group Inc",               CisCode = "D34EMRT", CountryOfOperation = "United States",  Mgs = "Healthcare IT",        CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 7,  CanonicalCustomerName = "Belron SA",                            CisCode = "E56FNUV", CountryOfOperation = "Belgium",         Mgs = "Automotive Services",  CountryOfIncorporation = "Belgium",        Region = "Europe" },
                new() { CanonicalCustomerId = 8,  CanonicalCustomerName = "Blackhawk Network Holdings Inc",       CisCode = "F78GPWX", CountryOfOperation = "United States",  Mgs = "Financial Technology", CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 9,  CanonicalCustomerName = "Carnival Corporation",                 CisCode = "L90MVIJ", CountryOfOperation = "United States",  Mgs = "Leisure & Travel",     CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 10, CanonicalCustomerName = "Citrix Systems Inc",                   CisCode = "M12NWKL", CountryOfOperation = "United States",  Mgs = "Software",             CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 11, CanonicalCustomerName = "DaVita Inc",                           CisCode = "T56UDYZ", CountryOfOperation = "United States",  Mgs = "Healthcare",           CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 12, CanonicalCustomerName = "Finastra Ltd",                         CisCode = "Y56ZIJK", CountryOfOperation = "United Kingdom", Mgs = "Financial Technology", CountryOfIncorporation = "United Kingdom", Region = "Europe" },
                new() { CanonicalCustomerId = 13, CanonicalCustomerName = "Jazz Pharmaceuticals PLC",             CisCode = "H35IRAB", CountryOfOperation = "Ireland",         Mgs = "Pharmaceuticals",      CountryOfIncorporation = "Ireland",        Region = "Europe" },
                new() { CanonicalCustomerId = 14, CanonicalCustomerName = "LogMeIn Inc",                          CisCode = "L13MVIJ", CountryOfOperation = "United States",  Mgs = "Software",             CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 15, CanonicalCustomerName = "Paysafe Ltd",                          CisCode = "S57TCWX", CountryOfOperation = "United Kingdom", Mgs = "Financial Technology", CountryOfIncorporation = "United Kingdom", Region = "Europe" },
                new() { CanonicalCustomerId = 16, CanonicalCustomerName = "Refinitiv Holdings Ltd",               CisCode = "U91VEAB", CountryOfOperation = "United States",  Mgs = "Financial Services",   CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 17, CanonicalCustomerName = "Solera Holdings Inc",                  CisCode = "W35XGEF", CountryOfOperation = "United States",  Mgs = "Automotive Software",  CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 18, CanonicalCustomerName = "Envision Healthcare Corp",             CisCode = "X34YHGH", CountryOfOperation = "United States",  Mgs = "Healthcare",           CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 19, CanonicalCustomerName = "Broadstreet Partners Inc",             CisCode = "H12IRAB", CountryOfOperation = "United States",  Mgs = "Insurance",            CountryOfIncorporation = "United States",  Region = "North America" },
                new() { CanonicalCustomerId = 20, CanonicalCustomerName = "Cablevision Lightpath Inc",            CisCode = "I34JSCD", CountryOfOperation = "United States",  Mgs = "Telecommunications",   CountryOfIncorporation = "United States",  Region = "North America" },
            };
            db.CustomerMasters.AddRange(masters);
            await db.SaveChangesAsync();
        }

        // Seed CustomerAliasMapping
        if (!await db.CustomerAliasMappings.AnyAsync())
        {
            var mappings = new List<CustomerAliasMapping>
            {
                new() { OriginalCustomerName = "Pinnacle Dermatology Management, LLC - Term Loan (12/21)-x1",  CleanedCustomerName = "Pinnacle Dermatology Management LLC", CanonicalCustomerId = 2 },
                new() { OriginalCustomerName = "Pinnacle Dermatology Management, LLC - Term Loan (12/21)-x10", CleanedCustomerName = "Pinnacle Dermatology Management LLC", CanonicalCustomerId = 2 },
                new() { OriginalCustomerName = "Pinnacle Dermatology Management LLC - ANOTHER ITEM",           CleanedCustomerName = "Pinnacle Dermatology Management LLC", CanonicalCustomerId = 2 },
                new() { OriginalCustomerName = "Pinnacle Dermatology Mgmt LLC",                                CleanedCustomerName = "Pinnacle Dermatology Management LLC", CanonicalCustomerId = 2 },
                new() { OriginalCustomerName = "Alliance Animal Hlth",                        CleanedCustomerName = "Alliance Animal Health LLC",   CanonicalCustomerId = 1 },
                new() { OriginalCustomerName = "Alliance Animal Health",                      CleanedCustomerName = "Alliance Animal Health LLC",   CanonicalCustomerId = 1 },
                new() { OriginalCustomerName = "Alliance Animal Health LLC - Term Loan B",    CleanedCustomerName = "Alliance Animal Health LLC",   CanonicalCustomerId = 1 },
                new() { OriginalCustomerName = "OJ Ltd",         CleanedCustomerName = "OJ Limited", CanonicalCustomerId = 3 },
                new() { OriginalCustomerName = "OJ Limited",     CleanedCustomerName = "OJ Limited", CanonicalCustomerId = 3 },
                new() { OriginalCustomerName = "Apex Grp",            CleanedCustomerName = "Apex Group Ltd", CanonicalCustomerId = 4 },
                new() { OriginalCustomerName = "Apex Group Limited",  CleanedCustomerName = "Apex Group Ltd", CanonicalCustomerId = 4 },
                new() { OriginalCustomerName = "Apex Group Ltd - Revolver", CleanedCustomerName = "Apex Group Ltd", CanonicalCustomerId = 4 },
                new() { OriginalCustomerName = "Ardonagh Grp Ltd",    CleanedCustomerName = "Ardonagh Group Ltd", CanonicalCustomerId = 5 },
                new() { OriginalCustomerName = "Ardonagh Group",      CleanedCustomerName = "Ardonagh Group Ltd", CanonicalCustomerId = 5 },
                new() { OriginalCustomerName = "Athenahealth Inc",        CleanedCustomerName = "Athenahealth Group Inc", CanonicalCustomerId = 6 },
                new() { OriginalCustomerName = "Athena Health Group",     CleanedCustomerName = "Athenahealth Group Inc", CanonicalCustomerId = 6 },
                new() { OriginalCustomerName = "Belron",        CleanedCustomerName = "Belron SA", CanonicalCustomerId = 7 },
                new() { OriginalCustomerName = "Belron S.A.",   CleanedCustomerName = "Belron SA", CanonicalCustomerId = 7 },
                new() { OriginalCustomerName = "Blackhawk Network",                CleanedCustomerName = "Blackhawk Network Holdings Inc", CanonicalCustomerId = 8 },
                new() { OriginalCustomerName = "Blackhawk Network Holdings",       CleanedCustomerName = "Blackhawk Network Holdings Inc", CanonicalCustomerId = 8 },
                new() { OriginalCustomerName = "Carnival Corp",          CleanedCustomerName = "Carnival Corporation", CanonicalCustomerId = 9 },
                new() { OriginalCustomerName = "Carnival Corporation",   CleanedCustomerName = "Carnival Corporation", CanonicalCustomerId = 9 },
                new() { OriginalCustomerName = "Citrix Systems",    CleanedCustomerName = "Citrix Systems Inc", CanonicalCustomerId = 10 },
                new() { OriginalCustomerName = "Citrix Inc",        CleanedCustomerName = "Citrix Systems Inc", CanonicalCustomerId = 10 },
                new() { OriginalCustomerName = "DaVita",               CleanedCustomerName = "DaVita Inc", CanonicalCustomerId = 11 },
                new() { OriginalCustomerName = "DaVita Healthcare",    CleanedCustomerName = "DaVita Inc", CanonicalCustomerId = 11 },
                new() { OriginalCustomerName = "Finastra",          CleanedCustomerName = "Finastra Ltd", CanonicalCustomerId = 12 },
                new() { OriginalCustomerName = "Finastra Limited",  CleanedCustomerName = "Finastra Ltd", CanonicalCustomerId = 12 },
                new() { OriginalCustomerName = "Jazz Pharma",            CleanedCustomerName = "Jazz Pharmaceuticals PLC", CanonicalCustomerId = 13 },
                new() { OriginalCustomerName = "Jazz Pharmaceuticals",   CleanedCustomerName = "Jazz Pharmaceuticals PLC", CanonicalCustomerId = 13 },
                new() { OriginalCustomerName = "LogMeIn",     CleanedCustomerName = "LogMeIn Inc", CanonicalCustomerId = 14 },
                new() { OriginalCustomerName = "Paysafe",          CleanedCustomerName = "Paysafe Ltd", CanonicalCustomerId = 15 },
                new() { OriginalCustomerName = "Paysafe Limited",  CleanedCustomerName = "Paysafe Ltd", CanonicalCustomerId = 15 },
                new() { OriginalCustomerName = "Refinitiv",            CleanedCustomerName = "Refinitiv Holdings Ltd", CanonicalCustomerId = 16 },
                new() { OriginalCustomerName = "Refinitiv Holdings",   CleanedCustomerName = "Refinitiv Holdings Ltd", CanonicalCustomerId = 16 },
                new() { OriginalCustomerName = "Solera Holdings",    CleanedCustomerName = "Solera Holdings Inc", CanonicalCustomerId = 17 },
                new() { OriginalCustomerName = "Solera Inc",         CleanedCustomerName = "Solera Holdings Inc", CanonicalCustomerId = 17 },
                new() { OriginalCustomerName = "Envision Healthcare",    CleanedCustomerName = "Envision Healthcare Corp", CanonicalCustomerId = 18 },
                new() { OriginalCustomerName = "Envision HC Corp",       CleanedCustomerName = "Envision Healthcare Corp", CanonicalCustomerId = 18 },
                new() { OriginalCustomerName = "Broadstreet Partners",    CleanedCustomerName = "Broadstreet Partners Inc", CanonicalCustomerId = 19 },
                new() { OriginalCustomerName = "Cablevision Lightpath",    CleanedCustomerName = "Cablevision Lightpath Inc", CanonicalCustomerId = 20 },
            };
            db.CustomerAliasMappings.AddRange(mappings);
            await db.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Ensure Postgres has the InvestorAlias schema and tables ready for push.
    /// </summary>
    public static async Task EnsurePostgresSchemaAsync(PostgresDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(
            "CREATE SCHEMA IF NOT EXISTS \"InvestorAlias\"");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""InvestorAlias"".""CustomerMaster"" (
                ""CanonicalCustomerId""     INT PRIMARY KEY,
                ""CanonicalCustomerName""   VARCHAR(500),
                ""CIS CODE""               VARCHAR(50),
                ""Ctry Of Op""             VARCHAR(200),
                ""MGS""                    VARCHAR(100),
                ""Ctry of Inc""            VARCHAR(200),
                ""Region""                 VARCHAR(200)
            )");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""InvestorAlias"".""CustomerAliasMapping"" (
                ""ID""                      SERIAL PRIMARY KEY,
                ""OriginalCustomerName""    VARCHAR(1000) NOT NULL,
                ""CleanedCustomerName""     VARCHAR(500),
                ""CanonicalCustomerId""     INT REFERENCES ""InvestorAlias"".""CustomerMaster""(""CanonicalCustomerId"")
            )");
    }
}
