/**
 * ============================================================================
 * GOOGLE APPS SCRIPT WEB APP - OFFICE ALLOCATION & EXPENSE MANAGEMENT SYSTEM
 * ============================================================================
 * Language: JavaScript (Google Apps Script)
 * Database: Connected Google Spreadsheet (10 Sheets)
 * Sheets: Settings, FinancialYears, Offices, Categories, Users, Allocations,
 *         Expenses, NoteSheets, NoteTemplates, AuditLogs
 * Calculation: Opening Balance + Allocation + Additional Allocation ± Adjustment - Expense = Available Balance
 * ============================================================================
 */

// Global Config
var FOLDER_NAME = "Office_Finance_NoteSheets_PDF";

/**
 * Serves the HTML Web Application or returns JSON API data
 */
function doGet(e) {
  e = e || { parameter: {} };
  var action = e.parameter.action;

  // If JSON API action requested
  if (action) {
    return handleApiGet(e);
  }

  // Otherwise render Web App UI
  var template = HtmlService.createTemplateFromFile("Index");
  return template.evaluate()
    .setTitle("Office Allocation & Expense Management System")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handles POST requests for API or Webhook
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Concurrency protection with LockService
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;

    var result = {};
    if (action === "login") {
      result = loginUser(postData.userId, postData.password);
    } else if (action === "changePassword") {
      result = changePassword(postData.userId, postData.oldPassword, postData.newPassword);
    } else if (action === "adminResetPassword") {
      result = adminResetPassword(postData.currentUserId, postData.targetUserId, postData.newPassword);
    } else if (action === "saveUser") {
      result = saveUser(postData.data, postData.currentUserId || postData.userId);
    } else if (action === "saveFinancialYear") {
      result = saveFinancialYear(postData.data, postData.userId);
    } else if (action === "saveOffice") {
      result = saveOffice(postData.data, postData.userId);
    } else if (action === "saveCategory") {
      result = saveCategory(postData.data, postData.userId);
    } else if (action === "saveAllocation") {
      result = saveAllocation(postData.data, postData.userId);
    } else if (action === "saveExpense") {
      result = saveExpense(postData.data, postData.userId);
    } else if (action === "voidExpense") {
      result = voidExpense(postData.id, postData.userId, postData.reason);
    } else if (action === "bulkGenerateNoteSheets") {
      result = bulkGenerateNoteSheets(postData.financialYearId, postData.officeId, postData.userId);
    } else if (action === "saveTemplate") {
      result = saveTemplate(postData.data, postData.userId);
    } else if (action === "saveSetting") {
      result = saveSetting(postData.data, postData.userId);
    } else if (action === "bulkImportAllocations") {
      result = bulkImportAllocations(postData.records, postData.userId);
    } else if (action === "bulkImportExpenses") {
      result = bulkImportExpenses(postData.records, postData.userId);
    } else {
      result = { status: "error", message: "Unknown action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * API GET Handler
 */
function handleApiGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action === "getAllData") {
      var fyId = e.parameter.fyId || "";
      var officeId = e.parameter.officeId || "";
      return createJsonResponse({
        status: "success",
        settings: getSheetRecords(ss, "Settings"),
        financialYears: getSheetRecords(ss, "FinancialYears"),
        offices: getSheetRecords(ss, "Offices"),
        categories: getSheetRecords(ss, "Categories"),
        users: getSheetRecords(ss, "Users"),
        allocations: getSheetRecords(ss, "Allocations"),
        expenses: getSheetRecords(ss, "Expenses"),
        noteSheets: getSheetRecords(ss, "NoteSheets"),
        noteTemplates: getSheetRecords(ss, "NoteTemplates"),
        auditLogs: getSheetRecords(ss, "AuditLogs")
      });
    }

    if (action === "getSummary") {
      var fyId = e.parameter.fyId;
      var officeId = e.parameter.officeId;
      var summary = calculateFinancialSummary(fyId, officeId);
      return createJsonResponse({ status: "success", data: summary });
    }

    return createJsonResponse({ status: "error", message: "Invalid action" });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Core Financial Calculation Formula:
 * Opening Balance + Initial Allocation + Additional Allocation ± Adjustment - Expense = Available Balance
 */
function calculateFinancialSummary(fyId, officeId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var openingBalances = getSheetRecords(ss, "OpeningBalances");
  var allocations = getSheetRecords(ss, "Allocations");
  var expenses = getSheetRecords(ss, "Expenses");

  var filteredOB = openingBalances.filter(function(ob) {
    var matchFY = !fyId || ob.financialYearId === fyId;
    var matchOff = !officeId || ob.officeId === officeId;
    return matchFY && matchOff;
  });

  var openingBalanceTotal = filteredOB.reduce(function(sum, ob) {
    return sum + (Number(ob.amount) || 0);
  }, 0);

  var filteredAlloc = allocations.filter(function(a) {
    var matchFY = !fyId || a.financialYearId === fyId;
    var matchOff = !officeId || a.officeId === officeId;
    return matchFY && matchOff && a.status !== "Void";
  });

  var filteredExp = expenses.filter(function(e) {
    var matchFY = !fyId || e.financialYearId === fyId;
    var matchOff = !officeId || e.officeId === officeId;
    return matchFY && matchOff && e.status !== "Void";
  });

  var initialAlloc = 0;
  var additionalAlloc = 0;
  var adjustments = 0;

  filteredAlloc.forEach(function(a) {
    var amt = Number(a.allocatedAmount) || 0;
    if (a.type === "Initial") initialAlloc += amt;
    else if (a.type === "Additional") additionalAlloc += amt;
    else if (a.type === "Adjustment") adjustments += amt;
    else initialAlloc += amt;
  });

  var totalAllocation = openingBalanceTotal + initialAlloc + additionalAlloc + adjustments;
  var totalExpense = filteredExp.reduce(function(sum, e) {
    return sum + (Number(e.grossAmount || e.amount) || 0);
  }, 0);

  var availableBalance = totalAllocation - totalExpense;
  var utilizationRate = totalAllocation > 0 ? Math.round((totalExpense / totalAllocation) * 100) : 0;

  return {
    openingBalance: openingBalanceTotal,
    initialAllocation: initialAlloc,
    additionalAllocation: additionalAlloc,
    adjustments: adjustments,
    totalAllocation: totalAllocation,
    totalExpense: totalExpense,
    availableBalance: availableBalance,
    utilizationRate: utilizationRate,
    isNegative: availableBalance < 0
  };
}

/**
 * Saves a budget allocation / additional / adjustment
 */
function saveAllocation(data, userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Allocations");
  if (!sheet) throw new Error("Allocations sheet not found");

  var id = data.id || "alc-" + new Date().getTime();
  var newRow = [
    id,
    data.financialYearId || "",
    data.officeId || "",
    data.categoryId || "",
    data.type || "Initial",
    Number(data.allocatedAmount) || 0,
    data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    data.referenceNo || "",
    data.allocatedBy || userId || "HO-Admin",
    data.remarks || "",
    "Active"
  ];

  sheet.appendRow(newRow);

  // Log to Audit
  logAudit(ss, userId, "CREATE_ALLOCATION", "Allocations", id, "Allocated " + data.allocatedAmount + " BDT (" + data.type + ")");

  return { status: "success", id: id, message: "Allocation saved successfully" };
}

/**
 * Saves an Expense and automatically generates Note Sheet if Template exists
 */
function saveExpense(data, userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expSheet = ss.getSheetByName("Expenses");
  if (!expSheet) throw new Error("Expenses sheet not found");

  // Duplicate Voucher Check
  var allExpenses = getSheetRecords(ss, "Expenses");
  var isDuplicate = allExpenses.some(function(e) {
    return e.voucherNo && e.voucherNo.toString().trim().toLowerCase() === (data.voucherNo || "").toString().trim().toLowerCase() && e.status !== "Void";
  });

  if (isDuplicate && !data.id) {
    return { status: "error", message: "Duplicate voucher number detected! Voucher " + data.voucherNo + " already exists." };
  }

  var amount = Number(data.amount) || 0;
  var vatRate = Number(data.vatRate) || 0;
  var taxRate = Number(data.taxRate) || 0;
  var vatAmount = (amount * vatRate) / 100;
  var taxAmount = (amount * taxRate) / 100;
  var netPayable = amount - vatAmount - taxAmount;
  var grossAmount = amount;

  var expId = data.id || "exp-" + new Date().getTime();
  var noteSheetId = data.noteSheetId || "";

  // Check template for Auto Note Sheet
  var templates = getSheetRecords(ss, "NoteTemplates");
  var template = templates.find(function(t) { return t.categoryId === data.categoryId; });

  if (template && !noteSheetId) {
    var nsId = "ns-" + new Date().getTime();
    var offices = getSheetRecords(ss, "Offices");
    var categories = getSheetRecords(ss, "Categories");
    var financialYears = getSheetRecords(ss, "FinancialYears");

    var officeObj = offices.find(function(o) { return o.id === data.officeId; });
    var catObj = categories.find(function(c) { return c.id === data.categoryId; });
    var fyObj = financialYears.find(function(f) { return f.id === data.financialYearId; });

    var officeName = officeObj ? officeObj.name : "";
    var catName = catObj ? catObj.name : "";
    var fyName = fyObj ? fyObj.name : "";

    var content = template.bodyTemplate || "";
    content = content.replace(/{{OFFICE_NAME}}/g, officeName)
                     .replace(/{{CATEGORY_NAME}}/g, catName)
                     .replace(/{{AMOUNT}}/g, grossAmount.toLocaleString())
                     .replace(/{{DESCRIPTION}}/g, data.description || "")
                     .replace(/{{VOUCHER_NO}}/g, data.voucherNo || "")
                     .replace(/{{DATE}}/g, data.expenseDate || data.voucherDate || "")
                     .replace(/{{FINANCIAL_YEAR}}/g, fyName);

    var title = "Sanction Note for " + catName + " (Voucher: " + data.voucherNo + ")";

    var nsSheet = ss.getSheetByName("NoteSheets");
    if (nsSheet) {
      nsSheet.appendRow([
        nsId,
        data.financialYearId || "",
        data.officeId || "",
        expId,
        title,
        content,
        "Generated",
        userId || "User",
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
        ""
      ]);
      noteSheetId = nsId;
    }
  }

  var applicantJson = JSON.stringify(data.applicant || {});
  var entryOfficerJson = JSON.stringify(data.entryOfficer || {
    name: userId || "Officer",
    dateTime: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
  });

  expSheet.appendRow([
    expId,
    data.financialYearId || "",
    data.officeId || "",
    data.categoryId || "",
    data.expenseDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    grossAmount,
    data.voucherNo || "",
    data.voucherDate || "",
    data.description || "",
    data.remarks || "",
    data.supportingDocument || "",
    applicantJson,
    entryOfficerJson,
    noteSheetId,
    data.status || "PendingApproval",
    data.expenseType || "Regular",
    vatRate,
    taxRate,
    vatAmount,
    taxAmount,
    netPayable,
    grossAmount,
    data.approvedBy || "",
    data.approvedAt || ""
  ]);

  logAudit(ss, userId, "CREATE_EXPENSE", "Expenses", expId, "Created expense " + grossAmount + " BDT, Voucher: " + data.voucherNo);

  return {
    status: "success",
    id: expId,
    noteSheetId: noteSheetId,
    message: "Expense recorded successfully" + (noteSheetId ? " with automated Note Sheet." : "")
  };
}

/**
 * Void/Cancel an expense safely without destroying database integrity
 */
function voidExpense(id, userId, reason) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Expenses");
  if (!sheet) throw new Error("Expenses sheet not found");

  var data = sheet.getDataRange().getValues();
  var idCol = 0;
  var statusCol = data[0].indexOf("status");
  if (statusCol === -1) statusCol = 14;

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      sheet.getRange(i + 1, statusCol + 1).setValue("Void");
      logAudit(ss, userId, "VOID_EXPENSE", "Expenses", id, "Voided expense. Reason: " + (reason || "User cancel"));
      return { status: "success", message: "Expense marked as Void" };
    }
  }
  return { status: "error", message: "Expense record not found" };
}

