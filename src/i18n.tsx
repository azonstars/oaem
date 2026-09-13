import React, { createContext, useContext, useState } from "react";

export type Language = "bn" | "en";

export interface Translations {
  appName: string;
  subtitle: string;
  financialYear: string;
  office: string;
  active: string;
  inactive: string;
  allOffices: string;
  allCategories: string;
  all: string;
  searchPlaceholder: string;
  logout: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  actions: string;
  status: string;
  date: string;
  amount: string;
  remarks: string;
  description: string;
  referenceNo: string;
  voucherNo: string;
  voucherDate: string;
  category: string;
  type: string;
  total: string;
  success: string;
  warning: string;
  error: string;

  // Sidebar Menu
  menuDashboard: string;
  menuAllocations: string;
  menuAdditionalAllocation: string;
  menuAdjustments: string;
  menuExpenses: string;
  menuNoteSheets: string;
  menuNoteTemplates: string;
  menuReports: string;
  menuOffices: string;
  menuCategories: string;
  menuCsvImport: string;
  menuUsers: string;
  menuSettings: string;
  menuAuditLogs: string;
  menuAppsScript: string;

  // Dashboard
  welcomeBack: string;
  headOfficeBadge: string;
  subOfficeBadge: string;
  headOfficeSub: string;
  subOfficeSub: string;
  newExpenseBtn: string;
  newAllocationBtn: string;
  statAllocation: string;
  statAdditional: string;
  statAdjustment: string;
  statExpense: string;
  statBalance: string;
  statUtilization: string;
  statPendingNoteSheets: string;
  categoryWiseBudget: string;
  officeWiseSummary: string;
  recentExpenses: string;
  noRecentExpenses: string;
  noCategoriesFound: string;
  noOfficesFound: string;
  spent: string;
  allocated: string;
  remaining: string;
  availableForUse: string;
  overspentAlert: string;
  formulaNote: string;

  // Allocations & Adjustments
  allocationTitle: string;
  allocationSubtitle: string;
  additionalAllocationTitle: string;
  additionalAllocationSubtitle: string;
  adjustmentTitle: string;
  adjustmentSubtitle: string;
  addAllocation: string;
  addAdditional: string;
  addAdjustment: string;
  allocationType: string;
  typeInitial: string;
  typeAdditional: string;
  typeAdjustment: string;
  allocatedAmount: string;
  allocatedBy: string;
  csvBulkUpload: string;

  // Expenses
  expensesTitle: string;
  expensesSubtitle: string;
  addExpense: string;
  applicantType: string;
  applicantOwnOffice: string;
  applicantPersonInstitution: string;
  applicantName: string;
  applicantDesignation: string;
  applicantInstitution: string;
  entryOfficer: string;
  entryOfficerName: string;
  entryOfficerDesignation: string;
  supportingDoc: string;
  duplicateVoucherAlert: string;
  viewNoteSheet: string;
  autoNoteSheetNotice: string;
  bulkGenerateNoteSheets: string;

  // Note Sheets & Templates
  noteSheetsTitle: string;
  noteSheetsSubtitle: string;
  templatesTitle: string;
  templatesSubtitle: string;
  newNoteSheet: string;
  newTemplate: string;
  templateSelect: string;
  templateVariablesHint: string;
  subjectTitle: string;
  bodyContent: string;
  printPdf: string;
  combinedPdf: string;
  generatedDirectly: string;
  noApprovalNeeded: string;

  // Print Layout & Page Setup
  printLayoutTitle: string;
  printLayoutSubtitle: string;
  contentPosition: string;
  posTop: string;
  posUpperMiddle: string;
  posCenter: string;
  posLowerMiddle: string;
  posBottom: string;
  posCustom: string;
  topOffset: string;
  leftOffset: string;
  pageSize: string;
  pageSizeA4: string;
  pageSizeLegal: string;
  pageSizeLetter: string;
  pageSizeCustom: string;
  pageWidth: string;
  pageHeight: string;
  pageOrientation: string;
  portrait: string;
  landscape: string;
  margins: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  saveSettingsForCategory: string;
  settingsSaved: string;
  resetDefaults: string;
  livePreview: string;
  guidelinesToggle: string;
  zoom: string;
  fitPage: string;
  fontSizeScale: string;
  fontSize: string;
  fontSizeCustom: string;
  lineSpacing: string;
  lineSpacingSingle: string;
  lineSpacing115: string;
  lineSpacing15: string;
  lineSpacingDouble: string;
  textAlign: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  fontFamily: string;
  paragraphSpacing: string;
  firstLineIndent: string;
  typographyTab: string;
  govtHeaderToggle: string;
  signatureToggle: string;

