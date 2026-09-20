import React, { useState } from "react";
import {
  FlowBoardTool,
  User,
  SystemSettings,
  Office,
  FinancialYear,
  canAccessTool,
} from "../types";
import { useLanguage } from "../i18n";
import { ToolDashboardV5 } from "./tools/ToolDashboardV5";
import { StockProTool } from "./tools/StockProTool";
import { ConferenceNoteTool } from "./tools/ConferenceNoteTool";
import { MultiItemBillTool } from "./tools/MultiItemBillTool";
import { StationeryBillTool } from "./tools/StationeryBillTool";
import { MiscellaneousView } from "./MiscellaneousView";
import OfficeMonitoringIntegratedTool from "./officeMonitoring/OfficeMonitoringIntegratedTool";
import {
  ArrowLeft,
  Layers,
  Save,
  CheckCircle2,
  Activity,
  FileText,
  Calculator,
  Lock,
} from "lucide-react";

interface IndependentToolRunnerProps {
  tool: FlowBoardTool;
  currentUser: User;
  systemSettings?: SystemSettings | null;
  offices?: Office[];
  financialYears?: FinancialYear[];
  selectedFY?: string;
  currentTab?: string;
  onBackToHub: () => void;
}

export function IndependentToolRunner({
  tool,
  currentUser,
  systemSettings = null,
  offices,
  financialYears,
  selectedFY,
  currentTab,
  onBackToHub,
}: IndependentToolRunnerProps) {
  const { language } = useLanguage();

  // RBAC Access Guard: Check if user has permission to access this tool
  if (!canAccessTool(currentUser, tool.id)) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {language === "bn" ? "প্রবেশাধিকার সংরক্ষিত" : "Access Restricted"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === "bn"
                ? `আপনার আইডির জন্য "${tool.nameBn || tool.name}" মডিউলটির এক্সেস সেন্ট্রাল সেটিংস থেকে সীমাবদ্ধ করা রয়েছে। প্রয়োজনে সিস্টেম এডমিনের সাথে যোগাযোগ করুন।`
                : `Your account does not have permission to open the "${tool.name}" module. Please contact your system administrator.`}
            </p>
          </div>
          <button
            onClick={onBackToHub}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold text-xs transition inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === "bn" ? "ফ্লোবোর্ড হাবে ফিরুন" : "Back to FlowBoard Hub"}</span>
          </button>
        </div>
      </div>
    );
  }

  // If this is the StockPro / Tool Dashboard V5 suite, render the dedicated high-fidelity tool suite
  if (tool.id === "stockpro-dashboard") {
    return (
      <div className="w-full min-h-full flex-1">
        <ToolDashboardV5
          currentUser={currentUser}
          systemSettings={systemSettings}
          offices={offices}
          financialYears={financialYears}
          selectedFY={selectedFY}
          initialTab={currentTab}
          onBackToFlowBoard={onBackToHub}
        />
      </div>
    );
  }

  // If StockPro inventory tool is requested directly
  if (tool.id === "stockpro") {
    return (
      <div className="w-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950">
        <StockProTool
          currentUser={currentUser}
          systemSettings={systemSettings}
          offices={offices}
          financialYears={financialYears}
          selectedFY={selectedFY}
          onBack={onBackToHub}
        />
      </div>
    );
  }

  // If Conference & Meeting Note Generator is requested directly
  if (tool.id === "conference-note") {
    return (
      <div className="w-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950">
        <ConferenceNoteTool
          currentUser={currentUser}
          systemSettings={systemSettings}
          offices={offices}
          financialYears={financialYears}
          selectedFY={selectedFY}
          onBack={onBackToHub}
        />
      </div>
    );
  }

  // If Multi-Item Bill & CS Generator is requested directly
  if (tool.id === "multi-item-bill") {
    return (
      <div className="w-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950">
        <MultiItemBillTool
          currentUser={currentUser}
          systemSettings={systemSettings}
          offices={offices}
          financialYears={financialYears}
          selectedFY={selectedFY}
          onBack={onBackToHub}
        />
      </div>
    );
  }

  // If Printed Stationery & Work Order Challan is requested directly
  if (tool.id === "stationery-bill") {
    return (
      <div className="w-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950">
        <StationeryBillTool
          currentUser={currentUser}
          systemSettings={systemSettings}
          offices={offices}
          financialYears={financialYears}
          selectedFY={selectedFY}
          onBack={onBackToHub}
        />
      </div>
    );
  }

  // If Miscellaneous View / Form Overlay Studio is requested directly
  if (tool.id === "miscellaneous") {
    return (
      <div className="w-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHub}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "ফ্লোবোর্ড হাবে ফিরুন" : "Back to FlowBoard"}</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:border-slate-700 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {language === "bn" ? "বিবিধ ও ফর্ম ওভারলে স্টুডিও" : "Miscellaneous & Form Studio"}
              </span>
            </div>
          </div>
        </div>
        <MiscellaneousView
          currentUser={currentUser}
          language={language}
        />
      </div>
    );
  }

  // If Office Monitoring Management System is requested
  if (tool.id === "office-monitoring") {
    return (
      <div className="w-full min-h-full flex-1">
        <OfficeMonitoringIntegratedTool
          currentUser={currentUser}
          systemSettings={systemSettings}
          offices={offices || []}
          financialYears={financialYears}
          selectedFY={selectedFY}
          onBack={onBackToHub}
        />
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<"workspace" | "notes" | "calculator" | "info">("workspace");
  const [workspaceNotes, setWorkspaceNotes] = useState<string>(() => {
    return localStorage.getItem(`flowboard_tool_notes_${tool.id}`) || "";
  });
  const [savedStatus, setSavedStatus] = useState(false);

  // Simple integrated calculator / quick computation state
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState<string | null>(null);

  const handleSaveNotes = () => {
    localStorage.setItem(`flowboard_tool_notes_${tool.id}`, workspaceNotes);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleCompute = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Safe sanitized arithmetic evaluator for basic math
      const sanitized = calcInput.replace(/[^0-9+\-*/().\s]/g, "");
      if (!sanitized) return;
      const res = Function(`'use strict'; return (${sanitized})`)();
      setCalcResult(String(res));
    } catch {
      setCalcResult("Error");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Tool Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToHub}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 text-xs font-semibold"
            title="Back to FlowBoard Hub"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">FlowBoard Hub</span>
          </button>

          <div
            className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${
              tool.gradient || "from-blue-600 to-indigo-600"
            } text-white flex items-center justify-center p-2 shadow-md shrink-0`}
          >
            <Layers className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "bn" && tool.nameBn ? tool.nameBn : tool.name}
              </h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {tool.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === "bn" && tool.descriptionBn ? tool.descriptionBn : tool.description}
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "workspace"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "notes"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Notes & Logs
          </button>
          <button
            onClick={() => setActiveTab("calculator")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "calculator"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Calculator
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "info"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Module Info
          </button>
        </div>
      </div>

      {/* Main Tab Area */}
      {activeTab === "workspace" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === "bn" ? "টুল ওয়ার্কস্পেস কনসোল" : "Independent Workspace Environment"}
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">Isolated Context ID: {tool.id}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "এই মডিউলটি FlowBoard-এ সম্পূর্ণ স্বাধীনভাবে কার্যকর। এর সকল ডাটা, স্টেট ও কার্যপদ্ধতি অন্যান্য সিস্টেমের হস্তক্ষেপ ছাড়াই নিরাপদে সংরক্ষিত হয়।"
                  : "This module executes in an independent isolated workspace within FlowBoard. Operations, state, and workflows inside this tool run independently without interference with other tools."}
              </p>

              {/* Dynamic Action Panel */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === "bn" ? "দ্রুত একশন টাস্ক:" : "Workspace Action Commands:"}
                  </span>
                  <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white">Category</div>
                    <div className="text-slate-500 uppercase text-[11px]">{tool.category}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white">Assigned User</div>
                    <div className="text-slate-500 text-[11px]">{currentUser.name} ({currentUser.role})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Quick Notes */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tool Scratchpad</h4>
                </div>
                {savedStatus && (
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>

              <textarea
                rows={6}
                value={workspaceNotes}
                onChange={(e) => setWorkspaceNotes(e.target.value)}
                placeholder="Write temporary notes, instructions, or calculation logs for this tool..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 transition text-slate-800 dark:text-slate-200"
              />

              <button
                onClick={handleSaveNotes}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Notes Locally</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>{language === "bn" ? "নোট ও কার্যবিবরণী" : "Persistent Notes & Session Logs"}</span>
            </h3>
            <button
              onClick={handleSaveNotes}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedStatus ? "সংরক্ষিত হয়েছে!" : "সংরক্ষণ করুন"}</span>
            </button>
          </div>

          <textarea
            rows={12}
            value={workspaceNotes}
            onChange={(e) => setWorkspaceNotes(e.target.value)}
            placeholder="Type comprehensive notes or session documentation here..."
            className="w-full p-4 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 transition text-slate-800 dark:text-slate-200 leading-relaxed"
          />
        </div>
      )}

      {activeTab === "calculator" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Calculator className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "bn" ? "দ্রুত গাণিতিক ও ভ্যাট-ট্যাক্স ক্যালকুলেটর" : "Quick Calculation Assistant"}
              </h3>
              <p className="text-[11px] text-slate-400">
                Perform instant budget & rate formulas directly in this tool.
              </p>
            </div>
          </div>

          <form onSubmit={handleCompute} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expression / সূত্র
              </label>
              <input
                type="text"
                value={calcInput}
                onChange={(e) => setCalcInput(e.target.value)}
                placeholder="e.g. 50000 * 0.15 + 2500"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition shadow-md"
            >
              Compute Result
            </button>
          </form>

          {calcResult !== null && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center">
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold uppercase">Computed Value</div>
              <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-200 mt-1">
                {calcResult}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "info" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Module Specifications</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Module ID</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tool.id}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Version</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">v{tool.version}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Status</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{tool.status}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-1">Created By</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{tool.createdBy || "System"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
