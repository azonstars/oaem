import React, { Suspense, lazy, useEffect, useState } from "react";
import { safeStorage } from "../utils/storage";
import { apiFetch } from "../api";
import {
  FlowBoardTool,
  User,
  SystemSettings,
  Office,
  FinancialYear,
  canAccessTool,
} from "../types";
import { useLanguage } from "../i18n";
import {
  ArrowLeft,
  Layers,
  Save,
  CheckCircle2,
  Activity,
  FileText,
  Calculator,
  Lock,
  AlertTriangle,
} from "lucide-react";

const ToolDashboardV5 = lazy(() =>
  import("./tools/ToolDashboardV5").then((m) => ({ default: m.ToolDashboardV5 })),
);
const StockProTool = lazy(() =>
  import("./tools/StockProTool").then((m) => ({ default: m.StockProTool })),
);
const ConferenceNoteTool = lazy(() =>
  import("./tools/ConferenceNoteTool").then((m) => ({ default: m.ConferenceNoteTool })),
);
const MultiItemBillTool = lazy(() =>
  import("./tools/MultiItemBillTool").then((m) => ({ default: m.MultiItemBillTool })),
);
const StationeryBillTool = lazy(() =>
  import("./tools/StationeryBillTool").then((m) => ({ default: m.StationeryBillTool })),
);
const TravelBillTool = lazy(() =>
  import("./tools/TravelBillTool").then((m) => ({ default: m.TravelBillTool })),
);
const MiscellaneousView = lazy(() =>
  import("./MiscellaneousView").then((m) => ({ default: m.MiscellaneousView })),
);
const OfficeMonitoringIntegratedTool = lazy(
  () => import("./officeMonitoring/OfficeMonitoringIntegratedTool"),
);

/**
 * Safe recursive-descent arithmetic parser supporting +, -, *, /, %, parentheses, and decimals.
 */
function safeEvaluateMath(expr: string): number {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      let dotCount = 0;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === ".") dotCount++;
        if (dotCount > 1) throw new Error("Invalid number");
        num += expr[i++];
      }
      tokens.push(num);
      continue;
    }
    if ("+-*/()%".includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    throw new Error("Unsupported character");
  }
  if (tokens.length === 0) throw new Error("Empty expression");

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseExpression = (): number => {
    let val = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const rhs = parseTerm();
      val = op === "+" ? val + rhs : val - rhs;
    }
    return val;
  };

  const parseTerm = (): number => {
    let val = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = consume();
      const rhs = parseFactor();
      if (op === "*") val *= rhs;
      else if (op === "/") {
        if (rhs === 0) throw new Error("Division by zero");
        val /= rhs;
      } else {
        if (rhs === 0) throw new Error("Division by zero");
        val %= rhs;
      }
    }
    return val;
  };

  const parseFactor = (): number => {
    const t = peek();
    if (t === "+") {
      consume();
      return parseFactor();
    }
    if (t === "-") {
      consume();
      return -parseFactor();
    }
    if (t === "(") {
      consume();
      const val = parseExpression();
      if (consume() !== ")") throw new Error("Unmatched parenthesis");
      return val;
    }
    const numStr = consume();
    if (!numStr || !/^\d*\.?\d+$/.test(numStr)) {
      throw new Error("Unexpected token");
    }
    return Number(numStr);
  };

  const result = parseExpression();
  if (pos < tokens.length) throw new Error("Unexpected trailing input");
  if (!Number.isFinite(result)) throw new Error("Invalid result");
  return result;
}

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

function ToolLoadingFallback({ language }: { language: string }) {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {language === "bn" ? "টুল লোড হচ্ছে..." : "Loading workspace tool..."}
        </p>
      </div>
    </div>
  );
}

