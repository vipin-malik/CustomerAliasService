# Customer Alias Manager

A full-stack application for managing customer alias mappings — resolving original customer names to their cleaned and canonical forms. Built for **enterprise scale** (50K+ mappings, 40K+ canonical customers, 30K+ bulk resolve). Uses a **dual-database architecture** with SQL Server as the primary store and PostgreSQL as the external push target. The frontend communicates with the backend via **GraphQL** (Apollo Client + HotChocolate), backed by an **in-memory cache** for sub-millisecond resolve operations.

---

## Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  React UI (TS)   │────>│  .NET 10 API         │────>│  SQL Server         │
│  localhost:3000  │     │  localhost:5001       │     │  (PRIMARY)          │
│                  │     │                      │     │  CustomerAliasMapping│
│  Vite + MUI +    │     │  GraphQL             │     │  CustomerMaster     │
│  Apollo Client + │     │  (HotChocolate)      │     └─────────────────────┘
│  AG Grid +       │     │                      │              │
│  CSS Modules     │     │  In-Memory Cache     │     Push on demand (SQL → PG)
└──────────────────┘     │  (MappingsCacheService)     │
        │                │  O(1) exact match    │     ┌─────────────────────┐
   Apollo Client         │  In-memory partial   │────>│  PostgreSQL         │
   useQuery /            │  Prefix-ranked search │     │  (EXTERNAL)         │
   useLazyQuery /        │                      │     │  bilateral_asset_   │
   useMutation           └──────────────────────┘     │  level (source)     │
        │                                             │  + push target      │
   /graphql endpoint                                  └─────────────────────┘
