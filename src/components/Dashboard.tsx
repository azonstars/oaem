import React from "react";
import {
  Allocation,
  Expense,
  Category,
  Office,
  FinancialYear,
  User,
  NoteSheet,
  SystemSettings,
  isStaffOrAdmin,
} from "../types";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertCircle,
  ArrowRightLeft,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface DashboardProps {
  allocations: Allocation[];
  expenses: Expense[];
  categories: Category[];
  offices: Office[];
  financialYears: FinancialYear[];
  selectedFY: string;
  currentUser: User;
  noteSheets?: NoteSheet[];
  systemSettings?: SystemSettings | null;
  setCurrentTab: (tab: string) => void;
  onNavigateExpenses?: (
    filter: "All" | "Pending" | "Approved" | "Rejected",
  ) => void;
  onOpenAbout?: () => void;
}

export function Dashboard({
  allocations,
  expenses,
  categories,
  offices,
  financialYears,
  selectedFY,
  currentUser,
  noteSheets: _noteSheets,
  systemSettings,
  setCurrentTab,
  onNavigateExpenses,
  onOpenAbout: _onOpenAbout,
}: DashboardProps) {
  const { t, language, formatCurrency, formatNumber } = useLanguage();
  const { theme, isCustom } = useTheme();
  const currentFYObj = financialYears.find((fy) => fy.id === selectedFY);
  const currentOffice = offices.find((o) => o.id === currentUser.officeId);
  const isHeadOffice = isStaffOrAdmin(currentUser?.role);

  const isDark = theme === "dark";

  const filteredAllocations = allocations.filter((a) => {
    const matchFY = a.financialYearId === selectedFY;
    const matchOffice = isHeadOffice
      ? true
      : a.officeId === currentUser.officeId;
    return matchFY && matchOffice;
  });

  const filteredExpenses = expenses.filter((e) => {
    const matchFY = e.financialYearId === selectedFY;
    const matchOffice = isHeadOffice
      ? true
      : e.officeId === currentUser.officeId;
    return matchFY && matchOffice;
  });


  const initialAllocation = filteredAllocations
    .filter((a) => a.type === "Initial" || (!a.type as any))
    .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);

  const additionalAllocation = filteredAllocations
    .filter((a) => a.type === "Additional")
    .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);

  const adjustments = filteredAllocations
    .filter((a) => a.type === "Adjustment")
    .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);

  const totalAllocated = initialAllocation + additionalAllocation + adjustments;

  const approvedExpenses = filteredExpenses.filter(
    (e) => e.status === "Approved" || !e.status,
  );
  const pendingExpenses = filteredExpenses.filter(
    (e) => e.status === "Pending",
  );

  const totalSpent = approvedExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
  const totalPendingAmount = pendingExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );

  const balance = totalAllocated - totalSpent - totalPendingAmount;
  const utilizationRate =
    totalAllocated > 0
      ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100))
      : 0;

  const categorySummary = categories
    .map((cat) => {
      const allocated = filteredAllocations
        .filter((a) => a.categoryId === cat.id)
        .reduce((s, a) => s + Number(a.allocatedAmount || 0), 0);
      const spent = filteredExpenses
        .filter((e) => e.categoryId === cat.id)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const rem = allocated - spent;
      const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
      return { ...cat, allocated, spent, rem, pct };
    })
    .filter((c) => c.allocated > 0 || c.spent > 0);

  const officeSummary = isHeadOffice
    ? offices
        .map((off) => {
          const allocated = filteredAllocations
            .filter((a) => a.officeId === off.id)
            .reduce((s, a) => s + Number(a.allocatedAmount || 0), 0);
          const spent = filteredExpenses
            .filter((e) => e.officeId === off.id)
            .reduce((s, e) => s + Number(e.amount || 0), 0);
          const rem = allocated - spent;
          const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
          return { ...off, allocated, spent, rem, pct };
        })
        .filter((o) => o.allocated > 0 || o.spent > 0)
    : [];

  const getTimeSlotAndGreeting = (): {
    slot: "morning" | "afternoon" | "evening" | "night";
    greeting: string;
  } => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        slot: "morning",
        greeting: language === "bn" ? "শুভ সকাল" : "Good Morning",
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        slot: "afternoon",
        greeting: language === "bn" ? "শুভ অপরাহ্ন" : "Good Afternoon",
      };
    } else if (hour >= 17 && hour < 20) {
      return {
        slot: "evening",
        greeting: language === "bn" ? "শুভ সন্ধ্যা" : "Good Evening",
      };
    } else {
      return {
        slot: "night",
        greeting: language === "bn" ? "শুভ রাত্রি" : "Good Night",
      };
    }
  };

  const { slot, greeting } = getTimeSlotAndGreeting();

  const replacePlaceholders = (template: string): string => {
    if (!template) return "";
    const systemName =
      systemSettings?.webAppName ||
      (language === "bn"
        ? "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম"
        : "Office Allocation & Expense Management System");
    const officeName =
      currentOffice?.name ||
      (language === "bn" ? "প্রধান কার্যালয়" : "Head Office");
    const fyName =
      currentFYObj?.name ||
      financialYears.find((f) => f.isActive)?.name ||
      "2026-2027";
    const userName =
      currentUser?.name || (language === "bn" ? "ব্যবহারকারী" : "User");
    const institutionName =
      systemSettings?.institutionName ||
      (language === "bn"
        ? "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"
        : "Government of the People's Republic of Bangladesh");

    return template
      .replace(/{name}/g, userName)
      .replace(/{system}/g, systemName)
      .replace(/{office}/g, officeName)
      .replace(/{fiscal_year}/g, fyName)
      .replace(/{greeting}/g, greeting)
      .replace(/{institution}/g, institutionName);
  };

  const getWelcomeLines = (): { line1: string; line2: string } => {
    const customConfig = systemSettings?.welcomeMessages?.[slot];

    const defaultMessages = {
      morning: {
        line1:
          language === "bn"
            ? "হ্যালো {name}, শুভ সকাল! 👋"
            : "Hello {name}, Good Morning! 👋",
        line2:
          language === "bn"
            ? "আজকের কাজের জন্য {system}-এ আপনাকে স্বাগতম।"
            : "Welcome to {system} for today's work.",
      },
      afternoon: {
        line1:
          language === "bn"
            ? "হ্যালো {name}, শুভ অপরাহ্ন! 👋"
            : "Hello {name}, Good Afternoon! 👋",
        line2:
          language === "bn"
            ? "{system}-এ ফিরে আসায় আপনাকে স্বাগতম।"
            : "Welcome back to {system}.",
      },
      evening: {
        line1:
          language === "bn"
            ? "হ্যালো {name}, শুভ সন্ধ্যা! 👋"
            : "Hello {name}, Good Evening! 👋",
        line2:
          language === "bn"
            ? "{system}-এ ফিরে আসায় আপনাকে স্বাগতম।"
            : "Welcome back to {system}.",
      },
      night: {
        line1:
          language === "bn"
            ? "হ্যালো {name}, শুভ রাত্রি! 👋"
            : "Hello {name}, Good Night! 👋",
        line2:
          language === "bn"
            ? "{system}-এ ফিরে আসায় আপনাকে স্বাগতম।"
            : "Welcome back to {system}.",
      },
    };

    const rawLine1 =
      customConfig?.line1 && customConfig.line1.trim() !== ""
        ? customConfig.line1
        : defaultMessages[slot].line1;
    const rawLine2 =
      customConfig?.line2 && customConfig.line2.trim() !== ""
        ? customConfig.line2
        : defaultMessages[slot].line2;

    return {
      line1: replacePlaceholders(rawLine1),
      line2: replacePlaceholders(rawLine2),
    };
  };

  const welcomeLines = getWelcomeLines();

  const getCurrentFormattedDate = () => {
    const now = new Date();
    if (language === "bn") {
      const bnDays = [
        "রবিবার",
        "সোমবার",
        "মঙ্গলবার",
        "বুধবার",
        "বৃহস্পতিবার",
        "শুক্রবার",
        "শনিবার",
      ];
      const bnMonths = [
        "জানুয়ারি",
        "ফেব্রুয়ারি",
        "মার্চ",
        "এপ্রিল",
        "মে",
        "জুন",
        "জুলাই",
        "আগস্ট",
        "সেপ্টেম্বর",
        "অক্টোবর",
        "নভেম্বর",
        "ডিসেম্বর",
      ];
      const toBnDigits = (n: number) =>
        n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d)]);
      return `${bnDays[now.getDay()]}, ${toBnDigits(now.getDate())} ${bnMonths[now.getMonth()]} ${toBnDigits(now.getFullYear())}`;
    }
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner with Institution Logo & Dynamic Custom Welcome Message */}
      <div
        className={`p-6 rounded-2xl shadow-lg border flex flex-col md:flex-row justify-between items-start md:items-center gap-5 transition-all ${
          isCustom
            ? "bg-gradient-to-r from-[#18132d] via-[#281c4a] to-[#3b276b] text-purple-50 border-[#4a357b] shadow-purple-950/50"
            : isDark
              ? "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white border-slate-700 shadow-black/40"
              : "bg-gradient-to-r from-[#2c2825] via-[#38332e] to-[#2c2825] text-amber-50 border-[#443e38] shadow-stone-900/20"
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          {systemSettings?.logoUrl ? (
            <img
              src={systemSettings.logoUrl}
              alt="Institution Logo"
              className="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 shadow-md border border-white/20 shrink-0"
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-md shrink-0 ${
                isCustom
                  ? "bg-gradient-to-tr from-purple-600 to-amber-500"
                  : isDark
                    ? "bg-emerald-600"
                    : "bg-[#c05621]"
              }`}
            >
              {language === "bn" ? "বাং" : "GO"}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                  isCustom
                    ? "bg-purple-500/20 text-amber-300 border-purple-400/30"
                    : isDark
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-[#c05621]/20 text-emerald-400 border-[#c05621]/30"
                }`}
              >
                {isHeadOffice
                  ? t.headOfficeBadge
                  : `${t.subOfficeBadge}: ${currentOffice?.name}`}
              </span>
              <span className="text-slate-300 text-xs font-mono">
                {t.financialYear}:{" "}
                <strong className="text-white">{currentFYObj?.name}</strong>
              </span>
            </div>

            {/* Dynamic Admin-Configurable Welcome Headline (Line 1) */}
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {welcomeLines.line1}
            </h2>

            {/* Welcome Subtitle (Line 2) */}
            <p
              className={`text-xs mt-1 leading-relaxed ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-amber-200"}`}
            >
              {welcomeLines.line2}
            </p>

            {/* Accounting Formula Note */}
            <p
              className={`text-xs font-mono mt-1 opacity-80 flex items-center gap-1.5 ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-amber-300"}`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
              {t.formulaNote}
            </p>
          </div>
        </div>

        {/* Right Section: Date Displayed Above the Action Buttons */}
        <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0 self-stretch md:self-auto justify-between md:justify-center">
          {/* Date placed directly above the New Allocation / Expense buttons */}
          <div
            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border backdrop-blur-xs ${
              isCustom
                ? "bg-purple-950/60 border-purple-800 text-purple-200"
                : isDark
                  ? "bg-slate-800/80 border-slate-700 text-slate-200"
                  : "bg-black/30 border-white/15 text-amber-100"
            }`}
          >
            <span>📅 {getCurrentFormattedDate()}</span>
            <span className="opacity-40">|</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {currentFYObj?.name || "2026-2027"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setCurrentTab("expenses")}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 ${
                isCustom
                  ? "bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold"
                  : isDark
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-[#c05621] hover:bg-[#a8491b] text-white"
              }`}
            >
              <Receipt className="w-4 h-4" /> {t.newExpenseBtn}
            </button>
            <button
              onClick={() => setCurrentTab("allocations")}
              className="flex-1 md:flex-initial bg-slate-800/90 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 border border-slate-600/60"
            >
              <DollarSign className="w-4 h-4" /> {t.newAllocationBtn}
            </button>
          </div>
        </div>
      </div>

      {/* Negative Balance Alert Warning if Overspent */}
      {balance < 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs">
            <strong className="font-bold">{t.overspentAlert}</strong>
            <p className="mt-0.5">
              মোট ব্যয় বরাদ্দের চেয়ে {formatCurrency(Math.abs(balance))} বেশি
              হয়েছে। অনুগ্রহ করে অতিরিক্ত বরাদ্দ বা সমন্বয় প্রদান করুন।
            </p>
          </div>
        </div>
      )}

      {/* 7 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Initial Allocation */}
        <div
          className={`p-4 rounded-2xl shadow-sm border transition-colors ${
            isCustom
              ? "bg-[#18132e]/90 border-[#322754] text-purple-100"
              : isDark
                ? "bg-slate-900 border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <DollarSign
              className={`w-4 h-4 ${isCustom ? "text-amber-400" : isDark ? "text-emerald-500" : "text-emerald-600"}`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.statAllocation}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono truncate">
            {formatCurrency(initialAllocation)}
          </div>
        </div>

        {/* Additional Allocation */}
        <div
          className={`p-4 rounded-2xl shadow-sm border transition-colors ${
            isCustom
              ? "bg-[#18132e]/90 border-[#322754] text-purple-100"
              : isDark
                ? "bg-slate-900 border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.statAdditional}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono truncate">
            {formatCurrency(additionalAllocation)}
          </div>
        </div>

        {/* Adjustment */}
        <div
          className={`p-4 rounded-2xl shadow-sm border transition-colors ${
            isCustom
              ? "bg-[#18132e]/90 border-[#322754] text-purple-100"
              : isDark
                ? "bg-slate-900 border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.statAdjustment}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono truncate">
            {formatCurrency(adjustments)}
          </div>
        </div>

        {/* Approved Expense */}
        <div
          className={`p-4 rounded-2xl shadow-sm border transition-colors ${
            isCustom
              ? "bg-[#18132e]/90 border-[#322754] text-purple-100"
              : isDark
                ? "bg-slate-900 border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <Receipt className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.statExpense}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono truncate text-rose-500">
            {formatCurrency(totalSpent)}
          </div>
        </div>

        {/* Pending Expenses */}
        <div
          onClick={() => {
            if (onNavigateExpenses) onNavigateExpenses("Pending");
            else setCurrentTab("expenses");
          }}
          className={`p-4 rounded-2xl shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${
            isCustom
              ? "bg-[#18132e]/90 border-amber-500/40 text-amber-300"
              : isDark
                ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                : "bg-amber-50/80 border-amber-300 text-amber-900"
          }`}
          title={
            language === "bn"
              ? "পেন্ডিং ব্যয় দেখতে ক্লিক করুন"
              : "Click to view pending expenses"
          }
        >
          <div className="flex items-center justify-between opacity-80 mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {language === "bn" ? "পেন্ডিং ব্যয়" : "Pending Expenses"}
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
              {formatNumber(pendingExpenses.length)}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono truncate text-amber-600">
            {formatCurrency(totalPendingAmount)}
          </div>
        </div>

        {/* Available Balance */}
        <div
          className={`p-4 rounded-2xl shadow-sm border transition-colors ${
            balance < 0
              ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
              : isCustom
                ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                : isDark
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2 opacity-80 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.statBalance}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono truncate">
            {formatCurrency(balance)}
          </div>
        </div>

        {/* Utilization Rate */}
        <div
          className={`p-4 rounded-2xl shadow-sm border transition-colors ${
            isCustom
              ? "bg-[#18132e]/90 border-[#322754] text-purple-100"
              : isDark
                ? "bg-slate-900 border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t.statUtilization}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono truncate">
            {formatNumber(utilizationRate)}%
          </div>
        </div>
      </div>

      {/* Category Wise Budget Matrix */}
      <div
        className={`p-6 rounded-2xl shadow-sm border transition-colors ${
          isCustom
            ? "bg-[#140f29]/90 border-[#2d224d] text-purple-100"
            : isDark
              ? "bg-slate-900 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold">{t.categoryWiseBudget}</h3>
            <p className="text-xs opacity-60">
              {language === "bn"
                ? "খাতভিত্তিক বরাদ্দ ও খরচের সারসংক্ষেপ"
                : "Category allocations, expenses and balances"}
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${
              isCustom
                ? "bg-[#1f183d] border-[#392b66] text-amber-300"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {formatNumber(categorySummary.length)} {t.allCategories}
          </span>
        </div>

        {categorySummary.length === 0 ? (
          <div className="text-center py-8 opacity-50 text-xs">
            {t.noCategoriesFound}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySummary.map((cat) => (
              <div
                key={cat.id}
                className={`p-4 rounded-xl border space-y-2 transition ${
                  isCustom
                    ? "bg-[#1a1436] border-[#36295c] hover:border-[#4d3a82]"
                    : isDark
                      ? "bg-slate-800/50 border-slate-700/60 hover:border-slate-600"
                      : "bg-slate-50 border-slate-200 hover:border-emerald-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono opacity-50 block">
                      {cat.code}
                    </span>
                    <h4 className="font-bold text-xs">{cat.name}</h4>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      cat.pct > 90
                        ? "bg-rose-500/20 text-rose-400"
                        : isCustom
                          ? "bg-purple-500/20 text-amber-300"
                          : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {formatNumber(cat.pct)}%
                  </span>
                </div>

                <div className="w-full bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      cat.pct > 90
                        ? "bg-rose-500"
                        : isCustom
                          ? "bg-amber-400"
                          : "bg-[#c05621]"
                    }`}
                    style={{ width: `${Math.min(100, cat.pct)}%` }}
                  />
                </div>

                <div
                  className={`text-xs space-y-1 font-mono pt-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                >
                  <div className="flex justify-between">
                    <span
                      className={
                        isCustom
                          ? "text-purple-300/80"
                          : isDark
                            ? "text-slate-400"
                            : "text-slate-500"
                      }
                    >
                      {t.allocated}:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(cat.allocated)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={
                        isCustom
                          ? "text-purple-300/80"
                          : isDark
                            ? "text-slate-400"
                            : "text-slate-500"
                      }
                    >
                      {t.spent}:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(cat.spent)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between border-t pt-1 font-bold ${
                      isCustom
                        ? "border-[#302452]"
                        : isDark
                          ? "border-slate-700"
                          : "border-slate-200"
                    }`}
                  >
                    <span
                      className={
                        isCustom
                          ? "text-purple-200"
                          : isDark
                            ? "text-slate-300"
                            : "text-slate-900"
                      }
                    >
                      {t.remaining}:
                    </span>
                    <span
                      className={
                        cat.rem < 0
                          ? "text-rose-500 dark:text-rose-400 font-extrabold"
                          : isCustom
                            ? "text-amber-300 font-bold"
                            : isDark
                              ? "text-emerald-400 font-bold"
                              : "text-emerald-700 font-extrabold"
                      }
                    >
                      {formatCurrency(cat.rem)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Office Wise Summary for Head Office */}
      {isHeadOffice && officeSummary.length > 0 && (
        <div
          className={`p-6 rounded-2xl shadow-sm border transition-colors ${
            isCustom
              ? "bg-[#140f29]/90 border-[#2d224d] text-purple-100"
              : isDark
                ? "bg-slate-900 border-slate-800 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold">{t.officeWiseSummary}</h3>
            <span className="text-xs opacity-60">
              {formatNumber(officeSummary.length)} {t.allOffices}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {officeSummary.map((off) => (
              <div
                key={off.id}
                className={`p-4 rounded-xl border space-y-2 ${
                  isCustom
                    ? "bg-[#1a1436] border-[#36295c]"
                    : isDark
                      ? "bg-slate-800/50 border-slate-700/60"
                      : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono opacity-50 block">
                      {off.code}
                    </span>
                    <h4 className="font-bold text-xs">{off.name}</h4>
                  </div>
                  <span className="text-xs font-bold opacity-75 px-2 py-0.5 rounded-md">
                    {formatNumber(off.pct)}%
                  </span>
                </div>
                <div
                  className={`text-xs space-y-1 font-mono pt-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                >
                  <div className="flex justify-between">
                    <span
                      className={
                        isCustom
                          ? "text-purple-300/80"
                          : isDark
                            ? "text-slate-400"
                            : "text-slate-500"
                      }
                    >
                      {t.allocated}:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(off.allocated)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={
                        isCustom
                          ? "text-purple-300/80"
                          : isDark
                            ? "text-slate-400"
                            : "text-slate-500"
                      }
                    >
                      {t.spent}:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(off.spent)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between border-t pt-1 font-bold ${
                      isCustom
                        ? "border-[#302452]"
                        : isDark
                          ? "border-slate-700"
                          : "border-slate-200"
                    }`}
                  >
                    <span
                      className={
                        isCustom
                          ? "text-purple-200"
                          : isDark
                            ? "text-slate-300"
                            : "text-slate-900"
                      }
                    >
                      {t.remaining}:
                    </span>
                    <span
                      className={
                        off.rem < 0
                          ? "text-rose-500 dark:text-rose-400 font-extrabold"
                          : isCustom
                            ? "text-amber-300 font-bold"
                            : isDark
                              ? "text-emerald-400 font-bold"
                              : "text-emerald-700 font-extrabold"
                      }
                    >
                      {formatCurrency(off.rem)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Expenses List */}
      <div
        className={`p-6 rounded-2xl shadow-sm border transition-colors ${
          isCustom
            ? "bg-[#140f29]/90 border-[#2d224d] text-purple-100"
            : isDark
              ? "bg-slate-900 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold">{t.recentExpenses}</h3>
          <button
            onClick={() => setCurrentTab("expenses")}
            className={`text-xs font-semibold hover:underline transition ${isCustom ? "text-amber-300" : isDark ? "text-emerald-500" : "text-emerald-600"}`}
          >
            {t.all} ({formatNumber(filteredExpenses.length)}) →
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8 opacity-50 text-xs">
            {t.noRecentExpenses}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`uppercase font-semibold border-b ${
                  isCustom
                    ? "bg-[#1e173b] text-purple-200 border-[#382b61]"
                    : isDark
                      ? "bg-slate-800 text-slate-300 border-slate-700"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <tr>
                  <th className="p-3">{t.voucherNo}</th>
                  <th className="p-3">{t.date}</th>
                  <th className="p-3">{t.category}</th>
                  <th className="p-3">{t.office}</th>
                  <th className="p-3">{t.description}</th>
                  <th className="p-3 text-right">{t.amount}</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isCustom ? "divide-[#2b1f52]" : isDark ? "divide-slate-800" : "divide-[#e2dacd]"}`}
              >
                {filteredExpenses.slice(0, 5).map((e) => {
                  const cat = categories.find((c) => c.id === e.categoryId);
                  const off = offices.find((o) => o.id === e.officeId);
                  return (
                    <tr
                      key={e.id}
                      className={`transition ${
                        isCustom
                          ? "hover:bg-[#1e173d]"
                          : isDark
                            ? "hover:bg-slate-800/60"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="p-3 font-mono font-semibold opacity-90">
                        {e.voucherNo}
                      </td>
                      <td className="p-3 opacity-75">{e.expenseDate}</td>
                      <td className="p-3 font-medium opacity-90">
                        {cat?.name || e.categoryId}
                      </td>
                      <td className="p-3 opacity-75">
                        {off?.name || e.officeId}
                      </td>
                      <td className="p-3 opacity-75 truncate max-w-xs">
                        {e.description}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
