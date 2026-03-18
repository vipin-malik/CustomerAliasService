import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

// Connect to default 'postgres' database first to create our database
const adminClient = new Client({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  database: 'postgres',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

const DB_NAME = process.env.PG_DATABASE || 'investor_db';

async function run() {
  // ─── Step 1: Create the database if it doesn't exist ─────────
  console.log('Connecting to Postgres...');
  await adminClient.connect();
  console.log('Connected.');

  const dbCheck = await adminClient.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]
  );

  if (dbCheck.rows.length === 0) {
    console.log(`Creating database "${DB_NAME}"...`);
    await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log('Database created.');
  } else {
    console.log(`Database "${DB_NAME}" already exists.`);
  }

  await adminClient.end();

  // ─── Step 2: Connect to the new database and create table ────
  const client = new Client({
    host:     process.env.PG_HOST     || 'localhost',
    port:     parseInt(process.env.PG_PORT || '5432', 10),
    database: DB_NAME,
    user:     process.env.PG_USER     || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
  });

  await client.connect();
  console.log(`Connected to "${DB_NAME}".`);

  // Create table matching the schema from PgDbTableSchemaSample
  console.log('Creating table "bilateral_asset_level" ...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS bilateral_asset_level (
      id                              SERIAL PRIMARY KEY,
      "As of Date"                    DATE,
      "CIS Code"                      TEXT,
      "Data Context"                  TEXT,
      "Included in Pool"              BOOLEAN,
      "NatWest Unique Id"             TEXT,
      "Obligor Name"                  TEXT,
      "Tranche"                       TEXT,
      "Loan Type"                     TEXT,
      "Seniority"                     TEXT,
      "Native Currency"               TEXT,
      "FX"                            NUMERIC(18,4),
      "Notional Funded (Native Currency)"       NUMERIC(18,4),
      "Notional Funded (Deal Base Currency)"     NUMERIC(18,4),
      "Post haircut (Deal Base Currency)"        NUMERIC(18,4),
      "ACB Multiplier (%)"            NUMERIC(18,4),
      "Non-Performance Haircuts (%)"  NUMERIC(18,4),
      "Concentrations Haircuts (%)"   NUMERIC(18,4),
      "Final Multiplier (%)"          NUMERIC(18,4),
      "Country Reported"              TEXT,
      "NWM Standard Country Name"     TEXT,
      "NWM Standard Industry Group"   TEXT,
      "Cyclicality Profile"           TEXT,
      "Industry Sectors Reported"     TEXT,
      "NWM Industry Sub Sectors"      TEXT,
      "Curr Issuer Rating -Moodys"    TEXT,
      "Curr Issuer Rating -S&P"       TEXT,
      "Curr Issuer Rating -Fitch"     TEXT,
      "Curr Issuer Rating -KBRA"      TEXT,
      "Curr Issuer Rating -DBRS"      TEXT,
      "NWM Watchlist Status"          TEXT,
      "Reason For Watchlist"          TEXT,
      "Date Watchlist Status Assigned" DATE,
      "Maturity Date"                 DATE,
      "Confirm Date of Financials"    DATE,
      "Leverage Ratio"                NUMERIC(18,4),
      "Leverage Ratio-at Inclusion"   NUMERIC(18,4),
      "EBITDA (Deal Base Currency)"   NUMERIC(18,4),
      "EBITDA (Deal Base Currency)-at Inclusion" NUMERIC(18,4),
      "EV/EBITDA"                     NUMERIC(18,4),
      "EV/EBITDA-at Inclusion"        NUMERIC(18,4),
      "LTV (%)"                       NUMERIC(18,4),
      "LTV (%)-at Inclusion"          NUMERIC(18,4),
      "Recurring Revenue (Deal Base Currency)"   NUMERIC(18,4),
      "Recurring Revenue Retention rate (%)"     NUMERIC(18,4),
      "Debt-to-Recurring Revenue Ratio"          NUMERIC(18,4),
      "Reporting Frequency"           TEXT,
      "Cov-Lite"                      TEXT,
      "Defaulted Collateral Obligation" TEXT,
      "Defaulted Date"                DATE,
      "Total Margin"                  NUMERIC(18,4),
      "Cash Margin"                   NUMERIC(18,4),
      "PIK Margin"                    NUMERIC(18,4),
      "PIK Status"                    TEXT,
      "Asset Level Advance Rate"      NUMERIC(18,4),
      "Market Value (%)"              NUMERIC(18,4),
      "Assigned Value"                NUMERIC(18,4),
      "Assigned Value Date"           DATE,
      "Asset Quarterly Review"        TEXT,
      "Last Updated at"               TIMESTAMP,
      "Last Updated by"               TEXT
    )
  `);
  console.log('Table created.');

  // ─── Step 3: Insert sample data ──────────────────────────────
  const existingCount = await client.query('SELECT COUNT(*) FROM bilateral_asset_level');
  if (parseInt(existingCount.rows[0].count, 10) > 0) {
    console.log(`Table already has ${existingCount.rows[0].count} rows. Skipping seed.`);
    await client.end();
    return;
  }

  console.log('Inserting sample investor data...');

  const sampleData = [
    { name: 'Alliance Animal Health',       cis: 'X32EOUS', ctx: 'IPD', tranche: 'DDTL',       loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare' },
    { name: 'Apex Group Ltd',               cis: 'A45BKLS', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'EUR', country: 'Luxembourg',    industry: 'Financial Services' },
    { name: 'Ardonagh Group Ltd',           cis: 'B78CKJD', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'First Lien',  currency: 'GBP', country: 'United Kingdom', industry: 'Insurance' },
    { name: 'Asplundh Tree Expert LLC',     cis: 'C12DLQP', ctx: 'IPD', tranche: 'Revolver',    loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Utilities' },
    { name: 'Athenahealth Group Inc',       cis: 'D34EMRT', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare IT' },
    { name: 'Belron SA',                    cis: 'E56FNUV', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'First Lien',  currency: 'EUR', country: 'Belgium',        industry: 'Automotive Services' },
    { name: 'Blackhawk Network Holdings',   cis: 'F78GPWX', ctx: 'IPD', tranche: 'DDTL',       loanType: 'BSL', seniority: 'Second Lien', currency: 'USD', country: 'United States', industry: 'Financial Technology' },
    { name: 'Blue Ribbon LLC',              cis: 'G90HQYZ', ctx: 'IPD', tranche: 'Term Loan A', loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Food & Beverage' },
    { name: 'Broadstreet Partners Inc',     cis: 'H12IRAB', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Insurance' },
    { name: 'Cablevision Lightpath Inc',    cis: 'I34JSCD', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Telecommunications' },
    { name: 'Camelot UK Bidco Ltd',         cis: 'J56KTEF', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'MML', seniority: 'First Lien',  currency: 'GBP', country: 'United Kingdom', industry: 'Software' },
    { name: 'Cano Health LLC',              cis: 'K78LUGH', ctx: 'IPD', tranche: 'Revolver',    loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare' },
    { name: 'Carnival Corporation',         cis: 'L90MVIJ', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Leisure & Travel' },
    { name: 'Citrix Systems Inc',           cis: 'M12NWKL', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Software' },
    { name: 'ClubCorp Holdings Inc',        cis: 'N34OXMN', ctx: 'IPD', tranche: 'DDTL',       loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Leisure & Travel' },
    { name: 'Colouroz Investment GmbH',     cis: 'O56PYOP', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'First Lien',  currency: 'EUR', country: 'Germany',        industry: 'Chemicals' },
    { name: 'Compass Minerals Intl',        cis: 'P78QZQR', ctx: 'IPD', tranche: 'Term Loan A', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Mining & Minerals' },
    { name: 'Consolidated Communications',  cis: 'Q90RAST', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Telecommunications' },
    { name: 'CPI Aerostructures Inc',       cis: 'R12SBUV', ctx: 'IPD', tranche: 'Revolver',    loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Aerospace & Defence' },
    { name: 'Cyxtera Technologies Inc',     cis: 'S34TCWX', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'Second Lien', currency: 'USD', country: 'United States', industry: 'Data Centres' },
    { name: 'DaVita Inc',                   cis: 'T56UDYZ', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare' },
    { name: 'Delos Finance SARL',           cis: 'U78VEAB', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'First Lien',  currency: 'EUR', country: 'Luxembourg',    industry: 'Financial Services' },
    { name: 'Diamond Sports Group LLC',     cis: 'V90WFCD', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Media & Entertainment' },
    { name: 'Edgewell Personal Care',       cis: 'W12XGEF', ctx: 'IPD', tranche: 'Term Loan A', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Consumer Goods' },
    { name: 'Envision Healthcare Corp',     cis: 'X34YHGH', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare' },
    { name: 'Finastra Ltd',                 cis: 'Y56ZIJK', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'MML', seniority: 'First Lien',  currency: 'GBP', country: 'United Kingdom', industry: 'Financial Technology' },
    { name: 'Fleet Midco I Ltd',            cis: 'Z78AJKL', ctx: 'IPD', tranche: 'DDTL',       loanType: 'MML', seniority: 'First Lien',  currency: 'GBP', country: 'United Kingdom', industry: 'Software' },
    { name: 'Gardner Denver Holdings',      cis: 'A91BKMN', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Industrial Equipment' },
    { name: 'Global Medical Response Inc',  cis: 'B13CLOP', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare' },
    { name: 'Greeneden Group Holdings',     cis: 'C35DMQR', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Software' },
    { name: 'Harbor Freight Tools USA',     cis: 'D57ENST', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Retail' },
    { name: 'Houghton International Inc',   cis: 'E79FOUV', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Chemicals' },
    { name: 'Idera Inc',                    cis: 'F91GPWX', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Software' },
    { name: 'Inmarsat PLC',                 cis: 'G13HQYZ', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'GBP', country: 'United Kingdom', industry: 'Telecommunications' },
    { name: 'Jazz Pharmaceuticals PLC',     cis: 'H35IRAB', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'Ireland',        industry: 'Pharmaceuticals' },
    { name: 'KAR Auction Services Inc',     cis: 'I57JSCD', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Automotive Services' },
    { name: 'Klockner Pentaplast Group',    cis: 'J79KTEF', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'First Lien',  currency: 'EUR', country: 'Germany',        industry: 'Packaging' },
    { name: 'Lealand Finance Company BV',   cis: 'K91LUGH', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'MML', seniority: 'First Lien',  currency: 'EUR', country: 'Netherlands',    industry: 'Oil & Gas Services' },
    { name: 'LogMeIn Inc',                  cis: 'L13MVIJ', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Software' },
    { name: 'Mauser Packaging Solutions',   cis: 'M35NWKL', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Packaging' },
    { name: 'McDermott International Ltd',  cis: 'N57OXMN', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Energy Services' },
    { name: 'Messer Industries GmbH',       cis: 'O79PYOP', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'MML', seniority: 'First Lien',  currency: 'EUR', country: 'Germany',        industry: 'Industrial Gases' },
    { name: 'Navicure Inc',                 cis: 'P91QZQR', ctx: 'IPD', tranche: 'DDTL',       loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare IT' },
    { name: 'Numericable Group SA',         cis: 'Q13RAST', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'EUR', country: 'France',         industry: 'Telecommunications' },
    { name: 'Ortho Clinical Diagnostics',   cis: 'R35SBUV', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare' },
    { name: 'Paysafe Ltd',                  cis: 'S57TCWX', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'MML', seniority: 'First Lien',  currency: 'GBP', country: 'United Kingdom', industry: 'Financial Technology' },
    { name: 'Quorum Health Corporation',    cis: 'T79UDYZ', ctx: 'IPD', tranche: 'Term Loan',   loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Healthcare' },
    { name: 'Refinitiv Holdings Ltd',       cis: 'U91VEAB', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Financial Services' },
    { name: 'Sedgwick Claims Mgmt Services',cis: 'V13WFCD', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'MML', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Insurance' },
    { name: 'Solera Holdings Inc',          cis: 'W35XGEF', ctx: 'IPD', tranche: 'Term Loan B', loanType: 'BSL', seniority: 'First Lien',  currency: 'USD', country: 'United States', industry: 'Automotive Software' },
  ];

  for (const row of sampleData) {
    const fx = row.currency === 'USD' ? 1.0 : row.currency === 'EUR' ? 1.08 : row.currency === 'GBP' ? 1.27 : 1.0;
    const notional = (Math.random() * 50 + 5).toFixed(4); // 5-55M
    const notionalDBC = (notional * fx).toFixed(4);

    await client.query(`
      INSERT INTO bilateral_asset_level (
        "As of Date", "CIS Code", "Data Context", "Included in Pool",
        "NatWest Unique Id", "Obligor Name", "Tranche", "Loan Type",
        "Seniority", "Native Currency", "FX",
        "Notional Funded (Native Currency)", "Notional Funded (Deal Base Currency)",
        "Country Reported", "NWM Standard Country Name",
        "NWM Standard Industry Group",
        "Last Updated at", "Last Updated by"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
    `, [
      '2024-09-30', row.cis, row.ctx, true,
      String(sampleData.indexOf(row) + 1), row.name, row.tranche, row.loanType,
      row.seniority, row.currency, fx,
      notional, notionalDBC,
      row.country, row.country,
      row.industry,
      new Date(), 'system-seed'
    ]);
  }

  console.log(`Inserted ${sampleData.length} sample rows.`);

  // Verify
  const count = await client.query('SELECT COUNT(*) FROM bilateral_asset_level');
  console.log(`Total rows in table: ${count.rows[0].count}`);

  const sample = await client.query('SELECT "Obligor Name", "Loan Type", "Seniority", "Native Currency" FROM bilateral_asset_level LIMIT 5');
  console.table(sample.rows);

  await client.end();
  console.log('Done! Database is ready.');
}

run().catch((err) => {
  console.error('Setup failed:', err.message);
  console.error('\nMake sure PostgreSQL is running and the credentials in server/.env are correct.');
  process.exit(1);
});
