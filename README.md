# Customer Alias Manager

A full-stack application for managing customer alias mappings — resolving original customer names to their cleaned and canonical forms. Uses a **dual-database architecture** with SQL Server as the primary store and PostgreSQL as the external push target. The frontend communicates with the backend exclusively via **GraphQL** (Apollo Client + HotChocolate).

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  React UI        │────>│  .NET 10 API     │────>│  SQL Server         │
│  localhost:3000  │     │  localhost:5001   │     │  (PRIMARY)          │
│                  │     │                  │     │  CustomerAliasMapping│
│  Vite + MUI +    │     │  GraphQL         │     │  CustomerMaster     │
│  Apollo Client + │     │  (HotChocolate)  │     └─────────────────────┘
│  Tailwind CSS    │     │  + Minimal APIs  │              │
└──────────────────┘     │                  │     Push on demand (SQL → PG)
        │                │                  │              │
   Apollo Client         │                  │     ┌─────────────────────┐
   useQuery /            │                  │────>│  PostgreSQL         │
   useMutation           │                  │     │  (EXTERNAL)         │
        │                └──────────────────┘     │  bilateral_asset_   │
   /graphql endpoint                              │  level (source)     │
                                                  │  + push target      │
                                                  └─────────────────────┘
```

### Database Roles

| Database | Role | Tables |
|----------|------|--------|
| **SQL Server** (primary) | All CRUD, resolve, edit operations | `InvestorAlias.CustomerAliasMapping`, `InvestorAlias.CustomerMaster` |
| **PostgreSQL** (external) | Read-only source data + push target | `bilateral_asset_level` (source), `InvestorAlias.CustomerAliasMapping` + `InvestorAlias.CustomerMaster` (push target) |

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 7, Apollo Client 3, MUI v7, MUI X DataGrid v8, Tailwind CSS 4, Framer Motion |
| **Backend** | C# .NET 10, HotChocolate GraphQL 15, Minimal APIs (legacy), Entity Framework Core, Npgsql |
| **Databases** | SQL Server Express (primary), PostgreSQL 16 (external) |

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18+ | https://nodejs.org/ |
| **npm** | v9+ | Bundled with Node.js |
| **.NET SDK** | 10.0+ | https://dotnet.microsoft.com/download |
| **SQL Server** | Express 2019+ | https://www.microsoft.com/en-us/sql-server/sql-server-downloads |
| **PostgreSQL** | 16+ | https://www.postgresql.org/download/ |

Verify installations:

```bash
node --version        # v18.x or higher
npm --version         # v9.x or higher
dotnet --version      # 10.x or higher
```

---

## Project Structure

```
CustomerAliasService/
├── README.md
├── index.html                          # Vite entry HTML
├── package.json                        # Frontend dependencies
├── vite.config.js                      # Vite config + API/GraphQL proxy
├── tailwind.config.js                  # Tailwind purple theme
├── postcss.config.js
├── .env.example                        # Environment variable template
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Router + MUI ThemeProvider + ApolloProvider
│   ├── index.css                       # Global styles + Tailwind theme vars
│   ├── config/
│   │   └── appConfig.js                # App config (API URLs, navigation)
│   ├── theme/
│   │   └── muiTheme.js                 # MUI dark purple theme
│   ├── styles/
│   │   └── classes.js                  # Reusable Tailwind class strings
│   ├── services/
│   │   └── graphqlClient.js            # Apollo Client + all GQL queries/mutations
│   ├── components/
│   │   ├── Header.jsx                  # Top header bar
│   │   ├── TabNav.jsx                  # Horizontal tab navigation
│   │   ├── Layout.jsx                  # Page layout shell
│   │   ├── StatsCard.jsx               # Dashboard stat card
│   │   └── ConfidenceBadge.jsx         # Resolve confidence indicator
│   └── pages/
│       ├── Resolve.jsx                 # Single + bulk alias resolution (default page)
│       └── Mappings.jsx                # Master-detail grid with edit/delete
│
├── InvestorDataApi/                    # C# .NET Web API
│   ├── Program.cs                      # Minimal APIs + GraphQL registration
│   ├── appsettings.json                # SQL Server + Postgres connection strings
│   ├── InvestorDataApi.csproj          # .NET project file + NuGet packages
│   ├── GraphQL/
│   │   ├── Query.cs                    # All GraphQL queries (resolve, CRUD, investors)
│   │   └── Mutation.cs                 # All GraphQL mutations (create, update, delete, push)
│   ├── Data/
│   │   ├── SqlServerDbContext.cs       # EF Core context (SQL Server - primary)
│   │   ├── InvestorDbContext.cs         # EF Core context (PostgreSQL - source + push)
│   │   └── DbSeeder.cs                 # Schema creation + seed data (re-seeds on startup)
│   └── Models/
│       ├── BilateralAsset.cs           # Source data entity (Postgres)
│       ├── CustomerAliasMapping.cs     # Alias mapping entity
│       ├── CustomerMaster.cs           # Canonical master entity
│       ├── InvestorDto.cs              # Source data API response DTO
│       ├── PagedResult.cs              # Pagination wrapper
│       ├── ResolveModels.cs            # Resolve request/response DTOs
│       ├── PushModels.cs               # Push-to-DB request/response DTOs
│       └── CreateMappingRequest.cs     # Create mapping request DTO
│
└── server/                             # PostgreSQL seed script
    ├── setup-db.js                     # Creates bilateral_asset_level + inserts sample data
    └── package.json