  // Reports
  reportsTitle: string;
  reportsSubtitle: string;
  officeSummaryTab: string;
  categorySummaryTab: string;
  expenseLedgerTab: string;
  exportPdf: string;
  exportCsv: string;
  printReport: string;

  // Settings
  settingsTitle: string;
  settingsSubtitle: string;
  institutionName: string;
  webAppName: string;
  systemLogoUrl: string;
  financialYearsTab: string;
  officesTab: string;
  categoriesTab: string;
  usersTab: string;
  generalSettingsTab: string;

  // Audit Logs
  auditTitle: string;
  auditSubtitle: string;
  timestamp: string;
  user: string;
  action: string;
  table: string;
  details: string;

  // Apps Script Deployment
  appsScriptTitle: string;
  appsScriptSubtitle: string;
  copyCode: string;
  copied: string;
  setupInstructions: string;
}

const translations: Record<Language, Translations> = {
  bn: {
    appName: "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম",
    subtitle: "স্বয়ংক্রিয় নোট শিট ও বাজেট ট্র্যাকিং",
    financialYear: "অর্থবছর",
    office: "অফিস",
    active: "সক্রিয়",
    inactive: "নিষ্ক্রিয়",
    allOffices: "সকল অফিস",
    allCategories: "সকল খাত",
    all: "সকল",
    searchPlaceholder: "রেকর্ড বা ভাউচার খুঁজুন...",
    logout: "লগআউট",
    save: "সংরক্ষণ করুন",
    cancel: "বাতিল",
    delete: "মুছে ফেলুন",
    edit: "সম্পাদনা",
    actions: "অ্যাকশন",
    status: "অবস্থা",
    date: "তারিখ",
    amount: "টাকার পরিমাণ",
    remarks: "মন্তব্য",
    description: "বিবরণ / উদ্দেশ্য",
    referenceNo: "স্মারক নং / রেফারেন্স",
    voucherNo: "ভাউচার নং",
    voucherDate: "ভাউচার তারিখ",
    category: "ব্যয়ের খাত",
    type: "ধরণ",
    total: "মোট",
    success: "সফল হয়েছে",
    warning: "সতর্কতা",
    error: "ত্রুটি",

    menuDashboard: "ড্যাশবোর্ড",
    menuAllocations: "বাজেট বরাদ্দ",
    menuAdditionalAllocation: "অতিরিক্ত বরাদ্দ",
    menuAdjustments: "সমন্বয় (Adjustment)",
    menuExpenses: "ব্যয় এন্ট্রি (Expense)",
    menuNoteSheets: "নোট শিট (Note Sheet)",
    menuNoteTemplates: "নোট টেমপ্লেট",
    menuReports: "প্রতিবেদন ও লেজার",
    menuOffices: "অফিসসমূহ",
    menuCategories: "ব্যয়ের খাতসমূহ",
    menuCsvImport: "সিএসভি ইম্পোর্ট",
    menuUsers: "ব্যবহারকারী",
    menuSettings: "সিস্টেম সেটিংস",
    menuAuditLogs: "অডিট লগ",
    menuAppsScript: "গুগল স্ক্রিপ্ট ডেপ্লয়",

    welcomeBack: "স্বাগতম,",
    headOfficeBadge: "প্রধান কার্যালয় (Head Office)",
    subOfficeBadge: "অধীনস্থ অফিস (Sub-Office)",
    headOfficeSub:
      "সার্বিক বরাদ্দ, উপ-অফিস তদারকি এবং বাজেট ব্যবহারের পূর্ণাঙ্গ নিয়ন্ত্রণ।",
    subOfficeSub:
      "শাখা অফিসের বরাদ্দ ব্যবহার, ব্যয় ভাউচার এন্ট্রি ও নোট শিট তৈরি।",
    newExpenseBtn: "নতুন ব্যয় এন্ট্রি",
    newAllocationBtn: "নতুন বরাদ্দ প্রদান",
    statAllocation: "মূল বরাদ্দ (Initial)",
    statAdditional: "অতিরিক্ত বরাদ্দ (Addl.)",
    statAdjustment: "সমন্বয় (Adjustment)",
    statExpense: "মোট ব্যয় (Expense)",
    statBalance: "অবশিষ্ট স্থিতি (Balance)",
    statUtilization: "ব্যবহারের হার (Utilization)",
    statPendingNoteSheets: "অপেক্ষমান নোট শিট",
    categoryWiseBudget: "খাতভিত্তিক বাজেট ব্যবহার ও স্থিতি",
    officeWiseSummary: "অফিসভিত্তিক বরাদ্দের সারাংশ",
    recentExpenses: "সাম্প্রতিক ব্যয়ের তালিকা",
    noRecentExpenses: "কোনো ব্যয়ের তথ্য পাওয়া যায়নি।",
    noCategoriesFound: "কোনো খাতের তথ্য পাওয়া যায়নি।",
    noOfficesFound: "কোনো অফিসের তথ্য পাওয়া যায়নি।",
    spent: "ব্যয়",
    allocated: "বরাদ্দ",
    remaining: "অবশিষ্ট",
    availableForUse: "ব্যবহারযোগ্য স্থিতি",
    overspentAlert:
      "সতর্কতা: বরাদ্দের চেয়ে ব্যয় বেশি হয়েছে (Negative Balance)!",
    formulaNote:
      "হিসাব সূত্র: প্রারম্ভিক স্থিতি + বরাদ্দ + অতিরিক্ত বরাদ্দ ± সমন্বয় - ব্যয় = অবশিষ্ট স্থিতি",

    allocationTitle: "বাজেট বরাদ্দ ব্যবস্থাপনা",
    allocationSubtitle: "বিভিন্ন অফিস ও খাতের জন্য সরকারি বরাদ্দ নির্ধারণ করুন",
    additionalAllocationTitle: "অতিরিক্ত বরাদ্দ",
    additionalAllocationSubtitle:
      "জরুরী বা সংশোধিত অতিরিক্ত বাজেট বরাদ্দ এন্ট্রি",
    adjustmentTitle: "বাজেট সমন্বয় (Adjustment)",
    adjustmentSubtitle: "খাত বা অফিসের মধ্যকার বাজেট সমন্বয় ও স্থানান্তর",
    addAllocation: "নতুন বরাদ্দ যুক্ত করুন",
    addAdditional: "অতিরিক্ত বরাদ্দ যুক্ত করুন",
    addAdjustment: "বাজেট সমন্বয় করুন",
    allocationType: "বরাদ্দের ধরণ",
    typeInitial: "মূল বরাদ্দ (Initial)",
    typeAdditional: "অতিরিক্ত বরাদ্দ (Additional)",
    typeAdjustment: "সমন্বয় (Adjustment)",
    allocatedAmount: "বরাদ্দের পরিমাণ (টাকা)",
    allocatedBy: "অনুমোদনকারী কর্মকর্তা",
    csvBulkUpload: "সিএসভি ফাইল আপলোড",

    expensesTitle: "দৈনন্দিন অফিস ব্যয় এন্ট্রি",
    expensesSubtitle:
      "ভাউচারভিত্তিক ব্যয় সংরক্ষণ ও স্বয়ংক্রিয় নোট শিট প্রস্তুত",
    addExpense: "নতুন ব্যয় এন্ট্রি করুন",
    applicantType: "আবেদনকারীর ধরণ",
    applicantOwnOffice: "নিজ অফিস / নিজস্ব কর্মকর্তা-কর্মচারী",
    applicantPersonInstitution: "ব্যক্তি / সরবরাহকারী / প্রতিষ্ঠান",
    applicantName: "আবেদনকারী / প্রাপকের নাম",
    applicantDesignation: "পদবী",
    applicantInstitution: "প্রতিষ্ঠান / ভেন্ডরের নাম",
    entryOfficer: "এন্ট্রি প্রদানকারী কর্মকর্তা",
    entryOfficerName: "কর্মকর্তার নাম",
    entryOfficerDesignation: "পদবী",
    supportingDoc: "সংযুক্ত নথির লিংক / ড্রাইভ লিংক",
    duplicateVoucherAlert:
      "সতর্কতা: এই ভাউচার নম্বরটি ইতিমধ্যে সিস্টেমে বিদ্যমান!",
    viewNoteSheet: "নোট শিট দেখুন ও প্রিন্ট করুন",
    autoNoteSheetNotice:
      "ব্যয় সংরক্ষণের সাথে সাথে টেমপ্লেট অনুযায়ী অটো নোট শিট তৈরি হবে।",
    bulkGenerateNoteSheets: "একক ক্লিকে সকল পেন্ডিং নোট শিট তৈরি করুন",

    noteSheetsTitle: "সরকারি অনুমোদন নোট শিট",
    noteSheetsSubtitle:
      "ব্যয়ের বিপরীতে প্রস্তুতকৃত ডিজিটাল নোট শিট ও প্রিন্ট কপি",
    templatesTitle: "নোট শিট টেমপ্লেট",
    templatesSubtitle: "প্রতিটি ব্যয়ের খাতের জন্য প্রাতিষ্ঠানিক খসড়া ফরম্যাট",
    newNoteSheet: "নতুন নোট শিট তৈরি",
    newTemplate: "নতুন টেমপ্লেট যুক্ত করুন",
    templateSelect: "টেমপ্লেট নির্বাচন করুন",
    templateVariablesHint:
      "উপলব্ধ ভেরিয়েবলসমূহ: {{OFFICE_NAME}}, {{FINANCIAL_YEAR}}, {{CATEGORY}}, {{EXPENSE_DATE}}, {{VOUCHER_DATE}}, {{AMOUNT}}, {{BASE_AMOUNT}}, {{VAT_RATE}}, {{VAT_AMOUNT}}, {{TAX_RATE}}, {{TAX_AMOUNT}}, {{NET_PAYABLE}}, {{GROSS_AMOUNT}}, {{DESCRIPTION}}, {{REMARKS}}, {{VOUCHER_NO}}, {{APPLICANT_NAME}}, {{APPLICANT_DESIGNATION}}, {{ENTRY_OFFICER}}, {{QUOTATION_DATE}}, {{MEMO_SUPPLY_ORDER_NO}}, {{MEMO_FORWARDING_NO}}, {{DEBIT_ACCOUNT}}, {{PAYMENT_TYPE}}, {{SUPPLY_RECIPIENT_NAME}}, {{SUPPLY_RECIPIENT_DESIGNATION}}, {{SUPPLY_RECIPIENT_ORG_NAME}}, {{SUPPLY_RECIPIENT_ADDRESS_1}}, {{SUPPLY_RECIPIENT_ADDRESS_2}}, {{SUPPLIER_ORG_1}}, {{SUPPLIER_ORG_2}}, {{SUPPLIER_ORG_3}}, {{SUPPLIER_1_UNIT_PRICE}}, {{SUPPLIER_1_TOTAL_PRICE}}, {{SUPPLIER_2_UNIT_PRICE}}, {{SUPPLIER_2_TOTAL_PRICE}}, {{SUPPLIER_3_UNIT_PRICE}}, {{SUPPLIER_3_TOTAL_PRICE}}, {{PROVISION_AMOUNT}}, {{BUDGET_ALLOCATION}}, {{ADDITIONAL_ALLOCATION}}, {{TOTAL_ALLOCATION}}, {{TOTAL_SPENT_SO_FAR}}, {{CURRENT_EXPENSE}}, {{TOTAL_SPENT_INCLUDING_CURRENT}}, {{REMAINING_BALANCE}}",
    subjectTitle: "বিষয় (Subject)",
    bodyContent: "নোটের মূল বক্তব্য",
    printPdf: "প্রিন্ট / পিডিএফ ডাউনলোড",
    combinedPdf: "খাতভিত্তিক সম্মিলিত নোট শিট",
    generatedDirectly: "সরাসরি প্রস্তুতকৃত",
    noApprovalNeeded:
      "ডিজিটালাইজড অফিস নোট (ম্যানুয়াল কাজের গতি বৃদ্ধির জন্য সরাসরি কার্যকর)",

    // Print Layout & Page Setup
    printLayoutTitle: "প্রিন্ট লেআউট ও পেজ সেটআপ",
    printLayoutSubtitle: "পেজ সাইজ, অবস্থান এবং মার্জিন কাস্টমাইজেশন",
    contentPosition: "নোট শিটের অবস্থান (Content Position)",
    posTop: "শীর্ষে (Top)",
    posUpperMiddle: "উচ্চ-মধ্যম (Upper Middle)",
    posCenter: "মাঝামাঝি (Center)",
    posLowerMiddle: "নিম্ন-মধ্যম (Lower Middle)",
    posBottom: "নিচে (Bottom)",
    posCustom: "কাস্টম পজিশন (Custom)",
    topOffset: "উপরের অফসেট / মার্জিন",
    leftOffset: "বামের অফসেট / মার্জিন",
    pageSize: "পেজের আকার (Page Size)",
    pageSizeA4: "A4 (210 × 297 mm)",
    pageSizeLegal: "Legal (216 × 356 mm / 8.5 × 14 in)",
    pageSizeLetter: "Letter (216 × 279 mm)",
    pageSizeCustom: "কাস্টম সাইজ (Custom)",
    pageWidth: "প্রস্থ (Width mm)",
    pageHeight: "উচ্চতা (Height mm)",
    pageOrientation: "পেজের অভিমুখ (Orientation)",
    portrait: "উল্লম্ব (Portrait)",
    landscape: "অনুভূমিক (Landscape)",
    margins: "মার্জিন (Margins - mm)",
    marginTop: "উপর (Top)",
    marginBottom: "নিচ (Bottom)",
    marginLeft: "বাম (Left)",
    marginRight: "ডান (Right)",
    saveSettingsForCategory: "এই খাতের ডিফল্ট হিসেবে সংরক্ষণ করুন",
    settingsSaved: "লেআউট সেটিংস সফলভাবে সংরক্ষিত হয়েছে!",
    resetDefaults: "স্ট্যান্ডার্ডে রিসেট",
    livePreview: "লাইভ প্রিন্ট প্রিভিউ",
    guidelinesToggle: "মার্জিন গাইড রেখা প্রদর্শন",
    zoom: "জুম",
    fitPage: "ফিট পেজ",
    fontSizeScale: "লেখার আকার (Scale)",
    fontSize: "ফন্ট সাইজ (Font Size - pt)",
    fontSizeCustom: "গুগল ডকসের মতো ১ থেকে ৫০০+ সাইজ",
    lineSpacing: "লাইনের ব্যবধান / দূরত্ব (Line Spacing)",
    lineSpacingSingle: "একক (1.0 Single)",
    lineSpacing115: "প্রমিত (1.15)",
    lineSpacing15: "দেড় গুণ (1.5)",
    lineSpacingDouble: "দ্বিগুণ (2.0 Double)",
    textAlign: "টেক্সট অ্যালাইনমেন্ট / জাস্টিফাই",
    alignLeft: "বামে (Left)",
    alignCenter: "মাঝামাঝি (Center)",
    alignRight: "ডানে (Right)",
    alignJustify: "জাস্টিফাই (Justify - সমান প্রান্ত)",
    fontFamily: "ফন্ট ও টাইপফেস",
    paragraphSpacing: "অনুচ্ছেদের ব্যবধান (Paragraph Spacing - pt)",
    firstLineIndent: "প্রথম লাইনের ইন্ডেন্ট (First Line Indent - mm)",
    typographyTab: "টাইপোগ্রাফি ও ফরম্যাট",
    govtHeaderToggle: "সরকারি হেডার ব্যানার",
    signatureToggle: "স্বাক্ষর ও সিল ব্লক",

    reportsTitle: "আর্থিক প্রতিবেদন ও হিসাব বিবরণী",
    reportsSubtitle: "অফিস, খাত এবং অর্থবছরভিত্তিক বিস্তারিত ব্যয় লেজার",
    officeSummaryTab: "অফিসভিত্তিক প্রতিবেদন",
    categorySummaryTab: "খাতভিত্তিক প্রতিবেদন",
    expenseLedgerTab: "বিস্তারিত ব্যয় লেজার",
    exportPdf: "পিডিএফ রিপোর্ট",
    exportCsv: "এক্সেল / সিএসভি ডাউনলোড",
    printReport: "প্রতিবেদন প্রিন্ট করুন",

    settingsTitle: "সিস্টেম ও প্রতিষ্ঠান সেটিংস",
    settingsSubtitle:
      "প্রতিষ্ঠান তথ্য, অর্থবছর, ব্যয়ের খাত ও ব্যবহারকারী পরিচালনা",
    institutionName: "প্রতিষ্ঠানের নাম",
    webAppName: "সফটওয়্যারের শিরোনাম",
    systemLogoUrl: "লোগোর ইউআরএল (ঐচ্ছিক)",
    financialYearsTab: "অর্থবছর",
    officesTab: "অফিস তালিকা",
    categoriesTab: "ব্যয়ের খাত",
    usersTab: "ব্যবহারকারীগণ",
    generalSettingsTab: "সাধারণ সেটিংস",

    auditTitle: "অডিট ও নিরাপত্তা লগ",
    auditSubtitle: "সিস্টেমের প্রতিটি লেনদেন ও পরিবর্তনের অপরিবর্তনীয় রেকর্ড",
    timestamp: "তারিখ ও সময়",
    user: "ব্যবহারকারী",
    action: "সম্পাদিত কাজ",
    table: "মডিউল / টেবিল",
    details: "বিস্তারিত বিবরণ",

    appsScriptTitle: "Google Apps Script ব্যাকএন্ড কোড",
    appsScriptSubtitle:
      "Google Sheets-এ সরাসরি Web App হিসেবে ডেপ্লয় করার প্রস্তুত কোড",
    copyCode: "কোড কপি করুন",
    copied: "কপি সম্পন্ন!",
    setupInstructions: "ডেপ্লয়মেন্ট নির্দেশিকা",
  },
  en: {
    appName: "Office Allocation & Expense Management System",
    subtitle: "Automated Note Sheets & Real-Time Budget Tracking",
    financialYear: "Financial Year",
    office: "Office",
    active: "Active",
    inactive: "Inactive",
    allOffices: "All Offices",
    allCategories: "All Categories",
    all: "All",
    searchPlaceholder: "Search records, vouchers...",
    logout: "Logout",
    save: "Save Record",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    actions: "Actions",
    status: "Status",
    date: "Date",
    amount: "Amount",
    remarks: "Remarks",
    description: "Description / Purpose",
    referenceNo: "Reference / Memo No",
    voucherNo: "Voucher No",
    voucherDate: "Voucher Date",
    category: "Budget Category",
    type: "Type",
    total: "Total",
    success: "Success",
    warning: "Warning",
    error: "Error",

    menuDashboard: "Dashboard",
    menuAllocations: "Allocation",
    menuAdditionalAllocation: "Additional Allocation",
    menuAdjustments: "Adjustment",
    menuExpenses: "Expense Entry",
    menuNoteSheets: "Note Sheet",
    menuNoteTemplates: "Note Templates",
    menuReports: "Reports & Ledger",
    menuOffices: "Offices",
    menuCategories: "Categories",
    menuCsvImport: "CSV Import",
    menuUsers: "Users",
    menuSettings: "Settings",
    menuAuditLogs: "Audit Log",
    menuAppsScript: "Apps Script Deploy",

    welcomeBack: "Welcome back,",
    headOfficeBadge: "Head Office Portal",
    subOfficeBadge: "Sub-Office Portal",
    headOfficeSub:
      "Complete oversight of all sub-office budgets, allocations, and expenditures.",
    subOfficeSub:
      "Manage sub-office budget allocations, voucher expenses, and automated note sheets.",
    newExpenseBtn: "New Expense",
    newAllocationBtn: "New Allocation",
    statAllocation: "Initial Allocation",
    statAdditional: "Additional Allocation",
    statAdjustment: "Adjustment",
    statExpense: "Total Expense",
    statBalance: "Available Balance",
    statUtilization: "Utilization Rate",
    statPendingNoteSheets: "Pending Note Sheets",
    categoryWiseBudget: "Category-wise Budget & Balance",
    officeWiseSummary: "Office-wise Allocation Summary",
    recentExpenses: "Recent Expense Transactions",
    noRecentExpenses: "No expenses recorded yet.",
    noCategoriesFound: "No categories found.",
    noOfficesFound: "No offices found.",
    spent: "Spent",
    allocated: "Allocated",
    remaining: "Remaining",
    availableForUse: "Available for Utilization",
    overspentAlert:
      "Warning: Expenses exceed total allocation (Negative Balance)!",
    formulaNote:
      "Formula: Opening Balance + Allocation + Additional Allocation ± Adjustment - Expense = Available Balance",

    allocationTitle: "Budget Allocation Management",
    allocationSubtitle: "Allocate funds across offices and expenditure heads",
    additionalAllocationTitle: "Additional Allocation",
    additionalAllocationSubtitle:
      "Manage supplementary and revised budget allocations",
    adjustmentTitle: "Budget Adjustment",
    adjustmentSubtitle:
      "Inter-category and inter-office fund transfers and corrections",
    addAllocation: "Add Initial Allocation",
    addAdditional: "Add Additional Allocation",
    addAdjustment: "Add Budget Adjustment",
    allocationType: "Allocation Type",
    typeInitial: "Initial Allocation",
    typeAdditional: "Additional Allocation",
    typeAdjustment: "Adjustment",
    allocatedAmount: "Allocated Amount (BDT)",
    allocatedBy: "Allocating Officer",
    csvBulkUpload: "Bulk CSV Upload",

    expensesTitle: "Expense Voucher Entry",
    expensesSubtitle:
      "Log voucher expenses with automatic Note Sheet generation",
    addExpense: "Add New Expense",
    applicantType: "Applicant Type",
    applicantOwnOffice: "Own Office / Internal Staff",
    applicantPersonInstitution: "Person / Vendor / Institution",
    applicantName: "Applicant / Payee Name",
    applicantDesignation: "Designation",
    applicantInstitution: "Institution / Vendor Name",
    entryOfficer: "Entry Officer Information",
    entryOfficerName: "Officer Name",
    entryOfficerDesignation: "Designation",
    supportingDoc: "Supporting Document / Drive Link",
    duplicateVoucherAlert:
      "Warning: This voucher number already exists in the system!",
    viewNoteSheet: "View & Print Note Sheet",
    autoNoteSheetNotice:
      "Note Sheet is automatically generated upon saving based on Category Template.",
    bulkGenerateNoteSheets: "Bulk Generate All Pending Note Sheets",

    noteSheetsTitle: "Digital Sanction Note Sheets",
    noteSheetsSubtitle:
      "Official digitized sanction sheets with instant print and PDF export",
    templatesTitle: "Note Sheet Templates",
    templatesSubtitle:
      "Standard official draft templates for each budget category",
    newNoteSheet: "Create Note Sheet",
    newTemplate: "Add Note Template",
    templateSelect: "Select Template",
    templateVariablesHint:
      "Available variables: {{OFFICE_NAME}}, {{FINANCIAL_YEAR}}, {{CATEGORY}}, {{EXPENSE_DATE}}, {{VOUCHER_DATE}}, {{AMOUNT}}, {{BASE_AMOUNT}}, {{VAT_RATE}}, {{VAT_AMOUNT}}, {{TAX_RATE}}, {{TAX_AMOUNT}}, {{NET_PAYABLE}}, {{GROSS_AMOUNT}}, {{DESCRIPTION}}, {{REMARKS}}, {{VOUCHER_NO}}, {{APPLICANT_NAME}}, {{APPLICANT_DESIGNATION}}, {{ENTRY_OFFICER}}, {{QUOTATION_DATE}}, {{MEMO_SUPPLY_ORDER_NO}}, {{MEMO_FORWARDING_NO}}, {{DEBIT_ACCOUNT}}, {{PAYMENT_TYPE}}, {{SUPPLY_RECIPIENT_NAME}}, {{SUPPLY_RECIPIENT_DESIGNATION}}, {{SUPPLY_RECIPIENT_ORG_NAME}}, {{SUPPLY_RECIPIENT_ADDRESS_1}}, {{SUPPLY_RECIPIENT_ADDRESS_2}}, {{SUPPLIER_ORG_1}}, {{SUPPLIER_ORG_2}}, {{SUPPLIER_ORG_3}}, {{SUPPLIER_1_UNIT_PRICE}}, {{SUPPLIER_1_TOTAL_PRICE}}, {{SUPPLIER_2_UNIT_PRICE}}, {{SUPPLIER_2_TOTAL_PRICE}}, {{SUPPLIER_3_UNIT_PRICE}}, {{SUPPLIER_3_TOTAL_PRICE}}, {{PROVISION_AMOUNT}}, {{BUDGET_ALLOCATION}}, {{ADDITIONAL_ALLOCATION}}, {{TOTAL_ALLOCATION}}, {{TOTAL_SPENT_SO_FAR}}, {{CURRENT_EXPENSE}}, {{TOTAL_SPENT_INCLUDING_CURRENT}}, {{REMAINING_BALANCE}}",
    subjectTitle: "Subject",
    bodyContent: "Body Content",
    printPdf: "Print / Save PDF",
    combinedPdf: "Combined Category PDF",
    generatedDirectly: "Directly Generated",
    noApprovalNeeded:
      "Automated Office Sanction (Streamlined for rapid manual digitization)",

    // Print Layout & Page Setup
    printLayoutTitle: "Print Layout & Page Setup",
    printLayoutSubtitle:
      "Customize page dimensions, placement, margins and typography",
    contentPosition: "Note Sheet Content Position",
    posTop: "Top",
    posUpperMiddle: "Upper Middle",
    posCenter: "Center",
    posLowerMiddle: "Lower Middle",
    posBottom: "Bottom",
    posCustom: "Custom Position",
    topOffset: "Top Offset / Margin",
    leftOffset: "Left Offset / Margin",
    pageSize: "Page Size",
    pageSizeA4: "A4 (210 × 297 mm)",
    pageSizeLegal: "Legal (216 × 356 mm / 8.5 × 14 in)",
    pageSizeLetter: "Letter (216 × 279 mm)",
    pageSizeCustom: "Custom Size",
    pageWidth: "Width (mm)",
    pageHeight: "Height (mm)",
    pageOrientation: "Page Orientation",
    portrait: "Portrait",
    landscape: "Landscape",
    margins: "Margins (mm)",
    marginTop: "Top",
    marginBottom: "Bottom",
    marginLeft: "Left",
    marginRight: "Right",
    saveSettingsForCategory: "Save as Default for Category",
    settingsSaved: "Print layout settings saved successfully!",
    resetDefaults: "Reset to Default",
    livePreview: "Live Print Preview",
    guidelinesToggle: "Show Margin Guides",
    zoom: "Zoom",
    fitPage: "Fit Page",
    fontSizeScale: "Font Scale",
    fontSize: "Font Size (pt)",
    fontSizeCustom: "Exact size 1 to 500+ pt",
    lineSpacing: "Line Spacing",
    lineSpacingSingle: "Single (1.0)",
    lineSpacing115: "Standard (1.15)",
    lineSpacing15: "1.5 Lines",
    lineSpacingDouble: "Double (2.0)",
    textAlign: "Text Alignment & Justification",
    alignLeft: "Left",
    alignCenter: "Center",
    alignRight: "Right",
    alignJustify: "Justify",
    fontFamily: "Font Family",
    paragraphSpacing: "Paragraph Spacing (pt)",
    firstLineIndent: "First Line Indent (mm)",
    typographyTab: "Typography",
    govtHeaderToggle: "Government Header Banner",
    signatureToggle: "Signatures & Seal Block",

    reportsTitle: "Financial Reports & Ledger",
    reportsSubtitle:
      "Comprehensive office, category, and ledger financial analytics",
    officeSummaryTab: "Office-wise Report",
    categorySummaryTab: "Category-wise Report",
    expenseLedgerTab: "Detailed Expense Ledger",
    exportPdf: "Export PDF",
    exportCsv: "Export CSV / Excel",
    printReport: "Print Report",

    settingsTitle: "System & Organization Settings",
    settingsSubtitle:
      "Manage organization info, financial years, categories, and users",
    institutionName: "Institution Name",
    webAppName: "System Display Title",
    systemLogoUrl: "Logo URL (Optional)",
    financialYearsTab: "Financial Years",
    officesTab: "Offices",
    categoriesTab: "Categories",
    usersTab: "System Users",
    generalSettingsTab: "General Settings",

    auditTitle: "Audit Trail & Activity Log",
    auditSubtitle:
      "Tamper-evident logs of all allocations, expenses, and system actions",
    timestamp: "Timestamp",
    user: "User",
    action: "Action",
    table: "Module / Table",
    details: "Details",

    appsScriptTitle: "Google Apps Script Backend Code",
    appsScriptSubtitle:
      "Ready-to-deploy code to run as a Google Sheets Web App",
    copyCode: "Copy Code",
    copied: "Copied!",
    setupInstructions: "Deployment Guide",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app_lang");
    return saved === "en" || saved === "bn" ? saved : "bn";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_lang", lang);
  };

  const t = translations[language];

  // Helper for Bengali/English numerals
  const formatNumber = (num: number): string => {
    if (isNaN(num)) return "0";
    const formatted = num.toLocaleString();
    if (language === "bn") {
      const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return formatted.replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
    }
    return formatted;
  };

  const formatCurrency = (amount: number): string => {
    return `৳ ${formatNumber(amount)}`;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, formatCurrency, formatNumber }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
