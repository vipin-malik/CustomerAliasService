import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

// ─── Config ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
const TABLE = 'bilateral_asset_level';

// ─── Postgres pool ─────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'investor_db',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  max:      20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});

// ─── Express app ───────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());

// ─── Health check ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: err.message });
  }
});

// ─── GET /api/v1/investors ─────────────────────────────────────
// Paginated investor list with optional search
app.get('/api/v1/investors', async (req, res) => {
  try {
    let page     = Math.max(1, parseInt(req.query.page) || 1);
    let pageSize = Math.min(10000, Math.max(1, parseInt(req.query.pageSize) || 25));
    const search = req.query.search?.trim() || null;

    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`"Obligor Name" ILIKE $${paramIdx}`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count query
    const countQuery = `SELECT COUNT(*) AS total FROM ${TABLE} ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    // Data query — select key columns and alias them to match the frontend
    const dataQuery = `
      SELECT
        id,
        "Obligor Name"                  AS name,
        "Data Context"                  AS "assetClass",
        "Loan Type"                     AS source,
        "CIS Code"                      AS "cisCode",
        "NatWest Unique Id"             AS "natwestId",
        "Tranche"                       AS tranche,
        "Seniority"                     AS seniority,
        "Native Currency"               AS currency,
        "FX"                            AS fx,
        "Country Reported"              AS country,
        "NWM Standard Industry Group"   AS industry,
        "As of Date"                    AS "createdAt"
      FROM ${TABLE}
      ${whereClause}
      ORDER BY "Obligor Name" ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const dataParams = [...params, pageSize, offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    res.json({
      items: dataResult.rows,
      totalCount,
      pageNumber: page,
      pageSize,
      totalPages,
    });
  } catch (err) {
    console.error('Error fetching investors:', err.message);
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// ─── GET /api/v1/investors/distinct/asset-classes ──────────────
app.get('/api/v1/investors/distinct/asset-classes', async (_req, res) => {
  try {
    const query = `SELECT DISTINCT "Data Context" AS "assetClass" FROM ${TABLE} WHERE "Data Context" IS NOT NULL ORDER BY 1`;
    const result = await pool.query(query);
    res.json(result.rows.map((r) => r.assetClass));
  } catch (err) {
    console.error('Error fetching asset classes:', err.message);
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// ─── GET /api/v1/investors/:id ─────────────────────────────────
app.get('/api/v1/investors/:id', async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        "Obligor Name"                  AS name,
        "Data Context"                  AS "assetClass",
        "Loan Type"                     AS source,
        "CIS Code"                      AS "cisCode",
        "NatWest Unique Id"             AS "natwestId",
        "Tranche"                       AS tranche,
        "Seniority"                     AS seniority,
        "Native Currency"               AS currency,
        "FX"                            AS fx,
        "Country Reported"              AS country,
        "NWM Standard Industry Group"   AS industry,
        "As of Date"                    AS "createdAt"
      FROM ${TABLE}
      WHERE id = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Investor not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching investor:', err.message);
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// ─── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Investor API server running on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`);
  console.log(`Table: ${TABLE}`);
});
