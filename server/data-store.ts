import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDbSheetData, saveDbSheetData, saveDbSingleItem } from "../sqlite.js";
import { initialData } from "./default-data.js";
import { computeExpenseAmounts, isCategory134 } from "./utils.js";

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

function isCategoryMatching(
  itemCategoryId: string,
  targetCategoryId: string,
  targetCategory: any,
  categories: any[],
  is134: boolean,
): boolean {
  if (!itemCategoryId || !targetCategoryId) return false;
  if (itemCategoryId === targetCategoryId) return true;
  const itemCat = categories.find(
    (c: any) =>
      c.id === itemCategoryId ||
      c.code === itemCategoryId ||
      c.budgetHead === itemCategoryId,
  );
  if (itemCat && targetCategory) {
    if (itemCat.id === targetCategory.id) return true;
    if (
      itemCat.code &&
      targetCategory.code &&
      itemCat.code.trim().toLowerCase() === targetCategory.code.trim().toLowerCase()
    )
      return true;
    if (
      itemCat.budgetHead &&
      targetCategory.budgetHead &&
      itemCat.budgetHead.trim().toLowerCase() ===
        targetCategory.budgetHead.trim().toLowerCase()
    )
      return true;
    if (is134 && isCategory134(itemCat)) {
      const iCode = (
        itemCat.budgetHead ||
        itemCat.code ||
        itemCat.name ||
        ""
      ).replace(/\s+/g, "");
      const tCode = (
        targetCategory.budgetHead ||
        targetCategory.code ||
        targetCategory.name ||
        ""
      ).replace(/\s+/g, "");
      if (iCode && tCode && iCode === tCode) return true;
      if (
        (iCode.includes("134/1") ||
          iCode.includes("134/01") ||
          iCode.includes("১৩৪/১") ||
          iCode.includes("১৩৪/০১") ||
          iCode.includes("আসবাবপত্র")) &&
        (tCode.includes("134/1") ||
          tCode.includes("134/01") ||
          tCode.includes("১৩৪/১") ||
          tCode.includes("১৩৪/০১") ||
          tCode.includes("আসবাবপত্র"))
      ) {
        return true;
      }
    }
  }
  return false;
}