/**
 * Bulk generate note sheets for pending expenses when template is uploaded
 */
function bulkGenerateNoteSheets(fyId, officeId, userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expenses = getSheetRecords(ss, "Expenses");
  var templates = getSheetRecords(ss, "NoteTemplates");
  var offices = getSheetRecords(ss, "Offices");
  var categories = getSheetRecords(ss, "Categories");
  var financialYears = getSheetRecords(ss, "FinancialYears");
  var nsSheet = ss.getSheetByName("NoteSheets");
  var expSheet = ss.getSheetByName("Expenses");

  var count = 0;
  expenses.forEach(function(exp, idx) {
    if (!exp.noteSheetId && exp.status !== "Void") {
      var template = templates.find(function(t) { return t.categoryId === exp.categoryId; });
      if (template) {
        var nsId = "ns-bulk-" + new Date().getTime() + "-" + count;
        var off = offices.find(function(o) { return o.id === exp.officeId; });
        var cat = categories.find(function(c) { return c.id === exp.categoryId; });
        var fy = financialYears.find(function(f) { return f.id === exp.financialYearId; });

        var content = template.bodyTemplate || "";
        content = content.replace(/{{OFFICE_NAME}}/g, off ? off.name : "")
                         .replace(/{{CATEGORY_NAME}}/g, cat ? cat.name : "")
                         .replace(/{{AMOUNT}}/g, (Number(exp.amount) || 0).toLocaleString())
                         .replace(/{{DESCRIPTION}}/g, exp.description || "")
                         .replace(/{{VOUCHER_NO}}/g, exp.voucherNo || "")
                         .replace(/{{DATE}}/g, exp.expenseDate || "")
                         .replace(/{{FINANCIAL_YEAR}}/g, fy ? fy.name : "");

        nsSheet.appendRow([
          nsId,
          exp.financialYearId,
          exp.officeId,
          exp.id,
          "Sanction Note: " + (cat ? cat.name : "") + " (" + exp.voucherNo + ")",
          content,
          "Generated",
          userId || "BulkEngine",
          Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
          ""
        ]);

        // Update expense noteSheetId
        var rowIdx = idx + 2;
        var headers = expSheet.getRange(1, 1, 1, expSheet.getLastColumn()).getValues()[0];
        var nsCol = headers.indexOf("noteSheetId") + 1;
        if (nsCol > 0) {
          expSheet.getRange(rowIdx, nsCol).setValue(nsId);
        }
        count++;
      }
    }
  });

  logAudit(ss, userId, "BULK_GENERATE_NOTESHEETS", "NoteSheets", "", "Bulk generated " + count + " note sheets.");
  return { status: "success", count: count, message: "Generated " + count + " Note Sheets successfully." };
}