```

---

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/vipin-malik/CustomerAliasService.git
cd CustomerAliasService
```

### 2. Set Up SQL Server

Ensure SQL Server Express is running.

```bash
# Check service status (Windows)
sc query MSSQL$SQLEXPRESS
```

The API will automatically create the `CustomerAliasDb` database, schema, tables, and seed data on first run.

### 3. Set Up PostgreSQL

Ensure PostgreSQL is running on `localhost:5432`.

```bash
# Create the investor_db database and seed sample data
cd server
npm install
node setup-db.js
cd ..
```

The API will automatically create the `InvestorAlias` schema and push target tables in Postgres.

### 4. Configure Connection Strings

Edit `InvestorDataApi/appsettings.json` if your credentials differ:

```json
{
  "ConnectionStrings": {
    "SqlServer": "Server=localhost\\SQLEXPRESS;Database=CustomerAliasDb;Trusted_Connection=True;TrustServerCertificate=True;",
    "Postgres": "Host=localhost;Port=5432;Database=investor_db;Username=postgres;Password=postgres"
  }
}
```

### 5. Build and Run the .NET API

```bash
cd InvestorDataApi
dotnet restore
dotnet build
dotnet run
# Starts on http://localhost:5001
```

On startup, the API will:
- Create `CustomerAliasDb` database in SQL Server
- Clear and re-seed `CustomerAliasMapping` (41 records) and `CustomerMaster` (20 records)
- Ensure PostgreSQL has the `InvestorAlias` schema ready for push
- Start the GraphQL endpoint at `/graphql`

**Verify the API:**
```bash
curl http://localhost:5001/health
# Expected: {"status":"healthy","sqlServer":"connected","postgres":"connected"}
```

**Test GraphQL:**
```bash
curl -X POST http://localhost:5001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health { status sqlServer postgres } }"}'
```

### 6. Install Frontend Dependencies

```bash
# From the project root
npm install
```

### 7. Run the Frontend

```bash
npm run dev
# Starts on http://localhost:3000
```

The Vite dev server proxies `/api/*` and `/graphql` requests to `http://localhost:5001`.

### 8. Open the Application

```
http://localhost:3000
```

---

## GraphQL API

The frontend communicates exclusively via GraphQL. The schema is served at `/graphql` by HotChocolate.

### Queries

| Query | Description |
|-------|-------------|
| `health` | Health check (SQL Server + Postgres status) |
| `investors(page, pageSize, search)` | Paginated investors from Postgres `bilateral_asset_level` |
| `customerAliasMappings(page, pageSize, search)` | Paginated alias mappings with joined CustomerMaster |
| `customerMasters(page, pageSize, search)` | Paginated canonical customer masters |
| `customerMastersWithAliases(page, pageSize, search)` | Masters with nested alias mappings (master-detail) |
| `resolveAlias(aliasName, assetClass)` | Resolve a single customer name |
| `resolveAliasesBulk(aliases)` | Resolve multiple customer names in one call |

### Mutations

| Mutation | Description |
|----------|-------------|
| `createCustomerAliasMapping(input)` | Create alias mapping (auto-creates CustomerMaster if needed) |
| `updateCustomerMaster(canonicalCustomerId, input)` | Update canonical customer fields |
| `deleteCustomerAliasMapping(id)` | Delete an alias mapping |
| `pushToDb(records)` | Save resolved data to SQL Server |
| `pushToPostgres` | Sync all SQL Server data to PostgreSQL |

### Resolve Algorithm

The resolve endpoint uses a three-tier matching strategy:

1. **Exact match** (100% confidence) — Input matches `OriginalCustomerName` exactly
2. **Partial match** (calculated confidence) — Input is a substring of an alias or cleaned name; score = `shorter/longer * 100`
3. **Master fallback** (70% confidence) — Input is a substring of a `CanonicalCustomerName`
4. **No match** (0%) — Unresolved

### REST Endpoints (Legacy)

The original REST endpoints remain available alongside GraphQL but are no longer used by the frontend.

---

## Database Schema

### Schema: `InvestorAlias` (SQL Server - primary, PostgreSQL - push target)

**`CustomerAliasMapping`** — Maps original customer names to cleaned names

| Column | Type | Description |
|--------|------|-------------|
| `ID` | INT PK (identity) | Auto-increment |
| `OriginalCustomerName` | NVARCHAR(1000) | Raw name (with tranches, suffixes, etc.) |
| `CleanedCustomerName` | NVARCHAR(500) | Normalized/cleaned name |
| `CanonicalCustomerId` | INT FK | Links to CustomerMaster |