export function getAvailableBalance(
  financialYearId: string,
  officeId: string,
  categoryId: string,
  currentExpenseId?: string,
) {
  const allocations = getSheetData("Allocations");
  const expenses = getSheetData("Expenses");
  const postFactoProposals = getSheetData("PostFactoProposals") || [];
  const categories = getSheetData("Categories") || [];
  const offices = getSheetData("Offices") || [];

  const category = categories.find(
    (c: any) =>
      c.id === categoryId ||
      c.code === categoryId ||
      c.budgetHead === categoryId,
  );
  const is134 = isCategory134(category);

  const regionalOffice =
    offices.find(
      (o: any) =>
        o.type === "HeadOffice" ||
        o.id === "off-ho" ||
        (o.name && o.name.includes("আঞ্চলিক কার্যালয়")),
    );

  const targetAllocOfficeId = is134
    ? regionalOffice?.id || "off-ho"
    : officeId;

  let categoryAllocations = allocations.filter(
    (a: any) =>
      a.financialYearId === financialYearId &&
      isCategoryMatching(a.categoryId, categoryId, category, categories, is134) &&
      (is134
        ? a.officeId === targetAllocOfficeId ||
          a.officeId === "off-ho" ||
          a.officeId === officeId
        : a.officeId === officeId),
  );

  if (is134 && categoryAllocations.length === 0) {
    categoryAllocations = allocations.filter(
      (a: any) =>
        a.financialYearId === financialYearId &&
        isCategoryMatching(a.categoryId, categoryId, category, categories, is134),
    );
  }

  const openingBalances = getSheetData("OpeningBalances") || [];
  let categoryOpeningBalances = openingBalances.filter(
    (ob: any) =>
      ob.financialYearId === financialYearId &&
      isCategoryMatching(ob.categoryId, categoryId, category, categories, is134) &&
      (is134
        ? ob.officeId === targetAllocOfficeId ||
          ob.officeId === "off-ho" ||
          ob.officeId === officeId
        : ob.officeId === officeId),
  );

  if (is134 && categoryOpeningBalances.length === 0) {
    categoryOpeningBalances = openingBalances.filter(
      (ob: any) =>
        ob.financialYearId === financialYearId &&
        isCategoryMatching(ob.categoryId, categoryId, category, categories, is134),
    );
  }

  const openingProvision = categoryOpeningBalances.reduce(
    (sum: number, ob: any) => sum + Number(ob.amount || 0),
    0,
  );

  const initialBudget = categoryAllocations
    .filter((a: any) => a.type === "Initial" || !a.type)
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const adjustmentAmount = categoryAllocations
    .filter((a: any) => a.type === "Adjustment")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  // provisionAmount includes carried forward opening balance from previous financial year + in-year adjustments/provisions
  const provisionAmount = openingProvision + adjustmentAmount;

  const additionalBudget = categoryAllocations
    .filter((a: any) => a.type === "Additional")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const totalAllocated = initialBudget + provisionAmount + additionalBudget;

  const categoryExpenses = expenses.filter(
    (e: any) =>
      e.financialYearId === financialYearId &&
      isCategoryMatching(e.categoryId, categoryId, category, categories, is134) &&
      (is134 ? true : e.officeId === officeId) &&
      e.status !== "Rejected",
  );

  let totalSpent = 0;
  let totalPending = 0;

  const items: Array<{ id: string; date: string; createdAt: string; gross: number }> = [];

  categoryExpenses.forEach((e: any) => {
    const computed = computeExpenseAmounts(e.amount, e.vatRate, e.taxRate);
    const gross = Number(computed.grossAmount || 0);
    if (e.status === "Pending") {
      totalPending += gross;
    } else {
      totalSpent += gross;
    }
    items.push({
      id: e.id,
      date: e.date || e.voucherDate || e.createdAt || "",
      createdAt: e.createdAt || e.date || "",
      gross,
    });
  });

  const categoryProposals = postFactoProposals.filter(
    (p: any) =>
      p.financialYearId === financialYearId &&
      isCategoryMatching(p.categoryId, categoryId, category, categories, is134) &&
      (is134 ? true : p.officeId === officeId) &&
      p.status !== "Rejected",
  );

  categoryProposals.forEach((p: any) => {
    const amt = Number(p.totalAmount || 0);
    if (p.status === "Pending") {
      totalPending += amt;
    } else {
      totalSpent += amt;
    }
    items.push({
      id: p.id,
      date: p.date || p.createdAt || "",
      createdAt: p.createdAt || p.date || "",
      gross: amt,
    });
  });

  items.sort((a, b) => {
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    const cComp = a.createdAt.localeCompare(b.createdAt);
    if (cComp !== 0) return cComp;
    return a.id.localeCompare(b.id);
  });

  let previousExpense = 0;
  let foundCurrent = false;
  items.forEach((item) => {
    if (currentExpenseId && item.id === currentExpenseId) {
      foundCurrent = true;
      return;
    }
    if (!foundCurrent) {
      previousExpense += item.gross;
    }
  });

  if (currentExpenseId && !foundCurrent) {
    previousExpense = items
      .filter((item) => item.id !== currentExpenseId)
      .reduce((sum, item) => sum + item.gross, 0);
  } else if (!currentExpenseId) {
    previousExpense = totalSpent + totalPending;
  }

  const available = totalAllocated - totalSpent - totalPending;

  return {
    initialBudget,
    provisionAmount,
    additionalBudget,
    allocated: totalAllocated,
    totalAllocated,
    spent: totalSpent,
    totalSpent,
    previousExpense,
    pending: totalPending,
    totalPending,
    available,
    availableBalance: available,
  };
}

