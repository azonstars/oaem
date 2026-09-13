import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../i18n";
import { Phone, MapPin, ShieldCheck, Info } from "lucide-react";

interface AppFooterProps {
  onOpenAbout?: () => void;
}

export function AppFooter({ onOpenAbout }: AppFooterProps) {
  const { theme, isCustom } = useTheme();
  const { language } = useLanguage();

  const isDark = theme === "dark";

  return (
    <footer
      className={`w-full h-12 px-4 sm:px-6 border-t text-xs transition-colors print:hidden shrink-0 flex items-center ${
        isCustom
          ? "bg-[#140f29] border-[#2e234e] text-purple-200"
          : isDark
            ? "bg-slate-950 border-slate-800 text-slate-400"
            : "bg-white border-slate-200 text-slate-600"
      }`}
    >
      <div className="w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
        {/* Left Side: Institutional & System Identity */}
        <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
          <div
            className={`flex items-center gap-1.5 font-semibold shrink-0 ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 shrink-0 ${isCustom ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600"}`}
            />
            <span>
              {language === "bn"
                ? "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম"
                : "Office Allocation & Expense Management System"}
            </span>
          </div>
          <span className="opacity-40 hidden sm:inline">•</span>
          <span className="opacity-75 font-mono text-[11px]">v2.5.0</span>
          <span className="opacity-40 hidden md:inline">•</span>
          <span className="opacity-65 text-xs hidden md:inline truncate">
            {language === "bn"
              ? "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"
              : "Government of Bangladesh"}
          </span>
        </div>

        {/* Right Side: Developer & Support Credit */}
        <div className="flex items-center gap-x-2.5 sm:gap-x-3 shrink-0 whitespace-nowrap text-xs">
          <div className="flex items-center gap-1">
            <span className="opacity-70">
              {language === "bn" ? "ডেভেলপমেন্ট:" : "Engineered by:"}
            </span>
            <strong
              className={`font-semibold ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}
            >
              PJC Automation
            </strong>
          </div>

          <span className="opacity-30 hidden sm:inline">|</span>

          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3 opacity-60 shrink-0" />
            <a
              href="tel:+8801820302571"
              className={`hover:underline font-mono text-xs ${isCustom ? "text-amber-300" : isDark ? "text-slate-200" : "text-slate-800"}`}
              title={
                language === "bn"
                  ? "সহায়তার জন্য কল করুন"
                  : "Call for Technical Support"
              }
            >
              +8801820302571
            </a>
          </div>

          <span className="opacity-30 hidden lg:inline">|</span>

          <div className="hidden lg:flex items-center gap-1 opacity-75 text-xs">
            <MapPin className="w-3 h-3 opacity-60 shrink-0" />
            <span>Rangamati, Bangladesh</span>
          </div>

          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className={`ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium border transition ${
                isCustom
                  ? "border-[#4c3b7a] bg-[#221a42] hover:bg-[#2e2358] text-amber-300"
                  : isDark
                    ? "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
                    : "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
              title={
                language === "bn"
                  ? "সিস্টেম ও ডেভেলপার পরিচিতি"
                  : "System & Developer Details"
              }
            >
              <Info className="w-3 h-3" />
              <span>{language === "bn" ? "পরিচিতি" : "About"}</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
