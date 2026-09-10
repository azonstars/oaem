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

export type UserRole = "Super Admin" | "Head Office Admin" | "Head Office User" | "Sub-office User" | "Report Viewer";

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
  webAppName: string;
  description: string;
  customThemeColor?: string;
  welcomeMessages?: WelcomeMessageConfig;
  notices?: string[];
  requireExpenseApproval?: boolean;
  financialYearStartMonth?: number;
  financialYearEndMonth?: number;
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

export type ContentPosition = "TOP" | "UPPER_MIDDLE" | "CENTER" | "LOWER_MIDDLE" | "BOTTOM" | "CUSTOM";
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
