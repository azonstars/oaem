import { apiFetch } from "../api";
import React, { useEffect, useState } from "react";
import { Copy, Check, X, FileSpreadsheet, FileCode, Database, HelpCircle, Download } from "lucide-react";
import { useLanguage } from "../i18n";

interface AppsScriptDeployViewProps {
  onClose?: () => void;
}

type TabType = "code" | "setup" | "html" | "guide";

export function AppsScriptDeployView({ onClose }: AppsScriptDeployViewProps = {}) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("code");
  const [codeGs, setCodeGs] = useState("");
  const [setupDb, setSetupDb] = useState("");
  const [indexHtml, setIndexHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch("/api/apps-script-code")
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        setCodeGs(data.codeGs || data.code || "");
        setSetupDb(data.setupDb || "");
        setIndexHtml(data.indexHtml || "");
      })
      .catch(err => console.error(err));
  }, []);

  

  const currentCode = activeTab === "code" ? codeGs : activeTab === "setup" ? setupDb : indexHtml;

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-2xl w-full p-6 border border-slate-700 max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">
              {language === "bn" ? "Google Apps Script সম্পূর্ণ ডেপ্লয়মেন্ট সেন্টার" : "Google Apps Script Ready-to-Deploy Center"}
            </h3>
            <p className="text-xs text-slate-400">
              {language === "bn" ? "Google Sheets ডাটাবেস ও ড্রাইভের সাথে সরাসরি সংযুক্ত ওয়েব অ্যাপ" : "Standalone Web App connected directly with Google Sheets & Drive"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {/* Tab Navigation */}
        <div className="flex gap-2 pt-4 pb-2 border-b border-slate-800 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("code")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === "code" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Code.gs (Backend)
          </button>
          <button
            onClick={() => setActiveTab("setup")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === "setup" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" /> SetupDatabase.gs
          </button>
          <button
            onClick={() => setActiveTab("html")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === "html" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Index.html (Frontend)
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === "guide" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {language === "bn" ? "ডেপ্লয়মেন্ট গাইড" : "Deployment Guide"}
          </button>
        </div>

        {/* Content Area */}
        <div className="py-4 overflow-y-auto flex-1 font-mono text-xs">
          {activeTab === "guide" ? (
            <div className="font-sans text-xs space-y-4 text-slate-200 leading-relaxed p-2">
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  ১. Google Sheets ডাটাবেস প্রস্তুতি (Google Sheets Setup)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>একটি নতুন <strong>Google Sheet</strong> খুলুন এবং নাম দিন <code className="text-emerald-300">Office_Allocation_Expense_DB</code>।</li>
                  <li>মেনু থেকে <strong>Extensions &gt; Apps Script</strong> এ ক্লিক করুন।</li>
                  <li><strong>SetupDatabase.gs</strong> ফাইলের কোড পেস্ট করে <code className="text-emerald-300">setupDatabase()</code> ফাংশনটি রান করুন। এটি স্বয়ংক্রিয়ভাবে ১০টি শিট (Settings, FinancialYears, Offices, Categories, Users, Allocations, Expenses, NoteSheets, NoteTemplates, AuditLogs) এবং গুগল ড্রাইভে PDF ফোল্ডার তৈরি করবে।</li>
                </ol>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  ২. Apps Script কোড সংযোজন (Script Files Setup)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Apps Script এডিটর-এ <strong>Code.gs</strong> ফাইলে আমাদের <code className="text-emerald-300">Code.gs</code> কোডটি পেস্ট করুন।</li>
                  <li>+ বাটনে ক্লিক করে একটি নতুন <strong>HTML</strong> ফাইল তৈরি করুন এবং ফাইলের নাম দিন <code className="text-emerald-300">Index</code> (বা Index.html)।</li>
                  <li>আমাদের <code className="text-emerald-300">Index.html</code> কোডটি সেখানে পেস্ট করুন।</li>
                </ol>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  ৩. Web App ডেপ্লয়মেন্ট (Deploy as Web App)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>উপরে ডানদিকের <strong>Deploy &gt; New deployment</strong> বাটনে ক্লিক করুন।</li>
                  <li>গিয়ার আইকন থেকে <strong>Web app</strong> নির্বাচন করুন।</li>
                  <li><strong>Execute as:</strong> <code className="text-emerald-300">Me (your-email)</code> নির্বাচন করুন।</li>
                  <li><strong>Who has access:</strong> <code className="text-emerald-300">Anyone</code> অথবা <code className="text-emerald-300">Anyone within organization</code> দিন।</li>
                  <li><strong>Deploy</strong> চাপুন এবং প্রাপ্ত <strong>Web App URL</strong> ব্রাউজারে ওপেন করুন।</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  onClick={() => handleDownload(activeTab === "code" ? "Code.gs" : activeTab === "setup" ? "SetupDatabase.gs" : "Index.html", currentCode)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs border border-slate-700 transition"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  {language === "bn" ? "ডাউনলোড" : "Download"}
                </button>
                <button
                  onClick={() => handleCopy(currentCode)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs border border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? (language === "bn" ? "কপি সম্পন্ন!" : "Copied!") : (language === "bn" ? "কোড কপি করুন" : "Copy Code")}
                </button>
              </div>

              <pre className="bg-slate-950 p-4 pt-12 rounded-xl border border-slate-800 text-emerald-300 overflow-x-auto leading-relaxed max-h-[50vh]">
                {currentCode || "Loading code..."}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400 shrink-0">
          <span>
            {language === "bn"
              ? "সিস্টেম রুল: Opening Balance + Allocation + Additional Allocation ± Adjustment - Expense = Available Balance"
              : "System Rule: Opening + Allocation + Additional ± Adjustment - Expense = Available Balance"}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition text-center"
            >
              {language === "bn" ? "সম্পন্ন" : "Close"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
