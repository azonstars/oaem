import { z } from "zod";

export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const dateSchema = z.string().regex(dateRegex, { message: "তারিখ অবশ্যই YYYY-MM-DD ফরম্যাটে হতে হবে (যেমন: 2026-06-30)।" });

export const SettingsSchema = z.object({
  institutionName: z.string().min(1, "প্রতিষ্ঠানের নাম আবশ্যক"),
  webAppName: z.string().min(1, "সফটওয়্যারের নাম আবশ্যক"),
  logoUrl: z.string().optional().default(""),
  loginLogoUrl: z.string().optional().default(""),
  description: z.string().optional().default(""),
  customThemeColor: z.string().optional(),
  welcomeMessages: z.any().optional(),
  notices: z.array(z.string()).optional(),
  requireExpenseApproval: z.boolean().optional(),
  financialYearStartMonth: z.number().min(1).max(12).optional(),
  financialYearEndMonth: z.number().min(1).max(12).optional(),
  showNoticeBar: z.boolean().optional(),
}).strip();

export const FinancialYearsSchema = z.object({
  name: z.string().min(1, "অর্থবছরের নাম আবশ্যক"),
  startDate: dateSchema,
  endDate: dateSchema,
  isActive: z.boolean().optional().default(false),
  status: z.enum(["Active", "Inactive", "Closed"]).optional().default("Active"),
  isClosed: z.boolean().optional().default(false),
}).strip();

export const OfficesSchema = z.object({
  name: z.string().min(1, "অফিসের নাম আবশ্যক"),
  type: z.enum(["HeadOffice", "SubOffice"]).default("SubOffice"),
  code: z.string().optional().default(""),
  address: z.string().optional().default(""),
  parentOfficeId: z.string().optional().default(""),
  status: z.enum(["Active", "Inactive"]).default("Active"),
}).strip();

export const UsersSchema = z.object({
  userId: z.string().min(1, "User ID আবশ্যক"),
  name: z.string().min(1, "ব্যবহারকারীর নাম আবশ্যক"),
  email: z.string().min(1, "ইমেইল আবশ্যক"),
  role: z.enum([
    "Super Admin",
    "Admin",
    "Moderator",
    "User",
    "Head Office Admin",
    "Head Office User",
    "Sub-office User",
    "Report Viewer"
  ]),
  officeId: z.string().min(1, "অফিস আইডি আবশ্যক"),
  designation: z.string().optional().default(""),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  password: z.string().optional(),
  toolPermissions: z.record(z.any()).optional().default({}),
}).strip();

export const CategoriesSchema = z.object({
  code: z.string().optional().default(""),
  name: z.string().min(1, "বাজেট খাতের নাম আবশ্যক"),
  description: z.string().optional().default(""),
  budgetHead: z.string().optional().default(""),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  allowInQuotation: z.boolean().optional().default(true),
  allowExcess: z.boolean().optional().default(false),
  requireApproval: z.boolean().optional().default(true),
}).strip();

export const AllocationsBaseSchema = z.object({
  financialYearId: z.string().min(1, "অর্থবছর আবশ্যক"),
  officeId: z.string().min(1, "অফিস আবশ্যক"),
  categoryId: z.string().min(1, "বাজেট খাত আবশ্যক"),
  type: z.enum(["Initial", "Additional", "Adjustment"]).default("Initial"),
  allocatedAmount: z.preprocess((val) => Number(val), z.number().refine(n => !isNaN(n), { message: "বরাদ্দের পরিমাণ একটি বৈধ সংখ্যা হতে হবে।" })),
  date: dateSchema,
  referenceNo: z.string().optional().default(""),
  allocatedBy: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
}).strip();

export const AllocationsSchema = AllocationsBaseSchema.refine((data) => {
  if (data.type === "Adjustment") {
    return data.allocatedAmount !== 0;
  }
  return data.allocatedAmount > 0;
}, {
  message: "বরাদ্দের পরিমাণ অবশ্যই ০-এর বেশি হতে হবে (Adjustment ব্যতীত)।",
  path: ["allocatedAmount"]
});

export const ApplicantSchema = z.object({
  type: z.enum(["OwnOffice", "PersonInstitution"]).default("OwnOffice"),
  name: z.string().optional().default(""),
  designation: z.string().optional().default(""),
  officeId: z.string().optional(),
  institutionName: z.string().optional(),
}).optional();

export const EntryOfficerSchema = z.object({
  name: z.string().optional().default(""),
  designation: z.string().optional().default(""),
  officeId: z.string().optional().default(""),
  userId: z.string().optional().default(""),
  dateTime: z.string().optional().default(""),
}).optional();

