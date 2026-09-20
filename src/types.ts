export interface FinancialYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status?: "Active" | "Inactive";
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string;
}

export interface Office {
  id: string;
  name: string;
  type: "HeadOffice" | "SubOffice";
  code: string;
  address: string;
  parentOfficeId?: string;
  status: "Active" | "Inactive";
}

export type UserRole =
  | "Super Admin"
  | "Admin"
  | "Moderator"
  | "Divisional Admin"
  | "Divisional Moderator"
  | "Regional Admin"
  | "Regional Moderator"
  | "Branch Admin"
  | "Branch User"
  | "User"
  | "Head Office Admin"
  | "Head Office User"
  | "Sub-office User"
  | "Report Viewer";

export type ToolAccessLevel = "full" | "operate" | "view" | "none";

export interface ToolPermissionConfig {
  access?: ToolAccessLevel;
  roleTitle?: string;
  notes?: string;
}

export type UserToolPermissions = Record<string, ToolPermissionConfig | undefined>;

export function isSuperAdmin(role?: string): boolean {
  return role === "Super Admin";
}

export function isAdmin(role?: string): boolean {
  return (
    role === "Super Admin" ||
    role === "Admin" ||
    role === "Head Office Admin" ||
    role === "HeadOfficeAdmin" ||
    role === "Divisional Admin" ||
    role === "Regional Admin" ||
    role === "Branch Admin"
  );
}

export function isModerator(role?: string): boolean {
  return (
    role === "Moderator" ||
    role === "Divisional Moderator" ||
    role === "Regional Moderator"
  );
}

export function isDivisionalRole(role?: string): boolean {
  return role === "Divisional Admin" || role === "Divisional Moderator";
}

export function isRegionalRole(role?: string): boolean {
  return role === "Regional Admin" || role === "Regional Moderator";
}

export function isBranchRole(role?: string): boolean {
  return role === "Branch Admin" || role === "Branch User";
}

export function isStaffOrAdmin(role?: string): boolean {
  return isAdmin(role) || isModerator(role);
}

export function isGeneralUser(role?: string): boolean {
  return !isStaffOrAdmin(role);
}

export interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  officeId: string;
  designation?: string;
  passwordHash?: string;
  passwordSalt?: string;
  status: "Active" | "Inactive";
  mustChangePassword?: boolean;
  toolPermissions?: UserToolPermissions;
}

export let globalRoleToolAccess: Record<string, Record<string, ToolAccessLevel>> | null = null;

export const DEFAULT_ROLE_TOOL_ACCESS: Record<string, Record<string, ToolAccessLevel>> = {
  "Super Admin": {
    "budget-expense": "full",
    "stockpro": "full",
    "conference-note": "full",
    "multi-item-bill": "full",
    "stationery-bill": "full",
    "miscellaneous": "full",
    "office-monitoring": "full",
  },
  "Admin": {
    "budget-expense": "full",
    "stockpro": "full",
    "conference-note": "full",
    "multi-item-bill": "full",
    "stationery-bill": "full",
    "miscellaneous": "full",
    "office-monitoring": "full",
  },
  "Head Office Admin": {
    "budget-expense": "full",
    "stockpro": "full",
    "conference-note": "full",
    "multi-item-bill": "full",
    "stationery-bill": "full",
    "miscellaneous": "full",
    "office-monitoring": "full",
  },
  "HeadOfficeAdmin": {
    "budget-expense": "full",
    "stockpro": "full",
    "conference-note": "full",
    "multi-item-bill": "full",
    "stationery-bill": "full",
    "miscellaneous": "full",
    "office-monitoring": "full",
  },
  "Moderator": {
    "budget-expense": "full",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "operate",
  },
  "Divisional Admin": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "full",
  },
  "Divisional Moderator": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "operate",
  },
  "Regional Admin": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "full",
  },
  "Regional Moderator": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "operate",
  },
  "Branch Admin": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "operate",
  },
  "Branch User": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "operate",
  },
  "Head Office User": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "operate",
  },
  "Sub-office User": {
    "budget-expense": "operate",
    "stockpro": "operate",
    "conference-note": "operate",
    "multi-item-bill": "operate",
    "stationery-bill": "operate",
    "miscellaneous": "operate",
    "office-monitoring": "operate",
  },
  "User": {
    "budget-expense": "none",
    "stockpro": "none",
    "conference-note": "none",
    "multi-item-bill": "none",
    "stationery-bill": "none",
    "miscellaneous": "none",
    "office-monitoring": "operate",
  },
  "Report Viewer": {
    "budget-expense": "view",
    "stockpro": "none",
    "conference-note": "none",
    "multi-item-bill": "none",
    "stationery-bill": "none",
    "miscellaneous": "view",
    "office-monitoring": "view",
  },
};

