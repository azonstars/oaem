import { createClient, Client } from "@libsql/client";
import path from "path";
import fs from "fs";

let dbClient: Client | null = null;
const memoryCache: Record<string, any[]> = {};
let dbFilePath = "";
let isRemoteLibSql = false;

const TABLE_SCHEMAS: Record<string, string> = {
  Settings: `
    CREATE TABLE IF NOT EXISTS Settings (
      id TEXT PRIMARY KEY,
      institutionName TEXT,
      webAppName TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  FinancialYears: `
    CREATE TABLE IF NOT EXISTS FinancialYears (
      id TEXT PRIMARY KEY,
      name TEXT,
      startDate TEXT,
      endDate TEXT,
      isActive INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Active',
      isClosed INTEGER DEFAULT 0,
      closedAt TEXT,
      closedBy TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  Offices: `
    CREATE TABLE IF NOT EXISTS Offices (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      code TEXT,
      address TEXT,
      parentOfficeId TEXT,
      status TEXT DEFAULT 'Active',
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  Users: `
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE,
      name TEXT,
      email TEXT,
      role TEXT,
      officeId TEXT,
      designation TEXT,
      passwordHash TEXT,
      passwordSalt TEXT,
      status TEXT DEFAULT 'Active',
      mustChangePassword INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  Categories: `
    CREATE TABLE IF NOT EXISTS Categories (
      id TEXT PRIMARY KEY,
      code TEXT,
      name TEXT,
      description TEXT,
      budgetHead TEXT,
      status TEXT DEFAULT 'Active',
      allowInQuotation INTEGER DEFAULT 0,
      allowExcess INTEGER DEFAULT 0,
      requireApproval INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  Allocations: `
    CREATE TABLE IF NOT EXISTS Allocations (
      id TEXT PRIMARY KEY,
      financialYearId TEXT,
      officeId TEXT,
      categoryId TEXT,
      type TEXT,
      allocatedAmount REAL DEFAULT 0,
      date TEXT,
      referenceNo TEXT,
      allocatedBy TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  Expenses: `
    CREATE TABLE IF NOT EXISTS Expenses (
      id TEXT PRIMARY KEY,
      financialYearId TEXT,
      officeId TEXT,
      categoryId TEXT,
      expenseType TEXT,
      quotationFormType TEXT,
      expenseDate TEXT,
      amount REAL DEFAULT 0,
      baseAmount REAL DEFAULT 0,
      vatRate REAL DEFAULT 0,
      vatAmount REAL DEFAULT 0,
      taxRate REAL DEFAULT 0,
      taxAmount REAL DEFAULT 0,
      netPayable REAL DEFAULT 0,
      grossAmount REAL DEFAULT 0,
      voucherNo TEXT,
      voucherDate TEXT,
      description TEXT,
      status TEXT DEFAULT 'Pending',
      noteSheetId TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  NoteSheets: `
    CREATE TABLE IF NOT EXISTS NoteSheets (
      id TEXT PRIMARY KEY,
      financialYearId TEXT,
      officeId TEXT,
      expenseId TEXT,
      title TEXT,
      status TEXT,
      createdBy TEXT,
      createdAt TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  NoteTemplates: `
    CREATE TABLE IF NOT EXISTS NoteTemplates (
      id TEXT PRIMARY KEY,
      categoryId TEXT,
      title TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  OpeningBalances: `
    CREATE TABLE IF NOT EXISTS OpeningBalances (
      id TEXT PRIMARY KEY,
      financialYearId TEXT,
      officeId TEXT,
      categoryId TEXT,
      amount REAL DEFAULT 0,
      sourceFYId TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  AuditLogs: `
    CREATE TABLE IF NOT EXISTS AuditLogs (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      userId TEXT,
      action TEXT,
      tableName TEXT,
      recordId TEXT,
      details TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
    PostFactoProposals: `
    CREATE TABLE IF NOT EXISTS PostFactoProposals (
      id TEXT PRIMARY KEY,
      financialYearId TEXT,
      officeId TEXT,
      categoryId TEXT,
      description TEXT,
      vatRate REAL DEFAULT 0,
      taxRate REAL DEFAULT 0,
      unitPrice REAL DEFAULT 0,
      totalAmount REAL DEFAULT 0,
      managerName TEXT,
      status TEXT DEFAULT 'Pending',
      sanctionMemoNo TEXT,
      sanctionDate TEXT,
      sanctionedAmount REAL DEFAULT 0,
      sanctionDocument TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  FlowTools: `
    CREATE TABLE IF NOT EXISTS FlowTools (
      id TEXT PRIMARY KEY,
      name TEXT,
      nameBn TEXT,
      category TEXT,
      status TEXT DEFAULT 'active',
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  StockProProducts: `
    CREATE TABLE IF NOT EXISTS StockProProducts (
      id TEXT PRIMARY KEY,
      name TEXT,
      sku TEXT,
      padType TEXT,
      fromPad INTEGER DEFAULT 0,
      perPadPages INTEGER DEFAULT 100,
      stockQuantity REAL DEFAULT 0,
      sellingPrice REAL DEFAULT 0,
      costPrice REAL DEFAULT 0,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  StockProBranches: `
    CREATE TABLE IF NOT EXISTS StockProBranches (
      id TEXT PRIMARY KEY,
      name TEXT,
      code TEXT,
      phone TEXT,
      address TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  StockProInvoices: `
    CREATE TABLE IF NOT EXISTS StockProInvoices (
      id TEXT PRIMARY KEY,
      date TEXT,
      agentId TEXT,
      totalAmount REAL DEFAULT 0,
      linkedPadNo TEXT,
      createdBy TEXT,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  StockProVoucherPads: `
    CREATE TABLE IF NOT EXISTS StockProVoucherPads (
      id TEXT PRIMARY KEY,
      padNo TEXT,
      category TEXT,
      totalPages INTEGER DEFAULT 100,
      currentPage INTEGER DEFAULT 1,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  ToolDocuments: `
    CREATE TABLE IF NOT EXISTS ToolDocuments (
      id TEXT PRIMARY KEY,
      toolType TEXT,
      title TEXT,
      docDate TEXT,
      memoNo TEXT,
      officeId TEXT,
      financialYearId TEXT,
      createdBy TEXT,
      totalAmount REAL DEFAULT 0,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
};

const INDEX_COMMANDS = [
  "CREATE INDEX IF NOT EXISTS idx_expenses_office ON Expenses(officeId);",
  "CREATE INDEX IF NOT EXISTS idx_expenses_fy ON Expenses(financialYearId);",
  "CREATE INDEX IF NOT EXISTS idx_expenses_cat ON Expenses(categoryId);",
  "CREATE INDEX IF NOT EXISTS idx_alloc_office ON Allocations(officeId);",
  "CREATE INDEX IF NOT EXISTS idx_alloc_fy ON Allocations(financialYearId);",
  "CREATE INDEX IF NOT EXISTS idx_notesheets_office ON NoteSheets(officeId);",
  "CREATE INDEX IF NOT EXISTS idx_users_userid ON Users(userId);",
  "CREATE INDEX IF NOT EXISTS idx_audit_time ON AuditLogs(timestamp);",
  "CREATE INDEX IF NOT EXISTS idx_pfp_office ON PostFactoProposals(officeId);",
  "CREATE INDEX IF NOT EXISTS idx_pfp_fy ON PostFactoProposals(financialYearId);",
  "CREATE INDEX IF NOT EXISTS idx_stockpro_inv_agent ON StockProInvoices(agentId);",
  "CREATE INDEX IF NOT EXISTS idx_tooldocs_type ON ToolDocuments(toolType);",
  "CREATE INDEX IF NOT EXISTS idx_tooldocs_office ON ToolDocuments(officeId);",
];

/**
 * Initializes SQLite database connection, tables, indexes, and migrates initial data
 */
export async function initSqlite(
  dataDir: string,
  initialData: Record<string, any[]>,
): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const remoteUrl = process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL;
  const authToken =
    process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (remoteUrl && remoteUrl.trim()) {
    isRemoteLibSql = true;
    console.log(
      `[SQLite] Connecting to Cloud LibSQL/Turso Database at: ${remoteUrl}`,
    );
    dbClient = createClient({
      url: remoteUrl.trim(),
      authToken: authToken ? authToken.trim() : undefined,
    });
  } else {
    isRemoteLibSql = false;
    dbFilePath =
      process.env.SQLITE_DB_PATH || path.join(dataDir, "database.sqlite");
    console.log(
      `[SQLite] Connecting to Local SQLite database at: ${dbFilePath}`,
    );
    dbClient = createClient({
      url: `file:${dbFilePath}`,
    });

    try {
      await dbClient.execute("PRAGMA journal_mode = WAL;");
      await dbClient.execute("PRAGMA synchronous = NORMAL;");
    } catch (err) {
      console.warn("[SQLite] Notice on PRAGMA settings:", err);
    }
  }

  for (const [, createSql] of Object.entries(TABLE_SCHEMAS)) {
    await dbClient.execute(createSql);
  }

  for (const indexSql of INDEX_COMMANDS) {
    try {
      await dbClient.execute(indexSql);
    } catch (err) {
      console.warn("[SQLite] Notice on index creation:", err);
    }
  }

  const sheetNames = Object.keys(TABLE_SCHEMAS);
  for (const sheet of sheetNames) {
    const checkCount = await dbClient.execute(
      `SELECT COUNT(*) as count FROM ${sheet}`,
    );
    const rowCount = Number(checkCount.rows[0]?.count || 0);

    let items: any[] = [];

    if (rowCount === 0) {

      const jsonPath = path.join(dataDir, `${sheet}.json`);
      if (fs.existsSync(jsonPath)) {
        try {
          const raw = fs.readFileSync(jsonPath, "utf-8");
          items = JSON.parse(raw);
          console.log(
            `[SQLite] Migrated ${items.length} records from ${sheet}.json into SQLite table ${sheet}`,
          );
        } catch (_e) {
          items = initialData[sheet] || [];
        }
      } else {
        items = initialData[sheet] || [];
      }

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await insertOrReplaceItem(sheet, item);
        }
        console.log(
          `[SQLite] Seeded table '${sheet}' with ${items.length} records in SQLite.`,
        );
      }
    } else {

      const result = await dbClient.execute(
        `SELECT data FROM ${sheet} ORDER BY rowid ASC`,
      );
      items = result.rows
        .map((r: any) => {
          try {
            return JSON.parse(r.data as string);
          } catch (_e) {
            return null;
          }
        })
        .filter(Boolean);
      console.log(
        `[SQLite] Loaded ${items.length} records from SQLite table '${sheet}'.`,
      );

      if (sheet === "NoteTemplates" && initialData?.NoteTemplates) {
        for (const initTmpl of initialData.NoteTemplates) {
          if (!items.some((it: any) => it.id === initTmpl.id)) {
            await insertOrReplaceItem("NoteTemplates", initTmpl);
            items.push(initTmpl);
            console.log(
              `[SQLite] Added missing default NoteTemplate '${initTmpl.id}' to database.`,
            );
          }
        }
      }
    }

    memoryCache[sheet] = items;
  }

  console.log(
    "[SQLite] Database initialization and migration completed successfully.",
  );
}

/**
 * Returns in-memory cache for fast synchronous reads
 */
export function getDbSheetData(
  sheetName: string,
  initialData?: Record<string, any[]>,
): any[] {
  if (memoryCache[sheetName]) {
    return memoryCache[sheetName];
  }
  if (initialData && initialData[sheetName]) {
    memoryCache[sheetName] = initialData[sheetName];
    return memoryCache[sheetName];
  }
  memoryCache[sheetName] = [];
  return memoryCache[sheetName];
}

/**
 * Saves all sheet items to SQLite and updates in-memory cache
 */
export async function saveDbSheetData(
  sheetName: string,
  items: any[],
): Promise<void> {
  memoryCache[sheetName] = items;

  if (!dbClient) {
    console.warn("[SQLite] Warning: dbClient not ready when saving", sheetName);
    return;
  }

  try {

    if (items.length === 0) {
      await dbClient.execute(`DELETE FROM ${sheetName}`);
      return;
    }

    const currentIds = items.map((it) => it.id).filter(Boolean);
    if (currentIds.length > 0) {
      const placeholders = currentIds.map(() => "?").join(",");
      await dbClient.execute({
        sql: `DELETE FROM ${sheetName} WHERE id NOT IN (${placeholders})`,
        args: currentIds,
      });
    }

    for (const item of items) {
      await insertOrReplaceItem(sheetName, item);
    }

    await checkpointWal();
  } catch (err) {
    console.error(
      `[SQLite Error] Failed to save records for ${sheetName}:`,
      err,
    );
    throw err;
  }
}

/**
 * Inserts or updates an individual item in its corresponding table
 */
async function insertOrReplaceItem(sheet: string, item: any): Promise<void> {
  if (!dbClient || !item) return;

  const dataStr = JSON.stringify(item);
  const cleanArgs = (args: any[]) =>
    args.map((v) => (v === undefined ? null : v));

  switch (sheet) {
    case "Settings":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO Settings (id, institutionName, webAppName, data) VALUES (?, ?, ?, ?)`,
        args: cleanArgs([
          item.id || "system_settings",
          item.institutionName || "",
          item.webAppName || "",
          dataStr,
        ]),
      });
      break;

    case "FinancialYears":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO FinancialYears (id, name, startDate, endDate, isActive, status, isClosed, closedAt, closedBy, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.name || "",
          item.startDate || "",
          item.endDate || "",
          item.isActive ? 1 : 0,
          item.status || "Active",
          item.isClosed ? 1 : 0,
          item.closedAt || null,
          item.closedBy || null,
          dataStr,
        ]),
      });
      break;

    case "Offices":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO Offices (id, name, type, code, address, parentOfficeId, status, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.name || "",
          item.type || "SubOffice",
          item.code || "",
          item.address || "",
          item.parentOfficeId || null,
          item.status || "Active",
          dataStr,
        ]),
      });
      break;

    case "Users":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO Users (id, userId, name, email, role, officeId, designation, passwordHash, passwordSalt, status, mustChangePassword, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.userId || "",
          item.name || "",
          item.email || "",
          item.role || "Sub-office User",
          item.officeId || "",
          item.designation || "",
          item.passwordHash || "",
          item.passwordSalt || "",
          item.status || "Active",
          item.mustChangePassword ? 1 : 0,
          dataStr,
        ]),
      });
      break;

    case "Categories":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO Categories (id, code, name, description, budgetHead, status, allowInQuotation, allowExcess, requireApproval, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.code || "",
          item.name || "",
          item.description || "",
          item.budgetHead || "",
          item.status || "Active",
          item.allowInQuotation ? 1 : 0,
          item.allowExcess ? 1 : 0,
          item.requireApproval ? 1 : 0,
          dataStr,
        ]),
      });
      break;

    case "Allocations":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO Allocations (id, financialYearId, officeId, categoryId, type, allocatedAmount, date, referenceNo, allocatedBy, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.financialYearId || "",
          item.officeId || "",
          item.categoryId || "",
          item.type || "Initial",
          Number(item.allocatedAmount || 0),
          item.date || "",
          item.referenceNo || "",
          item.allocatedBy || "",
          dataStr,
        ]),
      });
      break;

    case "Expenses":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO Expenses (id, financialYearId, officeId, categoryId, expenseType, quotationFormType, expenseDate, amount, baseAmount, vatRate, vatAmount, taxRate, taxAmount, netPayable, grossAmount, voucherNo, voucherDate, description, status, noteSheetId, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.financialYearId || "",
          item.officeId || "",
          item.categoryId || "",
          item.expenseType || "General",
          item.quotationFormType || null,
          item.expenseDate || "",
          Number(item.amount || 0),
          Number(item.baseAmount || 0),
          Number(item.vatRate || 0),
          Number(item.vatAmount || 0),
          Number(item.taxRate || 0),
          Number(item.taxAmount || 0),
          Number(item.netPayable || 0),
          Number(item.grossAmount || 0),
          item.voucherNo || "",
          item.voucherDate || "",
          item.description || "",
          item.status || "Pending",
          item.noteSheetId || null,
          dataStr,
        ]),
      });
      break;

    case "NoteSheets":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO NoteSheets (id, financialYearId, officeId, expenseId, title, status, createdBy, createdAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.financialYearId || "",
          item.officeId || "",
          item.expenseId || null,
          item.title || "",
          item.status || "Draft",
          item.createdBy || "",
          item.createdAt || "",
          dataStr,
        ]),
      });
      break;

    case "NoteTemplates":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO NoteTemplates (id, categoryId, title, data) VALUES (?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.categoryId || "",
          item.title || "",
          dataStr,
        ]),
      });
      break;

    case "OpeningBalances":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO OpeningBalances (id, financialYearId, officeId, categoryId, amount, sourceFYId, data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.financialYearId || "",
          item.officeId || "",
          item.categoryId || "",
          Number(item.amount || 0),
          item.sourceFYId || null,
          dataStr,
        ]),
      });
      break;

    case "AuditLogs":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO AuditLogs (id, timestamp, userId, action, tableName, recordId, details, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.timestamp || "",
          item.userId || "",
          item.action || "",
          item.tableName || "",
          item.recordId || "",
          item.details || "",
          dataStr,
        ]),
      });
      break;

    case "PostFactoProposals":
      await dbClient.execute({
        sql: `INSERT OR REPLACE INTO PostFactoProposals (id, financialYearId, officeId, categoryId, description, vatRate, taxRate, unitPrice, totalAmount, managerName, status, sanctionMemoNo, sanctionDate, sanctionedAmount, sanctionDocument, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: cleanArgs([
          item.id,
          item.financialYearId || "",
          item.officeId || "",
          item.categoryId || "",
          item.description || "",
          Number(item.vatRate || 0),
          Number(item.taxRate || 0),
          Number(item.unitPrice || 0),
          Number(item.totalAmount || 0),
          item.managerName || "",
          item.status || "Pending",
          item.sanctionMemoNo || "",
          item.sanctionDate || "",
          Number(item.sanctionedAmount || 0),
          item.sanctionDocument || "",
          dataStr,
        ]),
      });
      break;

    default:
      console.warn(
        `[SQLite] Unrecognized table ${sheet}, skipping SQL mapping.`,
      );
  }
}

/**
 * Forces WAL journal to commit back to the main database file
 */
export async function checkpointWal(): Promise<void> {
  if (!dbClient || isRemoteLibSql) return;
  try {
    await dbClient.execute("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch (err) {
    console.warn("[SQLite] WAL checkpoint notice:", err);
  }
}

/**
 * Restores raw SQLite database file from uploaded backup
 */
export async function restoreSqliteFromFile(
  uploadedFilePath: string,
  dataDir: string,
  initialData: Record<string, any[]>,
): Promise<void> {

  const headerBuf = Buffer.alloc(16);
  const fd = fs.openSync(uploadedFilePath, "r");
  fs.readSync(fd, headerBuf, 0, 16, 0);
  fs.closeSync(fd);
  const headerStr = headerBuf.toString("utf8");
  if (!headerStr.startsWith("SQLite format 3")) {
    throw new Error(
      "Invalid SQLite file format. File must be a valid SQLite database.",
    );
  }

  if (dbClient) {
    try {
      dbClient.close();
    } catch (_e) {
      console.warn("[SQLite] Error closing existing dbClient:", _e);
    }
    dbClient = null;
  }

  const targetDbPath =
    process.env.SQLITE_DB_PATH || path.join(dataDir, "database.sqlite");
  const walPath = `${targetDbPath}-wal`;
  const shmPath = `${targetDbPath}-shm`;
  if (fs.existsSync(walPath)) {
    try {
      fs.unlinkSync(walPath);
    } catch (_e) {}
  }
  if (fs.existsSync(shmPath)) {
    try {
      fs.unlinkSync(shmPath);
    } catch (_e) {}
  }

  fs.copyFileSync(uploadedFilePath, targetDbPath);
  console.log(`[SQLite] Restored database.sqlite from ${uploadedFilePath}`);

  await initSqlite(dataDir, initialData);
  await checkpointWal();
}

/**
 * Restores database from a complete JSON snapshot
 */
export async function restoreFromDataMap(
  dataMap: Record<string, any[]>,
  dataDir: string,
): Promise<number> {
  let count = 0;
  const sheetNames = Object.keys(TABLE_SCHEMAS);
  for (const sheet of sheetNames) {
    if (Array.isArray(dataMap[sheet])) {
      await saveDbSheetData(sheet, dataMap[sheet]);

      try {
        const filePath = path.join(dataDir, `${sheet}.json`);
        fs.writeFileSync(
          filePath,
          JSON.stringify(dataMap[sheet], null, 2),
          "utf-8",
        );
      } catch (_e) {}
      count += dataMap[sheet].length;
    }
  }
  await checkpointWal();
  return count;
}

/**
 * Returns in-memory map of all sheet records
 */
export function getAllDataMap(): Record<string, any[]> {
  const result: Record<string, any[]> = {};
  for (const sheet of Object.keys(TABLE_SCHEMAS)) {
    result[sheet] = getDbSheetData(sheet);
  }
  return result;
}

/**
 * Returns database status & statistics
 */
export async function getSqliteStats(): Promise<{
  dbPath: string;
  sizeBytes: number;
  isRemote: boolean;
  remoteUrl?: string;
  tableCounts: Record<string, number>;
}> {
  const tableCounts: Record<string, number> = {};
  let sizeBytes = 0;

  if (!isRemoteLibSql && fs.existsSync(dbFilePath)) {
    const stat = fs.statSync(dbFilePath);
    sizeBytes = stat.size;
  }

  if (dbClient) {
    for (const table of Object.keys(TABLE_SCHEMAS)) {
      try {
        const rs = await dbClient.execute(
          `SELECT COUNT(*) as cnt FROM ${table}`,
        );
        tableCounts[table] = Number(rs.rows[0]?.cnt || 0);
      } catch (_e) {
        tableCounts[table] = 0;
      }
    }
  }

  return {
    dbPath: isRemoteLibSql
      ? process.env.LIBSQL_URL ||
        process.env.TURSO_DATABASE_URL ||
        "Remote Cloud LibSQL"
      : dbFilePath,
    sizeBytes,
    isRemote: isRemoteLibSql,
    remoteUrl: isRemoteLibSql
      ? process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL || ""
      : undefined,
    tableCounts,
  };
}

/**
 * Safely executes raw custom SQL query for Super Admin or export
 */
export async function querySql(sql: string, args: any[] = []): Promise<any[]> {
  if (!dbClient) {
    const dataDir = path.join(process.cwd(), "data");
    await initSqlite(dataDir, {});
  }
  const result = await dbClient!.execute({ sql, args });
  return result.rows as any[];
}
