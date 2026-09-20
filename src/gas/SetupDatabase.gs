/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - DATABASE SETUP & MIGRATION SCRIPT (SetupDatabase.gs)
 * ============================================================================
 * Run 'setupDatabase' or 'setupUsersWithPasswords' from Google Apps Script editor
 * or from the custom '📌 সিস্টেম সেটআপ' menu in Google Sheets.
 * ============================================================================
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  if (ui) {
    ui.createMenu("📌 সিস্টেম সেটআপ")
      .addItem("🚀 সম্পূর্ণ ডাটাবেস তৈরি করুন (Setup Database)", "setupDatabase")
      .addItem("🔄 বিদ্যমান ডাটাবেস মাইগ্রেশন করুন (Migrate Schema)", "migrateExistingDatabase")
      .addItem("🔑 ইউজার আইডি ও পাসওয়ার্ড অটো ফিক্স করুন (Update Users & Passwords)", "setupUsersWithPasswords")
      .addToUi();
  }
}

/**
 * Automatically initializes or upgrades the Users sheet with userId and passwordHash columns.
 */
function setupUsersWithPasswords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getSheetByName("Users");

  var headers = ["id", "userId", "name", "email", "passwordHash", "role", "officeId", "designation", "status"];
  
  var defaultUsers = [
    ["usr-1", "admin", "জনাব অ্যাডমিন (HO)", "admin@headoffice.gov", "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", "Head Office Admin", "off-ho", "পরিচালক (অর্থ ও হিসাব)", "Active"],
    ["usr-2", "ctg_manager", "জনাব রহমান (CTG)", "ctg.manager@office.gov", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "Sub-office User", "off-sub1", "আঞ্চলিক ব্যবস্থাপক", "Active"],
    ["usr-3", "syl_manager", "বেগম ফারহানা (SYL)", "sylhet.manager@office.gov", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "Sub-office User", "off-sub2", "শাখা প্রধান", "Active"],
    ["usr-4", "auditor", "সিনিয়র অডিটর", "audit@headoffice.gov", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "Report Viewer", "off-ho", "হিসাব নিরীক্ষক", "Active"]
  ];

  if (!sheet) {
    sheet = ss.insertSheet("Users");
  } else {
    sheet.clear();
  }

  sheet.appendRow(headers);
  defaultUsers.forEach(function(row) {
    sheet.appendRow(row);
  });

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#0f172a");
  headerRange.setFontColor("#f8fafc");
  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  if (ui) {
    ui.alert("সফল হয়েছে!", "Users শিট আপডেট করা হয়েছে। ডিফল্ট ইউজার আইডি: admin, ctg_manager, syl_manager, auditor (পাসওয়ার্ড যথাক্রমে admin123 / password123)।", ui.ButtonSet.OK);
  }
}

/**
 * Safely migrates existing spreadsheets by adding missing columns/sheets without deleting existing records.
 */
function migrateExistingDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var requiredSheets = {
    "Settings": ["id", "institutionName", "logoUrl", "webAppName", "description", "customThemeColor", "welcomeMessages", "notices", "showNoticeBar"],
    "FinancialYears": ["id", "name", "startDate", "endDate", "isActive", "status", "openingBalance"],
    "Offices": ["id", "name", "type", "code", "address", "parentOfficeId", "status"],
    "Users": ["id", "userId", "name", "email", "passwordHash", "role", "officeId", "designation", "status"],
    "Categories": ["id", "code", "name", "description", "budgetHead", "status"],
    "OpeningBalances": ["id", "financialYearId", "officeId", "categoryId", "amount", "createdAt"],
    "Allocations": ["id", "financialYearId", "officeId", "categoryId", "type", "allocatedAmount", "date", "referenceNo", "allocatedBy", "remarks", "status"],
    "Expenses": ["id", "financialYearId", "officeId", "categoryId", "expenseDate", "amount", "voucherNo", "voucherDate", "description", "remarks", "supportingDocument", "applicant", "entryOfficer", "noteSheetId", "status", "expenseType", "vatRate", "taxRate", "vatAmount", "taxAmount", "netPayable", "grossAmount", "approvedBy", "approvedAt"],
    "NoteSheets": ["id", "financialYearId", "officeId", "expenseId", "title", "content", "status", "createdBy", "createdAt", "pdfPath"],
    "NoteTemplates": ["id", "categoryId", "title", "bodyTemplate"],
    "AuditLogs": ["id", "timestamp", "userId", "action", "tableName", "recordId", "details"]
  };

  var updatedCount = 0;
  for (var sheetName in requiredSheets) {
    var expectedHeaders = requiredSheets[sheetName];
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(expectedHeaders);
      var headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
      headerRange.setBackground("#0f172a");
      headerRange.setFontColor("#f8fafc");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
      updatedCount++;
    } else {
      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        sheet.appendRow(expectedHeaders);
      } else {
        var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        expectedHeaders.forEach(function(expectedHeader) {
          if (currentHeaders.indexOf(expectedHeader) === -1) {
            sheet.getRange(1, lastCol + 1).setValue(expectedHeader);
            lastCol++;
            updatedCount++;
          }
        });
      }
    }
  }

  if (ui) {
    ui.alert("মাইগ্রেশন সম্পন্ন!", "ডাটাবেস স্কিমা সফলভাবে আপডেট করা হয়েছে। নতুন কলাম ও OpeningBalances শিট যুক্ত করা হয়েছে (পুরাতন ডাটা অক্ষত আছে)।", ui.ButtonSet.OK);
  }
}

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  var sheetConfigs = [
    {
      name: "Settings",
      headers: ["id", "institutionName", "logoUrl", "webAppName", "description", "customThemeColor", "welcomeMessages", "notices"],
      sample: [
        ["sys-1", "ফ্লোবোর্ড এন্টারপ্রাইজ প্ল্যাটফর্ম", "", "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম", "Office Allocation & Expense Management System", "#0f172a", "", ""]
      ]
    },
    {
      name: "FinancialYears",
      headers: ["id", "name", "startDate", "endDate", "isActive", "status", "openingBalance"],
      sample: [
        ["fy-1", "2024-2025", "2024-07-01", "2025-06-30", false, "Closed", 0],
        ["fy-2", "2025-2026", "2025-07-01", "2026-06-30", true, "Open", 0],
        ["fy-3", "2026-2027", "2026-07-01", "2027-06-30", false, "Archived", 0]
      ]
    },
    {
      name: "Offices",
      headers: ["id", "name", "type", "code", "address", "parentOfficeId", "status"],
      sample: [
        ["off-ho", "প্রধান কার্যালয় (ঢাকা)", "HeadOffice", "HO-01", "মতিঝিল, ঢাকা", "", "Active"],
        ["off-sub1", "চট্টগ্রাম আঞ্চলিক কার্যালয়", "SubOffice", "SUB-CTG", "আগ্রাবাদ, চট্টগ্রাম", "off-ho", "Active"],
        ["off-sub2", "সিলেট শাখা অফিস", "SubOffice", "SUB-SYL", "জিন্দাবাজার, সিলেট", "off-ho", "Active"],
        ["off-sub3", "রাজশাহী বিভাগীয় কার্যালয়", "SubOffice", "SUB-RAJ", "বোয়ালিয়া, রাজশাহী", "off-ho", "Active"]
      ]
    },
    {
      name: "Users",
      headers: ["id", "userId", "name", "email", "passwordHash", "role", "officeId", "designation", "status"],
      sample: [
        ["usr-1", "admin", "জনাব অ্যাডমিন (HO)", "admin@headoffice.gov", "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", "Head Office Admin", "off-ho", "পরিচালক (অর্থ ও হিসাব)", "Active"],
        ["usr-2", "ctg_manager", "জনাব রহমান (CTG)", "ctg.manager@office.gov", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "Sub-office User", "off-sub1", "আঞ্চলিক ব্যবস্থাপক", "Active"],
        ["usr-3", "syl_manager", "বেগম ফারহানা (SYL)", "sylhet.manager@office.gov", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "Sub-office User", "off-sub2", "শাখা প্রধান", "Active"],
        ["usr-4", "auditor", "সিনিয়র অডিটর", "audit@headoffice.gov", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "Report Viewer", "off-ho", "হিসাব নিরীক্ষক", "Active"]
      ]
    },
    {
      name: "Categories",
      headers: ["id", "code", "name", "description", "budgetHead", "status"],
      sample: [
        ["cat-1", "CAT-101", "বেতন ও ভাতাদি (Salary & Allowances)", "কর্মকর্তা-কর্মচারীদের মাসিক বেতন ও উৎসব ভাতা", "Revenue-101", "Active"],
        ["cat-2", "CAT-102", "অফিস ভাড়া ও ইউটিলিটি (Rent & Utilities)", "অফিস ভবন ভাড়া, বিদ্যুৎ, পানি ও ইন্টারনেট বিল", "Revenue-102", "Active"],
        ["cat-3", "CAT-201", "স্টেশনারি ও মুদ্রণ (Stationery & Printing)", "কাগজ, টোনার, কলম ও রেজিস্টার মুদ্রণ", "Supplies-201", "Active"],
        ["cat-4", "CAT-301", "মেরামত ও রক্ষণাবেক্ষণ (Maintenance)", "কম্পিউটার, এসি ও অফিস সরঞ্জাম মেরামত", "Maintenance-301", "Active"],
        ["cat-5", "CAT-401", "ভ্রমণ ও যাতায়াত (Travel & Conveyance)", "দাপ্তরিক সফর, জ্বালানি ও টিএ/ডিএ ভাতা", "Travel-401", "Active"],
        ["cat-6", "CAT-501", "প্রশিক্ষণ ও কর্মশালা (Training & Workshop)", "দক্ষতা বৃদ্ধি ও দাপ্তরিক প্রশিক্ষণ ব্যয়", "Development-501", "Active"]
      ]
    },
    {
      name: "OpeningBalances",
      headers: ["id", "financialYearId", "officeId", "categoryId", "amount", "createdAt"],
      sample: [
        ["ob-1", "fy-2", "off-sub1", "cat-1", 50000, "2025-07-01 00:00:00"]
      ]
    },
    {
      name: "Allocations",
      headers: ["id", "financialYearId", "officeId", "categoryId", "type", "allocatedAmount", "date", "referenceNo", "allocatedBy", "remarks", "status"],
      sample: [
        ["alc-1", "fy-2", "off-sub1", "cat-1", "Initial", 1500000, "2025-07-10", "HO-ALC-25-001", "usr-1", "বার্ষিক বেতন বাজেট", "Active"],
        ["alc-2", "fy-2", "off-sub1", "cat-2", "Initial", 300000, "2025-07-10", "HO-ALC-25-002", "usr-1", "অফিস ভাড়া ও বিদ্যুৎ", "Active"],
        ["alc-3", "fy-2", "off-sub1", "cat-3", "Initial", 100000, "2025-07-10", "HO-ALC-25-003", "usr-1", "স্টেশনারি বরাদ্দ", "Active"],
        ["alc-4", "fy-2", "off-sub1", "cat-3", "Additional", 50000, "2025-08-01", "HO-ALC-25-ADD-1", "usr-1", "জরুরি অতিরিক্ত স্টেশনারি", "Active"],
        ["alc-5", "fy-2", "off-sub2", "cat-1", "Initial", 1200000, "2025-07-12", "HO-ALC-25-004", "usr-1", "সিলেট শাখা বেতন", "Active"],
        ["alc-6", "fy-2", "off-sub2", "cat-2", "Adjustment", -10000, "2025-08-05", "HO-ALC-25-ADJ-1", "usr-1", "ভাড়া অতিরিক্ত সমন্বয়", "Active"]
      ]
    },
    {
      name: "Expenses",
      headers: ["id", "financialYearId", "officeId", "categoryId", "expenseDate", "amount", "voucherNo", "voucherDate", "description", "remarks", "supportingDocument", "applicant", "entryOfficer", "noteSheetId", "status", "expenseType", "vatRate", "taxRate", "vatAmount", "taxAmount", "netPayable", "grossAmount", "approvedBy", "approvedAt"],
      sample: [
        [
          "exp-1", "fy-2", "off-sub1", "cat-1", "2025-08-05", 125000, "V-CTG-001", "2025-08-01",
          "জুলাই ২০২৫ মাসের কর্মকর্তা-কর্মচারীদের বেতন পরিশোধ", "ব্যাংকের মাধ্যমে পরিশোধিত", "",
          JSON.stringify({ type: "OwnOffice", name: "জনাব রহমান", designation: "আঞ্চলিক ব্যবস্থাপক", officeId: "off-sub1" }),
          JSON.stringify({ name: "জনাব রহমান (CTG)", designation: "আঞ্চলিক ব্যবস্থাপক", officeId: "off-sub1", userId: "usr-2", dateTime: "2025-08-05 10:00:00" }),
          "ns-1", "Approved", "Regular", 0, 0, 0, 0, 125000, 125000, "usr-1", "2025-08-05 10:30:00"
        ]
      ]
    },
    {
      name: "NoteSheets",
      headers: ["id", "financialYearId", "officeId", "expenseId", "title", "content", "status", "createdBy", "createdAt", "pdfPath"],
      sample: [
        [
          "ns-1", "fy-2", "off-sub1", "exp-1", "বেতন ও ভাতাদি ব্যয়ের মঞ্জুরি আদেশ",
          "বিষয়: জুলাই ২০২৫ মাসের কর্মকর্তা-কর্মচারীদের মাসিক বেতন বাবদ ১,২৫,০০০/- (এক লক্ষ পঁচিশ হাজার) টাকা ব্যয়ের মঞ্জুরি।\n\nসূত্র: অনুমোদিত বাজেট অর্থবছর ২০২৫-২০২৬।\n\nউপযুক্ত বিষয়ের প্রেক্ষিতে জানানো যাচ্ছে যে, চট্টগ্রাম আঞ্চলিক কার্যালয়ের স্টাফদের জুলাই মাসের বেতন পরিশোধ সম্পন্ন করা হয়েছে।",
          "Generated", "usr-2", "2025-08-05 10:00:00", ""
        ]
      ]
    },
    {
      name: "NoteTemplates",
      headers: ["id", "categoryId", "title", "bodyTemplate"],
      sample: [
        [
          "nt-1", "cat-3", "স্টেশনারি ও দ্রব্যাদি ক্রয় মঞ্জুরি নোট",
          "বিষয়: {{OFFICE_NAME}}-এর জন্য {{CATEGORY_NAME}} বাবদ {{AMOUNT}}/- টাকা ব্যয়ের অনুমোদন।\n\nসূত্র: অর্থবছর {{FINANCIAL_YEAR}}-এর অনুমোদিত বাজেট বরাদ্দ।\n\nবিবরণ: {{DESCRIPTION}}\nভাউচার নম্বর: {{VOUCHER_NO}}\nতারিখ: {{DATE}}\n\nউক্ত ব্যয়ের স্বপক্ষে বিল-ভাউচার যাচাইপূর্বক অর্থ ছাড়ের জন্য পেশ করা হলো।"
        ],
        [
          "nt-2", "cat-2", "অফিস ইউটিলিটি ও বিল পরিশোধ নোট",
          "বিষয়: {{OFFICE_NAME}}-এর মাসিক বিদ্যুৎ ও সেবা বিল বাবদ {{AMOUNT}}/- টাকা পরিশোধের নোট।\n\nবিবরণ: {{DESCRIPTION}}\nভাউচার নং: {{VOUCHER_NO}} (তারিখ: {{DATE}})\n\nবিধি মোতাবেক বিলটি পরিশোধযোগ্য।"
        ]
      ]
    },
    {
      name: "AuditLogs",
      headers: ["id", "timestamp", "userId", "action", "tableName", "recordId", "details"],
      sample: [
        ["al-1", "2025-07-01 09:00:00", "usr-1", "SYSTEM_INIT", "Database", "", "Database initialized successfully with 11 core tables."]
      ]
    }
  ];

  sheetConfigs.forEach(function(config) {
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
    }
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(config.headers);
      var headerRange = sheet.getRange(1, 1, 1, config.headers.length);
      headerRange.setBackground("#0f172a");
      headerRange.setFontColor("#f8fafc");
      headerRange.setFontWeight("bold");
      headerRange.setFontFamily("Arial");
      sheet.setFrozenRows(1);
      
      if (config.sample && config.sample.length > 0) {
        config.sample.forEach(function(row) {
          sheet.appendRow(row);
        });
      }
      sheet.autoResizeColumns(1, config.headers.length);
    }
  });

  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }

  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) {
    DriveApp.createFolder(FOLDER_NAME);
  }

  if (ui) {
    ui.alert("ডাটাবেস সেটআপ সম্পন্ন!", "সকল ১১টি টেবিল এবং গুগল ড্রাইভ ফোল্ডার ('" + FOLDER_NAME + "') সফলভাবে তৈরি ও আপডেট করা হয়েছে।", ui.ButtonSet.OK);
  }
}