export function getPostFactoBalanceInfo(
  financialYearId: string,
  officeId: string,
  categoryId: string,
  currentProposalId?: string,
  is134: boolean = false,
) {
  const allocations = getSheetData("Allocations");
  const expenses = getSheetData("Expenses");
  const postFactoProposals = getSheetData("PostFactoProposals") || [];
  const categories = getSheetData("Categories") || [];
  const offices = getSheetData("Offices") || [];

  const category = categories.find(
    (c: any) =>
      c.id === categoryId ||
      c.code === categoryId ||
      c.budgetHead === categoryId,
  );
  const effectiveIs134 = is134 || isCategory134(category);

  const regionalOffice =
    offices.find(
      (o: any) =>
        o.type === "HeadOffice" ||
        o.id === "off-ho" ||
        (o.name && o.name.includes("আঞ্চলিক কার্যালয়")),
    );

  const targetAllocOfficeId = effectiveIs134
    ? regionalOffice?.id || "off-ho"
    : officeId;

  let categoryAllocations = allocations.filter(
    (a: any) =>
      a.financialYearId === financialYearId &&
      isCategoryMatching(a.categoryId, categoryId, category, categories, effectiveIs134) &&
      (effectiveIs134
        ? a.officeId === targetAllocOfficeId ||
          a.officeId === "off-ho" ||
          a.officeId === officeId
        : a.officeId === officeId),
  );

  if (effectiveIs134 && categoryAllocations.length === 0) {
    categoryAllocations = allocations.filter(
      (a: any) =>
        a.financialYearId === financialYearId &&
        isCategoryMatching(a.categoryId, categoryId, category, categories, effectiveIs134),
    );
  }

  const openingBalances = getSheetData("OpeningBalances") || [];
  let categoryOpeningBalances = openingBalances.filter(
    (ob: any) =>
      ob.financialYearId === financialYearId &&
      isCategoryMatching(ob.categoryId, categoryId, category, categories, effectiveIs134) &&
      (effectiveIs134
        ? ob.officeId === targetAllocOfficeId ||
          ob.officeId === "off-ho" ||
          ob.officeId === officeId
        : ob.officeId === officeId),
  );

  if (effectiveIs134 && categoryOpeningBalances.length === 0) {
    categoryOpeningBalances = openingBalances.filter(
      (ob: any) =>
        ob.financialYearId === financialYearId &&
        isCategoryMatching(ob.categoryId, categoryId, category, categories, effectiveIs134),
    );
  }

  const openingProvision = categoryOpeningBalances.reduce(
    (sum: number, ob: any) => sum + Number(ob.amount || 0),
    0,
  );

  const initialBudget = categoryAllocations
    .filter((a: any) => a.type === "Initial" || !a.type)
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const adjustmentAmount = categoryAllocations
    .filter((a: any) => a.type === "Adjustment")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  // provisionAmount includes carried forward opening balance from previous financial year + in-year adjustments/provisions
  const provisionAmount = openingProvision + adjustmentAmount;

  const additionalBudget = categoryAllocations
    .filter((a: any) => a.type === "Additional")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const totalAllocated = initialBudget + provisionAmount + additionalBudget;

  const categoryExpenses = expenses.filter(
    (e: any) =>
      e.financialYearId === financialYearId &&
      isCategoryMatching(e.categoryId, categoryId, category, categories, effectiveIs134) &&
      (effectiveIs134 ? true : e.officeId === officeId) &&
      e.status !== "Rejected",
  );

  let totalSpent = 0;
  categoryExpenses.forEach((e: any) => {
    const computed = computeExpenseAmounts(e.amount, e.vatRate, e.taxRate);
    const gross = Number(computed.grossAmount || 0);
    totalSpent += gross;
  });

  const priorProposals = postFactoProposals.filter(
    (p: any) =>
      p.financialYearId === financialYearId &&
      isCategoryMatching(p.categoryId, categoryId, category, categories, effectiveIs134) &&
      (effectiveIs134 ? true : p.officeId === officeId) &&
      p.status !== "Rejected" &&
      p.id !== currentProposalId,
  );

  priorProposals.forEach((p: any) => {
    totalSpent += Number(p.totalAmount || 0);
  });

  const available = totalAllocated - totalSpent;

  return {
    initialBudget,
    provisionAmount,
    additionalBudget,
    allocated: totalAllocated,
    totalAllocated,
    spent: totalSpent,
    totalSpent,
    previousExpense: totalSpent,
    pending: 0,
    totalPending: 0,
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
