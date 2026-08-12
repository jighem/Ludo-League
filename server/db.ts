import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

let mysqlPool: mysql.Pool | null = null;
let sqlJsDb: SqlJsDatabase | null = null;
let dbFilePath: string = '';
let isUsingMySQL = false;

// Helpers to save SQLite data to disk if using sql.js fallback
function persistSqlJs() {
  if (sqlJsDb && dbFilePath) {
    try {
      const data = sqlJsDb.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dbFilePath, buffer);
    } catch (err) {
      console.error('Error saving SQLite DB to disk:', err);
    }
  }
}

export async function initDatabase() {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = Number(process.env.MYSQL_PORT || 3306);

  if (host && database) {
    try {
      console.log(`Connecting to MySQL database at ${host}:${port}/${database}...`);
      const pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
        timezone: '+00:00',
        dateStrings: true,
        connectTimeout: 10000
      });

      // Test connection
      const conn = await pool.getConnection();
      console.log('Successfully connected to MySQL database!');
      conn.release();

      mysqlPool = pool;
      isUsingMySQL = true;

      // Run schema initialization
      const schemaSqlPath = path.join(process.cwd(), 'server', 'schema.sql');
      if (fs.existsSync(schemaSqlPath)) {
        const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
        try {
          await mysqlPool.query(schemaSql);
        } catch (schemaErr) {
          console.warn('Notice during schema initialization on MySQL:', (schemaErr as Error).message);
        }
      }
      return;
    } catch (err) {
      console.warn('Could not connect to configured MySQL host, falling back to embedded SQL engine:', (err as Error).message);
    }
  }

  // Fallback to embedded file-backed SQL database
  console.log('Initializing embedded file-backed SQL database engine...');
  dbFilePath = path.join(process.cwd(), 'data', 'ludo_league.sqlite');
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();
  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    sqlJsDb = new SQL.Database(fileBuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }

  // Initialize schema on embedded DB
  initEmbeddedSchema();
  persistSqlJs();
  console.log('Embedded SQL database initialized successfully at:', dbFilePath);
}

function initEmbeddedSchema() {
  if (!sqlJsDb) return;

  sqlJsDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      nickname TEXT,
      profile_photo TEXT,
      mobile_number TEXT,
      email TEXT,
      date_joined DATE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      friendly_id TEXT NOT NULL UNIQUE,
      match_date DATE NOT NULL,
      match_time TIME NOT NULL,
      player_count INTEGER NOT NULL,
      notes TEXT,
      created_by INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_by INTEGER,
      deleted_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS match_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      points_awarded DECIMAL(8,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (match_id, player_id),
      UNIQUE (match_id, position)
    );

    CREATE TABLE IF NOT EXISTS scoring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_count INTEGER NOT NULL UNIQUE,
      pos1_points DECIMAL(8,2) NOT NULL,
      pos2_points DECIMAL(8,2) NOT NULL,
      pos3_points DECIMAL(8,2) NOT NULL DEFAULT 0.00,
      pos4_points DECIMAL(8,2) NOT NULL DEFAULT 0.00,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS application_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS championship_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      winner_player_ids TEXT NOT NULL,
      winning_average DECIMAL(8,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO scoring_rules (player_count, pos1_points, pos2_points, pos3_points, pos4_points) VALUES
    (4, 50.00, 30.00, 20.00, 0.00),
    (3, 62.50, 37.50, 0.00, 0.00),
    (2, 100.00, 0.00, 0.00, 0.00);

    INSERT OR IGNORE INTO application_settings (setting_key, setting_value) VALUES
    ('min_matches_qualification', '8'),
    ('app_name', 'Ludo League'),
    ('timezone', 'Asia/Kolkata'),
    ('closed_months', '[]');
  `);
}

/**
  Execute a SELECT query returning an array of objects
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isUsingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows as T[];
  }

  if (sqlJsDb) {
    // Convert MySQL queries with stddev or other functions if needed
    let adaptedSql = sql.replace(/STDDEV_SAMP\(([^)]+)\)/gi, 'AVG($1)'); // Fallback calculation
    const stmt = sqlJsDb.prepare(adaptedSql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  throw new Error('Database not initialized');
}

/**
  Execute an INSERT, UPDATE, or DELETE query returning insertId or affectedRows
 */
export async function execute(sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> {
  if (isUsingMySQL && mysqlPool) {
    const [result] = await mysqlPool.execute(sql, params);
    const res = result as mysql.ResultSetHeader;
    return { insertId: res.insertId, affectedRows: res.affectedRows };
  }

  if (sqlJsDb) {
    const stmt = sqlJsDb.prepare(sql);
    stmt.run(params);
    stmt.free();
    const insertIdRes = sqlJsDb.exec('SELECT last_insert_rowid() as id');
    const insertId = insertIdRes[0]?.values[0]?.[0] as number || 0;
    const changesRes = sqlJsDb.exec('SELECT changes() as cnt');
    const affectedRows = changesRes[0]?.values[0]?.[0] as number || 0;
    persistSqlJs();
    return { insertId, affectedRows };
  }

  throw new Error('Database not initialized');
}

/**
  Execute a database transaction block
 */
export async function transaction<T>(fn: (tx: {
  query: <R = any>(sql: string, params?: any[]) => Promise<R[]>;
  execute: (sql: string, params?: any[]) => Promise<{ insertId: number; affectedRows: number }>;
}) => Promise<T>): Promise<T> {
  if (isUsingMySQL && mysqlPool) {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
      const txWrapper = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          const [rows] = await conn.query(sql, params);
          return rows as R[];
        },
        execute: async (sql: string, params: any[] = []) => {
          const [result] = await conn.execute(sql, params);
          const res = result as mysql.ResultSetHeader;
          return { insertId: res.insertId, affectedRows: res.affectedRows };
        }
      };
      const result = await fn(txWrapper);
      await conn.commit();
      conn.release();
      return result;
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  }

  if (sqlJsDb) {
    sqlJsDb.exec('BEGIN TRANSACTION');
    try {
      const txWrapper = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          return query<R>(sql, params);
        },
        execute: async (sql: string, params: any[] = []) => {
          return execute(sql, params);
        }
      };
      const result = await fn(txWrapper);
      sqlJsDb.exec('COMMIT');
      persistSqlJs();
      return result;
    } catch (err) {
      sqlJsDb.exec('ROLLBACK');
      throw err;
    }
  }

  throw new Error('Database not initialized');
}

export function isMySQL(): boolean {
  return isUsingMySQL;
}