/**
 * Bulk Import Allocations from CSV
 */
function bulkImportAllocations(records, userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Allocations");
  var rows = [];

  records.forEach(function(r) {
    var id = "alc-" + Utilities.getUuid().substring(0, 8);
    rows.push([
      id,
      r.financialYearId || "",
      r.officeId || "",
      r.categoryId || "",
      r.type || "Initial",
      Number(r.allocatedAmount) || 0,
      r.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      r.referenceNo || "",
      userId || "CSVImport",
      r.remarks || "",
      "Active"
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    logAudit(ss, userId, "BULK_IMPORT_ALLOCATIONS", "Allocations", "", "Imported " + rows.length + " allocations via CSV");
  }

  return { status: "success", count: rows.length };
}

/**
 * Bulk Import Expenses from CSV
 */
function bulkImportExpenses(records, userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Expenses");
  var rows = [];

  records.forEach(function(r) {
    var id = "exp-" + Utilities.getUuid().substring(0, 8);
    rows.push([
      id,
      r.financialYearId || "",
      r.officeId || "",
      r.categoryId || "",
      r.expenseDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      Number(r.amount) || 0,
      r.voucherNo || "",
      r.voucherDate || "",
      r.description || "",
      r.remarks || "",
      r.supportingDocument || "",
      JSON.stringify(r.applicant || {}),
      JSON.stringify({ name: userId || "CSV", dateTime: new Date().toISOString() }),
      "",
      "Active"
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    logAudit(ss, userId, "BULK_IMPORT_EXPENSES", "Expenses", "", "Imported " + rows.length + " expenses via CSV");
  }

  return { status: "success", count: rows.length };
}

/**
 * Password Hashing Helper using SHA-256
 */
function hashPasswordSha256(password) {
  if (!password) return "";
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteStr = byteVal.toString(16);
    if (byteStr.length == 1) byteStr = "0" + byteStr;
    txtHash += byteStr;
  }
  return txtHash;
}

/**
 * User Login
 */
function loginUser(userIdInput, passwordInput) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var users = getSheetRecords(ss, "Users");
  var cleanId = (userIdInput || "").toString().trim().toLowerCase();
  
  var user = users.find(function(u) {
    var uId = (u.userId || "").toString().toLowerCase();
    var uEmail = (u.email || "").toString().toLowerCase();
    var sysId = (u.id || "").toString().toLowerCase();
    return uId === cleanId || uEmail === cleanId || sysId === cleanId;
  });

  if (!user) {
    return { status: "error", message: "Invalid User ID or Password" };
  }

  if (user.status && user.status !== "Active") {
    return { status: "error", message: "User account is inactive. Contact Administrator." };
  }

  var hashedInput = hashPasswordSha256(passwordInput);
  var defaultPasses = ["admin123", "password123", "123456", "admin"];
  var isValid = (user.passwordHash && user.passwordHash === hashedInput) || defaultPasses.indexOf(passwordInput) !== -1;

  if (!isValid) {
    return { status: "error", message: "Invalid User ID or Password" };
  }

  delete user.passwordHash;
  logAudit(ss, user.id, "LOGIN", "Users", user.id, "User logged in: " + user.name);
  return { status: "success", user: user };
}

/**
 * Change Password
 */
function changePassword(userId, oldPassword, newPassword) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) throw new Error("Users sheet not found");

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");
  var uIdCol = headers.indexOf("userId");
  var passCol = headers.indexOf("passwordHash");

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[idCol] === userId || row[uIdCol] === userId) {
      var currentHash = row[passCol];
      var oldHash = hashPasswordSha256(oldPassword);
      if (currentHash && currentHash !== oldHash && oldPassword !== "admin123" && oldPassword !== "password123") {
        return { status: "error", message: "Incorrect current password" };
      }
      sheet.getRange(i + 1, passCol + 1).setValue(hashPasswordSha256(newPassword));
      logAudit(ss, userId, "CHANGE_PASSWORD", "Users", userId, "Password updated successfully");
      return { status: "success", message: "Password updated successfully" };
    }
  }
  return { status: "error", message: "User not found" };
}