export const ExpensesSchema = z.object({
  financialYearId: z.string().min(1, "অর্থবছর আবশ্যক"),
  officeId: z.string().min(1, "অফিস আবশ্যক"),
  categoryId: z.string().min(1, "বাজেট খাত আবশ্যক"),
  expenseType: z.enum(["General", "Quotation"]).optional().default("General"),
  quotationFormType: z.enum(["Form1", "Form2"]).optional(),
  expenseDate: dateSchema,
  amount: z.preprocess((val) => Number(val), z.number().positive("ব্যয়ের পরিমাণ অবশ্যই ধনাত্মক সংখ্যা (> 0) হতে হবে।")),
  baseAmount: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().optional()),
  vatRate: z.preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().min(0).optional().default(0)),
  vatAmount: z.preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().min(0).optional().default(0)),
  taxRate: z.preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().min(0).optional().default(0)),
  taxAmount: z.preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().min(0).optional().default(0)),
  netPayable: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().optional()),
  grossAmount: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().optional()),
  voucherNo: z.string().min(1, "ভাউচার নম্বর আবশ্যক"),
  voucherDate: dateSchema.optional().or(z.literal("")),
  description: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  supportingDocument: z.string().optional().default(""),
  applicant: ApplicantSchema,
  entryOfficer: EntryOfficerSchema,
  hasStockChalan: z.string().optional().default(""),
  vatChalanNo: z.string().optional().default(""),
  vatChalanDate: z.string().optional().default(""),
  totalVatChalanAmount: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().optional()),
  quotationItems: z.any().optional(),
  branchEntries: z.any().optional(),
  debitAccount: z.string().optional(),
  paymentType: z.string().optional(),
  memoSupplyOrderNo: z.string().optional().default(""),
  memoForwardingNo: z.string().optional().default(""),
  quotationDate: z.string().optional().default(""),
  supplyRecipientName: z.string().optional().default(""),
  supplyRecipientDesignation: z.string().optional().default(""),
  supplyRecipientOrgName: z.string().optional().default(""),
  supplyRecipientAddress1: z.string().optional().default(""),
  supplyRecipientAddress2: z.string().optional().default(""),
  supplierOrg1: z.string().optional().default(""),
  supplierOrg2: z.string().optional().default(""),
  supplierOrg3: z.string().optional().default(""),
  status: z.enum(["Pending", "Approved", "Rejected"]).optional(),
  noteSheetId: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
}).strip();

export const NoteTemplatesSchema = z.object({
  categoryId: z.string().min(1, "বাজেট খাত আবশ্যক"),
  title: z.string().min(1, "শিরোনাম আবশ্যক"),
  bodyTemplate: z.string().min(1, "টেমপ্লেট বডি আবশ্যক"),
}).strip();

export const NoteSheetsSchema = z.object({
  financialYearId: z.string().min(1, "অর্থবছর আবশ্যক"),
  officeId: z.string().min(1, "অফিস আবশ্যক"),
  expenseId: z.string().optional(),
  title: z.string().min(1, "নোটশিট শিরোনাম আবশ্যক"),
  content: z.string().min(1, "নোটশিট কনটেন্ট আবশ্যক"),
  forwardingContent: z.string().optional(),
  supplyOrderContent: z.string().optional(),
  sanctionNoteSheetContent: z.string().optional(),
  sanctionLetterContent: z.string().optional(),
  pdfPath: z.string().optional(),
  status: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  isCustomEdited: z.boolean().optional(),
  updatedAt: z.string().optional(),
}).strip();

export const OpeningBalancesSchema = z.object({
  financialYearId: z.string().min(1, "অর্থবছর আবশ্যক"),
  officeId: z.string().min(1, "অফিস আবশ্যক"),
  categoryId: z.string().min(1, "বাজেট খাত আবশ্যক"),
  amount: z.preprocess((val) => Number(val), z.number().min(0, "ওপেনিং ব্যালেন্স অবশ্যই ০ বা তার বেশি হতে হবে।")),
  sourceFYId: z.string().optional(),
}).strip();

export const BidderOrgSchema = z.object({
  name: z.string().optional().default(""),
  address: z.string().optional().default(""),
  price: z.preprocess((val) => Number(val) || 0, z.number()).optional().default(0),
});