export function setGlobalRoleToolAccess(access: Record<string, Record<string, ToolAccessLevel>> | null) {
  globalRoleToolAccess = access;
}

/**
 * Returns the effective access level for a role and tool
 */
export function getRoleToolAccess(
  role: string,
  toolId: string = "budget-expense",
  customMap?: Record<string, Record<string, ToolAccessLevel>> | null
): ToolAccessLevel {
  const map = customMap || globalRoleToolAccess;
  if (map && map[role] && map[role][toolId] !== undefined) {
    return map[role][toolId];
  }
  if (DEFAULT_ROLE_TOOL_ACCESS[role] && DEFAULT_ROLE_TOOL_ACCESS[role][toolId] !== undefined) {
    return DEFAULT_ROLE_TOOL_ACCESS[role][toolId];
  }
  if (isAdmin(role) || role === "Super Admin") return "full";
  if (isModerator(role)) return toolId === "budget-expense" ? "full" : "operate";
  if (role === "Report Viewer") return toolId === "budget-expense" ? "view" : "none";
  if (role === "Sub-office User" || role === "Head Office User") return "operate";
  return "none";
}

/**
 * Returns the effective access level of a user for a specific tool
 */
export function getUserToolAccess(
  user?: User | null,
  toolId: string = "budget-expense",
  customRoleAccess?: Record<string, Record<string, ToolAccessLevel>> | null
): ToolAccessLevel {
  if (!user) return "none";
  if (user.role === "Super Admin") return "full";

  // If explicit granular permission exists in user profile (override default)
  if (user.toolPermissions && user.toolPermissions[toolId]?.access !== undefined) {
    return user.toolPermissions[toolId]!.access!;
  }

  return getRoleToolAccess(user.role, toolId, customRoleAccess);
}

export function canAccessTool(
  user?: User | null,
  toolId: string = "budget-expense"
): boolean {
  return getUserToolAccess(user, toolId) !== "none";
}

export function canOperateTool(
  user?: User | null,
  toolId: string = "budget-expense"
): boolean {
  const access = getUserToolAccess(user, toolId);
  return access === "full" || access === "operate";
}

export function isToolAdmin(
  user?: User | null,
  toolId: string = "budget-expense"
): boolean {
  return getUserToolAccess(user, toolId) === "full";
}

export function getToolRoleTitle(
  user?: User | null,
  toolId: string = "budget-expense",
  fallbackRoleTitle?: string
): string {
  if (!user) return "";
  if (user.toolPermissions && user.toolPermissions[toolId]?.roleTitle) {
    return user.toolPermissions[toolId]!.roleTitle!;
  }
  if (fallbackRoleTitle) return fallbackRoleTitle;
  const access = getUserToolAccess(user, toolId);
  if (access === "full") return "অ্যাডমিন / নিয়ন্ত্রক";
  if (access === "operate") return "অপারেটর / ব্যবহারকারী";
  if (access === "view") return "পরিদর্শক / অডিটর";
  return "অনুমোদনহীন";
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  budgetHead: string;
  status: "Active" | "Inactive";
  allowInQuotation?: boolean;
  allowExcess?: boolean;
  requireApproval?: boolean;
}