```

### Database Roles

| Database | Role | Tables |
|----------|------|--------|
| **SQL Server** (primary) | All CRUD, resolve, edit operations | `InvestorAlias.CustomerAliasMapping`, `InvestorAlias.CustomerMaster` |
| **PostgreSQL** (external) | Read-only source data + push target | `bilateral_asset_level` (source), `InvestorAlias.CustomerAliasMapping` + `InvestorAlias.CustomerMaster` (push target) |

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite 7, Apollo Client 3, MUI v7, AG Grid 35, CSS Modules |
| **Backend** | C# .NET 10, HotChocolate GraphQL 15, Entity Framework Core, In-Memory Cache, Npgsql |
| **Databases** | SQL Server Express (primary), PostgreSQL 16 (external) |

### Architecture Patterns

- Feature-based folder structure (`@core/`, `@features/resolve/`, `@features/mappings/`)
- Path aliases (`@core/*`, `@features/*`, `@api/*`)
- Arrow function components (no `React.FC`)
- Custom hooks per feature for business logic
- GraphQL queries/mutations organized by feature with barrel exports
- MUI-only UI components (no third-party UI libraries)
- CSS Modules for styling (no Tailwind)
- React Context + useReducer for notifications

---

## Performance at Scale

### In-Memory Cache (`MappingsCacheService`)

All alias mappings and customer masters are loaded into memory at startup as a singleton service:

| Operation | Mechanism | Performance |
|-----------|-----------|-------------|
| **Exact match** | `Dictionary<string, CachedMapping>` | O(1), ~microseconds |
| **Partial match** | In-memory linear scan on precomputed lowercase strings | <1ms for 50K records |
| **Master search** | Prefix-first ranking (starts-with before contains) | <1ms for 40K masters |
| **Master fallback** | In-memory scan of canonical names | <1ms |
| **Cache refresh** | Full reload from DB after any mutation | ~200ms for 50K records |

- **Resolve endpoints** are pure in-memory — zero DB hits
- **Cache auto-refreshes** after every create, update, delete, or push mutation
- **Thread-safe** via `ReaderWriterLockSlim` for concurrent reads
- **Memory usage**: ~25MB for 50K mappings

### Bulk Resolution (30K+ names)

| Feature | Implementation |
|---------|---------------|
| **Chunked processing** | 5,000 names per GraphQL request |
| **Progress feedback** | Real-time: phase, count, percentage, cancel button |
| **Streaming results** | UI updates after each chunk completes |
| **Resilience** | Failed chunks mark names as unresolved (no cascade) |
| **API limits** | 50MB request body, 5-minute execution timeout |

### Export (50K+ records)

| Feature | Implementation |
|---------|---------------|
| **Mappings export** | Server-side CSV streaming via `/api/v1/export-mappings` |
| **Resolve export** | Client-side CSV generation from in-memory results |
| **Streaming** | `AsAsyncEnumerable()` — constant memory regardless of dataset size |

### Autocomplete Search (40K+ masters)

| Feature | Implementation |
|---------|---------------|
| **Debounced input** | 300ms debounce, min 2 characters |
| **Cache-backed search** | `searchCustomerMasters` GraphQL query, zero DB hits |
| **Prefix ranking** | Starts-with matches shown before contains matches |
| **Limited results** | Top 20 matches returned |
| **Auto-updated** | New customers searchable immediately after mutation |

---

## Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | v18+ |
| **.NET SDK** | 10.0+ |
| **SQL Server** | Express 2019+ |
| **PostgreSQL** | 16+ |

---

## Project Structure

```
CustomerAliasService/
├── README.md
├── index.html                              # Vite entry HTML
├── package.json                            # Frontend dependencies
├── vite.config.ts                          # Vite config + path aliases + proxy
├── tsconfig.json                           # TypeScript config with path aliases
├── tsconfig.node.json
├── .env.example
│
├── src/
│   ├── main.tsx                            # Entry point + AG Grid module registration
│   ├── App.tsx                             # Router + ApolloProvider + NotificationProvider
│   ├── vite-env.d.ts                       # CSS module type declarations
│   │
│   ├── @core/                              # Core infrastructure
│   │   ├── config/
│   │   │   └── appConfig.ts                # App config (GraphQL URI, navigation)
│   │   ├── graphql/
│   │   │   ├── client.ts                   # Apollo Client (HttpLink, InMemoryCache)
│   │   │   └── fragments.ts                # Shared GQL operations (CREATE_CUSTOMER_ALIAS_MAPPING)
│   │   ├── theme/
│   │   │   └── muiTheme.ts                 # MUI dark purple theme
│   │   ├── styles/
│   │   │   ├── variables.css               # CSS custom properties (purple palette)
│   │   │   └── global.css                  # Global styles + AG Grid dark theme
│   │   ├── context/
│   │   │   └── NotificationContext.tsx      # MUI Snackbar notification provider
│   │   ├── components/
│   │   │   ├── Layout/                     # Page shell (Header + TabNav + content)
│   │   │   ├── Header/                     # Purple gradient header bar
│   │   │   └── TabNav/                     # Horizontal tab navigation
│   │   ├── types/
│   │   │   └── common.ts                   # Shared types (PagedResult, CustomerMaster, etc.)
│   │   └── index.ts                        # Barrel export
│   │
│   └── @features/                          # Feature modules
│       ├── resolve/
│       │   ├── graphql/
│       │   │   ├── queries.ts              # RESOLVE_ALIAS, RESOLVE_ALIASES_BULK, GET_INVESTORS, SEARCH_CUSTOMER_MASTERS
│       │   │   └── mutations.ts            # PUSH_TO_DB
│       │   ├── hooks/
│       │   │   ├── useResolveAlias.ts       # Single resolve logic
│       │   │   ├── useBulkResolve.ts        # Chunked bulk resolve with progress
│       │   │   └── useEditMapping.ts        # Edit dialog + debounced master search
│       │   ├── components/
│       │   │   └── ConfidenceBadge/         # MUI Chip-based status indicator
│       │   ├── types/
│       │   │   └── resolve.types.ts         # ResolveResponse, BulkResultRow, etc.
│       │   ├── ResolvePage.tsx              # Main resolve page (single + bulk)
│       │   └── ResolvePage.module.css
│       │
│       └── mappings/
│           ├── graphql/
│           │   ├── queries.ts              # GET_CUSTOMER_MASTERS_WITH_ALIASES
│           │   └── mutations.ts            # DELETE, UPDATE_CUSTOMER_MASTER, PUSH_TO_POSTGRES
│           ├── hooks/
│           │   ├── useMappings.ts           # Paginated query with search
│           │   └── useMappingMutations.ts   # All mutation logic with cache invalidation
│           ├── types/
│           │   └── mappings.types.ts        # CustomerMasterWithAliases, etc.
│           ├── MappingsPage.tsx             # Master-detail grid with CRUD
│           └── MappingsPage.module.css
│
├── InvestorDataApi/                        # C# .NET Web API
│   ├── Program.cs                          # GraphQL + REST endpoints + cache setup
│   ├── appsettings.json                    # Connection strings
│   ├── InvestorDataApi.csproj              # NuGet packages (HotChocolate, EF Core)
│   ├── GraphQL/
│   │   ├── Query.cs                        # Queries (cached resolve, cached master search, DB queries)
│   │   └── Mutation.cs                     # Mutations (CRUD + cache refresh after each write)
│   ├── Data/
│   │   ├── SqlServerDbContext.cs           # EF Core context (SQL Server)
│   │   ├── InvestorDbContext.cs            # EF Core context (PostgreSQL)
│   │   ├── DbSeeder.cs                    # Seed data (re-seeds on startup)
│   │   └── MappingsCacheService.cs        # Singleton in-memory cache
│   └── Models/                             # Entity and DTO classes
│
└── server/
    ├── setup-db.js                         # PostgreSQL bilateral_asset_level seed
    └── package.json
```

---

## Setup — Step by Step

### Prerequisites

Ensure the following are installed before starting:

```bash
# Verify installations
node --version          # v18.x or higher
npm --version           # v9.x or higher
dotnet --version        # 10.x or higher
sqlcmd -?               # SQL Server CLI (optional, for manual verification)
psql --version          # PostgreSQL CLI (optional, for manual verification)
```

### Step 1: Clone the Repository

```bash
git clone https://github.com/vipin-malik/CustomerAliasService.git
cd CustomerAliasService
```

### Step 2: Database Setup — SQL Server

The .NET API auto-creates the SQL Server database, schema, tables, and seed data on first startup. No manual setup required.

**Ensure SQL Server Express is running:**

```bash
# Windows — check service status
sc query MSSQL$SQLEXPRESS

# Start if not running
net start MSSQL$SQLEXPRESS
```

**Default connection string** (in `InvestorDataApi/appsettings.json`):
```
Server=localhost\SQLEXPRESS;Database=CustomerAliasDb;Trusted_Connection=True;TrustServerCertificate=True;
```

**What gets created automatically on API startup:**
- Database: `CustomerAliasDb`
- Schema: `InvestorAlias`
- Tables: `CustomerAliasMapping` (41 seed records), `CustomerMaster` (20 seed records)
- Indexes on `OriginalCustomerName`, `CleanedCustomerName`, `CanonicalCustomerId`

> **Note:** The seeder clears and re-inserts data on every startup to ensure consistent demo data. Remove the `ExecuteDeleteAsync()` calls in `DbSeeder.cs` for production use.

### Step 3: Database Setup — PostgreSQL

PostgreSQL serves as the source data store (`bilateral_asset_level` table) and push target.

**Ensure PostgreSQL is running:**

```bash
# Windows
net start postgresql-x64-16

# Verify connection
psql -U postgres -c "SELECT version();"
```

**Create the database and seed sample investor data:**

```bash
cd server
npm install
node setup-db.js
cd ..
```

This script will:
- Connect to PostgreSQL on `localhost:5432` with user `postgres` / password `postgres`
- Create the `investor_db` database if it doesn't exist
- Create the `bilateral_asset_level` table with 50 sample investor/obligor records
- On re-run, it truncates and re-seeds the table

**Default connection string** (in `InvestorDataApi/appsettings.json`):
```
Host=localhost;Port=5432;Database=investor_db;Username=postgres;Password=postgres
```

**Customize PostgreSQL credentials** (if different from defaults):

Edit `server/.env` or pass environment variables:
```bash
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=investor_db
```

The API will also auto-create the `InvestorAlias` schema and push target tables in PostgreSQL on startup:
- `InvestorAlias.CustomerMaster`
- `InvestorAlias.CustomerAliasMapping`

### Step 4: Configure Connection Strings

Edit `InvestorDataApi/appsettings.json` if your database credentials differ from the defaults:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "SqlServer": "Server=localhost\\SQLEXPRESS;Database=CustomerAliasDb;Trusted_Connection=True;TrustServerCertificate=True;",
    "Postgres": "Host=localhost;Port=5432;Database=investor_db;Username=postgres;Password=postgres"
  }
}
```

### Step 5: Build and Run the .NET API

```bash
cd InvestorDataApi

# Restore NuGet packages
dotnet restore

# Build
dotnet build

# Run (starts on http://localhost:5001)
dotnet run
```

**On startup, the API will:**
1. Create/verify SQL Server database and schema
2. Clear and re-seed `CustomerAliasMapping` (41 records) and `CustomerMaster` (20 records)
3. Create/verify PostgreSQL `InvestorAlias` push target schema
4. Load all mappings and masters into the **in-memory cache** (`MappingsCacheService`)
5. Start the GraphQL endpoint at `/graphql`
6. Start REST endpoints at `/api/v1/*`

**Verify the API is running:**

```bash
# Health check
curl http://localhost:5001/health
# Expected: {"status":"healthy","sqlServer":"connected","postgres":"connected"}

# Test GraphQL
curl -X POST http://localhost:5001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health { status sqlServer postgres } }"}'

# Test resolve (from cache)
curl -X POST http://localhost:5001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ resolveAlias(aliasName: \"Belron\") { customerName commonName isResolved confidenceScore } }"}'

# Test master search (from cache)
curl -X POST http://localhost:5001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ searchCustomerMasters(search: \"all\") { canonicalCustomerId canonicalCustomerName } }"}'
```

### Step 6: Build and Run the React UI

```bash
# From the project root (not InvestorDataApi/)
cd ..

# Install frontend dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev
```

The Vite dev server proxies these paths to the .NET API at `http://localhost:5001`:
- `/api/*` → REST endpoints
- `/graphql` → GraphQL endpoint
- `/health` → Health check

**Verify the UI is running:**

Open **http://localhost:3000** in your browser. You should see the Resolve page with Single Resolution and Bulk Resolution sections.

### Step 7: Verify End-to-End

1. **Single Resolve:** Type "Belron" in the Single Resolution box and press Enter. Should show "Resolved — High (100%)" with Belron SA details.

2. **Bulk Resolve:** Click "Load from Database" to load 50 investors from PostgreSQL. Click "Resolve 50 Selected" to see mixed green/amber/red results.

3. **Mappings:** Navigate to the Mappings tab. Should show 20 canonical customers with 41 total alias mappings. Click the expand arrow to see aliases.

4. **Export:** On the Mappings page, click "Export Excel" to download a denormalized CSV of all mappings.

---

## Build for Production

### Frontend

```bash
# From project root
npm run build
# Output: dist/
# Deploy the dist/ folder to any static file server or CDN
```

### Backend

```bash
cd InvestorDataApi

# Publish self-contained release
dotnet publish -c Release -o publish

# Output: InvestorDataApi/publish/
# Run with: ./publish/InvestorDataApi --urls "http://0.0.0.0:5001"
```

### Production Considerations

- **Remove re-seeding:** In `DbSeeder.cs`, remove the `ExecuteDeleteAsync()` calls so data persists across restarts
- **Connection strings:** Use environment variables or secrets manager instead of `appsettings.json`
- **CORS:** Update allowed origins in `Program.cs` for your production domain
- **HTTPS:** Configure Kestrel with TLS certificates or use a reverse proxy (nginx, IIS)
- **Cache:** The in-memory cache refreshes from DB on every mutation — no TTL expiry needed

---

## GraphQL API

### Queries

| Query | Source | Description |
|-------|--------|-------------|
| `health` | DB | Health check (SQL Server + Postgres status) |
| `investors(page, pageSize, search)` | DB | Paginated investors from Postgres |
| `customerAliasMappings(page, pageSize, search)` | DB | Paginated alias mappings with joined master |
| `customerMasters(page, pageSize, search)` | DB | Paginated canonical customer masters |
| `customerMastersWithAliases(page, pageSize, search)` | DB | Masters with nested alias mappings |
| `searchCustomerMasters(search, maxResults)` | **Cache** | Prefix-ranked master search (autocomplete) |
| `resolveAlias(aliasName, assetClass)` | **Cache** | Resolve single name (O(1) exact match) |
| `resolveAliasesBulk(aliases)` | **Cache** | Resolve multiple names in one call |

### Mutations

| Mutation | Description |
|----------|-------------|
| `createCustomerAliasMapping(input)` | Create alias mapping + refresh cache |
| `updateCustomerMaster(canonicalCustomerId, input)` | Update customer fields + refresh cache |
| `deleteCustomerAliasMapping(id)` | Delete alias + refresh cache |
| `pushToDb(records)` | Save resolved data to SQL Server + refresh cache |
| `pushToPostgres` | Sync all SQL Server data to PostgreSQL |

### REST Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/export-mappings` | Server-side streaming CSV export (denormalized join) |
| `POST /api/v1/investor/resolve` | Legacy single resolve |
| `POST /api/v1/investor/resolve-bulk` | Legacy bulk resolve |

---

## UI Pages

### Resolve (`/` — default page)

**Single Resolution:**
- Enter any customer name/alias and resolve instantly (from cache)
- Confidence badge: High (green, >90%), Medium (amber, 70-90%), Low (red, <70%), Unresolved (red)
- Edit Mapping dialog with debounced autocomplete (300ms, min 2 chars, prefix-ranked, top 20 results)
- Original/Cleaned customer name fields disabled in edit dialog
- Confirmation popup before saving

**Bulk Resolution (3-step workflow):**
1. **Load Customers** — Load from DB, upload CSV/TXT, or paste names (explicit "Load Names" button)
2. **Preview & Select** — AG Grid with checkbox selection, pagination, sorting
3. **Resolution Results** — AG Grid with status badges, chunked progress bar (5K/chunk), cancel button, export CSV, save to SQL Server

### Mappings (`/mappings`)
- Master-detail expandable table with nested alias mappings
- Edit customer popup dialog with save confirmation
- Delete alias with confirmation
- New Mapping creation
- Export Excel (server-side streaming CSV — handles 50K+ records)
- Push to Postgres
- Server-side pagination and search

---

## Data Flow

```
1. Load customer names from:
   ├── PostgreSQL bilateral_asset_level table
   ├── CSV / TXT file upload
   └── Manual paste (with "Load Names" button)

2. Resolve names via in-memory cache (zero DB hits):
   ├── O(1) exact match → 100% confidence (green)
   ├── In-memory partial match → calculated confidence (amber/red)
   ├── In-memory master fallback → 70% confidence (amber)
   └── No match → unresolved (red)

3. Edit unresolved / low-confidence mappings:
   ├── Debounced autocomplete search (cache-backed, prefix-ranked)
   └── Creates CustomerAliasMapping + CustomerMaster → cache refreshes

4. Save to SQL Server → cache refreshes automatically

5. Push to Postgres (on demand) → copies all data from SQL Server
```

---

## Design Theme

Dark purple theme across all layers:
- **Primary**: Purple `#a855f7`
- **Accent**: Fuchsia `#d946ef`
- **Surfaces**: Dark purple-tinted backgrounds (`#150f24` base)
- **AG Grid**: Custom dark theme via `themeQuartz.withParams()`
- **Styling**: CSS Modules + CSS custom properties (no Tailwind)

---

## Build for Production

```bash
# Frontend
npm run build          # Output: dist/

# Backend
cd InvestorDataApi
dotnet publish -c Release -o publish
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5001 in use | `netstat -ano \| findstr :5001` then `taskkill /F /PID <pid>` |
| Port 3000 in use | `netstat -ano \| findstr :3000` then `taskkill /F /PID <pid>` |
| SQL Server not running | `net start MSSQL$SQLEXPRESS` |
| Postgres not running | `net start postgresql-x64-16` |
| Health shows "degraded" | Check connection strings in `appsettings.json` |
| Frontend shows no data | Ensure .NET API is running on port 5001 |
| AG Grid shows no rows | Check `AllCommunityModule` is registered in `main.tsx` |
| GraphQL 400 errors | Check input type names match schema (use `/graphql` IDE) |
| Export fails | Ensure API is reachable at `/api/v1/export-mappings` |