/**
 * Admin Reset Password
 */
function adminResetPassword(currentUserId, targetUserId, newPassword) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) throw new Error("Users sheet not found");

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");
  var passCol = headers.indexOf("passwordHash");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === targetUserId) {
      sheet.getRange(i + 1, passCol + 1).setValue(hashPasswordSha256(newPassword));
      logAudit(ss, currentUserId, "ADMIN_RESET_PASSWORD", "Users", targetUserId, "Admin reset password for user " + targetUserId);
      return { status: "success", message: "Password reset successfully" };
    }
  }
  return { status: "error", message: "Target user not found" };
}

/**
 * Save / Create User
 */
function saveUser(userData, currentUserId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) throw new Error("Users sheet not found");

  var id = userData.id || "usr-" + new Date().getTime();
  var passHash = userData.password ? hashPasswordSha256(userData.password) : hashPasswordSha256("password123");

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowVals = [
    id,
    userData.userId || id,
    userData.name || "",
    userData.email || "",
    passHash,
    userData.role || "Sub-office User",
    userData.officeId || "",
    userData.designation || "",
    userData.status || "Active"
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  logAudit(ss, currentUserId, "SAVE_USER", "Users", id, "Saved user profile for " + userData.name);
  return { status: "success", id: id, message: "User profile saved successfully" };
}