export interface WelcomeMessageSlot {
  line1: string;
  line2: string;
}

export interface WelcomeMessageConfig {
  morning?: WelcomeMessageSlot;
  afternoon?: WelcomeMessageSlot;
  evening?: WelcomeMessageSlot;
  night?: WelcomeMessageSlot;
}

export interface SystemSettings {
  id: string;
  institutionName: string;
  logoUrl: string;
  loginLogoUrl?: string;
  webAppName: string;
  description: string;
  customThemeColor?: string;
  welcomeMessages?: WelcomeMessageConfig;
  notices?: string[];
  showNoticeBar?: boolean;
  requireExpenseApproval?: boolean;
  financialYearStartMonth?: number;
  financialYearEndMonth?: number;
  roleToolAccess?: Record<string, Record<string, ToolAccessLevel>>;
}

export interface Allocation {
  id: string;
  financialYearId: string;
  officeId: string;
  categoryId: string;
  type: "Initial" | "Additional" | "Adjustment";
  allocatedAmount: number;
  date: string;
  referenceNo: string;
  allocatedBy: string;
  remarks: string;
}

export interface ApplicantInfo {
  type: "OwnOffice" | "PersonInstitution";
  name: string;
  designation: string;
  officeId?: string;
  institutionName?: string;
}

export interface EntryOfficerInfo {
  name: string;
  designation: string;
  officeId: string;
  userId: string;
  dateTime: string;
}

export interface QuotationSupplier {
  nameAndAddress: string;
  unitPrice: number;
  qty: number;
  totalPrice: number;
  vatRate?: number;
  taxRate?: number;
  remarks?: string;
}

export interface QuotationItem {
  itemDescription: string;
  specification: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  vatRate?: number;
  taxRate?: number;
  remarks?: string;
  suppliers?: QuotationSupplier[];
}

export interface BranchDebitEntry {
  branchOfficeId?: string;
  branchName: string;
  itemDescription: string;
  itemIndex?: number;
  model?: string;
  unit?: string;
  qty: number;
  amount: number;
}

export interface Expense {
  id: string;
  financialYearId: string;
  officeId: string;
  categoryId: string;
  expenseType?: "General" | "Quotation";
  quotationFormType?: "Form1" | "Form2";
  expenseDate: string;
  amount: number; // Gross amount deducted from budget
  baseAmount?: number; // Base amount before tax/vat
  vatRate?: number;
  vatAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  netPayable?: number; // Amount payable to supplier
  grossAmount?: number; // Amount deducted from budget
  voucherNo: string;
  voucherDate: string;
  description: string;
  remarks: string;
  supportingDocument?: string;
  applicant: ApplicantInfo;
  entryOfficer: EntryOfficerInfo;
  noteSheetId?: string;
  status?: "Pending" | "Approved" | "Rejected";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  quotationItems?: QuotationItem[];
  branchEntries?: BranchDebitEntry[];
  debitAccount?: string;
  paymentType?: string;
  memoSupplyOrderNo?: string;
  memoForwardingNo?: string;
  quotationDate?: string;
  hasStockChalan?: string;
  vatChalanNo?: string;
  vatChalanDate?: string;
  supplyRecipientName?: string;
  supplyRecipientDesignation?: string;
  supplyRecipientOrgName?: string;
  supplyRecipientAddress1?: string;
  supplyRecipientAddress2?: string;
  supplierOrg1?: string;
  supplierOrg2?: string;
  supplierOrg3?: string;
}

export interface NoteSheet {
  id: string;
  financialYearId: string;
  officeId: string;
  expenseId?: string;
  title: string;
  content: string;
  forwardingContent?: string;
  supplyOrderContent?: string;
  sanctionNoteSheetContent?: string;
  sanctionLetterContent?: string;
  status?: string;
  createdBy: string;
  createdAt: string;
  pdfPath?: string;
  isCustomEdited?: boolean;
  updatedAt?: string;
  expenseType?: string;
  expenseGrossAmount?: number;
  isUnder1500?: boolean;
}

