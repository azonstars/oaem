# React & Google Apps Script (GAS) Feature & Data Parity Checklist

This document maintains strict architectural and business logic parity between the React full-stack application and the Google Apps Script (GAS) spreadsheet-backed web application.

## 1. Data Schema Parity
- **FinancialYears**: `id`, `name`, `startDate`, `endDate`, `isActive`, `status`, `openingBalance`
- **Offices**: `id`, `name`, `type`, `code`, `address`, `parentOfficeId`, `status`
- **Categories**: `id`, `code`, `name`, `description`, `budgetHead`, `status`
- **Users**: `id`, `userId`, `name`, `email`, `passwordHash`, `role`, `officeId`, `designation`, `status`
- **OpeningBalances**: `id`, `financialYearId`, `officeId`, `categoryId`, `amount`, `createdAt`
- **Allocations**: `id`, `financialYearId`, `officeId`, `categoryId`, `type` (Initial, Additional, Adjustment), `allocatedAmount`, `date`, `referenceNo`, `allocatedBy`, `remarks`, `status`
- **Expenses**: `id`, `financialYearId`, `officeId`, `categoryId`, `expenseDate`, `amount`, `voucherNo`, `voucherDate`, `description`, `remarks`, `supportingDocument`, `applicant`, `entryOfficer`, `noteSheetId`, `status`, `expenseType` (Regular, Quotation, Tender, DirectPurchase), `vatRate`, `taxRate`, `vatAmount`, `taxAmount`, `netPayable`, `grossAmount`, `approvedBy`, `approvedAt`
- **NoteSheets**: `id`, `financialYearId`, `officeId`, `expenseId`, `title`, `content`, `status`, `createdBy`, `createdAt`, `pdfPath`
- **NoteTemplates**: `id`, `categoryId`, `title`, `bodyTemplate`
- **AuditLogs**: `id`, `timestamp`, `userId`, `action`, `tableName`, `recordId`, `details`
- **Settings**: `id`, `institutionName`, `logoUrl`, `webAppName`, `description`, `customThemeColor`, `welcomeMessages`, `notices`

## 2. Business Logic Rules
1. **Balance Formula**: 
   $$\text{Available Balance} = \text{Opening Balance} + \text{Initial Allocation} + \text{Additional Allocation} \pm \text{Adjustment} - \text{Total Expenses}$$
2. **Overspending Check**: Expenses cannot exceed available balance unless override permission is granted by Head Office Admin.
3. **VAT & Tax Calculation**:
   - $\text{VAT Amount} = (\text{Gross Amount} \times \text{VAT Rate}) / 100$
   - $\text{Tax Amount} = (\text{Gross Amount} \times \text{Tax Rate}) / 100$
   - $\text{Net Payable} = \text{Gross Amount} - \text{VAT Amount} - \text{Tax Amount}$
4. **Expense Approval Workflow**: Draft -> PendingApproval -> Approved (or Rejected / Void). Only Head Office Admin or authorized managers can approve.
5. **Security & XSS Prevention**: All user input rendered via `innerHTML` in GAS client interface (`Index.html`) must be sanitized using `escapeHtml()`.