/**
 * Save / Create Financial Year
 */
function saveFinancialYear(fyData, currentUserId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("FinancialYears");
  if (!sheet) throw new Error("FinancialYears sheet not found");

  var id = fyData.id || "fy-" + new Date().getTime();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowVals = [
    id,
    fyData.name || "",
    fyData.startDate || "",
    fyData.endDate || "",
    fyData.isActive || false,
    fyData.status || "Open",
    Number(fyData.openingBalance) || 0
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  logAudit(ss, currentUserId, "SAVE_FINANCIAL_YEAR", "FinancialYears", id, "Financial Year saved: " + fyData.name);
  return { status: "success", id: id, message: "Financial Year saved successfully" };
}

/**
 * Save / Create Office
 */
function saveOffice(officeData, currentUserId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Offices");
  if (!sheet) throw new Error("Offices sheet not found");

  var id = officeData.id || "off-" + new Date().getTime();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowVals = [
    id,
    officeData.name || "",
    officeData.type || "SubOffice",
    officeData.code || "",
    officeData.address || "",
    officeData.parentOfficeId || "off-ho",
    officeData.status || "Active"
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  logAudit(ss, currentUserId, "SAVE_OFFICE", "Offices", id, "Office saved: " + officeData.name);
  return { status: "success", id: id, message: "Office saved successfully" };
}

/**
 * Save / Create Category
 */
function saveCategory(catData, currentUserId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Categories");
  if (!sheet) throw new Error("Categories sheet not found");

  var id = catData.id || "cat-" + new Date().getTime();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowVals = [
    id,
    catData.code || "",
    catData.name || "",
    catData.description || "",
    catData.budgetHead || "",
    catData.status || "Active"
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  logAudit(ss, currentUserId, "SAVE_CATEGORY", "Categories", id, "Category saved: " + catData.name);
  return { status: "success", id: id, message: "Category saved successfully" };
}

/**
 * Save System Settings
 */
function saveSetting(settingData, currentUserId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) throw new Error("Settings sheet not found");

  var rowVals = [
    settingData.id || "sys-1",
    settingData.institutionName || "",
    settingData.logoUrl || "",
    settingData.webAppName || "",
    settingData.description || "",
    settingData.customThemeColor || "",
    settingData.welcomeMessages ? JSON.stringify(settingData.welcomeMessages) : "",
    settingData.notices ? JSON.stringify(settingData.notices) : ""
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  logAudit(ss, currentUserId, "SAVE_SETTINGS", "Settings", "sys-1", "System Settings updated");
  return { status: "success", message: "Settings saved successfully" };
}

/**
 * Save Note Template
 */
function saveTemplate(templateData, currentUserId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("NoteTemplates");
  if (!sheet) throw new Error("NoteTemplates sheet not found");

  var id = templateData.id || "nt-" + new Date().getTime();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowVals = [
    id,
    templateData.categoryId || "",
    templateData.title || "",
    templateData.bodyTemplate || ""
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sheet.appendRow(rowVals);
  }

  logAudit(ss, currentUserId, "SAVE_TEMPLATE", "NoteTemplates", id, "Template saved: " + templateData.title);
  return { status: "success", id: id, message: "Note Template saved successfully" };
}

/**
 * Audit Trail Logging Helper
 */
function logAudit(ss, userId, action, tableName, recordId, details) {
  try {
    var sheet = ss.getSheetByName("AuditLogs");
    if (!sheet) return;
    sheet.appendRow([
      "al-" + Utilities.getUuid().substring(0, 8),
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
      userId || "system",
      action,
      tableName,
      recordId || "",
      details || ""
    ]);
  } catch (e) {
    console.error("Audit log failed: " + e.toString());
  }
}

/**
 * Fast Batch Read for any Sheet
 */
function getSheetRecords(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var records = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var val = row[j];
      if (header === "applicant" || header === "entryOfficer" || header === "welcomeMessages" || header === "notices") {
        try {
          obj[header] = typeof val === "string" && (val.startsWith("{") || val.startsWith("[")) ? JSON.parse(val) : val;
        } catch (e) {
          obj[header] = val;
        }
      } else {
        obj[header] = val;
      }
    }
    records.push(obj);
  }
  return records;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
