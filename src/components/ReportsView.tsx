import React, { useState, useMemo } from "react";
import {
  Allocation,
  Expense,
  Office,
  Category,
  FinancialYear,
  User,
  NoteSheet,
  SystemSettings,
  OpeningBalance,
} from "../types";
import {
  FileText,
  Printer,
  Download,
  Filter,
  FileBarChart,
  CheckSquare,
  Square,
} from "lucide-react";
import { useLanguage } from "../i18n";

interface ReportsViewProps {
  allocations: Allocation[];
  expenses: Expense[];
  offices: Office[];
  categories: Category[];
  financialYears: FinancialYear[];
  selectedFY: string;
  currentUser: User;
  isHeadOffice: boolean;
  noteSheets?: NoteSheet[];
  systemSettings?: SystemSettings | null;
  openingBalances?: OpeningBalance[];
}

type ReportType =
  | "CONSOLIDATED"
  | "CATEGORY_WISE"
  | "OFFICE_WISE"
  | "FINANCIAL_YEAR_WISE"
  | "ADDITIONAL_ALLOCATION"
  | "EXPENSE_TRANSACTION"
  | "APPLICANT_WISE"
  | "PENDING_NOTESHEET"
  | "COMBINED_PDF";

export function ReportsView({
  allocations,
  expenses,
  offices,
  categories,
  financialYears,
  selectedFY,
  currentUser,
  isHeadOffice,
  systemSettings,
  openingBalances = [],
}: ReportsViewProps) {
  const { t, formatCurrency, language } = useLanguage();
  const [reportType, setReportType] = useState<ReportType>("CONSOLIDATED");

  // Filters
  const [filterFY, setFilterFY] = useState(selectedFY);
  const [filterOffice, setFilterOffice] = useState(
    isHeadOffice ? "" : currentUser.officeId,
  );
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterApplicant, setFilterApplicant] = useState("");
  const [filterVoucher, setFilterVoucher] = useState("");

  // For Combined PDF (multi-category)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const currentFYObj = financialYears.find((f) => f.id === filterFY);
  const effectiveOffice = isHeadOffice ? filterOffice : currentUser.officeId;

  // Compute filtered Allocations & Expenses
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (filterFY && a.financialYearId !== filterFY) return false;
      if (effectiveOffice && a.officeId !== effectiveOffice) return false;
      if (filterCategory && a.categoryId !== filterCategory) return false;
      if (
        reportType === "COMBINED_PDF" &&
        selectedCategories.length > 0 &&
        !selectedCategories.includes(a.categoryId)
      )
        return false;
      if (filterDateFrom && a.date < filterDateFrom) return false;
      if (filterDateTo && a.date > filterDateTo) return false;
      return true;
    });
  }, [
    allocations,
    filterFY,
    effectiveOffice,
    filterCategory,
    reportType,
    selectedCategories,
    filterDateFrom,
    filterDateTo,
  ]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterFY && e.financialYearId !== filterFY) return false;
      if (effectiveOffice && e.officeId !== effectiveOffice) return false;
      if (filterCategory && e.categoryId !== filterCategory) return false;
      if (
        reportType === "COMBINED_PDF" &&
        selectedCategories.length > 0 &&
        !selectedCategories.includes(e.categoryId)
      )
        return false;
      if (filterDateFrom && e.expenseDate < filterDateFrom) return false;
      if (filterDateTo && e.expenseDate > filterDateTo) return false;
      if (
        filterApplicant &&
        !(e.applicant?.name || "")
          .toLowerCase()
          .includes(filterApplicant.toLowerCase())
      )
        return false;
      if (
        filterVoucher &&
        !(e.voucherNo || "").toLowerCase().includes(filterVoucher.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    expenses,
    filterFY,
    effectiveOffice,
    filterCategory,
    reportType,
    selectedCategories,
    filterDateFrom,
    filterDateTo,
    filterApplicant,
    filterVoucher,
  ]);

  // Compute Consolidated Summary
  const consolidatedData = useMemo(() => {
    const data: any[] = [];
    const grouped: Record<string, Record<string, any>> = {};

    // Add opening balances first
    (openingBalances || []).forEach((ob) => {
      if (filterFY && ob.financialYearId !== filterFY) return;
      if (effectiveOffice && ob.officeId !== effectiveOffice) return;
      if (filterCategory && ob.categoryId !== filterCategory) return;

      if (!grouped[ob.officeId]) grouped[ob.officeId] = {};
      if (!grouped[ob.officeId][ob.categoryId]) {
        grouped[ob.officeId][ob.categoryId] = {
          opening: 0,
          initial: 0,
          additional: 0,
          adjustment: 0,
          expense: 0,
        };
      }
      grouped[ob.officeId][ob.categoryId].opening += Number(ob.amount || 0);
    });

    filteredAllocations.forEach((a) => {
      if (!grouped[a.officeId]) grouped[a.officeId] = {};
      if (!grouped[a.officeId][a.categoryId]) {
        grouped[a.officeId][a.categoryId] = {
          opening: 0,
          initial: 0,
          additional: 0,
          adjustment: 0,
          expense: 0,
        };
      }
      if (a.type === "Initial" || (!a.type as any))
        grouped[a.officeId][a.categoryId].initial += Number(
          a.allocatedAmount || 0,
        );
      else if (a.type === "Additional")
        grouped[a.officeId][a.categoryId].additional += Number(
          a.allocatedAmount || 0,
        );
      else if (a.type === "Adjustment")
        grouped[a.officeId][a.categoryId].adjustment += Number(
          a.allocatedAmount || 0,
        );
    });

    filteredExpenses.forEach((e) => {
      if (!grouped[e.officeId]) grouped[e.officeId] = {};
      if (!grouped[e.officeId][e.categoryId]) {
        grouped[e.officeId][e.categoryId] = {
          opening: 0,
          initial: 0,
          additional: 0,
          adjustment: 0,
          expense: 0,
        };
      }
      grouped[e.officeId][e.categoryId].expense += Number(e.amount || 0);
    });

    for (const offId in grouped) {
      for (const catId in grouped[offId]) {
        const d = grouped[offId][catId];
        const opening = d.opening || 0;
        const totalAlloc = opening + d.initial + d.additional + d.adjustment;
        data.push({
          officeId: offId,
          categoryId: catId,
          opening,
          ...d,
          totalAlloc,
          balance: totalAlloc - d.expense,
        });
      }
    }
    return data;
  }, [
    filteredAllocations,
    filteredExpenses,
    openingBalances,
    filterFY,
    filterOffice,
    filterCategory,
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = "";
    if (
      reportType === "CONSOLIDATED" ||
      reportType === "CATEGORY_WISE" ||
      reportType === "OFFICE_WISE"
    ) {
      csv =
        "Office,Category,Initial Alloc,Additional Alloc,Adjustment,Total Alloc,Expense,Balance\n";
      consolidatedData.forEach((row) => {
        const off = offices.find((o) => o.id === row.officeId)?.name || "";
        const cat = categories.find((c) => c.id === row.categoryId)?.name || "";
        csv += `"${off}","${cat}",${row.initial},${row.additional},${row.adjustment},${row.totalAlloc},${row.expense},${row.balance}\n`;
      });
    } else if (
      reportType === "EXPENSE_TRANSACTION" ||
      reportType === "APPLICANT_WISE" ||
      reportType === "PENDING_NOTESHEET"
    ) {
      csv =
        "Date,Office,Category,Voucher No,Applicant,Base Amount,VAT Amount,Tax Amount,Net Payable,Gross Amount,Status\n";
      filteredExpenses.forEach((e) => {
        const off = offices.find((o) => o.id === e.officeId)?.name || "";
        const cat = categories.find((c) => c.id === e.categoryId)?.name || "";
        const base = e.baseAmount || e.amount || 0;
        const vat = e.vatAmount || 0;
        const tax = e.taxAmount || 0;
        const net = e.netPayable || base;
        const gross = e.grossAmount || e.amount || 0;
        const status = e.noteSheetId
          ? "Note Sheet Generated"
          : "Pending Template";
        csv += `"${e.expenseDate}","${off}","${cat}","${e.voucherNo || ""}","${e.applicant?.name || ""}",${base},${vat},${tax},${net},${gross},"${status}"\n`;
      });
    }

    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_${reportType}_${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Rendering individual report tables
  const renderConsolidatedTable = () => {
    let displayData = consolidatedData;
    if (reportType === "CATEGORY_WISE") {
      const catGroup: Record<string, any> = {};
      displayData.forEach((d) => {
        if (!catGroup[d.categoryId])
          catGroup[d.categoryId] = {
            opening: 0,
            initial: 0,
            additional: 0,
            adjustment: 0,
            expense: 0,
            totalAlloc: 0,
            balance: 0,
          };
        catGroup[d.categoryId].opening += d.opening || 0;
        catGroup[d.categoryId].initial += d.initial;
        catGroup[d.categoryId].additional += d.additional;
        catGroup[d.categoryId].adjustment += d.adjustment;
        catGroup[d.categoryId].expense += d.expense;
        catGroup[d.categoryId].totalAlloc += d.totalAlloc;
        catGroup[d.categoryId].balance += d.balance;
      });
      displayData = Object.keys(catGroup).map((catId) => ({
        categoryId: catId,
        officeId: "ALL",
        ...catGroup[catId],
      }));
    } else if (reportType === "OFFICE_WISE") {
      const offGroup: Record<string, any> = {};
      displayData.forEach((d) => {
        if (!offGroup[d.officeId])
          offGroup[d.officeId] = {
            opening: 0,
            initial: 0,
            additional: 0,
            adjustment: 0,
            expense: 0,
            totalAlloc: 0,
            balance: 0,
          };
        offGroup[d.officeId].opening += d.opening || 0;
        offGroup[d.officeId].initial += d.initial;
        offGroup[d.officeId].additional += d.additional;
        offGroup[d.officeId].adjustment += d.adjustment;
        offGroup[d.officeId].expense += d.expense;
        offGroup[d.officeId].totalAlloc += d.totalAlloc;
        offGroup[d.officeId].balance += d.balance;
      });
      displayData = Object.keys(offGroup).map((offId) => ({
        categoryId: "ALL",
        officeId: offId,
        ...offGroup[offId],
      }));
    }

    return (
      <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
        <thead>
          <tr className="bg-white border-b-2 border-slate-400 text-slate-800 uppercase tracking-wider font-bold">
            {reportType !== "CATEGORY_WISE" && (
              <th className="p-3 align-bottom">অফিস</th>
            )}
            {reportType !== "OFFICE_WISE" && (
              <th className="p-3 align-bottom">ব্যয়ের খাত</th>
            )}
            <th className="p-3 text-center text-blue-700 align-bottom leading-tight">
              ওপেনিং
              <br />
              ব্যালেন্স
            </th>
            <th className="p-3 text-center text-slate-700 align-bottom leading-tight">
              মূল বরাদ্দ
              <br />
              (INITIAL)
            </th>
            <th className="p-3 text-center text-slate-700 align-bottom leading-tight">
              অতিরিক্ত বরাদ্দ (ADDL.)
              <br />
              /
              <br />
              সমন্বয় (ADJUSTMENT)
            </th>
            <th className="p-3 text-center text-emerald-700 align-bottom leading-tight">
              মোট
              <br />
              বাজেট
            </th>
            <th className="p-3 text-center text-rose-600 align-bottom leading-tight">
              মোট ব্যয়
              <br />
              (EXPENSE)
            </th>
            <th className="p-3 text-center text-blue-700 align-bottom leading-tight">
              অবশিষ্ট
              <br />
              স্থিতি
              <br />
              (BALANCE)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 font-mono">
          {displayData.map((row, idx) => {
            const off =
              offices.find((o) => o.id === row.officeId)?.name ||
              (row.officeId === "ALL" ? t.allOffices : "");
            const cat =
              categories.find((c) => c.id === row.categoryId)?.name ||
              (row.categoryId === "ALL" ? t.allCategories : "");
            return (
              <tr key={idx} className="hover:bg-slate-50 transition bg-white border-b border-slate-200">
                {reportType !== "CATEGORY_WISE" && (
                  <td className="p-3 font-sans font-medium text-slate-800">
                    {off}
                  </td>
                )}
                {reportType !== "OFFICE_WISE" && (
                  <td className="p-3 font-sans text-slate-700">{cat}</td>
                )}
                <td className="p-3 text-center text-blue-700 font-semibold">
                  {formatCurrency(row.opening || 0)}
                </td>
                <td className="p-3 text-center text-slate-700">
                  {formatCurrency(row.initial)}
                </td>
                <td className="p-3 text-center text-slate-700">
                  {row.additional + row.adjustment > 0 ? "+" : ""}
                  {formatCurrency(row.additional + row.adjustment)}
                </td>
                <td className="p-3 text-center font-bold text-emerald-700">
                  {formatCurrency(row.totalAlloc)}
                </td>
                <td className="p-3 text-center text-rose-600 font-semibold">
                  {formatCurrency(row.expense)}
                </td>
                <td
                  className={`p-3 text-center font-bold ${row.balance < 0 ? "text-rose-600" : "text-blue-700"}`}
                >
                  {formatCurrency(row.balance)}
                </td>
              </tr>
            );
          })}
          {displayData.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="p-8 text-center text-slate-400 font-sans"
              >
                No data found for selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderExpenseTable = (pendingOnly = false) => {
    let exps = filteredExpenses;
    if (pendingOnly) exps = exps.filter((e) => !e.noteSheetId);

    return (
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold">
            <th className="p-3">
              {t.voucherNo} & {t.date}
            </th>
            <th className="p-3">
              {t.office} & {t.category}
            </th>
            <th className="p-3">{t.applicantName}</th>
            <th className="p-3 text-right">
              {language === "bn" ? "মূল পরিমাণ" : "Base"}
            </th>
            <th className="p-3 text-right">VAT</th>
            <th className="p-3 text-right">
              {language === "bn" ? "কর" : "Tax"}
            </th>
            <th className="p-3 text-right">
              {language === "bn" ? "নিট প্রদেয়" : "Net"}
            </th>
            <th className="p-3 text-right">
              {language === "bn" ? "গ্রস" : "Gross"}
            </th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {exps.map((e) => {
            const off = offices.find((o) => o.id === e.officeId)?.name;
            const cat = categories.find((c) => c.id === e.categoryId)?.name;
            const base = e.baseAmount || e.amount || 0;
            const vat = e.vatAmount || 0;
            const tax = e.taxAmount || 0;
            const net = e.netPayable || base;
            const gross = e.grossAmount || e.amount || 0;
            return (
              <tr key={e.id} className="hover:bg-slate-50 transition">
                <td className="p-3">
                  <div className="font-medium text-slate-800 font-mono">
                    {e.voucherNo}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {e.expenseDate}
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-slate-800 font-medium">{off}</div>
                  <div className="text-xs text-slate-500">{cat}</div>
                </td>
                <td className="p-3">
                  <div className="text-slate-800 font-medium">
                    {e.applicant?.name || "-"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {e.applicant?.designation || ""}
                  </div>
                </td>
                <td className="p-3 text-right text-slate-700 font-mono">
                  {formatCurrency(base)}
                </td>
                <td className="p-3 text-right text-emerald-700 font-mono">
                  {formatCurrency(vat)}
                </td>
                <td className="p-3 text-right text-rose-700 font-mono">
                  {formatCurrency(tax)}
                </td>
                <td className="p-3 text-right text-indigo-700 font-bold font-mono">
                  {formatCurrency(net)}
                </td>
                <td className="p-3 text-right font-bold text-slate-900 font-mono">
                  {formatCurrency(gross)}
                </td>
                <td className="p-3">
                  {e.noteSheetId ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                      {t.noteSheetsTitle} ({t.generatedDirectly})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      {t.statPendingNoteSheets}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {exps.length === 0 && (
            <tr>
              <td colSpan={9} className="p-8 text-center text-slate-400">
                No expenses found for selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderCombinedPdfPrintView = () => {
    return (
      <div className="space-y-12">
        {selectedCategories.map((catId, index) => {
          const cat = categories.find((c) => c.id === catId);
          const catAllocations = filteredAllocations.filter(
            (a) => a.categoryId === catId,
          );
          const catExpenses = filteredExpenses.filter(
            (e) => e.categoryId === catId,
          );
          const totalAlloc = catAllocations.reduce(
            (sum, a) => sum + Number(a.allocatedAmount || 0),
            0,
          );
          const totalExp = catExpenses.reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0,
          );
          const rem = totalAlloc - totalExp;

          return (
            <div
              key={catId}
              className={`${index > 0 ? "break-before-page pt-8" : ""} space-y-4`}
            >
              <div className="border-b-2 border-slate-800 pb-2 flex justify-between items-end">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {cat?.name}
                  </h2>
                  <span className="text-xs font-mono text-slate-500">
                    {t.category}: {cat?.budgetHead} | FY: {currentFYObj?.name}
                  </span>
                </div>
                <div className="text-right text-xs font-mono">
                  <div>
                    Allocated: <strong>{formatCurrency(totalAlloc)}</strong>
                  </div>
                  <div>
                    Spent: <strong>{formatCurrency(totalExp)}</strong>
                  </div>
                  <div>
                    Balance:{" "}
                    <strong
                      className={rem < 0 ? "text-red-600" : "text-emerald-700"}
                    >
                      {formatCurrency(rem)}
                    </strong>
                  </div>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 border border-slate-300">{t.date}</th>
                    <th className="p-2 border border-slate-300">{t.office}</th>
                    <th className="p-2 border border-slate-300">
                      {t.voucherNo}
                    </th>
                    <th className="p-2 border border-slate-300">
                      {t.applicantName}
                    </th>
                    <th className="p-2 border border-slate-300 text-right">
                      {t.amount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catExpenses.map((e) => {
                    const off = offices.find((o) => o.id === e.officeId)?.name;
                    return (
                      <tr key={e.id}>
                        <td className="p-2 border border-slate-300">
                          {e.expenseDate}
                        </td>
                        <td className="p-2 border border-slate-300">{off}</td>
                        <td className="p-2 border border-slate-300 font-mono">
                          {e.voucherNo}
                        </td>
                        <td className="p-2 border border-slate-300">
                          {e.applicant?.name || "-"}
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-bold">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    );
                  })}
                  {catExpenses.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center italic text-slate-400 border border-slate-300"
                      >
                        No expenses recorded for this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPrintHeader = () => {
    const selectedOfficeName = filterOffice
      ? offices.find((o) => o.id === filterOffice)?.name
      : "All Offices";

    return (
      <div
        className="hidden print:flex flex-col items-center justify-center mb-6 w-full text-center report-print-header"
        data-print-header="true"
      >
        <div className="flex items-center justify-center gap-4 mb-3">
          {systemSettings?.logoUrl ? (
            <img
              src={systemSettings.logoUrl}
              alt="Logo"
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <svg
              width="56"
              height="56"
              viewBox="0 0 100 100"
              className="shrink-0"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#006a4e"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#006a4e"
                strokeWidth="1.5"
                strokeDasharray="3,2"
              />
              <path
                d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82"
                fill="none"
                stroke="#006a4e"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="50" cy="22" r="3" fill="#f42a41" />
            </svg>
          )}
          <div className="text-left">
            <h1 className="text-xl font-bold text-slate-900 mb-0.5 tracking-tight">
              {systemSettings?.institutionName ||
                "বাংলাদেশ কৃষি ব্যাংক / BANGLADESH KRISHI BANK"}
            </h1>
            <p className="text-[13px] text-slate-700">
              {systemSettings?.webAppName ||
                "Office Allocation & Expense Management System"}
            </p>
          </div>
        </div>

        <div className="text-center w-full mt-1">
          <h2 className="text-base font-bold text-slate-800 mb-1">
            আর্থিক প্রতিবেদন ও হিসাব বিবরণী: {reportType.replace(/_/g, " ")}
          </h2>
          <div className="text-[12px] font-medium text-slate-700 flex justify-center items-center gap-2 mb-1">
            <span>FY: {currentFYObj?.name || "2026-2027"}</span>
            <span className="text-slate-400">|</span>
            <span>Office: {selectedOfficeName}</span>
          </div>
          <div className="text-[12px] text-slate-600 flex justify-center items-center gap-2">
            <span>
              Generated by: {currentUser.name} ({currentUser.role})
            </span>
            <span className="text-slate-400">|</span>
            <span>Date: {new Date().toLocaleDateString("en-US")}</span>
          </div>
        </div>

        <div className="w-full border-b-[3px] border-slate-900 mt-4 mb-4"></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)] print:h-auto print:block print:w-full print:m-0 print:p-0">
      {/* Top Filters */}
      <div
        data-no-print="true"
        className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-4 print:hidden shrink-0 flex flex-col gap-3"
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Filter className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            {t.reportsTitle} Filters
          </h3>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div className="w-48 shrink-0">
            <label className="block font-semibold text-slate-700 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 bg-slate-50 font-medium"
            >
              <option value="CONSOLIDATED">Consolidated Overview</option>
              <option value="CATEGORY_WISE">Category-wise Summary</option>
              {isHeadOffice && (
                <option value="OFFICE_WISE">Office-wise Summary</option>
              )}
              <option value="EXPENSE_TRANSACTION">Expense Transactions</option>
              <option value="APPLICANT_WISE">Applicant-wise Expenses</option>
              <option value="PENDING_NOTESHEET">Pending Note Sheets</option>
              <option value="COMBINED_PDF">
                Combined PDF (Multi-Category)
              </option>
            </select>
          </div>

          <div className="w-36 shrink-0">
            <label className="block font-semibold text-slate-700 mb-1">
              {t.financialYear}
            </label>
            <select
              value={filterFY}
              onChange={(e) => setFilterFY(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none bg-white"
            >
              <option value="">{t.all} Years</option>
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          {isHeadOffice && (
            <div className="w-48 shrink-0">
              <label className="block font-semibold text-slate-700 mb-1">
                {t.office}
              </label>
              <select
                value={filterOffice}
                onChange={(e) => setFilterOffice(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none bg-white"
              >
                <option value="">{t.allOffices}</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType !== "COMBINED_PDF" && (
            <div className="w-48 shrink-0">
              <label className="block font-semibold text-slate-700 mb-1">
                {t.category}
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none bg-white"
              >
                <option value="">{t.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="w-32 shrink-0">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {(reportType === "EXPENSE_TRANSACTION" ||
            reportType === "APPLICANT_WISE") && (
            <>
              <div className="w-40 shrink-0">
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.applicantName}
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={filterApplicant}
                  onChange={(e) => setFilterApplicant(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="w-40 shrink-0">
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.voucherNo}
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={filterVoucher}
                  onChange={(e) => setFilterVoucher(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Report Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:overflow-visible print:rounded-none print:p-0 print:m-0">
        {/* Toolbar */}
        <div
          data-no-print="true"
          className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0 print:hidden"
        >
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <FileBarChart className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">
              {reportType.replace(/_/g, " ")}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> CSV Export
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> {t.printPdf}
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0 print:m-0 print:overflow-visible print:w-full">
          {renderPrintHeader()}

          {reportType === "COMBINED_PDF" ? (
            <div>
              <div className="mb-6 print:hidden">
                <h3 className="font-bold text-slate-800 mb-1 text-sm">
                  Select Categories for Combined Report
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Each selected category will be rendered on a separate page
                  when printed or saved as PDF.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => toggleCategory(c.id)}
                      className={`p-3 border rounded-xl cursor-pointer flex items-center gap-2.5 transition text-xs ${selectedCategories.includes(c.id) ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold" : "bg-white border-slate-200 hover:border-emerald-300 text-slate-700"}`}
                    >
                      {selectedCategories.includes(c.id) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="mt-6 p-5 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-700 text-xs">
                      Ready for Printing
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 mb-3">
                      {selectedCategories.length} categories selected.
                    </p>
                    <button
                      onClick={handlePrint}
                      className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md"
                    >
                      <Printer className="w-4 h-4" /> Generate Combined PDF
                    </button>
                  </div>
                )}
              </div>
              {renderCombinedPdfPrintView()}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden print:border-none print:shadow-none w-full">
              {(reportType === "CONSOLIDATED" ||
                reportType === "CATEGORY_WISE" ||
                reportType === "OFFICE_WISE") &&
                renderConsolidatedTable()}
              {(reportType === "EXPENSE_TRANSACTION" ||
                reportType === "APPLICANT_WISE") &&
                renderExpenseTable()}
              {reportType === "PENDING_NOTESHEET" && renderExpenseTable(true)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
