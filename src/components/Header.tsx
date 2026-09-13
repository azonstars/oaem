import React, { useState, useRef, useEffect } from "react";
import { FinancialYear, User, Office, SystemSettings } from "../types";
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
}: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, isCustom, isDark } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);
  const [isNoticePaused, setIsNoticePaused] = useState(false);

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Dynamic Office & Parent Office Resolution
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Time-based Slot & Greeting Determination
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

  // Helper to replace dynamic placeholders safely
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

  // Resolve active notices (admin-configured or default fallback)
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

  // Auto rotate notice every 6 seconds
  useEffect(() => {
    if (processedNotices.length <= 1 || isNoticePaused) return;
    const timer = setInterval(() => {
      setCurrentNoticeIndex((prev) => (prev + 1) % processedNotices.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [processedNotices.length, isNoticePaused]);

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

  return (
    <div className="sticky top-0 z-30 shrink-0 w-full">
      {/* ========================================================================= */}
      {/* 1. MAIN PROFESSIONAL GOVERNMENT HEADER                                    */}
      {/* ========================================================================= */}
      <header
        className={`min-h-[4.25rem] py-2 px-3 sm:px-5 shrink-0 transition-colors border-b flex items-center justify-between gap-2 sm:gap-3.5 ${
          isCustom
            ? "bg-[#161226] border-[#2e244d] text-purple-100 shadow-sm"
            : isDark
              ? "bg-slate-900 border-slate-800 text-slate-100 shadow-sm"
              : "bg-white border-slate-200 text-slate-900 shadow-xs"
        }`}
      >
        {/* Left Section: [Logo + System Identity + Office Identity] */}
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

          {/* Logo */}
          <div className="shrink-0">
            {systemSettings?.logoUrl ? (
              <img
                src={systemSettings.logoUrl}
                alt="Government Emblem / System Logo"
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
                    গণ
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-semibold opacity-90 block">
                    GOB
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
                  ? "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"
                  : "Government of the People's Republic of Bangladesh")}
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

        {/* Right Section: [Search] → [Fiscal Year] → [Language] → [Theme] → [User Menu] */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0 ml-auto flex-nowrap">
          {/* 2. Compact Modern Search Field */}
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

          {/* 3. Professional Fiscal Year Selector */}
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
      {/* 2. DYNAMIC ROTATING NOTICE & ANNOUNCEMENT BAR                             */}
      {/* ========================================================================= */}
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
    </div>
  );
}