export const PostFactoProposalsSchema = z.object({
  financialYearId: z.string().min(1, "অর্থবছর আবশ্যক"),
  officeId: z.string().min(1, "অফিস আবশ্যক"),
  categoryId: z.string().min(1, "বাজেট খাত আবশ্যক"),
  description: z.string().min(1, "বিবরণ আবশ্যক"),
  vatRate: z.preprocess((val) => Number(val) || 0, z.number()).optional().default(0),
  taxRate: z.preprocess((val) => Number(val) || 0, z.number()).optional().default(0),
  bidders: z.array(BidderOrgSchema).optional().default([]),
  unitPrice: z.preprocess((val) => Number(val) || 0, z.number()).optional().default(0),
  totalAmount: z.preprocess((val) => Number(val) || 0, z.number().positive("মোট মূল্য ০-এর বেশি হতে হবে")),
  managerName: z.string().min(1, "ব্যবস্থাপকের নাম আবশ্যক"),
  status: z.enum(["Pending", "Sanctioned", "Rejected"]).optional().default("Pending"),
  submittedBy: z.string().optional().default(""),
  submittedAt: z.string().optional().default(""),
  sanctionMemoNo: z.string().optional().default(""),
  sanctionDate: z.string().optional().default(""),
  sanctionedAmount: z.preprocess((val) => Number(val) || 0, z.number()).optional().default(0),
  sanctionRemarks: z.string().optional().default(""),
  sanctionDocument: z.string().optional().default(""),
  sanctionedBy: z.string().optional().default(""),
  sanctionedAt: z.string().optional().default(""),
}).strip();

export const FlowToolsSchema = z.object({
  name: z.string().min(1, "টুলের নাম আবশ্যক"),
  nameBn: z.string().optional().default(""),
  description: z.string().optional().default(""),
  descriptionBn: z.string().optional().default(""),
  category: z.enum(["finance", "documents", "compliance", "analytics", "custom"]).default("custom"),
  icon: z.string().optional().default("AppWindow"),
  color: z.string().optional().default("#3b82f6"),
  gradient: z.string().optional().default("from-blue-600 to-indigo-600"),
  badge: z.string().optional().default(""),
  badgeBn: z.string().optional().default(""),
  version: z.string().optional().default("1.0.0"),
  isDefault: z.boolean().optional().default(false),
  status: z.enum(["active", "beta", "maintenance"]).default("active"),
  allowedRoles: z.array(z.string()).optional().default([]),
  routeOrTab: z.string().optional().default(""),
  customUrl: z.string().optional().default(""),
  statsCountKey: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  createdBy: z.string().optional().default(""),
  createdAt: z.string().optional().default(""),
}).strip();

export const SheetSchemas: Record<string, z.ZodTypeAny> = {
  Settings: SettingsSchema,
  FinancialYears: FinancialYearsSchema,
  Offices: OfficesSchema,
  Users: UsersSchema,
  Categories: CategoriesSchema,
  Allocations: AllocationsSchema,
  Expenses: ExpensesSchema,
  NoteTemplates: NoteTemplatesSchema,
  NoteSheets: NoteSheetsSchema,
  OpeningBalances: OpeningBalancesSchema,
  PostFactoProposals: PostFactoProposalsSchema,
  FlowTools: FlowToolsSchema,
};

export const SheetUpdateSchemas: Record<string, z.ZodTypeAny> = {
  Settings: SettingsSchema.partial(),
  FinancialYears: FinancialYearsSchema.partial(),
  Offices: OfficesSchema.partial(),
  Users: UsersSchema.partial(),
  Categories: CategoriesSchema.partial(),
  Allocations: AllocationsBaseSchema.partial(),
  Expenses: ExpensesSchema.partial(),
  NoteTemplates: NoteTemplatesSchema.partial(),
  NoteSheets: NoteSheetsSchema.partial(),
  OpeningBalances: OpeningBalancesSchema.partial(),
  PostFactoProposals: PostFactoProposalsSchema.partial(),
  FlowTools: FlowToolsSchema.partial(),
};

export function validateReferentialIntegrity(
  sheet: string,
  payload: any,
  getSheetData: (sheetName: string) => any[]
): { valid: boolean; error?: string } {
  // 1. Check financialYearId
  if (payload.financialYearId) {
    const fys = getSheetData("FinancialYears");
    if (!fys.some((f: any) => f.id === payload.financialYearId)) {
      return { valid: false, error: `অকার্যকর অর্থবছর: Financial Year ID '${payload.financialYearId}' বিদ্যমান নেই।` };
    }
  }

  // 2. Check officeId
  if (payload.officeId) {
    const offices = getSheetData("Offices");
    if (!offices.some((o: any) => o.id === payload.officeId)) {
      return { valid: false, error: `অকার্যকর অফিস: Office ID '${payload.officeId}' বিদ্যমান নেই।` };
    }
  }

  // 3. Check categoryId
  if (payload.categoryId) {
    const categories = getSheetData("Categories");
    if (!categories.some((c: any) => c.id === payload.categoryId)) {
      return { valid: false, error: `অকার্যকর বাজেট খাত: Category ID '${payload.categoryId}' বিদ্যমান নেই।` };
    }
  }

  // 4. Check sourceFYId for OpeningBalances
  if (payload.sourceFYId) {
    const fys = getSheetData("FinancialYears");
    if (!fys.some((f: any) => f.id === payload.sourceFYId)) {
      return { valid: false, error: `উৎস অর্থবছর ID '${payload.sourceFYId}' বিদ্যমান নেই।` };
    }
  }

  return { valid: true };
}

