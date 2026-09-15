import React, { useState, useMemo, useRef } from "react";
import {
  Allocation,
  Expense,
  Office,
  Category,
  FinancialYear,
  User,
  SystemSettings,
} from "../types";
import {
  X,
  Printer,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  Building2,
  Wallet,
  TrendingDown,
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface OfficeBudgetFloatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  officeId: string; // "all" or specific office id
  offices: Office[];
  categories: Category[];
  financialYears: FinancialYear[];
  selectedFY: string;
  allocations: Allocation[];
  expenses?: Expense[];
  currentUser: User;
  isHeadOffice: boolean;
  systemSettings?: SystemSettings | null;
  onEditAllocation?: (allocation: Allocation) => void;
  onDeleteAllocation?: (id: string) => void;
}

export function OfficeBudgetFloatingModal({
  isOpen,
  onClose,
  officeId,
  offices,
  categories,
  financialYears,
  selectedFY,
  allocations,
  expenses = [],
  currentUser,
  isHeadOffice,
  systemSettings,
  onEditAllocation,
  onDeleteAllocation,
}: OfficeBudgetFloatingModalProps) {
  const { t, formatCurrency, formatNumber, language } = useLanguage();
  const { isCustom, isDark } = useTheme();

  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const [searchCategory, setSearchCategory] = useState<string>("");

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  const currentFYObj = financialYears.find((f) => f.id === selectedFY);
  const effectiveOfficeId = !isHeadOffice ? currentUser.officeId : officeId;
  const isAllOffices = isHeadOffice && effectiveOfficeId === "all";
  const selectedOfficeObj = !isAllOffices
    ? offices.find((o) => o.id === effectiveOfficeId)
    : null;

  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (a.financialYearId !== selectedFY) return false;
      if (!isAllOffices && a.officeId !== effectiveOfficeId) return false;
      if (filterDateFrom && a.date < filterDateFrom) return false;
      if (filterDateTo && a.date > filterDateTo) return false;
      return true;
    });
  }, [
    allocations,
    selectedFY,
    effectiveOfficeId,
    isAllOffices,
    filterDateFrom,
    filterDateTo,
  ]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.financialYearId !== selectedFY) return false;
      if (!isAllOffices && e.officeId !== effectiveOfficeId) return false;
      if (filterDateFrom && e.expenseDate < filterDateFrom) return false;
      if (filterDateTo && e.expenseDate > filterDateTo) return false;
      return true;
    });
  }, [
    expenses,
    selectedFY,
    effectiveOfficeId,
    isAllOffices,
    filterDateFrom,
    filterDateTo,
  ]);

  const categoryBudgetData = useMemo(() => {
    const map: Record<
      string,
      {
        category: Category;
        initial: number;
        additional: number;
        adjustment: number;
        currentAllocation: number;
        approvedExpense: number;
        pendingExpense: number;
        totalExpense: number;
        balance: number;
        rows: Allocation[];
        expenseRows: Expense[];
      }
    > = {};

    categories.forEach((cat) => {
      map[cat.id] = {
        category: cat,
        initial: 0,
        additional: 0,
        adjustment: 0,
        currentAllocation: 0,
        approvedExpense: 0,
        pendingExpense: 0,
        totalExpense: 0,
        balance: 0,
        rows: [],
        expenseRows: [],
      };
    });

    filteredAllocations.forEach((a) => {
      if (!map[a.categoryId]) {
        const fallbackCat = categories.find((c) => c.id === a.categoryId) || {
          id: a.categoryId,
          name: "Unknown Category",
          code: "N/A",
          budgetHead: "N/A",
          description: "",
          status: "Active",
        };
        map[a.categoryId] = {
          category: fallbackCat,
          initial: 0,
          additional: 0,
          adjustment: 0,
          currentAllocation: 0,
          approvedExpense: 0,
          pendingExpense: 0,
          totalExpense: 0,
          balance: 0,
          rows: [],
          expenseRows: [],
        };
      }

      const amt = Number(a.allocatedAmount || 0);
      if (a.type === "Initial" || (!a.type as any)) {
        map[a.categoryId].initial += amt;
      } else if (a.type === "Additional") {
        map[a.categoryId].additional += amt;
      } else if (a.type === "Adjustment") {
        map[a.categoryId].adjustment += amt;
      }
      map[a.categoryId].currentAllocation += amt;
      map[a.categoryId].rows.push(a);
    });

    filteredExpenses.forEach((e) => {
      if (map[e.categoryId]) {
        const amt = Number(e.amount || 0);
        if (e.status === "Pending") {
          map[e.categoryId].pendingExpense += amt;
        } else {
          map[e.categoryId].approvedExpense += amt;
        }
        map[e.categoryId].totalExpense += amt;
        map[e.categoryId].expenseRows.push(e);
      }
    });

    Object.values(map).forEach((item) => {
      item.balance = item.currentAllocation - item.totalExpense;

      item.rows.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    });

    return Object.values(map)
      .filter((item) => {
        const hasData =
          item.currentAllocation !== 0 ||
          item.totalExpense !== 0 ||
          item.rows.length > 0;
        if (searchCategory.trim()) {
          const query = searchCategory.toLowerCase();
          const matchName = (item.category?.name || "")
            .toLowerCase()
            .includes(query);
          const matchHead = (item.category?.budgetHead || "")
            .toLowerCase()
            .includes(query);
          return matchName || matchHead;
        }
        return hasData;
      })
      .sort((a, b) =>
        (a.category?.budgetHead || "").localeCompare(
          b.category?.budgetHead || "",
        ),
      );
  }, [filteredAllocations, filteredExpenses, categories, searchCategory]);

  const overallMetrics = useMemo(() => {
    return categoryBudgetData.reduce(
      (acc, item) => ({
        initial: acc.initial + item.initial,
        additional: acc.additional + item.additional,
        adjustment: acc.adjustment + item.adjustment,
        currentAllocation: acc.currentAllocation + item.currentAllocation,
        approvedExpense: acc.approvedExpense + item.approvedExpense,
        pendingExpense: acc.pendingExpense + item.pendingExpense,
        totalExpense: acc.totalExpense + item.totalExpense,
        balance: acc.balance + item.balance,
        categoryCount: acc.categoryCount + 1,
        allocationCount: acc.allocationCount + item.rows.length,
      }),
      {
        initial: 0,
        additional: 0,
        adjustment: 0,
        currentAllocation: 0,
        approvedExpense: 0,
        pendingExpense: 0,
        totalExpense: 0,
        balance: 0,
        categoryCount: 0,
        allocationCount: 0,
      },
    );
  }, [categoryBudgetData]);

  if (!isOpen) return null;

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    categoryBudgetData.forEach((item) => {
      next[item.category.id] = true;
    });
    setExpandedCategories(next);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  const areAllExpanded =
    categoryBudgetData.length > 0 &&
    categoryBudgetData.every((item) => !!expandedCategories[item.category.id]);

  const applyPresetFY = () => {
    if (currentFYObj) {
      setFilterDateFrom(currentFYObj.startDate || "");
      setFilterDateTo(currentFYObj.endDate || "");
    }
  };

  const applyPresetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    setFilterDateFrom(firstDay);
    setFilterDateTo(lastDay);
  };

  const applyPresetToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setFilterDateFrom(today);
    setFilterDateTo(today);
  };

  const resetDateFilter = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = `Office/Branch: ${isAllOffices ? "All Offices" : selectedOfficeObj?.name || "N/A"}\n`;
    csv += `Financial Year: ${currentFYObj?.name || "N/A"}\n`;
    csv += `Date Filter: ${filterDateFrom || "Start"} to ${filterDateTo || "End"}\n\n`;
    csv +=
      "SL,Budget Head,Category Name,Initial Allocation,Additional Allocation,Adjustment,Current Total Allocation,Total Expense,Balance\n";

    categoryBudgetData.forEach((item, idx) => {
      csv += `${idx + 1},"${item.category?.budgetHead || ""}","${item.category?.name || ""}",${item.initial},${item.additional},${item.adjustment},${item.currentAllocation},${item.totalExpense},${item.balance}\n`;
    });

    csv += `\nTOTAL,,,${overallMetrics.initial},${overallMetrics.additional},${overallMetrics.adjustment},${overallMetrics.currentAllocation},${overallMetrics.totalExpense},${overallMetrics.balance}\n`;

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Budget_Statement_${selectedOfficeObj?.code || "All"}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        className={`w-full flex flex-col rounded-3xl shadow-2xl border transition-all duration-300 overflow-hidden ${
          isFullscreen ? "h-[98vh] max-w-[98vw]" : "max-h-[92vh] max-w-6xl"
        } ${
          isCustom
            ? "bg-[#140f29] border-[#382b61] text-purple-100 shadow-purple-950/40"
            : isDark
              ? "bg-slate-900 border-slate-750 text-slate-100 shadow-black/60"
              : "bg-white border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* Modal Sticky Header */}
        <div
          className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isCustom
              ? "bg-[#1a1336] border-[#312554]"
              : isDark
                ? "bg-slate-850 border-slate-800"
                : "bg-slate-50/90 border-slate-200"
          }`}
        >
          {/* Left Title & Office Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-2xl shrink-0 shadow-sm ${
                isCustom
                  ? "bg-amber-400 text-[#140e29]"
                  : isDark
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-emerald-600 text-white"
              }`}
            >
              {isAllOffices ? (
                <Layers className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold truncate">
                  {isAllOffices
                    ? language === "bn"
                      ? "সকল কার্যালয় ও শাখার সমন্বিত বাজেট তালিকা"
                      : "All Offices & Branches Consolidated Budget"
                    : selectedOfficeObj?.name}
                </h3>

                {!isAllOffices && selectedOfficeObj && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                      isCustom
                        ? "bg-[#2d2254] text-amber-300 border border-[#48377e]"
                        : isDark
                          ? "bg-slate-800 text-emerald-400 border border-slate-700"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {selectedOfficeObj.code}
                  </span>
                )}

                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    isCustom
                      ? "bg-purple-900/40 text-purple-200 border border-purple-800/50"
                      : isDark
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : "bg-slate-200/80 text-slate-700"
                  }`}
                >
                  {t.financialYear}: {currentFYObj?.name}
                </span>
              </div>

              <p
                className={`text-xs mt-0.5 flex items-center gap-2 ${isCustom ? "text-purple-300/80" : isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                <span>
                  {language === "bn"
                    ? "খাতভিত্তিক বর্তমান বরাদ্দ, অতিরিক্ত/সমন্বয় ও ব্যয়ের লাইভ হিসাব"
                    : "Category-wise current budget, tranches, & expenditure overview"}
                </span>
                <span>•</span>
                <span className="font-semibold text-emerald-500">
                  {categoryBudgetData.length}{" "}
                  {language === "bn" ? "টি খাত" : "Categories"}
                </span>
              </p>
            </div>
          </div>

          {/* Right Action Buttons: Print, PDF, CSV, Fullscreen, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Collapse / Expand All Button */}
            <button
              type="button"
              onClick={areAllExpanded ? collapseAll : expandAll}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border shadow-sm ${
                isCustom
                  ? "bg-[#251d45] border-[#443370] text-amber-300 hover:bg-[#32285e]"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title={areAllExpanded ? "সব কলাপস করুন" : "সব বিস্তারিত দেখুন"}
            >
              {areAllExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {areAllExpanded
                  ? language === "bn"
                    ? "সব কলাপস করুন"
                    : "Collapse All"
                  : language === "bn"
                    ? "সব কলাপস খুলুন"
                    : "Expand All"}
              </span>
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border shadow-sm ${
                isCustom
                  ? "bg-[#251d45] border-[#443370] text-purple-200 hover:bg-[#32285e]"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title="Export CSV / Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">CSV</span>
            </button>

            {/* Direct Print / PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md hover:shadow-emerald-600/30"
              title="সরাসরি প্রিন্ট বা পিডিএফ সংরক্ষণ করুন"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "bn" ? "প্রিন্ট / PDF" : "Print / PDF"}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-xl text-xs font-semibold transition border hidden sm:flex items-center justify-center ${
                isCustom
                  ? "bg-[#251d45] border-[#443370] text-purple-200 hover:bg-[#32285e]"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title={isFullscreen ? "Minimize" : "Maximize"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl text-xs font-semibold transition border ${
                isCustom
                  ? "bg-rose-950/40 border-rose-900/60 text-rose-300 hover:bg-rose-900/60"
                  : isDark
                    ? "bg-rose-950/40 border-rose-900/50 text-rose-400 hover:bg-rose-900/60"
                    : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
              }`}
              title="বন্ধ করুন (Close)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Top Quick Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Budget Card */}
            <div
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 shadow-sm ${
                isCustom
                  ? "bg-[#1b143a] border-[#36275e]"
                  : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-gradient-to-br from-emerald-50/70 to-emerald-100/40 border-emerald-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-emerald-800"}`}
                >
                  {language === "bn"
                    ? "মোট বর্তমান বরাদ্দ"
                    : "Current Total Allocation"}
                </span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <div
                  className={`text-lg sm:text-xl font-black font-mono tracking-tight ${isCustom ? "text-amber-300" : isDark ? "text-white" : "text-emerald-950"}`}
                >
                  {formatCurrency(overallMetrics.currentAllocation)}
                </div>
                <div
                  className={`text-[10px] font-medium flex items-center gap-1.5 ${isCustom ? "text-purple-400" : isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  <span>মূল: {formatNumber(overallMetrics.initial)}</span>
                  <span>•</span>
                  <span>
                    অতিরিক্ত: +{formatNumber(overallMetrics.additional)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Expense Card */}
            <div
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 shadow-sm ${
                isCustom
                  ? "bg-[#1b143a] border-[#36275e]"
                  : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-gradient-to-br from-rose-50/70 to-rose-100/40 border-rose-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-rose-800"}`}
                >
                  {language === "bn" ? "মোট ব্যয় (খরচ)" : "Total Spent"}
                </span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-rose-500 dark:text-rose-400">
                  {formatCurrency(overallMetrics.totalExpense)}
                </div>
                <div
                  className={`text-[10px] font-medium flex items-center gap-1.5 ${isCustom ? "text-purple-400" : isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  <span>
                    অনুমোদিত: {formatNumber(overallMetrics.approvedExpense)}
                  </span>
                  {overallMetrics.pendingExpense > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-500 font-bold">
                        পেন্ডিং: {formatNumber(overallMetrics.pendingExpense)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Available Balance Card */}
            <div
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 shadow-sm ${
                isCustom
                  ? "bg-[#1b143a] border-[#36275e]"
                  : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-gradient-to-br from-blue-50/70 to-blue-100/40 border-blue-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-blue-800"}`}
                >
                  {language === "bn" ? "অবশিষ্ট স্থিতি" : "Available Balance"}
                </span>
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <div
                  className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                    overallMetrics.balance < 0
                      ? "text-rose-500"
                      : "text-emerald-500 dark:text-emerald-400"
                  }`}
                >
                  {formatCurrency(overallMetrics.balance)}
                </div>
                <div
                  className={`text-[10px] font-medium ${isCustom ? "text-purple-400" : isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  {overallMetrics.balance < 0 ? (
                    <span className="text-rose-500 font-bold">
                      ⚠️ বাজেট ঘাটতি
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ বাজেট পর্যাপ্ত
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Categories & Allocations Summary */}
            <div
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 shadow-sm ${
                isCustom
                  ? "bg-[#1b143a] border-[#36275e]"
                  : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-slate-50/90 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-600"}`}
                >
                  {language === "bn"
                    ? "খাত ও বরাদ্দের সংখ্যা"
                    : "Categories & Tranches"}
                </span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="space-y-0.5">
                <div
                  className={`text-lg sm:text-xl font-black font-mono tracking-tight ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}
                >
                  {formatNumber(overallMetrics.categoryCount)}{" "}
                  <span className="text-xs font-normal opacity-70">খাত</span>
                </div>
                <div
                  className={`text-[10px] font-medium ${isCustom ? "text-purple-400" : isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  মোট বরাদ্দ ভাউচার:{" "}
                  {formatNumber(overallMetrics.allocationCount)} টি
                </div>
              </div>
            </div>
          </div>

          {/* Date Filter & Search Control Toolbar */}
          <div
            className={`p-4 rounded-2xl border space-y-3 shadow-sm ${
              isCustom
                ? "bg-[#1a1236] border-[#342659]"
                : isDark
                  ? "bg-slate-850 border-slate-800"
                  : "bg-slate-50/80 border-slate-200"
            }`}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              {/* Date Pickers */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 shrink-0">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {language === "bn" ? "তারিখ ফিল্টার:" : "Date Filter:"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                  <span
                    className={`text-[11px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {language === "bn" ? "হতে" : "From"}
                  </span>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none transition ${
                      isCustom
                        ? "bg-[#140e28] border-[#3e2e6d] text-purple-100"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                  <span
                    className={`text-[11px] font-medium ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {language === "bn" ? "পর্যন্ত" : "To"}
                  </span>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none transition ${
                      isCustom
                        ? "bg-[#140e28] border-[#3e2e6d] text-purple-100"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                {/* Preset Date Buttons */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={applyPresetFY}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      isCustom
                        ? "bg-[#251b47] border-[#443370] text-purple-200 hover:text-amber-300"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {language === "bn" ? "অর্থবছর" : "Full FY"}
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetThisMonth}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      isCustom
                        ? "bg-[#251b47] border-[#443370] text-purple-200 hover:text-amber-300"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {language === "bn" ? "চলতি মাস" : "This Month"}
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetToday}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      isCustom
                        ? "bg-[#251b47] border-[#443370] text-purple-200 hover:text-amber-300"
                        : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {language === "bn" ? "আজ" : "Today"}
                  </button>

                  {(filterDateFrom || filterDateTo) && (
                    <button
                      type="button"
                      onClick={resetDateFilter}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-1"
                      title="ফিল্টার মুছুন"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {language === "bn" ? "রিসেট" : "Reset"}
                    </button>
                  )}
                </div>
              </div>

              {/* Category Search Input */}
              <div className="w-full lg:w-64">
                <input
                  type="text"
                  placeholder={
                    language === "bn"
                      ? "খাতের নাম বা কোড দিয়ে খুঁজুন..."
                      : "Search category or code..."
                  }
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none transition ${
                    isCustom
                      ? "bg-[#140e28] border-[#3e2e6d] text-purple-100 placeholder:text-purple-400/50"
                      : isDark
                        ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  }`}
                />
              </div>
            </div>

            {/* Filter Status / Alert */}
            {(filterDateFrom || filterDateTo) && (
              <div className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 pt-1 border-t border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {language === "bn"
                    ? `ফিল্টার সক্রিয়: ${filterDateFrom || "শুরু"} হতে ${filterDateTo || "বর্তমান"} পর্যন্ত মোট ${categoryBudgetData.length}টি খাতের হিসাব দেখানো হচ্ছে।`
                    : `Active Date Filter: ${filterDateFrom || "Start"} to ${filterDateTo || "Present"} (${categoryBudgetData.length} categories found)`}
                </span>
              </div>
            )}
          </div>

          {/* Category Table with Collapsible Tranches */}
          <div
            className={`rounded-2xl border overflow-hidden shadow-sm transition-colors ${
              isCustom
                ? "bg-[#16102e] border-[#312554]"
                : isDark
                  ? "bg-slate-900 border-slate-800"
                  : "bg-white border-slate-200"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b text-xs uppercase tracking-wider font-bold ${
                      isCustom
                        ? "bg-[#1f1740] border-[#382b61] text-purple-200"
                        : isDark
                          ? "bg-slate-800/90 border-slate-800 text-slate-300"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5 font-bold min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span>
                          {language === "bn"
                            ? "বাজেট খাত ও বিবরণ"
                            : "Budget Category & Head"}
                        </span>
                        <span
                          className={`text-[10px] font-normal normal-case px-1.5 py-0.5 rounded ${
                            isCustom
                              ? "bg-[#2d2254] text-purple-300"
                              : isDark
                                ? "bg-slate-700 text-slate-300"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {language === "bn"
                            ? "ক্লিক করে বিস্তারিত দেখুন"
                            : "Click to toggle"}
                        </span>
                      </div>
                    </th>
                    <th className="p-3.5 font-bold text-right text-emerald-600 dark:text-emerald-400">
                      {language === "bn"
                        ? "বর্তমান বরাদ্দ"
                        : "Current Total Budget"}
                    </th>
                    <th className="p-3.5 font-bold text-right text-rose-600 dark:text-rose-400">
                      {language === "bn" ? "মোট খরচ" : "Total Spent"}
                    </th>
                    <th className="p-3.5 font-bold text-right">
                      {language === "bn"
                        ? "অবশিষ্ট স্থিতি"
                        : "Available Balance"}
                    </th>
                    <th className="p-3.5 font-bold text-center w-28">
                      {language === "bn" ? "অবস্থা" : "Status"}
                    </th>
                  </tr>
                </thead>

                <tbody
                  className={`divide-y text-xs ${
                    isCustom
                      ? "divide-[#281d4a]"
                      : isDark
                        ? "divide-slate-800"
                        : "divide-slate-100"
                  }`}
                >
                  {categoryBudgetData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className={`p-10 text-center ${
                          isCustom
                            ? "text-purple-300/60"
                            : isDark
                              ? "text-slate-500"
                              : "text-slate-400"
                        }`}
                      >
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">
                          {language === "bn"
                            ? "কোনো বাজেট বরাদ্দ বা খাতের তথ্য পাওয়া যায়নি।"
                            : "No budget allocation or category records found."}
                        </p>
                        <p className="text-xs mt-1 opacity-70">
                          {language === "bn"
                            ? "তারিখ ফিল্টার রিসেট করুন বা নতুন বরাদ্দ প্রদান করুন।"
                            : "Please reset the date filter or add an allocation."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    categoryBudgetData.map((item) => {
                      const isExpanded = !!expandedCategories[item.category.id];
                      const hasTranches = item.rows.length > 0;

                      return (
                        <React.Fragment key={item.category.id}>
                          {/* Main Category Summary Row */}
                          <tr
                            onClick={() =>
                              toggleCategoryExpand(item.category.id)
                            }
                            className={`transition-colors cursor-pointer group select-none ${
                              isExpanded
                                ? isCustom
                                  ? "bg-[#251a4a] text-purple-100"
                                  : isDark
                                    ? "bg-slate-800/80 text-white"
                                    : "bg-emerald-50/70 text-slate-900"
                                : isCustom
                                  ? "hover:bg-[#1d163d] text-purple-200"
                                  : isDark
                                    ? "hover:bg-slate-850 text-slate-200"
                                    : "hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            {/* Expand/Collapse Chevron & Serial */}
                            <td className="p-3.5 text-center font-mono">
                              <button
                                type="button"
                                className={`p-1 rounded-lg transition-transform duration-200 inline-flex items-center justify-center ${
                                  isExpanded
                                    ? "rotate-90 text-emerald-500"
                                    : "text-slate-400 group-hover:text-emerald-500"
                                }`}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>

                            {/* Category Name & Budget Head */}
                            <td className="p-3.5">
                              <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                                <span
                                  className={
                                    isCustom
                                      ? "text-purple-100"
                                      : isDark
                                        ? "text-white"
                                        : "text-slate-900"
                                  }
                                >
                                  {item.category?.name || "N/A"}
                                </span>
                                {item.rows.length > 1 && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                      isCustom
                                        ? "bg-[#33245e] text-amber-300"
                                        : isDark
                                          ? "bg-slate-700 text-slate-300"
                                          : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {item.rows.length}{" "}
                                    {language === "bn"
                                      ? "টি এন্ট্রি"
                                      : "tranches"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`text-xs font-mono font-semibold ${
                                    isCustom
                                      ? "text-purple-300"
                                      : isDark
                                        ? "text-slate-400"
                                        : "text-slate-600"
                                  }`}
                                >
                                  {item.category.budgetHead}
                                </span>
                                {item.category.description && (
                                  <span className="text-[10px] opacity-60 truncate max-w-xs hidden sm:inline">
                                    • {item.category.description}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Current Total Allocation (বর্তমান বরাদ্দ) */}
                            <td className="p-3.5 text-right font-mono font-bold text-xs sm:text-sm">
                              <span
                                className={`px-2 py-1 rounded-lg ${
                                  isCustom
                                    ? "bg-[#281b4e] text-amber-300 border border-[#443275]"
                                    : isDark
                                      ? "bg-slate-800 text-emerald-400 border border-slate-700"
                                      : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                }`}
                              >
                                {formatCurrency(item.currentAllocation)}
                              </span>
                            </td>

                            {/* Total Spent */}
                            <td className="p-3.5 text-right font-mono font-bold text-xs sm:text-sm text-rose-500 dark:text-rose-400">
                              {formatCurrency(item.totalExpense)}
                            </td>

                            {/* Available Balance */}
                            <td
                              className={`p-3.5 text-right font-mono font-bold text-xs sm:text-sm ${
                                item.balance < 0
                                  ? "text-rose-500 font-extrabold"
                                  : "text-emerald-500 dark:text-emerald-400"
                              }`}
                            >
                              {formatCurrency(item.balance)}
                            </td>

                            {/* Status Badge */}
                            <td className="p-3.5 text-center">
                              {item.balance < 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 uppercase">
                                  {language === "bn" ? "ঘাটতি" : "Deficit"}
                                </span>
                              ) : item.currentAllocation === 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/15 text-slate-400">
                                  {language === "bn"
                                    ? "বরাদ্দ নেই"
                                    : "No Alloc"}
                                </span>
                              ) : item.balance === 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                                  {language === "bn"
                                    ? "সম্পূর্ণ ব্যয়"
                                    : "Exhausted"}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400">
                                  {language === "bn" ? "সক্রিয়" : "Healthy"}
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Breakdown Section (Visible ONLY when clicked) */}
                          {isExpanded && (
                            <tr
                              className={`border-b ${
                                isCustom
                                  ? "bg-[#110c22] border-[#291e4a]"
                                  : isDark
                                    ? "bg-slate-950/70 border-slate-800"
                                    : "bg-slate-50/80 border-slate-200"
                              }`}
                            >
                              <td
                                colSpan={6}
                                className="p-3 sm:p-4 pl-6 sm:pl-12 border-l-4 border-emerald-500"
                              >
                                <div className="space-y-3">
                                  {/* Tranches Sub-header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                      <span
                                        className={`font-bold text-xs ${isCustom ? "text-purple-200" : isDark ? "text-slate-200" : "text-slate-700"}`}
                                      >
                                        {language === "bn"
                                          ? "বরাদ্দ বিভাজন (মূল, অতিরিক্ত ও সমন্বয় বিবরণী)"
                                          : "Allocation Tranche Breakdown"}
                                      </span>
                                    </div>

                                    {/* Breakdown summary pills */}
                                    <div className="flex items-center gap-2 text-[11px] font-mono">
                                      <span
                                        className={`px-2 py-0.5 rounded ${isCustom ? "bg-[#1d163a] text-purple-300" : isDark ? "bg-slate-800 text-slate-300" : "bg-white border text-slate-700"}`}
                                      >
                                        মূল:{" "}
                                        <strong>
                                          {formatCurrency(item.initial)}
                                        </strong>
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded ${isCustom ? "bg-[#1d163a] text-blue-300" : isDark ? "bg-slate-800 text-blue-300" : "bg-white border text-blue-700"}`}
                                      >
                                        অতিরিক্ত:{" "}
                                        <strong>
                                          +{formatCurrency(item.additional)}
                                        </strong>
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded ${
                                          item.adjustment < 0
                                            ? "text-rose-400"
                                            : item.adjustment > 0
                                              ? "text-amber-400"
                                              : isCustom
                                                ? "text-purple-400"
                                                : "text-slate-500"
                                        } ${isCustom ? "bg-[#1d163a]" : isDark ? "bg-slate-800" : "bg-white border"}`}
                                      >
                                        সমন্বয়:{" "}
                                        <strong>
                                          {item.adjustment > 0 ? "+" : ""}
                                          {formatCurrency(item.adjustment)}
                                        </strong>
                                      </span>
                                    </div>
                                  </div>

                                  {/* List of Individual Allocation Rows */}
                                  {hasTranches ? (
                                    <div
                                      className={`rounded-xl border overflow-hidden ${
                                        isCustom
                                          ? "bg-[#171030] border-[#312554]"
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
                                            <th className="p-2.5 pl-3">
                                              ধরন (Type)
                                            </th>
                                            <th className="p-2.5">
                                              তারিখ (Date)
                                            </th>
                                            <th className="p-2.5">
                                              স্মারক নম্বর (Ref No)
                                            </th>
                                            <th className="p-2.5">
                                              বিবরণ / মন্তব্য (Remarks)
                                            </th>
                                            <th className="p-2.5 text-right pr-3">
                                              টাকার পরিমাণ (Amount)
                                            </th>
                                            {isHeadOffice && (
                                              <th className="p-2.5 text-center w-16">
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
                                          {item.rows.map((row) => (
                                            <tr
                                              key={row.id}
                                              className={`transition-colors ${
                                                isCustom
                                                  ? "hover:bg-[#201742]"
                                                  : isDark
                                                    ? "hover:bg-slate-800/60"
                                                    : "hover:bg-slate-50"
                                              }`}
                                            >
                                              {/* Type Pill */}
                                              <td className="p-2.5 pl-3 font-sans">
                                                <span
                                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                    row.type === "Additional"
                                                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                                      : row.type ===
                                                          "Adjustment"
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

                                              {/* Date */}
                                              <td className="p-2.5 text-slate-400">
                                                {row.date || "N/A"}
                                              </td>

                                              {/* Ref No */}
                                              <td className="p-2.5 font-bold font-mono">
                                                <span
                                                  className={
                                                    isCustom
                                                      ? "text-purple-200"
                                                      : isDark
                                                        ? "text-slate-200"
                                                        : "text-slate-800"
                                                  }
                                                >
                                                  {row.referenceNo || "—"}
                                                </span>
                                              </td>

                                              {/* Remarks */}
                                              <td className="p-2.5 font-sans text-xs italic text-slate-400 max-w-xs truncate">
                                                {row.remarks || "—"}
                                              </td>

                                              {/* Amount */}
                                              <td
                                                className={`p-2.5 pr-3 text-right font-bold text-xs ${
                                                  Number(row.allocatedAmount) <
                                                  0
                                                    ? "text-rose-400 font-black"
                                                    : row.type === "Additional"
                                                      ? "text-blue-400 font-bold"
                                                      : row.type ===
                                                          "Adjustment"
                                                        ? "text-amber-400 font-bold"
                                                        : isCustom
                                                          ? "text-amber-300"
                                                          : isDark
                                                            ? "text-emerald-400"
                                                            : "text-emerald-800"
                                                }`}
                                              >
                                                {Number(row.allocatedAmount) >
                                                  0 && row.type === "Additional"
                                                  ? "+"
                                                  : ""}
                                                {formatCurrency(
                                                  Number(
                                                    row.allocatedAmount || 0,
                                                  ),
                                                )}
                                              </td>

                                              {/* Actions for Head Office */}
                                              {isHeadOffice && (
                                                <td className="p-2.5 text-center">
                                                  <div className="flex items-center justify-center gap-1.5">
                                                    {onEditAllocation && (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          onEditAllocation(row)
                                                        }
                                                        className="p-1 rounded text-blue-400 hover:bg-blue-500/20 transition"
                                                        title="সম্পাদন করুন"
                                                      >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    )}
                                                    {onDeleteAllocation && (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          onDeleteAllocation(
                                                            row.id,
                                                          )
                                                        }
                                                        className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition"
                                                        title="মুছে ফেলুন"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    )}
                                                  </div>
                                                </td>
                                              )}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="p-3 text-center text-xs text-slate-400 italic">
                                      এই খাতে নির্বাচিত সময়কালে কোনো বরাদ্দ
                                      এন্ট্রি পাওয়া যায়নি।
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>

                {/* Table Grand Total Footer */}
                {categoryBudgetData.length > 0 && (
                  <tfoot>
                    <tr
                      className={`border-t font-bold text-xs sm:text-sm ${
                        isCustom
                          ? "bg-[#1f1740] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-800 text-white border-slate-700"
                            : "bg-slate-100 text-slate-900 border-slate-300"
                      }`}
                    >
                      <td colSpan={2} className="p-3.5 font-bold">
                        <div className="flex items-center justify-between">
                          <span>
                            {language === "bn"
                              ? "সর্বমোট বাজেট ও ব্যয় সংক্ষেপ:"
                              : "GRAND TOTAL:"}
                          </span>
                          <span className="text-xs font-normal opacity-70">
                            ({categoryBudgetData.length}টি খাত)
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-amber-300">
                        {formatCurrency(overallMetrics.currentAllocation)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-rose-500 dark:text-rose-400">
                        {formatCurrency(overallMetrics.totalExpense)}
                      </td>
                      <td
                        className={`p-3.5 text-right font-mono font-black ${
                          overallMetrics.balance < 0
                            ? "text-rose-500"
                            : "text-emerald-500 dark:text-emerald-400"
                        }`}
                      >
                        {formatCurrency(overallMetrics.balance)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-500">
                          {language === "bn" ? "পরিশোধিত" : "Calculated"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
            isCustom
              ? "bg-[#171030] border-[#312554] text-purple-300"
              : isDark
                ? "bg-slate-850 border-slate-800 text-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span>
              {language === "bn"
                ? `লাইভ হিসাব সমন্বিত • মুদ্রণ সময়: ${new Date().toLocaleDateString("bn-BD")} ${new Date().toLocaleTimeString("bn-BD")}`
                : `Live Synchronized • Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {language === "bn"
                  ? "প্রিন্ট / PDF সংরক্ষণ করুন"
                  : "Print / Save PDF"}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl font-semibold transition border ${
                isCustom
                  ? "bg-[#251d45] border-[#443370] text-purple-200 hover:bg-[#32285e]"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Printable Government Budget Statement (Rendered only on Print / PDF export) */}
      {/* ========================================================================= */}
      <div
        id="printable-budget-statement"
        ref={printRef}
        className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-[9999]"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-budget-statement, #printable-budget-statement * {
              visibility: visible;
            }
            #printable-budget-statement {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20mm 15mm;
              background: #ffffff !important;
              color: #000000 !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `,
          }}
        />

        {/* Government Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-xl font-extrabold text-black uppercase tracking-wide">
            {systemSettings?.institutionName || "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"}
          </h1>
          <h2 className="text-base font-bold text-gray-800 mt-1">
            {isAllOffices
              ? "সকল শাখা ও কার্যালয়ের সমন্বিত বাজেট বরাদ্দ ও ব্যয় বিবরণী"
              : `${selectedOfficeObj?.name} (${selectedOfficeObj?.code})`}
          </h2>
          <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mt-2 px-2">
            <span>অর্থবছর: {currentFYObj?.name}</span>
            <span>
              বিবরণী সময়কাল:{" "}
              {filterDateFrom || currentFYObj?.startDate || "শুরু"} হতে{" "}
              {filterDateTo || currentFYObj?.endDate || "বর্তমান"}
            </span>
            <span>
              প্রিন্টের তারিখ: {new Date().toLocaleDateString("bn-BD")}
            </span>
          </div>
        </div>

        {/* Summary Metric Strip for Print */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center border border-black p-3 bg-gray-50">
          <div>
            <div className="text-xs font-bold text-gray-600">
              মোট বর্তমান বরাদ্দ
            </div>
            <div className="text-base font-black text-black">
              {formatCurrency(overallMetrics.currentAllocation)}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-600">
              মোট ব্যয়িত অর্থ
            </div>
            <div className="text-base font-black text-black">
              {formatCurrency(overallMetrics.totalExpense)}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-600">
              অবশিষ্ট স্থিতি
            </div>
            <div className="text-base font-black text-black">
              {formatCurrency(overallMetrics.balance)}
            </div>
          </div>
        </div>

        {/* Detailed Category Table for Print */}
        <table className="w-full text-left text-xs border-collapse border border-black mb-8">
          <thead>
            <tr className="bg-gray-200 border-b border-black text-black font-bold">
              <th className="p-2 border-r border-black text-center w-8">
                ক্রম
              </th>
              <th className="p-2 border-r border-black w-24">কোড</th>
              <th className="p-2 border-r border-black">বাজেট খাত ও বিবরণ</th>
              <th className="p-2 border-r border-black text-right">
                মূল বরাদ্দ
              </th>
              <th className="p-2 border-r border-black text-right">অতিরিক্ত</th>
              <th className="p-2 border-r border-black text-right">সমন্বয়</th>
              <th className="p-2 border-r border-black text-right font-black">
                বর্তমান বরাদ্দ
              </th>
              <th className="p-2 border-r border-black text-right">মোট ব্যয়</th>
              <th className="p-2 text-right font-black">অবশিষ্ট স্থিতি</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black font-mono">
            {categoryBudgetData.map((item, idx) => (
              <tr
                key={item.category?.id || idx}
                className="border-b border-black"
              >
                <td className="p-1.5 border-r border-black text-center font-sans">
                  {idx + 1}
                </td>
                <td className="p-1.5 border-r border-black font-bold">
                  {item.category?.budgetHead || ""}
                </td>
                <td className="p-1.5 border-r border-black font-sans font-medium">
                  {item.category?.name || ""}
                </td>
                <td className="p-1.5 border-r border-black text-right">
                  {formatCurrency(item.initial)}
                </td>
                <td className="p-1.5 border-r border-black text-right">
                  +{formatCurrency(item.additional)}
                </td>
                <td className="p-1.5 border-r border-black text-right">
                  {item.adjustment > 0 ? "+" : ""}
                  {formatCurrency(item.adjustment)}
                </td>
                <td className="p-1.5 border-r border-black text-right font-bold bg-gray-100">
                  {formatCurrency(item.currentAllocation)}
                </td>
                <td className="p-1.5 border-r border-black text-right font-semibold">
                  {formatCurrency(item.totalExpense)}
                </td>
                <td className="p-1.5 text-right font-black">
                  {formatCurrency(item.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold border-t-2 border-black text-black">
              <td
                colSpan={3}
                className="p-2 border-r border-black font-sans font-extrabold text-right"
              >
                সর্বমোট (GRAND TOTAL):
              </td>
              <td className="p-2 border-r border-black text-right font-mono font-bold">
                {formatCurrency(overallMetrics.initial)}
              </td>
              <td className="p-2 border-r border-black text-right font-mono font-bold">
                +{formatCurrency(overallMetrics.additional)}
              </td>
              <td className="p-2 border-r border-black text-right font-mono font-bold">
                {overallMetrics.adjustment > 0 ? "+" : ""}
                {formatCurrency(overallMetrics.adjustment)}
              </td>
              <td className="p-2 border-r border-black text-right font-mono font-black bg-gray-300">
                {formatCurrency(overallMetrics.currentAllocation)}
              </td>
              <td className="p-2 border-r border-black text-right font-mono font-bold">
                {formatCurrency(overallMetrics.totalExpense)}
              </td>
              <td className="p-2 text-right font-mono font-black">
                {formatCurrency(overallMetrics.balance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Blocks */}
        <div className="grid grid-cols-2 gap-12 mt-16 pt-8 text-xs font-sans">
          <div className="text-center">
            <div className="border-t border-black pt-2 w-48 mx-auto font-bold">
              হিসাবরক্ষক / প্রস্তুতকারী
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">
              স্বাক্ষর ও তারিখ
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 w-48 mx-auto font-bold">
              শাখা / কার্যালয় প্রধান
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">
              স্বাক্ষর ও তারিখ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
