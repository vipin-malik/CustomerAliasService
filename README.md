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

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/vipin-malik/CustomerAliasService.git
cd CustomerAliasService
npm install
```

### 2. Set Up Databases

```bash
# SQL Server (auto-creates DB on API startup)
sc query MSSQL$SQLEXPRESS

# PostgreSQL — seed source data
cd server && npm install && node setup-db.js && cd ..
```

### 3. Configure Connection Strings

Edit `InvestorDataApi/appsettings.json` if your credentials differ:

```json
{
  "ConnectionStrings": {
    "SqlServer": "Server=localhost\\SQLEXPRESS;Database=CustomerAliasDb;Trusted_Connection=True;TrustServerCertificate=True;",
    "Postgres": "Host=localhost;Port=5432;Database=investor_db;Username=postgres;Password=postgres"
  }
}
```

### 4. Start

```bash
# Terminal 1 — .NET API
cd InvestorDataApi && dotnet run

# Terminal 2 — React UI
npm run dev
```

Open: **http://localhost:3000**

On startup, the API will seed databases, warm the in-memory cache, and start the GraphQL endpoint at `/graphql`.

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
