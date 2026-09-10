import React from "react";
import { 
  Code2, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Globe, 
  Mail, 
  Cpu, 
  Award, 
  Server, 
  Layers, 
  Clock, 
  CheckCircle2 
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface DeveloperProfileProps {
  variant?: "full" | "card" | "compact";
}

export function DeveloperProfile({ variant = "full" }: DeveloperProfileProps) {
  const { language } = useLanguage();
  const { theme, isCustom, isOcean } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`rounded-2xl border transition-all ${
      isCustom
        ? "bg-[#181230] border-[#382b61] text-purple-100 shadow-lg"
        : isOcean
        ? "bg-sky-950/70 border-sky-800/80 text-sky-100 shadow-md"
        : isDark
        ? "bg-slate-900 border-slate-800 text-slate-100 shadow-md"
        : "bg-white border-slate-200 text-slate-900 shadow-sm"
    }`}>
      {/* Header Banner */}
      <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isCustom
          ? "border-[#2f2252] bg-gradient-to-r from-[#20173e] to-[#2b1f54]"
          : isOcean
          ? "border-sky-800 bg-gradient-to-r from-sky-950 to-sky-900/60"
          : isDark
          ? "border-slate-800 bg-gradient-to-r from-slate-900 to-slate-850"
          : "border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/40"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md shrink-0 ${
            isCustom
              ? "bg-gradient-to-tr from-purple-700 to-amber-500 text-white"
              : isOcean
              ? "bg-gradient-to-tr from-sky-600 to-cyan-500 text-white"
              : isDark
              ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white"
              : "bg-gradient-to-tr from-emerald-600 to-teal-600 text-white"
          }`}>
            PJC
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg tracking-tight">PJC Automation</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border ${
                isCustom
                  ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                  : isOcean
                  ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                  : isDark
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                {language === "bn" ? "ভেরিফায়েড সফটওয়্যার ভেন্ডর" : "Verified Software Vendor"}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isCustom ? "text-purple-300/80" : isOcean ? "text-sky-300/80" : isDark ? "text-slate-400" : "text-slate-500"}`}>
              {language === "bn" 
                ? "এন্টারপ্রাইজ গভর্নেন্স, আর্থিক অটোমেশন ও ক্লাউড সফটওয়্যার সলিউশনস" 
                : "Enterprise Governance, Financial Automation & Cloud Software Systems"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border ${
            isCustom
              ? "bg-[#251b47] border-[#44337a] text-purple-200"
              : isOcean
              ? "bg-sky-900/60 border-sky-700 text-sky-200"
              : isDark
              ? "bg-slate-800 border-slate-700 text-slate-300"
              : "bg-white border-slate-200 text-slate-700"
          }`}>
            v2.5.4 LTS • 2026 Edition
          </span>
        </div>
      </div>

      {/* Main Grid Info */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Support & Contact */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isCustom
            ? "bg-[#1f173d] border-[#382b61]"
            : isOcean
            ? "bg-sky-900/30 border-sky-800/60"
            : isDark
            ? "bg-slate-850 border-slate-800"
            : "bg-slate-50/70 border-slate-200/80"
        }`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3">
              <Phone className={`w-4 h-4 ${isCustom ? "text-amber-400" : isOcean ? "text-sky-400" : "text-emerald-500"}`} />
              <span>{language === "bn" ? "কারিগরি সহায়তা ও হটলাইন" : "Technical Support SLA"}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="opacity-70">{language === "bn" ? "জরুরি হটলাইন:" : "Helpline:"}</span>
                <a 
                  href="tel:+8801820302571" 
                  className={`font-mono font-bold hover:underline ${isCustom ? "text-amber-300" : isOcean ? "text-sky-300" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  +8801820302571
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">{language === "bn" ? "ইমেইল:" : "Support Email:"}</span>
                <span className="font-mono text-xs opacity-90">support@pjcautomation.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">{language === "bn" ? "সহায়তা সময়:" : "Availability:"}</span>
                <span className="font-medium">{language === "bn" ? "২৪/৭ জরুরি সরকারি সেবা" : "24/7 GovTech Priority SLA"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Development HQ */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isCustom
            ? "bg-[#1f173d] border-[#382b61]"
            : isOcean
            ? "bg-sky-900/30 border-sky-800/60"
            : isDark
            ? "bg-slate-850 border-slate-800"
            : "bg-slate-50/70 border-slate-200/80"
        }`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3">
              <MapPin className={`w-4 h-4 ${isCustom ? "text-amber-400" : isOcean ? "text-sky-400" : "text-emerald-500"}`} />
              <span>{language === "bn" ? "প্রকৌশল ও গবেষণা কেন্দ্র" : "Engineering & Operations HQ"}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="opacity-70">{language === "bn" ? "অবস্থান:" : "Location:"}</span>
                <span className="font-semibold text-right">Rangamati Hill Tracts, Chattogram, Bangladesh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">{language === "bn" ? "সেবা অঞ্চল:" : "Coverage:"}</span>
                <span className="font-medium">{language === "bn" ? "সমগ্র বাংলাদেশ (সকল সরকারি দপ্তর)" : "All Government Administrative Offices"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture & Compliance */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between md:col-span-2 lg:col-span-1 ${
          isCustom
            ? "bg-[#1f173d] border-[#382b61]"
            : isOcean
            ? "bg-sky-900/30 border-sky-800/60"
            : isDark
            ? "bg-slate-850 border-slate-800"
            : "bg-slate-50/70 border-slate-200/80"
        }`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className={`w-4 h-4 ${isCustom ? "text-amber-400" : isOcean ? "text-sky-400" : "text-emerald-500"}`} />
              <span>{language === "bn" ? "নিরাপত্তা ও স্ট্যান্ডার্ডস" : "Security & Governance"}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="opacity-70">{language === "bn" ? "ডাটাবেজ ও ক্লাউড:" : "Database Engine:"}</span>
                <span className="font-mono text-xs font-semibold">Google Apps Script & Cloud SQL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">{language === "bn" ? "নিরাপত্তা আর্কিটেকচার:" : "Security:"}</span>
                <span className="font-medium">{language === "bn" ? "রোল-বেজড অ্যাক্সেস কন্ট্রোল (RBAC)" : "Role-Based Access Control (RBAC)"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">{language === "bn" ? "অডিট ট্রেইল:" : "Audit Log:"}</span>
                <span className="font-medium">{language === "bn" ? "সম্পূর্ণ ইমিউটেবল ট্র্যাকিং" : "Immutable Action Trail"}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer System Specs Strip */}
      <div className={`px-6 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs opacity-80 ${
        isCustom ? "border-[#2b1f4d] bg-[#140f29]" : isOcean ? "border-sky-900 bg-sky-950/90" : isDark ? "border-slate-800 bg-slate-950" : "border-slate-100 bg-slate-50/60"
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>React 18 + TypeScript + Tailwind CSS</span>
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <Layers className="w-3.5 h-3.5" />
            <span>GovTech Architecture v2.5</span>
          </span>
        </div>

        <div className="font-mono text-xs">
          © {new Date().getFullYear()} PJC Automation. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
