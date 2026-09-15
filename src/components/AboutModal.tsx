import React from "react";
import { X, Code, Phone, MapPin, ShieldCheck, Layers } from "lucide-react";
import { SystemSettings } from "../types";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemSettings: SystemSettings | null;
}

export function AboutModal({
  isOpen,
  onClose,
  systemSettings,
}: AboutModalProps) {
  const { language } = useLanguage();
  const { theme, isCustom } = useTheme();

  if (!isOpen) return null;

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
      <div
        className={`rounded-2xl max-w-lg w-full p-6 shadow-2xl border flex flex-col relative animate-in fade-in zoom-in-95 duration-150 ${
          isCustom
            ? "bg-[#18132e] text-purple-100 border-[#3b2d61]"
            : isDark
              ? "bg-slate-900 text-slate-100 border-slate-700"
              : "bg-white text-slate-900 border-slate-200"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${
            isCustom
              ? "text-purple-300 hover:text-white hover:bg-[#281e4d]"
              : isDark
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div
          className={`flex items-center gap-3.5 pb-4 border-b mb-5 ${
            isCustom
              ? "border-[#322652]"
              : isDark
                ? "border-slate-800"
                : "border-slate-200"
          }`}
        >
          {systemSettings?.logoUrl ? (
            <img
              src={systemSettings.logoUrl}
              alt="Institution Logo"
              className="w-12 h-12 rounded-xl object-contain border border-slate-200 dark:border-slate-700 p-1 bg-white"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow ${
                isCustom
                  ? "bg-gradient-to-tr from-purple-700 to-amber-600"
                  : "bg-gradient-to-tr from-emerald-600 to-teal-700"
              }`}
            >
              {language === "bn" ? "বাং" : "GOB"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base truncate">
              {systemSettings?.webAppName ||
                (language === "bn"
                  ? "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম"
                  : "Office Allocation & Expense System")}
            </h3>
            <p
              className={`text-xs font-medium ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-emerald-700"}`}
            >
              {systemSettings?.institutionName ||
                (language === "bn"
                  ? "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"
                  : "Government of Bangladesh")}
            </p>
          </div>
        </div>

        {/* System Details */}
        <div className="space-y-4 text-xs leading-relaxed">
          {/* Overview */}
          <div
            className={`p-3.5 rounded-xl border ${
              isCustom
                ? "bg-[#211940] border-[#3e2f69] text-purple-200"
                : isDark
                  ? "bg-slate-800/60 border-slate-700 text-slate-300"
                  : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="font-semibold mb-1 flex items-center gap-1.5 text-sm">
              <ShieldCheck
                className={`w-4 h-4 ${isCustom ? "text-amber-400" : "text-emerald-500"}`}
              />
              <span
                className={
                  isCustom
                    ? "text-purple-100"
                    : isDark
                      ? "text-slate-100"
                      : "text-slate-900"
                }
              >
                {language === "bn" ? "সিস্টেম সারসংক্ষেপ" : "System Overview"}
              </span>
            </div>
            <p className="text-xs opacity-90">
              {systemSettings?.description ||
                (language === "bn"
                  ? "সরকারি দপ্তর ও আঞ্চলিক শাখা কার্যালয়সমূহের বাজেট বরাদ্দ, ব্যয় মঞ্জুরি, ভাউচার ব্যবস্থাপনা, স্বয়ংক্রিয় নোট শিট ও আর্থিক প্রতিবেদন প্রস্তুতকরণের সমন্বিত প্ল্যাটফর্ম।"
                  : "Integrated platform for office budget allocations, expense tracking, voucher management, automated official note sheets, and multi-office financial reports.")}
            </p>
          </div>

          {/* Developer & Technical Support Card */}
          <div
            className={`p-4 rounded-xl border ${
              isCustom
                ? "bg-[#241a45] border-[#4b397a]"
                : isDark
                  ? "bg-slate-800/80 border-slate-700"
                  : "bg-emerald-50/80 border-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={`p-1.5 rounded-lg text-white shadow-sm ${
                  isCustom
                    ? "bg-purple-700"
                    : isDark
                      ? "bg-emerald-700"
                      : "bg-emerald-600"
                }`}
              >
                <Code className="w-4 h-4" />
              </div>
              <div>
                <h4
                  className={`font-bold text-xs ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}
                >
                  {language === "bn"
                    ? "ডেভেলপার ও কারিগরি সহায়তা"
                    : "Developer & Technical Support"}
                </h4>
                <p className="text-xs opacity-70">
                  {language === "bn"
                    ? "সফটওয়্যার উন্নয়ন, বাস্তবায়ন ও রক্ষণাবেক্ষণ"
                    : "Software Engineering, Implementation & Maintenance"}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div
                className={`flex items-center justify-between border-b pb-1.5 ${
                  isCustom
                    ? "border-[#36275d]"
                    : isDark
                      ? "border-slate-700/60"
                      : "border-emerald-200/80"
                }`}
              >
                <span className="opacity-75">
                  {language === "bn" ? "প্রকৌশল দল:" : "Engineering:"}
                </span>
                <span
                  className={`font-bold ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-emerald-800"}`}
                >
                  PJC Automation
                </span>
              </div>

              <div
                className={`flex items-center justify-between border-b pb-1.5 ${
                  isCustom
                    ? "border-[#36275d]"
                    : isDark
                      ? "border-slate-700/60"
                      : "border-emerald-200/80"
                }`}
              >
                <span className="opacity-75 flex items-center gap-1">
                  <Phone className="w-3 h-3 opacity-70" />
                  {language === "bn" ? "হেল্পলাইন:" : "Support Contact:"}
                </span>
                <a
                  href="tel:+8801820302571"
                  className={`font-mono font-bold hover:underline ${
                    isCustom
                      ? "text-amber-300"
                      : isDark
                        ? "text-sky-400"
                        : "text-emerald-700"
                  }`}
                >
                  +8801820302571
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="opacity-75 flex items-center gap-1">
                  <MapPin className="w-3 h-3 opacity-70" />
                  {language === "bn" ? "অবস্থান:" : "Location:"}
                </span>
                <span className="font-medium">
                  Rangamati, Chattogram, Bangladesh
                </span>
              </div>
            </div>
          </div>

          {/* Architecture Badge */}
          <div className="flex items-center justify-between px-1 pt-1 text-xs opacity-70">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 opacity-70" />
              <span>Full-Stack Cloud & Sheet Sync Ready</span>
            </span>
            <span className="font-mono font-medium">v2.5.0 Production</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`mt-5 pt-3 border-t flex justify-end ${
            isCustom
              ? "border-[#322652]"
              : isDark
                ? "border-slate-800"
                : "border-slate-200"
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow transition ${
              isCustom
                ? "bg-purple-700 hover:bg-purple-600 text-white"
                : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {language === "bn" ? "বন্ধ করুন" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
