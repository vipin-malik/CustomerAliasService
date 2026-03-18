# Customer Alias Manager

A full-stack application for managing customer alias mappings — resolving original customer names to their cleaned and canonical forms using `CustomerAliasMapping` and `CustomerMaster` tables in PostgreSQL.

---

## Architecture

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌──────────────┐
│   React UI (Vite)       │────>│  .NET Web API           │────>│  PostgreSQL   │
│   http://localhost:3000  │     │  http://localhost:5001   │     │  port 5432    │
└─────────────────────────┘     └─────────────────────────┘     └──────────────┘
```

| Layer | Tech Stack |
|-------|-----------|
| **Frontend** | React 19, Vite 7, MUI v7, MUI X DataGrid v8, Tailwind CSS 4, Framer Motion |
| **Backend** | C# .NET 10, Minimal APIs, Entity Framework Core, Npgsql, Serilog |
| **Database** | PostgreSQL 16 |

---

## Prerequisites

Install the following before getting started:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18+ | https://nodejs.org/ |
| **npm** | v9+ | Bundled with Node.js |
| **.NET SDK** | 10.0+ | https://dotnet.microsoft.com/download |
| **PostgreSQL** | 16+ | https://www.postgresql.org/download/ |

Verify installations:

```bash
node --version        # v18.x or higher
npm --version         # v9.x or higher
dotnet --version      # 10.x or higher
psql --version        # 16.x or higher (optional, for CLI access)
```

---

## Project Structure

```
InvestorAliasUi/
├── README.md
├── index.html                          # Vite entry HTML
├── package.json                        # Frontend dependencies
├── vite.config.js                      # Vite config + API proxy
├── tailwind.config.js                  # Tailwind theme
├── postcss.config.js
├── public/
│   └── vite.svg
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Router + MUI theme + Apollo
│   ├── index.css                       # Global styles + Tailwind theme
│   ├── config/
│   │   └── appConfig.js                # App config (API URLs, navigation)
│   ├── theme/
│   │   └── muiTheme.js                 # MUI dark theme
│   ├── styles/
│   │   └── classes.js                  # Reusable Tailwind class strings
│   ├── services/
│   │   ├── apiClient.js                # REST client (resolve, mappings)
│   │   ├── customerApiClient.js        # Customer data API client
│   │   └── graphqlClient.js            # Apollo GraphQL client
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
│       ├── Customers.jsx               # Browse customers from source DB
│       ├── Resolve.jsx                 # Single + bulk alias resolution
│       └── Mappings.jsx                # CRUD for both mapping tables
│
├── InvestorDataApi/                    # .NET Web API
│   ├── Program.cs                      # All endpoints (Minimal API)
│   ├── appsettings.json                # Postgres connection string
│   ├── InvestorDataApi.csproj          # .NET project file
│   ├── Properties/
│   │   └── launchSettings.json         # Dev server config (port 5001)
│   ├── Data/
│   │   ├── InvestorDbContext.cs         # EF Core DbContext
│   │   └── DbSeeder.cs                 # Schema creation + seed data
│   └── Models/
│       ├── BilateralAsset.cs           # Source data entity
│       ├── CustomerAliasMapping.cs     # Alias mapping entity
│       ├── CustomerMaster.cs           # Canonical master entity
│       ├── InvestorDto.cs              # API response DTO
│       ├── PagedResult.cs              # Pagination wrapper
│       ├── ResolveModels.cs            # Resolve request/response DTOs
│       ├── PushModels.cs               # Push-to-DB request/response
│       └── CreateMappingRequest.cs     # Create mapping DTO
│
└── server/                             # (Legacy) Node.js server - optional
    ├── setup-db.js                     # DB setup script (seed data)
    └── ...
```

---

## Step-by-Step Setup

### 1. Clone / Copy the Project

```bash
cd "D:\Vipin Work\Source\InvestorAliasUi"
```

### 2. Set Up PostgreSQL

Ensure PostgreSQL is running on `localhost:5432`.

**Option A — Already installed:**
```bash
# Verify it's running
psql -U postgres -c "SELECT version();"
```

**Option B — Install via EDB installer (Windows):**
```bash
# Download and run silent install
# Default password: postgres
```

The application will automatically create the required database, schema, and tables on first run (via `DbSeeder.cs`).

### 3. Configure the Backend

Edit the connection string if your Postgres credentials differ:

**File:** `InvestorDataApi/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=investor_db;Username=postgres;Password=postgres"
  }
}
```

### 4. Build and Run the .NET API

```bash
cd InvestorDataApi

# Restore packages
dotnet restore

# Build
dotnet build

