# Customer Alias Manager

A full-stack application for managing customer alias mappings — resolving original customer names to their cleaned and canonical forms. Uses a **dual-database architecture** with SQL Server as the primary store and PostgreSQL as the external push target.

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  React UI        │────>│  .NET 10 API     │────>│  SQL Server         │
│  localhost:3000  │     │  localhost:5001   │     │  (PRIMARY)          │
│                  │     │                  │     │  CustomerAliasMapping│
│  Vite + MUI +    │     │  Minimal APIs +  │     │  CustomerMaster     │
│  Tailwind CSS    │     │  EF Core         │     └─────────────────────┘
└──────────────────┘     │                  │              │
                         │                  │     Push on demand (SQL → PG)
                         │                  │              │
                         │                  │     ┌─────────────────────┐
                         │                  │────>│  PostgreSQL         │
                         │                  │     │  (EXTERNAL)         │
                         └──────────────────┘     │  bilateral_asset_   │
                                                  │  level (source)     │
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
| **Frontend** | React 19, Vite 7, MUI v7, MUI X DataGrid v8, Tailwind CSS 4, Framer Motion |
| **Backend** | C# .NET 10, Minimal APIs, Entity Framework Core, Npgsql, SQL Server |
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
sqlcmd -?             # SQL Server CLI (optional)
psql --version        # PostgreSQL CLI (optional)
```

---

## Project Structure

```
CustomerAliasService/
├── README.md
├── index.html                          # Vite entry HTML
├── package.json                        # Frontend dependencies
├── vite.config.js                      # Vite config + API proxy
├── tailwind.config.js                  # Tailwind dark theme
├── postcss.config.js
├── .env.example                        # Environment variable template
├── public/
│   └── vite.svg
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Router + MUI ThemeProvider + Apollo
│   ├── index.css                       # Global styles + Tailwind theme vars
│   ├── config/
│   │   └── appConfig.js                # App config (API URLs, navigation)
│   ├── theme/
│   │   └── muiTheme.js                 # MUI dark purple theme
│   ├── styles/
│   │   └── classes.js                  # Reusable Tailwind class strings
│   ├── services/
│   │   ├── apiClient.js                # REST client (resolve, mappings, push)
│   │   ├── customerApiClient.js        # Customer source data API client
│   │   └── graphqlClient.js            # Apollo GraphQL client (optional)
│   ├── components/
│   │   ├── Header.jsx                  # Top header bar
│   │   ├── TabNav.jsx                  # Horizontal tab navigation
│   │   ├── Layout.jsx                  # Page layout shell
│   │   ├── StatsCard.jsx               # Dashboard stat card
│   │   ├── ConfidenceBadge.jsx         # Resolve confidence indicator
│   │   ├── DataTable.jsx               # Generic paginated table
│   │   ├── Modal.jsx                   # Animated modal dialog
│   │   └── SearchInput.jsx             # Debounced search input
│   └── pages/
│       ├── Dashboard.jsx               # Stats + charts from CustomerMaster
│       ├── Customers.jsx               # Browse source customers (Postgres)
│       ├── Resolve.jsx                 # Single + bulk alias resolution
│       └── Mappings.jsx                # CRUD for both mapping tables
│
├── InvestorDataApi/                    # C# .NET Web API
│   ├── Program.cs                      # All endpoints (Minimal API)
│   ├── appsettings.json                # SQL Server + Postgres connection strings
│   ├── InvestorDataApi.csproj          # .NET project file + NuGet packages
│   ├── Properties/
│   │   └── launchSettings.json         # Dev server config (port 5001)
│   ├── Data/
│   │   ├── SqlServerDbContext.cs       # EF Core context (SQL Server - primary)
│   │   ├── InvestorDbContext.cs         # EF Core context (PostgreSQL - source + push)
│   │   └── DbSeeder.cs                 # Schema creation + seed data
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
└── server/                             # (Legacy) Node.js server - not required
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
# Check it's running
psql -U postgres -c "SELECT version();"
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

# Restore NuGet packages
dotnet restore

# Build
dotnet build

