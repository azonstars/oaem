# Office Allocation & Expense Management System

A comprehensive system designed for Government Offices to manage budgets, allocations, expenses, note sheets, and financial years accurately and securely.

## Features

- **Role-based Access Control (RBAC):** Distinct roles for Super Admin, Head Office Admin, and Sub-office User ensuring security and isolation.
- **Budget Allocations & Tracking:** Manage financial years, distribute budgets to sub-offices, and monitor available balances in real-time.
- **Expense Tracking & Approval Workflow:** Record expenses, compute VAT & Tax automatically, and track approval status.
- **Note Sheet Generation (AI Powered):** Automatically generate standard and AI-assisted note sheets for expenses using the Gemini API.
- **Financial Year Management:** Securely transition across financial years, freeze closed years, and handle carry-forward balances.
- **Audit Logs:** Track all critical operations for transparency and accountability.
- **Automated Backup & Concurrency Locking:** Features daily data backups and sheet-level locks preventing race conditions.

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   SESSION_SECRET=your_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key
   BACKUP_RETENTION_DAYS=30
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Build and start in production:
   ```bash
   npm run build
   npm run start
   ```

## Default Roles & Access

- **Super Admin:** Can manage everything, including users, roles, budget categories, offices, and financial years.
- **Head Office Admin:** Can manage allocations and approve/reject expenses across all sub-offices.
- **Sub-office User:** Can only view their office's allocations and submit their office's expenses. They cannot access other offices' data.

*(On first startup, the system seeds default users. Check the server console for the randomly generated temporary passwords for these users. Users must change their password upon first login.)*

## Data Structure

Data is persisted on disk via JSON files under the `data/` directory:
- `Allocations.json`: Budget allocations mapping to offices and financial years.
- `Expenses.json`: Expense records and vouchers.
- `Users.json`: User accounts and hashed passwords.
- `Offices.json`, `Categories.json`, `FinancialYears.json`: Core entity records.
- `NoteSheets.json`, `NoteTemplates.json`: Custom note templates and generated sheets.
- `OpeningBalances.json`: Rolled over balances between years.
- `AuditLogs.json`: Immutable audit trail.

## Google AI Studio Deploy

To deploy or share via GAS (Google AI Studio Build):
1. Build the frontend: `npm run build`
2. Ensure you specify `SESSION_SECRET` and `GEMINI_API_KEY` under Settings -> Secrets.
3. Start the process. The platform automatically serves the production build using the bundled `dist/server.cjs`.