function CustomToolWorkspace({
  tool,
  currentUser,
  onBackToHub,
}: {
  tool: FlowBoardTool;
  currentUser: User;
  onBackToHub: () => void;
}) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"workspace" | "notes" | "calculator" | "info">("workspace");
  const localNotesKey = `flowboard_tool_notes_${tool.id}`;
  const dbNoteDocId = `custom-note-${tool.id}`;

  const [workspaceNotes, setWorkspaceNotes] = useState<string>(() => {
    return safeStorage.getItem(localNotesKey) || "";
  });
  const [savedStatus, setSavedStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState<string | null>(null);

  const upsertCustomNoteToDb = async (content: string) => {
    const payload = {
      id: dbNoteDocId,
      toolId: tool.id,
      toolType: "custom_tool_notes",
      title: `${tool.nameBn || tool.name} - Notes`,
      docDate: new Date().toISOString().split("T")[0],
      officeId: currentUser?.officeId || "off-ho",
      createdBy: currentUser?.name || currentUser?.userId || "System",
      content,
    };

    const putRes = await apiFetch(`/api/tooldocuments/${encodeURIComponent(dbNoteDocId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (putRes.ok) return await putRes.json();

    if (putRes.status === 404) {
      const postRes = await apiFetch("/api/tooldocuments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (postRes.ok) return await postRes.json();
      const postErr = await postRes.json().catch(() => ({}));
      throw new Error(postErr?.error || "Failed to save note to database");
    }
    const putErr = await putRes.json().catch(() => ({}));
    throw new Error(putErr?.error || "Failed to update note in database");
  };

  useEffect(() => {
    let active = true;
    const loadNotes = async () => {
      try {
        const res = await apiFetch("/api/tooldocuments?toolType=custom_tool_notes");
        if (!res.ok) return;
        const docs = await res.json();
        if (!active || !Array.isArray(docs)) return;
        const dbDoc = docs.find((d: any) => d.id === dbNoteDocId || d.toolId === tool.id);
        const localSaved = safeStorage.getItem(localNotesKey) || "";
        if (dbDoc && typeof dbDoc.content === "string") {
          setWorkspaceNotes(dbDoc.content);
          safeStorage.setItem(localNotesKey, dbDoc.content);
        } else if (localSaved.trim()) {
          // Zero-data-loss additive migration of local notes to SQLite
          await upsertCustomNoteToDb(localSaved).catch(() => {});
        }
      } catch (_e) {
        // Keep local cache intact
      }
    };
    loadNotes();
    return () => {
      active = false;
    };
  }, [tool.id]);

  const handleSaveNotes = async () => {
    safeStorage.setItem(localNotesKey, workspaceNotes);
    setSavedStatus("saving");
    setSaveError(null);
    try {
      await upsertCustomNoteToDb(workspaceNotes);
      setSavedStatus("saved");
      setTimeout(() => setSavedStatus("idle"), 2500);
    } catch (err: any) {
      setSavedStatus("error");
      setSaveError(
        err?.message ||
          (language === "bn"
            ? "সার্ভারে সিঙ্ক ব্যর্থ হয়েছে; লোকাল ক্যাশে সংরক্ষিত আছে।"
            : "Server sync failed; saved in local cache."),
      );
    }
  };

  const handleCompute = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = safeEvaluateMath(calcInput);
      setCalcResult(String(Number(res.toFixed(6))));
    } catch {
      setCalcResult("Error");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto p-4 sm:p-6">
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
                  ? "এই মডিউলটি FlowBoard-এ সম্পূর্ণ স্বাধীনভাবে কার্যকর। এর সকল ডাটা, স্টেট ও নোট সার্ভারে নিরাপদে সংরক্ষিত হয়।"
                  : "This module executes in an independent isolated workspace within FlowBoard. Operations, state, and notes sync securely to the server database."}
              </p>

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
                    <div className="text-slate-500 text-[11px]">
                      {currentUser.name} ({currentUser.role})
                    </div>
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
                {savedStatus === "saved" && (
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> {language === "bn" ? "সংরক্ষিত" : "Synced"}
                  </span>
                )}
                {savedStatus === "error" && (
                  <span className="text-[10px] text-amber-500 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3 h-3" /> {language === "bn" ? "লোকাল ক্যাশ" : "Local Only"}
                  </span>
                )}
              </div>

              <textarea
                rows={6}
                value={workspaceNotes}
                onChange={(e) => setWorkspaceNotes(e.target.value)}
                placeholder="Write notes, instructions, or calculation logs for this tool..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 transition text-slate-800 dark:text-slate-200"
              />

              {saveError && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{saveError}</p>
              )}

              <button
                onClick={handleSaveNotes}
                disabled={savedStatus === "saving"}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {savedStatus === "saving"
                    ? language === "bn"
                      ? "সংরক্ষণ হচ্ছে..."
                      : "Saving..."
                    : language === "bn"
                      ? "ডাটাবেজে সংরক্ষণ করুন"
                      : "Save Notes to Database"}
                </span>
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
              disabled={savedStatus === "saving"}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {savedStatus === "saved"
                  ? language === "bn"
                    ? "সংরক্ষিত হয়েছে!"
                    : "Saved!"
                  : language === "bn"
                    ? "সংরক্ষণ করুন"
                    : "Save"}
              </span>
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

  return (
    <Suspense fallback={<ToolLoadingFallback language={language} />}>
      {tool.id === "stockpro-dashboard" ? (
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
      ) : tool.id === "stockpro" ? (
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
      ) : tool.id === "conference-note" ? (
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
      ) : tool.id === "multi-item-bill" ? (
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
      ) : tool.id === "stationery-bill" ? (
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
      ) : tool.id === "travel-bill" ? (
        <div className="w-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950">
          <TravelBillTool
            currentUser={currentUser}
            systemSettings={systemSettings}
            offices={offices}
            financialYears={financialYears}
            selectedFY={selectedFY}
            onBack={onBackToHub}
          />
        </div>
      ) : tool.id === "miscellaneous" ? (
        <div className="w-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
          <MiscellaneousView
            currentUser={currentUser}
            language={language}
            systemSettings={systemSettings}
          />
        </div>
      ) : tool.id === "office-monitoring" ? (
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
      ) : (
        <CustomToolWorkspace tool={tool} currentUser={currentUser} onBackToHub={onBackToHub} />
      )}
    </Suspense>
  );
}