# Run (starts on http://localhost:5001)
dotnet run
```

On first run, the API will:
- Create `CustomerAliasDb` database in SQL Server
- Create `InvestorAlias` schema with `CustomerAliasMapping` and `CustomerMaster` tables
- Seed 41 alias mappings and 20 canonical master records
- Ensure PostgreSQL has the `InvestorAlias` schema ready for push

**Verify the API:**
```bash
curl http://localhost:5001/health
# Expected: {"status":"healthy","sqlServer":"connected","postgres":"connected"}
```

### 6. Install Frontend Dependencies

```bash
# From the project root
cd ..
npm install
```

### 7. Run the Frontend

```bash
npm run dev
# Starts on http://localhost:3000
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5001`.

### 8. Open the Application

```
http://localhost:3000
```

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

**`bilateral_asset_level`** — Source customer/obligor data (read-only, maintained by external team)

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `Obligor Name` | TEXT | Customer name |
| `CIS Code` | TEXT | CIS identifier |
| `Data Context` | TEXT | Asset class |
| `Tranche` | TEXT | Loan tranche |
| `Loan Type` | TEXT | BSL/MML |
| `Seniority` | TEXT | First Lien/Second Lien |
| `Native Currency` | TEXT | USD/EUR/GBP |
| `Country Reported` | TEXT | Country |
| ... | | (+ many more financial columns) |

---

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (reports both SQL Server and Postgres status) |

### Customers — Source Data (PostgreSQL, read-only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/investors?page=&pageSize=&search=` | Paginated customer list |
| GET | `/api/v1/investors/{id}` | Single customer by ID |

### CustomerAliasMapping — CRUD (SQL Server)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customer-alias-mappings?page=&pageSize=&search=` | List mappings |
| GET | `/api/v1/customer-alias-mappings/{id}` | Get mapping by ID |
| POST | `/api/v1/customer-alias-mappings` | Create mapping (auto-assigns CanonicalCustomerId if empty, also accepts CustomerMaster fields) |
| PUT | `/api/v1/customer-alias-mappings/{id}` | Update mapping |
| DELETE | `/api/v1/customer-alias-mappings/{id}` | Delete mapping |

### CustomerMaster — Read (SQL Server)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customer-masters?page=&pageSize=&search=` | List canonical masters |
| GET | `/api/v1/customer-masters/{id}` | Get master by ID |

### Resolve (SQL Server)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/investor/resolve` | Resolve single customer name |
| POST | `/api/v1/investor/resolve-bulk` | Resolve multiple names in one call |

### Data Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/push-to-db` | Save resolved data to SQL Server (primary) |
| POST | `/api/v1/push-to-postgres` | Push ALL data from SQL Server to PostgreSQL |

---

## UI Pages

### Dashboard (`/`)
- Stats from `CustomerMaster`: Alias Mappings, Canonical Masters, Countries, Regions, MGS sectors
- Bar charts: Ctry Of Op, MGS, Region distribution
- Recent customer alias mappings table (MUI DataGrid)

### Customers (`/customers`)
- Source data from PostgreSQL `bilateral_asset_level` table
- MUI DataGrid with server-side pagination
- Search by customer name
- Export to CSV

### Resolve (`/resolve`)

**Single Resolution:**
- Enter any customer name/alias and resolve instantly
- Shows: Cleaned Name, Canonical Customer ID, Canonical Name, CIS Code, MGS, Ctry Of Op, Region
- "Edit Mapping" button appears for unresolved or low-confidence (<=90%) results
- Edit dialog allows setting all CustomerMaster fields (name, CIS Code, MGS, Ctry Of Op, Region)

**Bulk Resolution (3-step workflow):**
1. **Load Customers** — Load from PostgreSQL database, upload CSV/TXT file, or paste names
2. **Preview & Select** — MUI DataGrid with checkboxes to select which names to resolve
3. **Resolution Results** — DataGrid with all results:
   - Edit button (pencil icon) on rows needing attention (unresolved or <=90% confidence)
   - **Export CSV** — download results
   - **Save to SQL Server** — upsert resolved data into SQL Server primary tables
   - **Push to Postgres** — sync ALL SQL Server data to PostgreSQL (on demand)

### Mappings (`/mappings`)
- Two tabs: **CustomerAliasMapping** (41 records) and **CustomerMaster** (20 records)
- Full CRUD for alias mappings (create, edit, delete)
- Server-side pagination and search
- Data sourced from SQL Server

---

## Data Flow

```
1. Load customer names from:
   ├── PostgreSQL bilateral_asset_level table
   ├── CSV / TXT file upload
   └── Manual paste

2. Resolve names against SQL Server:
   ├── Exact match → 100% confidence
   ├── Partial match → calculated confidence
   └── No match → unresolved (user can edit)

3. Edit unresolved / low-confidence mappings:
   └── Creates CustomerAliasMapping + CustomerMaster in SQL Server

4. Save to SQL Server (primary):
   └── Upserts all resolved data into SQL Server tables

5. Push to Postgres (on demand):
   └── Copies ALL CustomerAliasMapping + CustomerMaster from SQL Server → PostgreSQL
```

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
| File upload not working | Hard refresh browser (`Ctrl+Shift+R`) |
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