export function checkReferentialIntegrityOnDelete(
  sheet: string,
  id: string,
  getSheetData: (sheetName: string) => any[]
): { allowed: boolean; error?: string } {
  if (sheet === "Offices") {
    const allocations = getSheetData("Allocations");
    if (allocations.some((a: any) => a.officeId === id)) {
      return {
        allowed: false,
        error: "এই অফিসের নামে বাজেট বরাদ্দ (Allocation) সংরক্ষিত রয়েছে। অফিসটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
    const expenses = getSheetData("Expenses");
    if (expenses.some((e: any) => e.officeId === id)) {
      return {
        allowed: false,
        error: "এই অফিসের নামে ব্যয় (Expense) সংরক্ষিত রয়েছে। অফিসটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
    const noteSheets = getSheetData("NoteSheets");
    if (noteSheets.some((ns: any) => ns.officeId === id)) {
      return {
        allowed: false,
        error: "এই অফিসের নামে নোটশিট (Note Sheet) তৈরি রয়েছে। অফিসটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
    const users = getSheetData("Users");
    if (users.some((u: any) => u.officeId === id)) {
      return {
        allowed: false,
        error: "এই অফিসে ব্যবহারকারী (User) সংযুক্ত রয়েছে। অফিসটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
  }

  if (sheet === "Categories") {
    const allocations = getSheetData("Allocations");
    if (allocations.some((a: any) => a.categoryId === id)) {
      return {
        allowed: false,
        error: "এই বাজেট খাতে বরাদ্দ (Allocation) সংরক্ষিত রয়েছে। খাতটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
    const expenses = getSheetData("Expenses");
    if (expenses.some((e: any) => e.categoryId === id)) {
      return {
        allowed: false,
        error: "এই বাজেট খাতে ব্যয় (Expense) লিপিবদ্ধ রয়েছে। খাতটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
    const noteTemplates = getSheetData("NoteTemplates");
    if (noteTemplates.some((nt: any) => nt.categoryId === id)) {
      return {
        allowed: false,
        error: "এই বাজেট খাতের নোটশিট টেমপ্লেট বিদ্যমান। খাতটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
    const openingBalances = getSheetData("OpeningBalances");
    if (openingBalances.some((ob: any) => ob.categoryId === id)) {
      return {
        allowed: false,
        error: "এই বাজেট খাতে ওপেনিং ব্যালেন্স সংরক্ষিত রয়েছে। খাতটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
  }

  if (sheet === "FinancialYears") {
    const allocations = getSheetData("Allocations");
    if (allocations.some((a: any) => a.financialYearId === id)) {
      return {
        allowed: false,
        error: "এই অর্থবছরে বরাদ্দ (Allocation) সংরক্ষিত রয়েছে। অর্থবছরটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় বা ক্লোজ করুন।"
      };
    }
    const expenses = getSheetData("Expenses");
    if (expenses.some((e: any) => e.financialYearId === id)) {
      return {
        allowed: false,
        error: "এই অর্থবছরে ব্যয় (Expense) লিপিবদ্ধ রয়েছে। অর্থবছরটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় বা ক্লোজ করুন।"
      };
    }
    const openingBalances = getSheetData("OpeningBalances");
    if (openingBalances.some((ob: any) => ob.financialYearId === id || ob.sourceFYId === id)) {
      return {
        allowed: false,
        error: "এই অর্থবছরে ওপেনিং ব্যালেন্স বা ফরওয়ার্ড হিস্টোরি রয়েছে। অর্থবছরটি মুছে ফেলা সম্ভব নয়।"
      };
    }
  }
  if (sheet === "Users") {
    const expenses = getSheetData("Expenses");
    if (expenses.some((e: any) => e.userId === id)) {
      return {
        allowed: false,
        error: "এই ব্যবহারকারীর নামে ব্যয় (Expense) সংরক্ষিত রয়েছে। আইডিটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
    const noteSheets = getSheetData("NoteSheets");
    if (noteSheets.some((n: any) => n.createdBy === id)) {
      return {
        allowed: false,
        error: "এই ব্যবহারকারীর নামে নোটশীট (NoteSheet) সংরক্ষিত রয়েছে। আইডিটি মুছে ফেলা সম্ভব নয় — অনুগ্রহ করে এটি নিষ্ক্রিয় (Inactive) করুন।"
      };
    }
  }

  return { allowed: true };
}