export interface NoteTemplate {
  id: string;
  categoryId: string;
  title: string;
  bodyTemplate: string;
}

export type ContentPosition =
  "TOP" | "UPPER_MIDDLE" | "CENTER" | "LOWER_MIDDLE" | "BOTTOM" | "CUSTOM";
export type PageSize = "A4" | "Legal" | "Letter" | "Custom";
export type PageOrientation = "portrait" | "landscape";
export type TextAlign = "left" | "center" | "right" | "justify";

export interface PrintLayoutSettings {
  position: ContentPosition;
  customTopOffset: number; // in mm
  customLeftOffset: number; // in mm
  pageSize: PageSize;
  customWidth: number; // in mm
  customHeight: number; // in mm
  orientation: PageOrientation;
  margins: {
    top: number; // in mm
    bottom: number; // in mm
    left: number; // in mm
    right: number; // in mm
  };
  fontSizeScale: number; // legacy percentage (e.g. 100)
  fontSizePt: number; // Exact font size in pt (1 to 500+, e.g. 12pt)
  lineSpacing: number; // line-height multiplier (e.g. 1.0, 1.15, 1.5, 2.0)
  textAlign: TextAlign; // left, center, right, justify
  fontFamily: string; // font-family name
  paragraphSpacing: number; // extra space between paragraphs in pt (e.g. 8)
  firstLineIndent: number; // indent in mm (e.g. 0 or 10)
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  letterSpacing?: number; // in px
  includeHeader: boolean;
  includeSignatures: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  details: string;
}

export interface OpeningBalance {
  id: string;
  financialYearId: string;
  officeId: string;
  categoryId: string;
  amount: number;
  sourceFYId?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface BidderOrganization {
  name: string;
  address: string;
  price?: number;
}

export interface PostFactoProposal {
  id: string;
  financialYearId: string;
  officeId: string;
  categoryId: string;
  description: string;
  vatRate: number;
  taxRate: number;
  bidders: BidderOrganization[];
  unitPrice: number;
  totalAmount: number;
  managerName: string;
  status: "Pending" | "Sanctioned" | "Rejected";
  submittedBy?: string;
  submittedAt?: string;
  sanctionType?: "budget_allocation" | "only_sanction";
  sanctionMemoNo?: string;
  sanctionDate?: string;
  sanctionedAmount?: number;
  sanctionRemarks?: string;
  sanctionDocument?: string;
  sanctionedBy?: string;
  sanctionedAt?: string;
  tenderDate?: string;
  workOrderNo?: string;
  workOrderDate?: string;
  letterNo?: string;
  letterDate?: string;
  noteSheetId?: string;
}

export type ToolCategory = "finance" | "documents" | "compliance" | "analytics" | "custom";
export type ToolStatus = "active" | "beta" | "maintenance";

export interface ToolSubModule {
  id: string;
  name: string;
  nameBn: string;
  tab: string;
  icon?: string;
  badge?: string;
  badgeBn?: string;
}

export interface FlowBoardTool {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  category: ToolCategory;
  icon: string;
  color: string;
  gradient: string;
  badge?: string;
  badgeBn?: string;
  version: string;
  isDefault?: boolean;
  status: ToolStatus;
  allowedRoles?: UserRole[];
  routeOrTab?: string;
  customUrl?: string;
  statsCountKey?: string;
  tags?: string[];
  subModules?: ToolSubModule[];
  createdBy?: string;
  createdAt?: string;
}

export interface ToolDocument {
  id: string;
  toolType: "conference_note" | "multi_item_bill" | "stationery_bill" | "stockpro_invoice" | "custom";
  title: string;
  docDate: string;
  memoNo?: string;
  officeId?: string;
  financialYearId?: string;
  createdBy?: string;
  totalAmount?: number;
  payload: any;
  createdAt?: string;
  updatedAt?: string;
}