**`CustomerMaster`** — Canonical customer reference data

| Column | Type | Description |
|--------|------|-------------|
| `CanonicalCustomerId` | INT PK | Canonical ID (manually assigned) |
| `CanonicalCustomerName` | NVARCHAR(500) | Canonical name |
| `CIS CODE` | NVARCHAR(50) | CIS identifier |
| `Ctry Of Op` | NVARCHAR(200) | Country of operation |
| `MGS` | NVARCHAR(100) | Market group/sector |
| `Ctry of Inc` | NVARCHAR(200) | Country of incorporation |
| `Region` | NVARCHAR(200) | Geographic region |

### PostgreSQL Source Table

**`bilateral_asset_level`** — Source customer/obligor data (read-only, seeded by `server/setup-db.js`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `Obligor Name` | TEXT | Customer name |
| `CIS Code` | TEXT | CIS identifier |
| `Tranche` | TEXT | Loan tranche |
| `Loan Type` | TEXT | BSL/MML |
| `Seniority` | TEXT | First Lien/Second Lien |
| `Native Currency` | TEXT | USD/EUR/GBP |
| `Country Reported` | TEXT | Country |
| ... | | (+ many more financial columns) |

---

## UI Pages

### Resolve (`/` — default page)

**Single Resolution:**
- Enter any customer name/alias and resolve instantly
- Shows: Cleaned Name, Canonical Customer ID, Canonical Name, CIS Code, MGS, Ctry Of Op, Region
- Confidence badge: High (green, >90%), Medium (amber, 70-90%), Low (red, <70%), Unresolved (red)
- "Edit Mapping" button appears for unresolved or low-confidence results
- Edit dialog with freeSolo autocomplete to link to existing or create new canonical customer
- Confirmation popup before saving

**Bulk Resolution (3-step workflow):**
1. **Load Customers** — Load from PostgreSQL database, upload CSV/TXT file, or paste names
2. **Preview & Select** — DataGrid with checkboxes to select which names to resolve
3. **Resolution Results** — DataGrid showing all results with status badges:
   - Edit button on rows needing attention
   - **Export CSV** — download results
   - **Save to SQL Server** — upsert into primary tables

### Mappings (`/mappings`)
- Master-detail expandable table: CustomerMaster rows with nested alias mappings
- **Edit customer** — pencil icon opens popup dialog to edit canonical name, CIS code, MGS, country, region (with save confirmation)
- **Delete alias** — trash icon on alias rows with confirmation dialog
- **New Mapping** — create alias with auto-assign to canonical customer
- **Push to Postgres** — sync all data to PostgreSQL
- Server-side pagination and search across masters and aliases

---

## Data Flow

```
1. Load customer names from:
   ├── PostgreSQL bilateral_asset_level table
   ├── CSV / TXT file upload
   └── Manual paste

2. Resolve names against SQL Server (via GraphQL):
   ├── Exact match → 100% confidence (green)
   ├── Partial match → calculated confidence (amber/red)
   ├── Master fallback → 70% confidence (amber)
   └── No match → unresolved (red)

3. Edit unresolved / low-confidence mappings:
   └── Creates CustomerAliasMapping + CustomerMaster in SQL Server

4. Save to SQL Server (primary):
   └── Upserts all resolved data into SQL Server tables

5. Push to Postgres (on demand):
   └── Copies ALL CustomerAliasMapping + CustomerMaster from SQL Server → PostgreSQL
```

---

## Design Theme

The application uses a **dark purple theme** across all layers:

- **Primary**: Purple `#a855f7` with full 50-900 palette
- **Accent**: Fuchsia `#d946ef`
- **Surfaces**: Dark purple-tinted backgrounds (`#150f24` base)
- **MUI components**: Custom-themed DataGrid, buttons, text fields, chips, dialogs
- **Tailwind CSS**: Matching purple primary/accent/surface variables

---

## Environment Variables (Optional)

Create a `.env` file in the project root to override defaults:

```env
VITE_API_BASE_URL=/api/v1/investor
VITE_CUSTOMER_API_BASE_URL=/api/v1/investors
VITE_GRAPHQL_URI=/graphql
```

---

## Build for Production

### Frontend
```bash
npm run build
# Output: dist/
```

### Backend
```bash
cd InvestorDataApi
dotnet publish -c Release -o publish
# Output: InvestorDataApi/publish/
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
| GraphQL 400 errors | Check input type names match schema (use `/graphql` IDE to explore) |
| Push to Postgres fails | Ensure PostgreSQL is running and `InvestorAlias` schema exists |

---

## Quick Start

Open three terminals:

**Terminal 1 — Ensure databases are running:**
```bash
net start MSSQL$SQLEXPRESS
net start postgresql-x64-16
```

**Terminal 2 — .NET API:**
```bash
cd InvestorDataApi
dotnet run
```

**Terminal 3 — React UI:**
```bash
npm run dev
```

Open: **http://localhost:3000**
