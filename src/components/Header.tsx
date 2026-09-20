import React, { useState, useRef, useEffect, useMemo } from "react";
import { FinancialYear, User, Office, SystemSettings, FlowBoardTool, canAccessTool } from "../types";
import {
  LogOut,
  Search,
  Globe,
  Sun,
  Moon,
  Palette,
  Menu,
  ChevronDown,
  Lock,
  Info,
  Building2,
  Calendar,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  LayoutGrid,
  Layers,
  Database,
  Activity,
  Cpu,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
  financialYears: FinancialYear[];
  selectedFY: string;
  setSelectedFY: (fyId: string) => void;
  currentUser: User;
  offices: Office[];
  systemSettings: SystemSettings | null;
  onToggleMobileMenu: () => void;
  onOpenAbout: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
  onOpenProposeUser?: () => void;
  activeTool?: FlowBoardTool | null;
  tools?: FlowBoardTool[];
  onOpenHub?: () => void;
  onSwitchTool?: (toolId: string) => void;
  onOpenSettings?: (subTab?: string) => void;
  onOpenCentralManagement?: () => void;
}

export function Header({
  financialYears,
  selectedFY,
  setSelectedFY,
  currentUser,
  offices,
  systemSettings,
  onToggleMobileMenu,
  onOpenAbout,
  onLogout,
  onChangePassword,
  onOpenProposeUser,
  activeTool,
  tools = [],
  onOpenHub,
  onSwitchTool,
  onOpenSettings: _onOpenSettings,
  onOpenCentralManagement,
}: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, isCustom, isDark } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);
  const [isNoticePaused, setIsNoticePaused] = useState(false);

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);

  const currentOffice = offices.find((o) => o.id === currentUser.officeId);
  const parentOffice = currentOffice?.parentOfficeId
    ? offices.find((o) => o.id === currentOffice.parentOfficeId)
    : null;
  const currentFY = financialYears.find((fy) => fy.id === selectedFY);

  const toggleLanguage = () => {
    setLanguage(language === "bn" ? "en" : "bn");
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(event.target as Node)
      ) {
        setShowThemeMenu(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        toolMenuRef.current &&
        !toolMenuRef.current.contains(event.target as Node)
      ) {
        setShowToolMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const accessibleTools = useMemo(() => {
    return (tools || []).filter((t) => canAccessTool(currentUser, t.id));
  }, [tools, currentUser]);

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

  const { greeting } = getTimeSlotAndGreeting();

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
      currentFY?.name ||
      financialYears.find((f) => f.isActive)?.name ||
      "2026-2027";
    const userName =
      currentUser?.name || (language === "bn" ? "ব্যবহারকারী" : "User");
    const institutionName =
      systemSettings?.institutionName ||
      (language === "bn"
        ? "ফ্লোবোর্ড এন্টারপ্রাইজ প্ল্যাটফর্ম"
        : "FlowBoard Enterprise Platform");

    return template
      .replace(/{name}/g, userName)
      .replace(/{system}/g, systemName)
      .replace(/{office}/g, officeName)
      .replace(/{fiscal_year}/g, fyName)
      .replace(/{greeting}/g, greeting)
      .replace(/{institution}/g, institutionName);
  };

  const rawNotices =
    systemSettings?.notices && systemSettings.notices.length > 0
      ? systemSettings.notices
      : [
          language === "bn"
            ? "অর্থবছর {fiscal_year}-এর সকল বাজেট বরাদ্দ ও ব্যয় বিবরণী যথাসময়ে নোট শিটের মাধ্যমে দাখিল ও সমন্বয় সম্পন্ন করুন।"
            : "Please submit and reconcile all budget allocations and expenditures for FY {fiscal_year} in a timely manner.",
          language === "bn"
            ? "সরকারি আর্থিক বিধিমালা ও বাজেট নির্দেশিকা অনুযায়ী প্রতিটি ভাউচারের বিপরীতে অনুমোদিত বিল ভাউচার নিশ্চিত করুন।"
            : "Ensure authorized bill vouchers and supporting documents are attached for all expenditure entries.",
          language === "bn"
            ? "উপ-আঞ্চলিক ও শাখা কার্যালয়ের অতিরিক্ত বরাদ্দ বা পুনঃউপযোজনের আবেদন প্রধান কার্যালয়ের বাজেট শাখায় প্রেরণ করুন।"
            : "Forward all requests for additional allocations or re-appropriations to the Head Office Budget Division.",
          language === "bn"
            ? "অফিসিয়াল ব্যয় এন্ট্রি ও নোট শিট অনুমোদনের পর চূড়ান্ত প্রিন্ট কপি অডিট ফাইলের জন্য সংরক্ষণ করুন।"
            : "Archive approved note sheets and voucher printouts for institutional internal audit records.",
        ];

  const processedNotices = rawNotices.map((n) => replacePlaceholders(n));

  useEffect(() => {
    if (
      systemSettings?.showNoticeBar === false ||
      processedNotices.length <= 1 ||
      isNoticePaused
    )
      return;
    const timer = setInterval(() => {
      setCurrentNoticeIndex((prev) => (prev + 1) % processedNotices.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [processedNotices.length, isNoticePaused, systemSettings?.showNoticeBar]);

  const handlePrevNotice = () => {
    setCurrentNoticeIndex(
      (prev) => (prev - 1 + processedNotices.length) % processedNotices.length,
    );
  };

  const handleNextNotice = () => {
    setCurrentNoticeIndex((prev) => (prev + 1) % processedNotices.length);
  };

  const toBnDigits = (n: number) =>
    n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d)]);

  const isHubMode = !activeTool;
  const isOfficeAllocationMode = Boolean(activeTool && activeTool.id === "budget-expense");

  return (
    <div
      className="sticky top-0 z-30 shrink-0 w-full print:hidden"
      data-no-print="true"
    >
      {/* ========================================================================= */}
      {/* 1. MAIN PROFESSIONAL HEADER                                               */}
      {/* ========================================================================= */}
      <header
        data-no-print="true"
        className={`min-h-[4.25rem] py-2 px-3 sm:px-5 shrink-0 transition-colors border-b flex items-center justify-between gap-2 sm:gap-3.5 print:hidden ${
          isCustom
            ? "bg-[#161226] border-[#2e244d] text-purple-100 shadow-sm"
            : isDark
              ? "bg-slate-900 border-slate-800 text-slate-100 shadow-sm"
              : "bg-white border-slate-200 text-slate-900 shadow-xs"
        }`}
      >
        {/* Left Section */}
        {isHubMode ? (
          /* FlowBoard Enterprise Institutional Branding - Technical & Modern */
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0 relative group cursor-pointer" onClick={onOpenHub}>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 dark:from-slate-900 dark:to-indigo-950 border border-slate-700/60 p-1 flex items-center justify-center shadow-md shadow-indigo-950/20">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-inner">
                  <Cpu className="w-5 h-5 text-emerald-100 animate-pulse" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 ring-2 ring-emerald-500/30" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 dark:from-emerald-400 dark:via-teal-300 dark:to-indigo-400 bg-clip-text text-transparent">
                  FlowBoard
                </span>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
                  {language === "bn" ? "এন্টারপ্রাইজ প্ল্যাটফর্ম" : "Enterprise Platform"}
                </span>

                <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ONLINE • v3.8.5</span>
                </div>

                {currentUser?.role === "Super Admin" && (
                  <div className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-mono">
                    <Database className="w-2.5 h-2.5 text-sky-500" />
                    <span>SQLite Central Sync</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden sm:block mt-0.5">
                {language === "bn"
                  ? "সেন্ট্রাল এন্টারপ্রাইজ অপারেটিং প্ল্যাটফর্ম ও ডিস্ট্রিবিউটেড সিস্টেমস হাব"
                  : "Central Enterprise Cloud Architecture & Distributed Modular Workspaces"}
              </p>
            </div>
          </div>
        ) : isOfficeAllocationMode ? (
          /* Office Allocation & Expense Management Suite Branding */
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Mobile Menu Toggle */}
            <button
              onClick={onToggleMobileMenu}
              className={`md:hidden p-1.5 rounded-xl border transition shrink-0 ${
                isCustom
                  ? "border-[#43356e] text-purple-200 hover:bg-[#251d45]"
                  : isDark
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Back to Hub shortcut button */}
            {onOpenHub && (
              <button
                onClick={onOpenHub}
                title="Return to FlowBoard Enterprise Hub"
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-500" />
                <span>FlowBoard Hub</span>
              </button>
            )}

            {/* Logo */}
            <div className="shrink-0">
              {systemSettings?.logoUrl ? (
                <img
                  src={systemSettings.logoUrl}
                  alt="Emblem / System Logo"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white p-1 border border-slate-200/90 shadow-sm ring-1 ring-slate-900/5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-emerald-500/20 shrink-0 ${
                    isCustom
                      ? "bg-gradient-to-br from-purple-700 to-amber-600"
                      : "bg-gradient-to-br from-emerald-600 to-emerald-800"
                  }`}
                >
                  <div className="text-center leading-none">
                    <span className="text-xs sm:text-xs font-extrabold tracking-wider block">
                      {language === "bn" ? "ফ্লো" : "FB"}
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-semibold opacity-90 block">
                      FLOW
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* System & Office Identity */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm lg:text-base font-bold tracking-tight leading-tight truncate">
                  {systemSettings?.webAppName ||
                    (language === "bn"
                      ? "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম"
                      : "Office Allocation & Expense Management System")}
                </h1>
              </div>

              <p className="text-xs sm:text-xs opacity-70 font-medium leading-tight truncate hidden sm:block">
                {systemSettings?.institutionName ||
                  (language === "bn"
                    ? "ফ্লোবোর্ড এন্টারপ্রাইজ প্ল্যাটফর্ম"
                    : "FlowBoard Enterprise Platform")}
              </p>

              {/* Dynamic Office Identity from existing logged-in user / master */}
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <div
                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-xs sm:text-xs font-semibold border max-w-full truncate ${
                    isCustom
                      ? "bg-[#251d45] border-[#4b3b7a] text-amber-300"
                      : isDark
                        ? "bg-emerald-950/60 border-emerald-800/70 text-emerald-300"
                        : "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                  }`}
                >
                  <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 opacity-80" />
                  <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-[240px]">
                    {currentOffice?.name ||
                      (language === "bn"
                        ? "প্রধান কার্যালয়, ঢাকা"
                        : "Head Office, Dhaka")}
                  </span>
                </div>

                {parentOffice && (
                  <span className="text-xs sm:text-xs opacity-50 hidden xl:inline truncate max-w-[120px]">
                    ({parentOffice?.name || ""})
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Independent Tool Workspace Header */
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {onOpenHub && (
              <button
                onClick={onOpenHub}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">FlowBoard Hub</span>
              </button>
            )}

            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold truncate">
                {language === "bn" && activeTool?.nameBn ? activeTool.nameBn : activeTool?.name}
              </span>
              {activeTool?.badge && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {language === "bn" && activeTool.badgeBn ? activeTool.badgeBn : activeTool.badge}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0 ml-auto flex-nowrap">
          {/* If on FlowBoard Hub, show technical telemetry status badge */}
          {isHubMode && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>{accessibleTools.length} Modules Active</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Sync: Instant</span>
            </div>
          )}

          {/* FlowBoard Hub Launcher Button (when inside a tool) */}
          {!isHubMode && onOpenHub && (
            <button
              id="header-flowboard-hub-btn"
              onClick={onOpenHub}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs ${
                isCustom
                  ? "bg-[#251d45] border-[#4b3b7a] text-purple-200 hover:bg-[#34285e]"
                  : isDark
                    ? "bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
              title="FlowBoard Workspace Hub"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">FlowBoard</span>
            </button>
          )}

          {/* Active Tool Switcher Dropdown */}
          {activeTool && accessibleTools.length > 0 && onSwitchTool && (
            <div className="relative" ref={toolMenuRef}>
              <button
                id="header-tool-switcher-btn"
                onClick={() => setShowToolMenu(!showToolMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  isCustom
                    ? "bg-[#231a40] border-[#43356e] text-amber-200"
                    : isDark
                      ? "bg-slate-800/90 border-slate-700 text-slate-200"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="max-w-[90px] sm:max-w-[140px] truncate hidden md:inline">
                  {language === "bn" && activeTool.nameBn ? activeTool.nameBn : activeTool.name}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showToolMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                    {language === "bn" ? "টুলস ও ওয়ার্কস্পেসসমূহ" : "Switch Active Tool"}
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {accessibleTools.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSwitchTool(t.id);
                          setShowToolMenu(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs text-left flex items-center justify-between transition ${
                          t.id === activeTool.id
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              t.id === activeTool.id ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span className="truncate">{language === "bn" && t.nameBn ? t.nameBn : t.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase shrink-0">
                          {t.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Compact Modern Search Field - ONLY in Office Allocation Suite */}
          {isOfficeAllocationMode && (
            <div className="relative hidden xl:block">
              <Search
                className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  t.searchPlaceholder ||
                  (language === "bn" ? "অনুসন্ধান করুন..." : "Search anything...")
                }
                className={`w-32 2xl:w-44 text-xs rounded-xl pl-8.5 pr-3 py-1.5 focus:outline-none transition-all ${
                  isCustom
                    ? "bg-[#231a40] border border-[#43356e] text-purple-100 placeholder-purple-300/40 focus:border-amber-400 focus:w-48"
                    : isDark
                      ? "bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:border-emerald-500 focus:w-48"
                      : "bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:w-48"
                }`}
              />
            </div>
          )}

          {/* 3. Professional Fiscal Year Selector - ONLY in Office Allocation Suite */}
          {isOfficeAllocationMode && (
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs shrink-0 ${
                currentFY?.isClosed
                  ? "bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                  : isCustom
                    ? "bg-[#231a40] border-[#43356e] text-amber-200"
                    : isDark
                      ? "bg-slate-800/90 border-slate-700 text-slate-200"
                      : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs opacity-70 hidden xl:inline whitespace-nowrap">
                {language === "bn" ? "অর্থবছর:" : "FY:"}
              </span>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1 truncate max-w-[80px] sm:max-w-[110px] md:max-w-[130px]"
              >
                {financialYears.map((fy) => (
                  <option
                    key={fy.id}
                    value={fy.id}
                    className="text-slate-900 bg-white"
                  >
                    {fy.name}{" "}
                    {fy.isClosed
                      ? `(${language === "bn" ? "🔒 ক্লোজড" : "🔒 Closed"})`
                      : fy.isActive
                        ? `(${language === "bn" ? "চলতি" : "Active"})`
                        : ""}
                  </option>
                ))}
              </select>
              {currentFY?.isClosed && (
                <span className="px-1.5 py-0.5 rounded text-xs sm:text-xs font-bold bg-rose-600 text-white flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">
                    {language === "bn" ? "ক্লোজড" : "Closed"}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* 4. Language Switcher (বাংলা | English) */}
          <button
            onClick={toggleLanguage}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
              isCustom
                ? "bg-[#231a40] hover:bg-[#2d2252] text-purple-100 border-[#43356e]"
                : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
            title={
              language === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"
            }
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden lg:inline">
              {language === "bn" ? "English" : "বাংলা"}
            </span>
          </button>

          {/* Central Management Dedicated Button (Admin & Super Admin only) */}
          {onOpenCentralManagement &&
            [
              "Super Admin",
              "Admin",
              "Head Office Admin",
              "HeadOfficeAdmin",
            ].includes(currentUser?.role || "") && (
              <button
                id="header-central-mgmt-btn"
                onClick={onOpenCentralManagement}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
                title={language === "bn" ? "ফ্লোবোর্ড সার্বজনীন সেন্ট্রাল ম্যানেজমেন্ট" : "FlowBoard Central Management"}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="hidden xl:inline">{language === "bn" ? "সেন্ট্রাল ম্যানেজমেন্ট" : "Central Management"}</span>
              </button>
            )}

          {/* 5. Theme Selector / Toggle */}
          <div className="relative shrink-0" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`p-2 rounded-xl border transition flex items-center justify-center shrink-0 ${
                isCustom
                  ? "bg-[#231a40] hover:bg-[#2d2252] text-amber-300 border-[#43356e]"
                  : isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
              title="Theme Selection"
            >
              {theme === "light" && (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
              {theme === "dark" && (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              )}
              {isCustom && <Palette className="w-3.5 h-3.5 text-purple-400" />}
            </button>

            {showThemeMenu && (
              <div
                className={`absolute right-0 mt-2 w-44 rounded-xl shadow-xl border py-1 z-50 text-xs animate-in fade-in zoom-in-95 ${
                  isCustom
                    ? "bg-[#1f1936] border-[#43356e] text-purple-100"
                    : isDark
                      ? "bg-slate-900 border-slate-700 text-slate-100"
                      : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <button
                  onClick={() => {
                    setTheme("light");
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-emerald-500/10 transition ${
                    theme === "light"
                      ? "font-bold text-emerald-600 bg-emerald-500/10"
                      : ""
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode (লাইট)</span>
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-emerald-500/10 transition ${
                    theme === "dark"
                      ? "font-bold text-emerald-400 bg-emerald-500/10"
                      : ""
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dark Mode (ডার্ক)</span>
                </button>
                <button
                  onClick={() => {
                    setTheme("custom");
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-purple-500/10 transition ${
                    isCustom ? "font-bold text-amber-400 bg-purple-500/10" : ""
                  }`}
                >
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>Custom Theme (কাস্টম)</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. User Dropdown Menu: 👤 User Name ▾ */}
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl border transition shadow-2xs shrink-0 ${
                isCustom
                  ? "bg-[#251d45] hover:bg-[#302657] border-[#4c3b7a] text-purple-100"
                  : isDark
                    ? "bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-100"
                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800"
              }`}
            >
              {/* User Avatar Circle */}
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {currentUser?.name
                  ? currentUser.name.charAt(0).toUpperCase()
                  : "U"}
              </div>

              <div className="text-left hidden xl:block">
                <span className="text-xs font-bold leading-none block truncate max-w-[85px] 2xl:max-w-[120px]">
                  {currentUser?.name || "User"}
                </span>
                <span className="text-xs opacity-60 leading-none block mt-0.5 truncate max-w-[85px] 2xl:max-w-[120px]">
                  {currentUser?.role || ""}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-60 ml-0.5 shrink-0" />
            </button>

            {/* User Dropdown Options */}
            {showUserMenu && (
              <div
                className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 ${
                  isCustom
                    ? "bg-[#1c1633] border-[#43356e] text-purple-100"
                    : isDark
                      ? "bg-slate-900 border-slate-700 text-slate-100"
                      : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                {/* Profile Summary Header */}
                <div className="px-4 py-2.5 border-b border-slate-200/50 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {currentUser?.name || "User"}
                  </p>
                  <p className="text-xs opacity-70 truncate font-mono mt-0.5">
                    {currentUser?.email || currentUser?.userId || ""}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {currentUser?.role || ""}
                    </span>
                  </div>
                </div>

                {/* Dropdown Options */}
                <div className="py-1">
                  {/* Central Management shortcut for Admin and Super Admin only */}
                  {onOpenCentralManagement &&
                    [
                      "Super Admin",
                      "Admin",
                      "Head Office Admin",
                      "HeadOfficeAdmin",
                    ].includes(currentUser?.role || "") && (
                      <button
                        id="header-user-menu-central-mgmt-btn"
                        onClick={() => {
                          onOpenCentralManagement();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-indigo-700 dark:text-indigo-300 font-semibold"
                      >
                        <Shield className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {language === "bn"
                            ? "🛡️ সেন্ট্রাল ম্যানেজমেন্ট"
                            : "🛡️ Central Management"}
                        </span>
                      </button>
                    )}

                  {/* Propose Colleague ID Option */}
                  {onOpenProposeUser && (
                    <button
                      onClick={() => {
                        onOpenProposeUser();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-sky-50 dark:hover:bg-sky-950/40 transition text-sky-700 dark:text-sky-300 font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-sky-500" />
                      <span>
                        {language === "bn"
                          ? "সহকর্মীর আইডি প্রস্তাব"
                          : "Propose Colleague ID"}
                      </span>
                    </button>
                  )}

                  {/* Change Password (Uses existing functionality) */}
                  <button
                    onClick={() => {
                      onChangePassword();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-200"
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {language === "bn"
                        ? "পাসওয়ার্ড পরিবর্তন"
                        : "Change Password"}
                    </span>
                  </button>

                  {/* About Modal */}
                  <button
                    onClick={() => {
                      onOpenAbout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-200"
                  >
                    <Info className="w-3.5 h-3.5 text-sky-500" />
                    <span>
                      {language === "bn"
                        ? "সিস্টেম পরিচিতি ও সংস্করণ"
                        : "About & System Info"}
                    </span>
                  </button>
                </div>

                {/* Logout Option (Uses existing functionality) */}
                <div className="border-t border-slate-200/50 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "লগআউট করুন" : "Logout"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC ROTATING NOTICE & ANNOUNCEMENT BAR (Office Allocation Suite)   */}
      {/* ========================================================================= */}
      {isOfficeAllocationMode && systemSettings?.showNoticeBar !== false && (
        <div
          onMouseEnter={() => setIsNoticePaused(true)}
          onMouseLeave={() => setIsNoticePaused(false)}
          className={`px-3 sm:px-6 py-2 border-b shrink-0 flex items-center justify-between gap-2.5 sm:gap-4 transition-colors ${
            isCustom
              ? "bg-[#140f29] border-[#312459] text-purple-100 shadow-inner"
              : isDark
                ? "bg-slate-900 border-slate-800 text-slate-100 shadow-inner"
                : "bg-emerald-50/90 border-emerald-200 text-slate-900 shadow-2xs"
          }`}
        >
          {/* Left Badge: Notice Indicator */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs shrink-0 border ${
                isCustom
                  ? "bg-rose-500/25 border-rose-400/50 text-rose-300"
                  : isDark
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                    : "bg-rose-100 border-rose-300 text-rose-800"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 animate-pulse" />
              <span className="tracking-wide">
                {language === "bn" ? "বিজ্ঞপ্তি" : "Notice"}
              </span>
            </div>

            {/* Center Notice Text with smooth transition and explicit high-contrast theme classes */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <p
                key={currentNoticeIndex}
                className={`text-xs sm:text-sm font-medium truncate transition-colors duration-200 ${
                  isCustom
                    ? "text-purple-100"
                    : isDark
                      ? "text-slate-100"
                      : "text-slate-900"
                }`}
                title={processedNotices[currentNoticeIndex]}
              >
                {processedNotices[currentNoticeIndex]}
              </p>
            </div>
          </div>

          {/* Right Controls: Navigation arrows & Counter */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs ${
              isCustom
                ? "text-purple-200"
                : isDark
                  ? "text-slate-300"
                  : "text-slate-700"
            }`}
          >
            <span className="text-xs font-mono font-medium opacity-80">
              {language === "bn"
                ? `(${toBnDigits(currentNoticeIndex + 1)}/${toBnDigits(processedNotices.length)})`
                : `(${currentNoticeIndex + 1}/${processedNotices.length})`}
            </span>

            <div className="flex items-center gap-0.5">
              <button
                onClick={handlePrevNotice}
                className={`p-1 rounded-lg transition border ${
                  isCustom
                    ? "border-purple-500/30 text-purple-200 hover:bg-[#281e4d] hover:text-white"
                    : isDark
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "border-emerald-200 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950"
                }`}
                title={
                  language === "bn" ? "পূর্ববর্তী বিজ্ঞপ্তি" : "Previous notice"
                }
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextNotice}
                className={`p-1 rounded-lg transition border ${
                  isCustom
                    ? "border-purple-500/30 text-purple-200 hover:bg-[#281e4d] hover:text-white"
                    : isDark
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "border-emerald-200 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950"
                }`}
                title={language === "bn" ? "পরবর্তী বিজ্ঞপ্তি" : "Next notice"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