# Run (starts on http://localhost:5001)
dotnet run
```

On first run, the API will:
- Create the `investor_db` database (if it doesn't exist)
- Create the `InvestorAlias` schema
- Create `CustomerAliasMapping` and `CustomerMaster` tables
- Seed sample data (41 alias mappings, 20 canonical masters)
- Create the `bilateral_asset_level` table with 50 sample customers

**Verify the API is running:**
```bash
curl http://localhost:5001/health
# Expected: {"status":"healthy","database":"connected"}
```

### 5. Install Frontend Dependencies

```bash
# From the project root
cd "D:\Vipin Work\Source\InvestorAliasUi"
npm install
```

### 6. Run the Frontend

```bash
npm run dev
# Starts on http://localhost:3000
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5001` (the .NET API).

### 7. Open the Application

Open your browser and navigate to:

```
http://localhost:3000
```

---

## Database Schema

### Schema: `InvestorAlias`

**`CustomerAliasMapping`** — Maps original customer names to cleaned names

| Column | Type | Description |
|--------|------|-------------|
| `ID` | SERIAL PK | Auto-increment |
| `OriginalCustomerName` | VARCHAR(1000) | Raw name (with tranches, suffixes, etc.) |
| `CleanedCustomerName` | VARCHAR(500) | Normalized/cleaned name |
| `CanonicalCustomerId` | INT FK | Links to CustomerMaster |

**`CustomerMaster`** — Canonical customer reference data

| Column | Type | Description |
|--------|------|-------------|
| `CanonicalCustomerId` | INT PK | Canonical ID |
| `CanonicalCustomerName` | VARCHAR(500) | Canonical name |
| `CIS CODE` | VARCHAR(50) | CIS identifier |
| `Ctry Of Op` | VARCHAR(200) | Country of operation |
| `MGS` | VARCHAR(100) | Market group/sector |
| `Ctry of Inc` | VARCHAR(200) | Country of incorporation |
| `Region` | VARCHAR(200) | Geographic region |

**`bilateral_asset_level`** — Source customer/obligor data (from Postgres)

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
| GET | `/health` | Database health check |

### Customers (Source Data)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/investors?page=&pageSize=&search=` | Paginated customer list |
| GET | `/api/v1/investors/{id}` | Single customer by ID |

### CustomerAliasMapping (CRUD)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customer-alias-mappings?page=&pageSize=&search=` | List mappings |
| GET | `/api/v1/customer-alias-mappings/{id}` | Get mapping by ID |
| POST | `/api/v1/customer-alias-mappings` | Create mapping (auto-assigns CanonicalCustomerId if empty) |
| PUT | `/api/v1/customer-alias-mappings/{id}` | Update mapping |
| DELETE | `/api/v1/customer-alias-mappings/{id}` | Delete mapping |

### CustomerMaster (Read)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customer-masters?page=&pageSize=&search=` | List canonical masters |
| GET | `/api/v1/customer-masters/{id}` | Get master by ID |

### Resolve
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/investor/resolve` | Resolve single customer name |
| POST | `/api/v1/investor/resolve-bulk` | Resolve multiple names in one call |

### Push to Database
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/push-to-db` | Upsert resolved data into both tables |

---

## UI Pages

### Dashboard (`/`)
- Stats: Alias Mappings count, Canonical Masters count, Countries, Regions, MGS sectors
- Bar charts: Top countries, MGS distribution, Region distribution
- Recent customer alias mappings table

### Customers (`/customers`)
- MUI DataGrid with server-side pagination
- Search by customer name
- Export to CSV

### Resolve (`/resolve`)
**Single Resolution:**
- Enter a customer name and resolve instantly
- Shows: Cleaned Name, Canonical ID, Canonical Name, CIS Code, MGS, Ctry Of Op, Region
- Edit button for unresolved or low-confidence (<=90%) results

**Bulk Resolution (3-step workflow):**
1. **Load Customers** — from database, upload CSV/TXT file, or paste names
2. **Preview & Select** — MUI DataGrid with checkboxes to select which names to resolve
3. **Resolution Results** — DataGrid showing all results with edit buttons for items needing attention
   - Export CSV
   - Push to Database (upserts into CustomerAliasMapping + CustomerMaster)

### Mappings (`/mappings`)
- Two tabs: **CustomerAliasMapping** and **CustomerMaster**
- Full CRUD for alias mappings (create, edit, delete)
- Server-side pagination and search

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
| Port 5001 in use | Kill the process: `netstat -ano \| findstr :5001` then `taskkill /F /PID <pid>` |
| Port 3000 in use | Kill Vite: `netstat -ano \| findstr :3000` then `taskkill /F /PID <pid>` |
| Postgres not running | Start the service: `net start postgresql-x64-16` |
| API returns 500 | Check Postgres connection string in `appsettings.json` |
| Frontend shows no data | Ensure the .NET API is running on port 5001 |
| File upload not working | Hard refresh the browser (`Ctrl+Shift+R`) |

---

## Quick Start (All-in-One)

Open three terminals:

**Terminal 1 — PostgreSQL** (if not running as service):
```bash
pg_ctl start -D "C:\Program Files\PostgreSQL\16\data"
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

Then open: **http://localhost:3000**
