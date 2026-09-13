import { apiFetch } from "../api";
import React, { useState, useRef } from "react";
import {
  Allocation,
  Office,
  Category,
  FinancialYear,
  User,
  Expense,
  SystemSettings,
} from "../types";
import {
  Plus,
  Building2,
  Trash2,
  Upload,
  AlertCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  FileDown,
  Edit2,
  Layers,
  Printer,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";
import { OfficeBudgetFloatingModal } from "./OfficeBudgetFloatingModal";

interface AllocationsViewProps {
  allocations: Allocation[];
  expenses?: Expense[];
  offices: Office[];
  categories: Category[];
  financialYears: FinancialYear[];
  selectedFY: string;
  currentUser: User;
  onAddAllocation: (allocation: Omit<Allocation, "id">) => void;
  onUpdateAllocation?: (id: string, allocation: Partial<Allocation>) => void;
  onDeleteAllocation: (id: string) => void;
  isHeadOffice: boolean;
  systemSettings?: SystemSettings | null;
  refreshData?: () => void;
}

export function AllocationsView({
  allocations,
  expenses = [],
  offices,
  categories,
  financialYears,
  selectedFY,
  currentUser,
  onAddAllocation,
  onUpdateAllocation,
  onDeleteAllocation,
  isHeadOffice,
  systemSettings,
  refreshData,
}: AllocationsViewProps) {
  const { t, formatCurrency, language } = useLanguage();
  const { isCustom, isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Selected office for floating buttons filter ("all" or specific officeId)
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(
    isHeadOffice ? "all" : currentUser.officeId,
  );

  // Floating Office Budget Modal state
  const [floatingOfficeId, setFloatingOfficeId] = useState<string | null>(null);
  const [isFloatingModalOpen, setIsFloatingModalOpen] =
    useState<boolean>(false);

  // Collapsed / Expanded state for the category summary rows in the main page table
  const [expandedSummaryKeys, setExpandedSummaryKeys] = useState<
    Record<string, boolean>
  >({});

  const openFloatingModal = (offId: string) => {
    setSelectedOfficeId(offId);
    setFloatingOfficeId(offId);
    setIsFloatingModalOpen(true);
  };

  const toggleSummaryKey = (key: string) => {
    setExpandedSummaryKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAllSummary = () => {
    const next: Record<string, boolean> = {};
    filteredAllocations.forEach((alc) => {
      next[`${alc.officeId}_${alc.categoryId}`] = true;
    });
    setExpandedSummaryKeys(next);
  };

  const collapseAllSummary = () => {
    setExpandedSummaryKeys({});
  };

  // Add Form State
  const [modalMode, setModalMode] = useState<"Entry" | "Transfer">("Entry");
  const [officeId, setOfficeId] = useState(
    selectedOfficeId !== "all" && offices.some((o) => o.id === selectedOfficeId)
      ? selectedOfficeId
      : offices.find((o) => o.type === "SubOffice")?.id || offices[0]?.id || "",
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [type, setType] = useState<"Initial" | "Additional" | "Adjustment">(
    "Initial",
  );

  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");

  // CSV Import State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFYObj = financialYears.find((fy) => fy.id === selectedFY);
  const isFYClosed = !!currentFYObj?.isClosed;

  // Compute office metrics for floating buttons (Name, Total Budget, Expense, Balance)
  const userAllowedOffices = offices.filter((o) =>
    isHeadOffice ? true : o.id === currentUser.officeId,
  );

  const officeMetrics = userAllowedOffices.map((off) => {
    const officeAlcs = allocations.filter(
      (a) => a.financialYearId === selectedFY && a.officeId === off.id,
    );
    const initial = officeAlcs
      .filter((a) => a.type === "Initial" || (!a.type as any))
      .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
    const additional = officeAlcs
      .filter((a) => a.type === "Additional")
      .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
    const adjustment = officeAlcs
      .filter((a) => a.type === "Adjustment")
      .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
    const totalBudget = initial + additional + adjustment;

    const officeExps = expenses.filter(
      (e) => e.financialYearId === selectedFY && e.officeId === off.id,
    );
    const approvedExps = officeExps.filter(
      (e) => e.status === "Approved" || !e.status,
    );
    const pendingExps = officeExps.filter((e) => e.status === "Pending");
    const totalExpense = approvedExps.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    );
    const pendingExpense = pendingExps.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    );
    const balance = totalBudget - totalExpense - pendingExpense;
    const count = officeAlcs.length;

    return {
      office: off,
      initial,
      additional,
      adjustment,
      totalBudget,
      totalExpense,
      pendingExpense,
      balance,
      count,
    };
  });

  // Grand total for "All Offices"
  const grandTotal = officeMetrics.reduce(
    (acc, item) => ({
      initial: acc.initial + item.initial,
      additional: acc.additional + item.additional,
      adjustment: acc.adjustment + item.adjustment,
      totalBudget: acc.totalBudget + item.totalBudget,
      totalExpense: acc.totalExpense + item.totalExpense,
      pendingExpense: acc.pendingExpense + item.pendingExpense,
      balance: acc.balance + item.balance,
      count: acc.count + item.count,
    }),
    {
      initial: 0,
      additional: 0,
      adjustment: 0,
      totalBudget: 0,
      totalExpense: 0,
      pendingExpense: 0,
      balance: 0,
      count: 0,
    },
  );

  // Filter allocations based on selected office filter
  const filteredAllocations = allocations.filter((a) => {
    const matchFY = a.financialYearId === selectedFY;
    const matchOffice = isHeadOffice
      ? selectedOfficeId === "all" || a.officeId === selectedOfficeId
      : a.officeId === currentUser.officeId;
    return matchFY && matchOffice;
  });

  const selectedOfficeObj =
    selectedOfficeId !== "all"
      ? offices.find((o) => o.id === selectedOfficeId)
      : null;
  const selectedOfficeMetric =
    selectedOfficeId !== "all"
      ? officeMetrics.find((m) => m.office.id === selectedOfficeId)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatedAmount || Number(allocatedAmount) === 0) return;

    if (modalMode === "Transfer") {
      const amt = Math.abs(Number(allocatedAmount));
      const sourceCategory = categories.find((c) => c.id === categoryId);
      if (!sourceCategory) return;

      const isProvision = sourceCategory.name.endsWith(" (Provision)");
      let finalToCategoryId: string | undefined;

      if (isProvision) {
        const mainCatName = sourceCategory.name.replace(" (Provision)", "");
        const mainCategory = categories.find((c) => c.name === mainCatName);
        if (mainCategory) {
          finalToCategoryId = mainCategory.id;
        } else {
          console.error("Main category not found for reverse transfer");
          return;
        }
      } else {
        // Ensure Provision category exists
        const provCategory = categories.find(
          (c) =>
            c.budgetHead === `${sourceCategory.budgetHead}-P` ||
            c.name === `${sourceCategory.name} (Provision)`,
        );

        finalToCategoryId = provCategory?.id;

        if (!provCategory) {
          // Create new category via API
          try {
            const res = await apiFetch("/api/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: `${sourceCategory.code}-P`,
                name: `${sourceCategory.name} (Provision)`,
                description: `Auto-generated provision category for ${sourceCategory.name}`,
                budgetHead: `${sourceCategory.budgetHead}-P`,
                status: "Active",
              }),
            });
            if (res.ok) {
              const newCat = await res.json();
              finalToCategoryId = newCat.id;
            }
          } catch (error) {
            console.error("Failed to create provision category", error);
            return;
          }
        }
      }

      if (!finalToCategoryId) return;

      // Source (Deduction)
      onAddAllocation({
        financialYearId: selectedFY,
        officeId,
        categoryId,
        type: "Adjustment",
        allocatedAmount: -amt,
        date,
        referenceNo,
        allocatedBy: currentUser.id,
        remarks:
          remarks ||
          (isProvision
            ? `Reverse transfer to main category`
            : `Provision transfer to auto-generated category`),
      });

      // Destination (Addition)
      setTimeout(() => {
        onAddAllocation({
          financialYearId: selectedFY,
          officeId, // Same office
          categoryId: finalToCategoryId!,
          type: "Adjustment",
          allocatedAmount: amt,
          date,
          referenceNo,
          allocatedBy: currentUser.id,
          remarks:
            remarks ||
            (isProvision
              ? `Reverse transfer received from provision`
              : `Provision received from ${sourceCategory.code}`),
        });

        if (refreshData) {
          setTimeout(refreshData, 500);
        }
      }, 300);
    } else {
      const sourceCategory = categories.find((c) => c.id === categoryId);
      const isProvision = sourceCategory?.name.endsWith(" (Provision)");
      let finalAmt = Number(allocatedAmount);
      if (type === "Adjustment" && isProvision && finalAmt > 0) {
        finalAmt = -finalAmt;
      }
      onAddAllocation({
        financialYearId: selectedFY,
        officeId,
        categoryId,
        type,
        allocatedAmount: finalAmt,
        date,
        referenceNo,
        allocatedBy: currentUser.id,
        remarks:
          remarks ||
          (isProvision && type === "Adjustment"
            ? "Provision reversal adjustment"
            : remarks),
      });
    }

    setAllocatedAmount("");
    setReferenceNo("");
    setRemarks("");
    setShowModal(false);
  };

  // Group by office and category to show Total = Initial + Additional +- Adjustment
  const summaryMap: Record<
    string,
    {
      initial: number;
      additional: number;
      adjustment: number;
      total: number;
      rows: Allocation[];
    }
  > = {};

  filteredAllocations.forEach((alc) => {
    const key = `${alc.officeId}_${alc.categoryId}`;
    if (!summaryMap[key]) {
      summaryMap[key] = {
        initial: 0,
        additional: 0,
        adjustment: 0,
        total: 0,
        rows: [],
      };
    }
    const amt = Number(alc.allocatedAmount || 0);
    if (alc.type === "Initial" || (!alc.type as any))
      summaryMap[key].initial += amt;
    else if (alc.type === "Additional") summaryMap[key].additional += amt;
    else if (alc.type === "Adjustment") summaryMap[key].adjustment += amt;

    summaryMap[key].total += amt;
    summaryMap[key].rows.push(alc);
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      if (lines.length < 2) {
        setCsvErrors(["CSV file is empty or missing headers."]);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = [
        "officecode",
        "budgethead",
        "type",
        "amount",
        "date",
        "referenceno",
      ];

      const missing = requiredHeaders.filter((req) => !headers.includes(req));
      if (missing.length > 0) {
        setCsvErrors([`Missing required columns: ${missing.join(", ")}`]);
        return;
      }

      const parsed: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });

        // Validations
        const office = offices.find((o) => o.code === row.officecode);
        if (!office)
          errors.push(`Row ${i}: Invalid office code "${row.officecode}"`);

        const category = categories.find(
          (c) => c.budgetHead === row.budgethead,
        );
        if (!category)
          errors.push(`Row ${i}: Invalid budget head "${row.budgethead}"`);

        const rowType = row.type as "Initial" | "Additional" | "Adjustment";
        if (!["Initial", "Additional", "Adjustment"].includes(rowType)) {
          errors.push(
            `Row ${i}: Invalid type "${row.type}". Must be Initial, Additional, or Adjustment`,
          );
        }

        const amount = Number(row.amount);
        if (isNaN(amount) || amount === 0)
          errors.push(`Row ${i}: Invalid amount "${row.amount}"`);

        // Duplicate Check
        const isDuplicate = allocations.some(
          (a) => a.referenceNo === row.referenceno && a.referenceNo !== "",
        );
        if (isDuplicate)
          errors.push(
            `Row ${i}: Reference number "${row.referenceno}" already exists`,
          );

        if (
          office &&
          category &&
          ["Initial", "Additional", "Adjustment"].includes(rowType) &&
          !isNaN(amount) &&
          amount !== 0 &&
          !isDuplicate
        ) {
          parsed.push({
            financialYearId: selectedFY,
            officeId: office.id,
            officeCode: row.officecode,
            categoryId: category.id,
            budgetHead: row.budgethead,
            type: rowType,
            allocatedAmount: amount,
            date: row.date || new Date().toISOString().split("T")[0],
            referenceNo: row.referenceno,
            remarks: row.remarks || "CSV Import",
            allocatedBy: currentUser.id,
          });
        }
      }

      setCsvErrors(errors);
      setCsvData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = () => {
    if (csvData.length === 0) return;
    csvData.forEach((row) => {
      onAddAllocation({
        financialYearId: row.financialYearId,
        officeId: row.officeId,
        categoryId: row.categoryId,
        type: row.type,
        allocatedAmount: row.allocatedAmount,
        date: row.date,
        referenceNo: row.referenceNo,
        remarks: row.remarks,
        allocatedBy: row.allocatedBy,
      });
    });
    setCsvData([]);
    setCsvErrors([]);
    setShowCsvModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const headers =
      "officeCode,budgetHead,type,amount,date,referenceNo,remarks\n";
    const example =
      "SUB-CTG,Revenue-101,Initial,500000,2025-07-01,REF-001,Annual Budget\n";
    const blob = new Blob([headers + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allocation_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2
            className={`text-xl font-bold ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}
          >
            {t.allocationsTitle}
          </h2>
          <p
            className={`text-xs mt-0.5 ${isCustom ? "text-purple-300 opacity-80" : isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {t.allocationsSubtitle} ({t.financialYear}: {currentFYObj?.name})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isHeadOffice && (
            <>
              <button
                disabled={isFYClosed}
                onClick={() => setShowCsvModal(true)}
                title={isFYClosed ? "🔒 এই অর্থবছরটি ক্লোজড।" : ""}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm border disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCustom
                    ? "bg-[#251d45] border-[#4b3b7a] text-purple-200 hover:bg-[#32285e]"
                    : isDark
                      ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Upload className="w-4 h-4" /> {t.importCsv}
              </button>
              <button
                disabled={isFYClosed}
                onClick={() => {
                  if (
                    selectedOfficeId !== "all" &&
                    offices.some((o) => o.id === selectedOfficeId)
                  ) {
                    setOfficeId(selectedOfficeId);
                  }
                  setShowModal(true);
                }}
                title={isFYClosed ? "🔒 এই অর্থবছরটি ক্লোজড।" : ""}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> {t.addAllocation}
              </button>
            </>
          )}
        </div>
      </div>

      {isFYClosed && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            🔒 নির্বাচিত অর্থবছর ({currentFYObj?.name}) বন্ধ (Closed) করা হয়েছে।
            নতুন বাজেট বরাদ্দ করা বা সংশোধন করা বন্ধ রয়েছে।
          </span>
        </div>
      )}

      {/* Formula Explanation Callout (হিসাব সূত্র) */}
      <div
        className={`border rounded-2xl p-4 text-xs flex items-center gap-2 ${
          isCustom
            ? "bg-[#181233] border-[#342759] text-purple-200"
            : isDark
              ? "bg-slate-850 border-slate-800 text-slate-300"
              : "bg-slate-100/70 border-slate-200 text-slate-700"
        }`}
      >
        <ArrowRightLeft className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="font-mono">{t.formulaNote}</span>
      </div>

      {/* Office & Branch Floating Button Cards Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <h3
              className={`text-xs sm:text-sm font-bold ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}
            >
              {language === "bn"
                ? "কার্যালয় ও শাখাভিত্তিক বাজেট (ক্লিক করলে ফ্লোটিং উইন্ডো ও প্রিন্ট ওপেন হবে)"
                : "Office & Branch Budget (Click to open floating window & print)"}
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isCustom
                  ? "bg-[#251c45] text-amber-300 border border-[#3f2f6e]"
                  : isDark
                    ? "bg-slate-800 text-slate-300 border border-slate-700"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {isHeadOffice
                ? language === "bn"
                  ? `${officeMetrics.length}টি শাখা / কার্যালয়`
                  : `${officeMetrics.length} Offices`
                : language === "bn"
                  ? "নিজ কার্যালয়"
                  : "Own Office"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openFloatingModal(selectedOfficeId)}
              className="text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm"
              title="সরাসরি ফ্লোটিং তালিকা ও প্রিন্ট ওপেন করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {language === "bn"
                  ? "ফ্লোটিং উইন্ডো ও প্রিন্ট"
                  : "Floating View & Print"}
              </span>
            </button>

            {isHeadOffice && selectedOfficeId !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedOfficeId("all")}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shadow-sm ${
                  isCustom
                    ? "text-amber-300 bg-[#251d45] hover:bg-[#32285e] border border-[#443370]"
                    : isDark
                      ? "text-emerald-400 bg-slate-800 hover:bg-slate-750 border border-slate-700"
                      : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {language === "bn" ? "সকল কার্যালয় দেখুন" : "View All Offices"}
              </button>
            )}
          </div>
        </div>

        {/* Floating Button / Interactive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* All Offices Floating Button (Head Office only) */}
          {isHeadOffice && (
            <button
              type="button"
              onClick={() => openFloatingModal("all")}
              className={`relative p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer border flex flex-col justify-between gap-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 group ${
                selectedOfficeId === "all"
                  ? isCustom
                    ? "bg-[#251a4a] border-amber-400 ring-2 ring-amber-400/40 text-purple-100"
                    : isDark
                      ? "bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30 text-white"
                      : "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/30 text-slate-900"
                  : isCustom
                    ? "bg-[#16102e] border-[#2e234e] text-purple-200 hover:border-amber-400/60 hover:bg-[#1f1740]"
                    : isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/60 hover:bg-slate-850"
                      : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      selectedOfficeId === "all"
                        ? isCustom
                          ? "bg-amber-400/20 text-amber-300"
                          : isDark
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-emerald-500/20 text-emerald-700"
                        : isCustom
                          ? "bg-purple-900/40 text-purple-300"
                          : isDark
                            ? "bg-slate-800 text-slate-400"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm truncate">
                      {language === "bn"
                        ? "সকল কার্যালয় ও শাখা"
                        : "All Offices & Branches"}
                    </div>
                    <div
                      className={`text-[10px] font-mono ${isCustom ? "text-purple-400" : isDark ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {language === "bn"
                        ? "সমন্বিত ফ্লোটিং তালিকা"
                        : "Consolidated Floating View"}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                    selectedOfficeId === "all"
                      ? isCustom
                        ? "bg-amber-400 text-[#140e29]"
                        : isDark
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-emerald-600 text-white"
                      : isCustom
                        ? "bg-[#251d45] text-purple-300"
                        : isDark
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {language === "bn" ? "ফ্লোটিং" : "Float"}
                </span>
              </div>

              <div
                className={`grid grid-cols-3 gap-1.5 pt-2 border-t text-center ${
                  isCustom
                    ? "border-purple-900/40"
                    : isDark
                      ? "border-slate-800"
                      : "border-slate-100"
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`text-[10px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {language === "bn" ? "মোট বাজেট" : "Budget"}
                  </span>
                  <span
                    className={`text-xs font-bold font-mono ${isCustom ? "text-amber-300" : isDark ? "text-slate-100" : "text-slate-900"}`}
                  >
                    {formatCurrency(grandTotal.totalBudget)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-[10px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {language === "bn" ? "খরচ" : "Expense"}
                  </span>
                  <span className="text-xs font-bold font-mono text-rose-500 dark:text-rose-400">
                    {formatCurrency(grandTotal.totalExpense)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-[10px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {language === "bn" ? "স্থিতি" : "Balance"}
                  </span>
                  <span
                    className={`text-xs font-bold font-mono ${
                      grandTotal.balance < 0
                        ? "text-rose-500"
                        : "text-emerald-500 dark:text-emerald-400"
                    }`}
                  >
                    {formatCurrency(grandTotal.balance)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-medium pt-1 text-emerald-500 opacity-90 group-hover:opacity-100">
                <span className="flex items-center gap-1">
                  <Printer className="w-3 h-3" />
                  {language === "bn"
                    ? "ক্লিক করুন: ফ্লোটিং উইন্ডো ও প্রিন্ট"
                    : "Click: Floating list & print"}
                </span>
                <span>→</span>
              </div>
            </button>
          )}

          {/* Individual Office Buttons */}
          {officeMetrics.map((item) => {
            const isSelected = selectedOfficeId === item.office.id;
            return (
              <button
                key={item.office.id}
                type="button"
                onClick={() => openFloatingModal(item.office.id)}
                className={`relative p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer border flex flex-col justify-between gap-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 group ${
                  isSelected
                    ? isCustom
                      ? "bg-[#251a4a] border-amber-400 ring-2 ring-amber-400/40 text-purple-100"
                      : isDark
                        ? "bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30 text-white"
                        : "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/30 text-slate-900"
                    : isCustom
                      ? "bg-[#16102e] border-[#2e234e] text-purple-200 hover:border-purple-400/60 hover:bg-[#1f1740]"
                      : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected
                          ? isCustom
                            ? "bg-amber-400/20 text-amber-300"
                            : isDark
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-emerald-500/20 text-emerald-700"
                          : isCustom
                            ? "bg-purple-900/40 text-purple-300"
                            : isDark
                              ? "bg-slate-800 text-slate-400"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-bold text-xs sm:text-sm truncate"
                        title={item.office?.name || ""}
                      >
                        {item.office?.name || "Unknown Office"}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-0.5">
                        <span
                          className={`font-mono ${isCustom ? "text-purple-400" : isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {item.office?.code || ""}
                        </span>
                        <span className="opacity-40">•</span>
                        <span
                          className={
                            item.office?.type === "HeadOffice"
                              ? "text-purple-400 font-semibold"
                              : "opacity-75"
                          }
                        >
                          {item.office?.type === "HeadOffice"
                            ? language === "bn"
                              ? "প্রধান"
                              : "HO"
                            : language === "bn"
                              ? "শাখা"
                              : "Sub"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                      isSelected
                        ? isCustom
                          ? "bg-amber-400 text-[#140e29]"
                          : isDark
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-emerald-600 text-white"
                        : isCustom
                          ? "bg-[#251d45] text-purple-300"
                          : isDark
                            ? "bg-slate-800 text-slate-400"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isSelected
                      ? language === "bn"
                        ? "সক্রিয়"
                        : "Active"
                      : language === "bn"
                        ? "ফ্লোটিং"
                        : "Float"}
                  </span>
                </div>

                <div
                  className={`grid grid-cols-3 gap-1.5 pt-2 border-t text-center ${
                    isCustom
                      ? "border-purple-900/40"
                      : isDark
                        ? "border-slate-800"
                        : "border-slate-100"
                  }`}
                >
                  <div className="flex flex-col">
                    <span
                      className={`text-[10px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {language === "bn" ? "মোট বাজেট" : "Budget"}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono ${isCustom ? "text-amber-300" : isDark ? "text-slate-100" : "text-slate-900"}`}
                    >
                      {formatCurrency(item.totalBudget)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-[10px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {language === "bn" ? "খরচ" : "Expense"}
                    </span>
                    <span className="text-xs font-bold font-mono text-rose-500 dark:text-rose-400">
                      {formatCurrency(item.totalExpense)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-[10px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {language === "bn" ? "স্থিতি" : "Balance"}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        item.balance < 0
                          ? "text-rose-500"
                          : "text-emerald-500 dark:text-emerald-400"
                      }`}
                    >
                      {formatCurrency(item.balance)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-medium pt-1 text-emerald-500 opacity-90 group-hover:opacity-100">
                  <span className="flex items-center gap-1">
                    <Printer className="w-3 h-3" />
                    {language === "bn"
                      ? "ক্লিক করুন: ফ্লোটিং তালিকা ও প্রিন্ট"
                      : "Click: Floating list & print"}
                  </span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Office Detail Banner (if a single office is filtered) */}
      {selectedOfficeObj && selectedOfficeMetric && (
        <div
          className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
            isCustom
              ? "bg-[#1d163a] border-[#382b61] text-purple-100"
              : isDark
                ? "bg-slate-850 border-slate-800 text-slate-100"
                : "bg-emerald-50/60 border-emerald-100 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isCustom
                  ? "bg-amber-400/20 text-amber-300"
                  : isDark
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-600 text-white"
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm sm:text-base">
                  {selectedOfficeObj.name}
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                    isCustom
                      ? "bg-[#2d2254] text-amber-300"
                      : isDark
                        ? "bg-slate-800 text-slate-300"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {selectedOfficeObj.code}
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 ${isCustom ? "text-purple-300/80" : isDark ? "text-slate-400" : "text-slate-600"}`}
              >
                {language === "bn"
                  ? "নির্বাচিত কার্যালয়ের বাজেট ও ব্যয়ের হিসাব বিবরণী"
                  : "Selected Office Budget & Expenditure Statement"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
            <div className="flex flex-col">
              <span
                className={`text-[11px] ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                {language === "bn" ? "মোট বাজেট" : "Total Budget"}
              </span>
              <span
                className={`text-sm font-bold font-mono ${isCustom ? "text-amber-300" : isDark ? "text-slate-100" : "text-slate-900"}`}
              >
                {formatCurrency(selectedOfficeMetric.totalBudget)}
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className={`text-[11px] ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                {language === "bn" ? "মোট খরচ" : "Total Spent"}
              </span>
              <span className="text-sm font-bold font-mono text-rose-500 dark:text-rose-400">
                {formatCurrency(selectedOfficeMetric.totalExpense)}
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className={`text-[11px] ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                {language === "bn" ? "অবশিষ্ট স্থিতি" : "Available Balance"}
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  selectedOfficeMetric.balance < 0
                    ? "text-rose-500 font-extrabold"
                    : "text-emerald-500 dark:text-emerald-400"
                }`}
              >
                {formatCurrency(selectedOfficeMetric.balance)}
              </span>
            </div>

            {/* Quick Button to open Floating Modal */}
            <button
              type="button"
              onClick={() => openFloatingModal(selectedOfficeObj.id)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {language === "bn"
                  ? "ফ্লোটিং উইন্ডো ও প্রিন্ট"
                  : "Floating View & Print"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Allocations Summary Table Header with Expand/Collapse All */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <h4
          className={`text-xs sm:text-sm font-bold ${isCustom ? "text-purple-200" : isDark ? "text-slate-200" : "text-slate-800"}`}
        >
          {language === "bn"
            ? "খাতভিত্তিক বাজেট তালিকা (কলাপস অপশন সহ)"
            : "Category Budget List (Collapsible)"}
        </h4>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAllSummary}
            className={`text-xs px-2.5 py-1 rounded-lg border transition ${
              isCustom
                ? "bg-[#251d45] border-[#443370] text-purple-200 hover:text-amber-300"
                : isDark
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {language === "bn" ? "সব বিস্তার করুন" : "Expand All"}
          </button>
          <button
            type="button"
            onClick={collapseAllSummary}
            className={`text-xs px-2.5 py-1 rounded-lg border transition ${
              isCustom
                ? "bg-[#251d45] border-[#443370] text-purple-200 hover:text-amber-300"
                : isDark
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {language === "bn" ? "সব কলাপস করুন" : "Collapse All"}
          </button>
        </div>
      </div>

      {/* Allocations Summary Table */}
      <div
        className={`rounded-2xl shadow-sm border overflow-hidden transition-colors ${
          isCustom
            ? "bg-[#140f29] border-[#2e234e]"
            : isDark
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-xs uppercase tracking-wider ${
                  isCustom
                    ? "bg-[#1c153b] border-[#302553] text-purple-300"
                    : isDark
                      ? "bg-slate-800/80 border-slate-800 text-slate-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <th className="p-3.5 font-semibold w-10 text-center">#</th>
                <th className="p-3.5 font-semibold">{t.office}</th>
                <th className="p-3.5 font-semibold">{t.category}</th>
                <th className="p-3.5 font-semibold text-right text-emerald-600 dark:text-emerald-400">
                  {language === "bn" ? "বর্তমান বরাদ্দ" : "Current Budget"}
                </th>
                <th className="p-3.5 font-semibold text-right text-rose-500">
                  {language === "bn" ? "মোট খরচ" : "Total Spent"}
                </th>
                <th className="p-3.5 font-semibold text-right">
                  {language === "bn" ? "অবশিষ্ট স্থিতি" : "Balance"}
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y text-xs ${
                isCustom
                  ? "divide-[#281e4a]"
                  : isDark
                    ? "divide-slate-800"
                    : "divide-slate-100"
              }`}
            >
              {Object.keys(summaryMap).length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={`p-8 text-center ${
                      isCustom
                        ? "text-purple-300/60"
                        : isDark
                          ? "text-slate-500"
                          : "text-slate-400"
                    }`}
                  >
                    {selectedOfficeObj
                      ? language === "bn"
                        ? `"${selectedOfficeObj.name}"-এর জন্য ${currentFYObj?.name} অর্থবছরে কোনো বাজেট বরাদ্দ পাওয়া যায়নি।`
                        : `No allocations found for ${selectedOfficeObj.name} in Financial Year ${currentFYObj?.name}.`
                      : `No allocations found for Financial Year ${currentFYObj?.name}.`}
                  </td>
                </tr>
              ) : (
                Object.entries(summaryMap).map(([key, data]) => {
                  const alc = data.rows[0];
                  const off = offices.find((o) => o.id === alc.officeId);
                  const cat = categories.find((c) => c.id === alc.categoryId);
                  const isExpanded = !!expandedSummaryKeys[key];

                  // Calculate category expense for this office & category
                  const catExps = expenses.filter(
                    (e) =>
                      e.financialYearId === selectedFY &&
                      e.officeId === alc.officeId &&
                      e.categoryId === alc.categoryId,
                  );
                  const catExpenseAmt = catExps.reduce(
                    (sum, e) => sum + Number(e.amount || 0),
                    0,
                  );
                  const catBalance = data.total - catExpenseAmt;

                  return (
                    <React.Fragment key={key}>
                      {/* Summary Row (Clickable to Expand / Collapse) */}
                      <tr
                        onClick={() => toggleSummaryKey(key)}
                        className={`transition cursor-pointer select-none ${
                          isExpanded
                            ? isCustom
                              ? "bg-[#251a4a] text-purple-100"
                              : isDark
                                ? "bg-slate-800/80 text-white"
                                : "bg-emerald-50/60 text-slate-900"
                            : isCustom
                              ? "bg-[#16102e] hover:bg-[#201844] text-purple-100"
                              : isDark
                                ? "bg-slate-900 hover:bg-slate-850 text-slate-200"
                                : "bg-white hover:bg-slate-50/50 text-slate-900"
                        }`}
                      >
                        {/* Expand/Collapse Chevron */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            className={`p-1 rounded transition-transform duration-200 ${
                              isExpanded
                                ? "rotate-90 text-emerald-500"
                                : "text-slate-400"
                            }`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>

                        {/* Office */}
                        <td className="p-3.5 font-medium">
                          <div
                            className={
                              isCustom
                                ? "text-purple-100"
                                : isDark
                                  ? "text-white"
                                  : "text-slate-900"
                            }
                          >
                            {off?.name}
                          </div>
                          <span
                            className={`text-xs font-mono ${isCustom ? "text-purple-400" : isDark ? "text-slate-500" : "text-slate-400"}`}
                          >
                            {off?.code}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="p-3.5">
                          <div
                            className={`font-bold ${isCustom ? "text-purple-100" : isDark ? "text-slate-200" : "text-slate-800"}`}
                          >
                            {cat?.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-mono mt-0.5">
                            <span
                              className={
                                isCustom
                                  ? "text-purple-400"
                                  : isDark
                                    ? "text-slate-500"
                                    : "text-slate-500"
                              }
                            >
                              {cat?.budgetHead}
                            </span>
                            <span className="text-[10px] opacity-60">
                              ({data.rows.length}{" "}
                              {language === "bn" ? "টি এন্ট্রি" : "records"})
                            </span>
                          </div>
                        </td>

                        {/* Current Total Allocation (বর্তমান বরাদ্দ) */}
                        <td className="p-3.5 text-right font-mono font-bold">
                          <span
                            className={`px-2 py-1 rounded-lg ${
                              isCustom
                                ? "bg-[#281b4e] text-amber-300 border border-[#443275]"
                                : isDark
                                  ? "bg-slate-800 text-emerald-400 border border-slate-700"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                            }`}
                          >
                            {formatCurrency(data.total)}
                          </span>
                        </td>

                        {/* Total Expense */}
                        <td className="p-3.5 text-right font-mono font-bold text-rose-500 dark:text-rose-400">
                          {formatCurrency(catExpenseAmt)}
                        </td>

                        {/* Available Balance */}
                        <td
                          className={`p-3.5 text-right font-bold font-mono ${
                            catBalance < 0
                              ? isCustom
                                ? "text-rose-400 font-black"
                                : isDark
                                  ? "text-rose-400 font-black"
                                  : "text-rose-700 font-black"
                              : isCustom
                                ? "text-emerald-300"
                                : isDark
                                  ? "text-emerald-400"
                                  : "text-emerald-700"
                          }`}
                        >
                          {formatCurrency(catBalance)}
                        </td>
                      </tr>

                      {/* Detailed History Rows (Visible ONLY when expanded) */}
                      {isExpanded && (
                        <tr
                          className={`border-b ${
                            isCustom
                              ? "bg-[#110c22]/90"
                              : isDark
                                ? "bg-slate-950/60"
                                : "bg-slate-50/70"
                          }`}
                        >
                          <td
                            colSpan={6}
                            className="p-3 sm:p-4 pl-8 sm:pl-14 border-l-4 border-emerald-500"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>
                                  {language === "bn"
                                    ? "বরাদ্দ বিভাজন (মূল, অতিরিক্ত ও সমন্বয় বিবরণী):"
                                    : "Allocation Tranches Breakdown:"}
                                </span>
                                <span className="font-mono text-[11px]">
                                  মূল: {formatCurrency(data.initial)} |
                                  অতিরিক্ত: +{formatCurrency(data.additional)} |
                                  সমন্বয়: {data.adjustment > 0 ? "+" : ""}
                                  {formatCurrency(data.adjustment)}
                                </span>
                              </div>

                              <div
                                className={`rounded-xl border overflow-hidden ${
                                  isCustom
                                    ? "bg-[#16102e] border-[#2e234e]"
                                    : isDark
                                      ? "bg-slate-900 border-slate-800"
                                      : "bg-white border-slate-200"
                                }`}
                              >
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr
                                      className={`border-b text-[10px] uppercase tracking-wider font-semibold ${
                                        isCustom
                                          ? "bg-[#1f163f] text-purple-300"
                                          : isDark
                                            ? "bg-slate-800 text-slate-400"
                                            : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      <th className="p-2 pl-3">ধরন (Type)</th>
                                      <th className="p-2">তারিখ (Date)</th>
                                      <th className="p-2">
                                        স্মারক নম্বর (Ref No)
                                      </th>
                                      <th className="p-2">বিবরণ / মন্তব্য</th>
                                      <th className="p-2 text-right pr-3">
                                        টাকার পরিমাণ
                                      </th>
                                      {isHeadOffice && (
                                        <th className="p-2 text-center w-16">
                                          অ্যাকশন
                                        </th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody
                                    className={`divide-y font-mono ${
                                      isCustom
                                        ? "divide-[#281d4a]"
                                        : isDark
                                          ? "divide-slate-800"
                                          : "divide-slate-100"
                                    }`}
                                  >
                                    {data.rows.map((row) => (
                                      <tr
                                        key={row.id}
                                        className={`transition ${
                                          isCustom
                                            ? "hover:bg-[#201742]"
                                            : isDark
                                              ? "hover:bg-slate-800/60"
                                              : "hover:bg-slate-50"
                                        }`}
                                      >
                                        <td className="p-2 pl-3 font-sans">
                                          <span
                                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                              row.type === "Additional"
                                                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                                : row.type === "Adjustment"
                                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                                  : "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30"
                                            }`}
                                          >
                                            {row.type === "Initial"
                                              ? "মূল বরাদ্দ"
                                              : row.type === "Additional"
                                                ? "অতিরিক্ত বরাদ্দ"
                                                : "সমন্বয় / উপযোজন"}
                                          </span>
                                        </td>
                                        <td className="p-2 text-slate-400">
                                          {row.date || "N/A"}
                                        </td>
                                        <td className="p-2 font-bold font-mono">
                                          <span
                                            className={
                                              isCustom
                                                ? "text-purple-200"
                                                : isDark
                                                  ? "text-slate-300"
                                                  : "text-slate-700"
                                            }
                                          >
                                            {row.referenceNo || "—"}
                                          </span>
                                        </td>
                                        <td className="p-2 font-sans text-xs italic text-slate-400 max-w-xs truncate">
                                          {row.remarks || "—"}
                                        </td>
                                        <td
                                          className={`p-2 pr-3 text-right font-bold text-xs ${
                                            Number(row.allocatedAmount) < 0
                                              ? "text-rose-400 font-black"
                                              : row.type === "Additional"
                                                ? "text-blue-400 font-bold"
                                                : row.type === "Adjustment"
                                                  ? "text-amber-400 font-bold"
                                                  : isCustom
                                                    ? "text-amber-300"
                                                    : isDark
                                                      ? "text-emerald-400"
                                                      : "text-emerald-800"
                                          }`}
                                        >
                                          {Number(row.allocatedAmount) > 0 &&
                                          row.type === "Additional"
                                            ? "+"
                                            : ""}
                                          {formatCurrency(
                                            Number(row.allocatedAmount),
                                          )}
                                        </td>
                                        {isHeadOffice && (
                                          <td className="p-2 text-center">
                                            <div className="flex justify-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingAllocation(row);
                                                }}
                                                className="p-1 rounded text-blue-400 hover:bg-blue-500/20 transition"
                                                title="সম্পাদন করুন"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeletingId(row.id);
                                                }}
                                                className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition"
                                                title={t.delete}
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto m-auto rounded-2xl max-w-lg w-full p-6 shadow-2xl border ${
              isCustom
                ? "bg-[#18122d] border-[#382b61] text-purple-100"
                : isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold">{t.addAllocation}</h3>
            </div>

            <div
              className={`flex gap-2 mb-4 p-1 rounded-xl ${
                isCustom
                  ? "bg-[#120d24]"
                  : isDark
                    ? "bg-slate-800"
                    : "bg-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setModalMode("Entry")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex-1 transition ${
                  modalMode === "Entry"
                    ? isCustom
                      ? "bg-[#281e4b] text-amber-300 shadow-sm border border-[#48377e]"
                      : isDark
                        ? "bg-slate-700 text-emerald-400 shadow-sm"
                        : "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                    : isCustom
                      ? "text-purple-300 hover:bg-[#20183d]"
                      : isDark
                        ? "text-slate-400 hover:bg-slate-750"
                        : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === "bn" ? "সাধারণ এন্ট্রি" : "Direct Entry"}
              </button>
              <button
                type="button"
                onClick={() => setModalMode("Transfer")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex-1 transition flex items-center justify-center gap-1.5 ${
                  modalMode === "Transfer"
                    ? isCustom
                      ? "bg-[#281e4b] text-amber-300 shadow-sm border border-[#48377e]"
                      : isDark
                        ? "bg-slate-700 text-emerald-400 shadow-sm"
                        : "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                    : isCustom
                      ? "text-purple-300 hover:bg-[#20183d]"
                      : isDark
                        ? "text-slate-400 hover:bg-slate-750"
                        : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {language === "bn"
                  ? "তহবিল / প্রভিশন স্থানান্তর"
                  : "Fund Transfer"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {modalMode === "Transfer" ? (
                <div className="space-y-3">
                  <div
                    className={`p-3 rounded-xl border space-y-3 ${
                      isCustom
                        ? "bg-[#1f183d] border-[#3f306e]"
                        : isDark
                          ? "bg-slate-800/80 border-slate-700"
                          : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    <div
                      className={`font-semibold text-xs mb-1 ${isCustom ? "text-amber-300" : isDark ? "text-blue-300" : "text-blue-800"}`}
                    >
                      {language === "bn"
                        ? "যেখান থেকে প্রভিশন হবে (মূল খাত)"
                        : "Transfer From (Main Category)"}
                    </div>
                    <div>
                      <label
                        className={`block font-medium mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t.office}
                      </label>
                      <select
                        value={officeId}
                        onChange={(e) => setOfficeId(e.target.value)}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none ${
                          isCustom
                            ? "bg-[#140e29] border-[#382b61] text-purple-100"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100"
                              : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        {offices.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className={`block font-medium mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t.category}
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none ${
                          isCustom
                            ? "bg-[#140e29] border-[#382b61] text-purple-100"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100"
                              : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const sourceCategoryUI = categories.find(
                      (c) => c.id === categoryId,
                    );
                    const isProvisionUI =
                      !!sourceCategoryUI?.name?.endsWith(" (Provision)");
                    const targetName = isProvisionUI
                      ? sourceCategoryUI?.name?.replace(" (Provision)", "") ||
                        ""
                      : `${sourceCategoryUI?.name || ""} (Provision)`;

                    return (
                      <div
                        className={`p-3 rounded-xl border space-y-3 opacity-90 cursor-not-allowed ${
                          isCustom
                            ? "bg-[#1f183d]/60 border-[#3f306e]"
                            : isDark
                              ? "bg-slate-800/50 border-slate-700"
                              : "bg-emerald-50 border-emerald-100"
                        }`}
                      >
                        <div
                          className={`font-semibold text-xs mb-1 ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-emerald-800"}`}
                        >
                          {isProvisionUI
                            ? language === "bn"
                              ? "যেখানে ফেরত যাবে (মূল খাত)"
                              : "Transfer To (Main Category)"
                            : language === "bn"
                              ? "যেখানে প্রভিশন হবে (অটো-জেনারেটেড)"
                              : "Transfer To (Auto-Generated Provision)"}
                        </div>
                        <div>
                          <label
                            className={`block font-medium mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                          >
                            {t.office}
                          </label>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={
                              offices.find((o) => o.id === officeId)?.name || ""
                            }
                            className={`w-full px-3 py-1.5 border rounded-lg ${isCustom ? "bg-[#140e29] border-[#382b61] text-purple-300" : isDark ? "bg-slate-850 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                          />
                        </div>
                        <div>
                          <label
                            className={`block font-medium mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                          >
                            {t.category}
                          </label>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={targetName}
                            className={`w-full px-3 py-1.5 border rounded-lg font-medium ${isCustom ? "bg-[#140e29] border-[#382b61] text-purple-300" : isDark ? "bg-slate-850 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t.allocationType}
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                          isCustom
                            ? "bg-[#140e29] border-[#382b61] text-purple-100"
                            : isDark
                              ? "bg-slate-800 border-slate-700 text-slate-100"
                              : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        <option value="Initial">
                          {t.statAllocation} (Initial)
                        </option>
                        <option value="Additional">
                          {t.statAdditional} (Additional)
                        </option>
                        <option value="Adjustment">
                          {t.statAdjustment} (Adjustment)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label
                        className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t.date}
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                          isCustom
                            ? "bg-[#140e29] border-[#382b61] text-purple-100"
                            : isDark
                              ? "bg-slate-800 border-slate-700 text-slate-100"
                              : "bg-white border-slate-300 text-slate-900"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {t.office}
                    </label>
                    <select
                      value={officeId}
                      onChange={(e) => setOfficeId(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#140e29] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {offices.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.name} ({off.code}) - {off.type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {t.category}
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#140e29] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} [{cat.budgetHead}]
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label
                    className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    {t.amount} ({language === "bn" ? "টাকা" : "BDT"}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={allocatedAmount}
                    onChange={(e) => setAllocatedAmount(e.target.value)}
                    placeholder={
                      modalMode === "Transfer"
                        ? "e.g. 5000"
                        : type === "Adjustment"
                          ? "e.g. 50000 or -10000"
                          : "e.g. 500000"
                    }
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                  {modalMode === "Entry" &&
                    type === "Adjustment" &&
                    (categories
                      .find((c) => c.id === categoryId)
                      ?.name?.endsWith(" (Provision)") ? (
                      <p className="text-xs text-emerald-400 mt-1 font-medium">
                        {language === "bn"
                          ? "✓ প্রভিশন রিভার্সালের জন্য পজিটিভ এন্ট্রি স্বয়ংক্রিয়ভাবে মাইনাস (-) হবে"
                          : "✓ Positive amount will automatically be negative for provision reversal"}
                      </p>
                    ) : (
                      <p
                        className={`text-xs mt-1 ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Use negative value to deduct
                      </p>
                    ))}
                </div>
                <div>
                  <label
                    className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    Reference No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. HO-ALC-25-001"
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none font-mono ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {modalMode === "Transfer" && (
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {t.date}
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#140e29] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                )}
                <div className={modalMode === "Entry" ? "col-span-2" : ""}>
                  <label
                    className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    {t.remarks}
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={
                      modalMode === "Transfer"
                        ? "Optional note"
                        : "e.g. Annual allocation tranche 1"
                    }
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div
                className={`flex justify-end gap-2 pt-3 border-t ${
                  isCustom
                    ? "border-[#2e234e]"
                    : isDark
                      ? "border-slate-800"
                      : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    isCustom
                      ? "bg-[#251d45] text-purple-200 hover:bg-[#32285e]"
                      : isDark
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow"
                >
                  {modalMode === "Transfer"
                    ? language === "bn"
                      ? "স্থানান্তর করুন"
                      : "Transfer"
                    : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-xl w-full p-6 shadow-2xl border ${
              isCustom
                ? "bg-[#18122d] border-[#382b61] text-purple-100"
                : isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="text-base font-bold mb-3">{t.importCsv}</h3>
            <p
              className={`text-xs mb-4 ${isCustom ? "text-purple-300/80" : isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Upload a bulk allocation CSV file to import multiple allocations
              across offices and budget heads instantly.
            </p>

            <div
              className={`flex items-center justify-between mb-4 p-3 rounded-xl border ${
                isCustom
                  ? "bg-[#1f183d] border-[#3d2e69]"
                  : isDark
                    ? "bg-slate-800 border-slate-700"
                    : "bg-slate-50 border-slate-200"
              }`}
            >
              <span
                className={`text-xs font-semibold ${isCustom ? "text-purple-200" : isDark ? "text-slate-200" : "text-slate-700"}`}
              >
                Need a sample format?
              </span>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <FileDown className="w-3.5 h-3.5" /> Download Template
              </button>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition mb-4 ${
                isCustom
                  ? "border-[#4b3b7a] hover:border-amber-400"
                  : isDark
                    ? "border-slate-700 hover:border-emerald-500"
                    : "border-slate-300 hover:border-emerald-500"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileSpreadsheet className="w-8 h-8 opacity-50" />
                <span
                  className={`text-xs font-semibold ${isCustom ? "text-purple-200" : isDark ? "text-slate-200" : "text-slate-700"}`}
                >
                  Click to browse or drop CSV here
                </span>
                <span className="text-xs opacity-60">
                  Required headers: officeCode, budgetHead, type, amount, date,
                  referenceNo
                </span>
              </label>
            </div>

            {csvErrors.length > 0 && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs mb-4 max-h-36 overflow-y-auto">
                <strong className="block font-bold mb-1">
                  Validation Errors:
                </strong>
                <ul className="list-disc pl-4 space-y-0.5 text-xs">
                  {csvErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {csvData.length > 0 && (
              <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs mb-4">
                <strong>{csvData.length} valid rows ready to import.</strong>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvData([]);
                  setCsvErrors([]);
                }}
                className={`px-4 py-2 text-xs rounded-xl font-medium ${
                  isCustom
                    ? "bg-[#251d45] text-purple-200 hover:bg-[#32285e]"
                    : isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={csvData.length === 0}
                className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow disabled:opacity-50"
              >
                Import {csvData.length > 0 ? `(${csvData.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Allocation Modal */}
      {editingAllocation && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-lg w-full p-6 shadow-2xl border ${
              isCustom
                ? "bg-[#18122d] border-[#382b61] text-purple-100"
                : isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="text-base font-bold mb-4">
              {language === "bn" ? "বরাদ্দ সম্পাদন করুন" : "Edit Allocation"}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (onUpdateAllocation && editingAllocation) {
                  try {
                    await onUpdateAllocation(editingAllocation.id, {
                      allocatedAmount: Number(
                        editingAllocation.allocatedAmount,
                      ),
                      referenceNo: editingAllocation.referenceNo,
                      remarks: editingAllocation.remarks,
                      date: editingAllocation.date,
                    });
                    setEditingAllocation(null);
                    if (refreshData) setTimeout(refreshData, 300);
                  } catch (err: any) {
                    alert(err.message || "Failed to update allocation");
                  }
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    {t.amount} *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingAllocation.allocatedAmount}
                    onChange={(e) =>
                      setEditingAllocation({
                        ...editingAllocation,
                        allocatedAmount: Number(e.target.value),
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61] text-purple-100"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    {t.date}
                  </label>
                  <input
                    type="date"
                    required
                    value={editingAllocation.date}
                    onChange={(e) =>
                      setEditingAllocation({
                        ...editingAllocation,
                        date: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61] text-purple-100"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>
              <div>
                <label
                  className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  Reference No. *
                </label>
                <input
                  type="text"
                  required
                  value={editingAllocation.referenceNo}
                  onChange={(e) =>
                    setEditingAllocation({
                      ...editingAllocation,
                      referenceNo: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none font-mono ${
                    isCustom
                      ? "bg-[#140e29] border-[#382b61] text-purple-100"
                      : isDark
                        ? "bg-slate-800 border-slate-700 text-slate-100"
                        : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  {t.remarks}
                </label>
                <input
                  type="text"
                  value={editingAllocation.remarks || ""}
                  onChange={(e) =>
                    setEditingAllocation({
                      ...editingAllocation,
                      remarks: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                    isCustom
                      ? "bg-[#140e29] border-[#382b61] text-purple-100"
                      : isDark
                        ? "bg-slate-800 border-slate-700 text-slate-100"
                        : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
              </div>
              <div
                className={`flex justify-end gap-2 pt-3 border-t ${
                  isCustom
                    ? "border-[#2e234e]"
                    : isDark
                      ? "border-slate-800"
                      : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditingAllocation(null)}
                  className={`px-4 py-2 rounded-xl font-medium ${
                    isCustom
                      ? "bg-[#251d45] text-purple-200 hover:bg-[#32285e]"
                      : isDark
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow"
                >
                  {language === "bn" ? "আপডেট করুন" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-sm w-full p-6 shadow-2xl border ${
              isCustom
                ? "bg-[#18122d] border-[#382b61] text-purple-100"
                : isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="text-base font-bold mb-2">
              {language === "bn" ? "নিশ্চিত করুন" : "Confirm Delete"}
            </h3>
            <p
              className={`text-sm mb-6 ${isCustom ? "text-purple-300/80" : isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              {language === "bn"
                ? "আপনি কি নিশ্চিত যে এই বরাদ্দটি মুছে ফেলতে চান? এটি আর ফেরত পাওয়া যাবে না।"
                : "Are you sure you want to delete this allocation? This action cannot be undone."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  isCustom
                    ? "bg-[#251d45] text-purple-200 hover:bg-[#32285e]"
                    : isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onDeleteAllocation(deletingId);
                    setDeletingId(null);
                    if (refreshData) setTimeout(refreshData, 300);
                  } catch (err: any) {
                    alert(err.message || "Failed to delete allocation");
                  }
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold shadow text-sm"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Office Budget Floating Modal (Interactive Drilldown with collapsible categories & date filter print/PDF) */}
      {isFloatingModalOpen && floatingOfficeId !== null && (
        <OfficeBudgetFloatingModal
          isOpen={isFloatingModalOpen}
          onClose={() => setIsFloatingModalOpen(false)}
          officeId={floatingOfficeId}
          offices={offices}
          categories={categories}
          financialYears={financialYears}
          selectedFY={selectedFY}
          allocations={allocations}
          expenses={expenses}
          currentUser={currentUser}
          isHeadOffice={isHeadOffice}
          systemSettings={systemSettings}
          onEditAllocation={(alc) => {
            setIsFloatingModalOpen(false);
            setEditingAllocation(alc);
          }}
          onDeleteAllocation={(id) => {
            onDeleteAllocation(id);
          }}
        />
      )}
    </div>
  );
}
