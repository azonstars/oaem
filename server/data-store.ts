import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDbSheetData, saveDbSheetData, saveDbSingleItem } from "../sqlite.js";
import { initialData } from "./default-data.js";
import { computeExpenseAmounts } from "./utils.js";

export const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getSheetData(sheetName: string): any[] {
  return getDbSheetData(sheetName, initialData);
}

const BACKUP_DIR = path.join(DATA_DIR, "backups");
let lastBackupDate = "";

export function ensureDailyBackup() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  if (lastBackupDate === today) return;

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const todayBackupDir = path.join(BACKUP_DIR, today);
    if (!fs.existsSync(todayBackupDir)) {
      fs.mkdirSync(todayBackupDir, { recursive: true });
      if (fs.existsSync(DATA_DIR)) {
        const sqliteFile = path.join(DATA_DIR, "database.sqlite");
        if (fs.existsSync(sqliteFile)) {
          try {
            fs.copyFileSync(
              sqliteFile,
              path.join(todayBackupDir, "database.sqlite"),
            );
          } catch (_e) {
            console.error("Backup copy error for database.sqlite:", _e);
          }
        }

        const files = fs
          .readdirSync(DATA_DIR)
          .filter((f) => f.endsWith(".json"));
        for (const f of files) {
          const src = path.join(DATA_DIR, f);
          const dest = path.join(todayBackupDir, f);
          try {
            fs.copyFileSync(src, dest);
          } catch (_e) {
            console.error("Backup copy error for " + f + ":", _e);
          }
        }
      }
    }

    lastBackupDate = today;

    const retentionDays =
      parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const backupFolders = fs.readdirSync(BACKUP_DIR);
    for (const folder of backupFolders) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(folder)) {
        if (folder < cutoffStr) {
          const folderPath = path.join(BACKUP_DIR, folder);
          try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(
              "[Backup Clean] Removed backup folder older than " + retentionDays + " days: " + folder,
            );
          } catch (cleanErr) {
            console.error(
              "Failed to delete old backup folder " + folder + ":",
              cleanErr,
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("Backup routine error:", err);
  }
}

export async function saveSheetData(sheetName: string, data: any[]): Promise<void> {
  ensureDailyBackup();

  await saveDbSheetData(sheetName, data);

  try {
    const filePath = path.join(DATA_DIR, sheetName + ".json");
    const tmpPath = path.join(
      DATA_DIR,
      sheetName + "." + Date.now() + "." + Math.random().toString(36).substring(2, 7) + ".tmp",
    );
    fs.promises
      .writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8")
      .then(() => fs.promises.rename(tmpPath, filePath))
      .catch((_e) =>
        console.warn("[JSON Mirror warning on " + sheetName + "]:", _e),
      );
  } catch (_e) {
    console.warn("[JSON Mirror warning on " + sheetName + "]:", _e);
  }
}

export async function addAuditLog(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  details: string,
): Promise<void> {
  const auditLogs = getSheetData("AuditLogs");
  const prevLog = auditLogs.length > 0 ? auditLogs[0] : null;
  const prevHash = prevLog
    ? crypto.createHash("sha256").update(JSON.stringify(prevLog)).digest("hex")
    : "0".repeat(64);

  const newLog = {
    id: "al-" + Date.now(),
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    userId,
    action,
    tableName,
    recordId,
    details,
    prevHash,
  };
  auditLogs.unshift(newLog);

  // High performance: insert single log to DB in background, non-blocking
  saveDbSingleItem("AuditLogs", newLog).catch((err) =>
    console.error("[AuditLog save error]:", err),
  );

  // Mirror JSON file asynchronously
  try {
    const filePath = path.join(DATA_DIR, "AuditLogs.json");
    fs.promises
      .writeFile(filePath, JSON.stringify(auditLogs, null, 2), "utf-8")
      .catch(() => {});
  } catch (_e) {}
}

export function getAvailableBalance(
  financialYearId: string,
  officeId: string,
  categoryId: string,
) {
  const allocations = getSheetData("Allocations");
  const expenses = getSheetData("Expenses");

  const categoryAllocations = allocations.filter(
    (a: any) =>
      a.financialYearId === financialYearId &&
      a.officeId === officeId &&
      a.categoryId === categoryId,
  );

  const initialBudget = categoryAllocations
    .filter((a: any) => a.type === "Initial" || !a.type)
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const provisionAmount = categoryAllocations
    .filter((a: any) => a.type === "Adjustment")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const additionalBudget = categoryAllocations
    .filter((a: any) => a.type === "Additional")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const totalAllocated = initialBudget + provisionAmount + additionalBudget;

  const categoryExpenses = expenses.filter(
    (e: any) =>
      e.financialYearId === financialYearId &&
      e.officeId === officeId &&
      e.categoryId === categoryId,
  );

  let totalSpent = 0;
  let totalPending = 0;

  categoryExpenses.forEach((e: any) => {
    const computed = computeExpenseAmounts(e.amount, e.vatRate, e.taxRate);
    const gross = Number(computed.grossAmount || 0);
    if (e.status === "Pending") {
      totalPending += gross;
    } else if (e.status === "Rejected") {
      // Rejected
    } else {
      totalSpent += gross;
    }
  });

  const available = totalAllocated - totalSpent - totalPending;

  return {
    initialBudget,
    provisionAmount,
    additionalBudget,
    allocated: totalAllocated,
    totalAllocated,
    spent: totalSpent,
    totalSpent,
    pending: totalPending,
    totalPending,
    available,
    availableBalance: available,
  };
}

export function isFYClosed(financialYearId: string): boolean {
  if (!financialYearId) return false;
  const fys = getSheetData("FinancialYears");
  const fy = fys.find((f: any) => f.id === financialYearId);
  return !!(fy && fy.isClosed);
}
