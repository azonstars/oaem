import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api";
import {
  Database,
  Download,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Table,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Play,
  FileCode2,
  Copy,
  Check,
  Upload,
  FileSpreadsheet,
  Globe,
  Cloud,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../i18n";
import { User } from "../types";

interface DatabaseSettingsTabProps {
  currentUser: User;
}

interface DbStatus {
  engine: string;
  isRemote?: boolean;
  remoteUrl?: string;
  status: string;
  location: string;
  sizeBytes: number;
  sizeFormatted: string;
  tables: Record<string, number>;
}

export function DatabaseSettingsTab({ currentUser }: DatabaseSettingsTabProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isOcean = theme === "ocean";
  const isDark = theme === "dark";

  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(
    null,
  );
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [checkpointing, setCheckpointing] = useState(false);

  const [sqlQuery, setSqlQuery] = useState(
    "SELECT id, name, code, budgetHead FROM Categories LIMIT 5",
  );
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlResults, setSqlResults] = useState<any[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/database/status");
      const data = await res.json();
      if (res.ok) {
        setDbStatus(data);
      } else {
        setError(data.error || "Failed to fetch database status");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDownloadDb = () => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/database/download", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `database-${new Date().toISOString().split("T")[0]}.sqlite`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccessNotice(
          language === "bn"
            ? "SQLite ডাটাবেজ ফাইল ডাউনলোড সম্পন্ন হয়েছে।"
            : "SQLite database downloaded successfully.",
        );
        setTimeout(() => setSuccessNotice(null), 4000);
      })
      .catch((err) => {
        alert("ডাটাবেজ ডাউনলোড করতে সমস্যা হয়েছে: " + err.message);
      });
  };

  const handleExportJson = () => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/database/export-json", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-financial-system-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccessNotice(
          language === "bn"
            ? "JSON ব্যাকআপ ফাইল এক্সপোর্ট সম্পন্ন হয়েছে।"
            : "JSON backup exported successfully.",
        );
        setTimeout(() => setSuccessNotice(null), 4000);
      })
      .catch((err) => {
        alert("JSON এক্সপোর্ট করতে সমস্যা হয়েছে: " + err.message);
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (
      !lower.endsWith(".sqlite") &&
      !lower.endsWith(".db") &&
      !lower.endsWith(".json")
    ) {
      alert(
        language === "bn"
          ? "অনুগ্রহ করে একটি .sqlite অথবা .json ফাইল নির্বাচন করুন।"
          : "Please select a .sqlite or .json file.",
      );
      return;
    }
    setSelectedRestoreFile(file);
    setShowRestoreModal(true);

    e.target.value = "";
  };

  const handleConfirmRestore = async () => {
    if (!selectedRestoreFile) return;
    setRestoring(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await apiFetch("/api/database/restore", {
            method: "POST",
            body: JSON.stringify({
              base64Data,
              fileName: selectedRestoreFile.name,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            setShowRestoreModal(false);
            setSelectedRestoreFile(null);
            setSuccessNotice(
              data.message ||
                (language === "bn"
                  ? "ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে।"
                  : "Database restored successfully."),
            );
            await fetchStatus();
          } else {
            setError(data.error || "রিস্টোর ব্যর্থ হয়েছে।");
          }
        } catch (err: any) {
          setError(err.message || "রিস্টোর প্রসেস করতে ব্যর্থ হয়েছে।");
        } finally {
          setRestoring(false);
        }
      };
      reader.onerror = () => {
        setError("ফাইল পড়তে সমস্যা হয়েছে।");
        setRestoring(false);
      };
      reader.readAsDataURL(selectedRestoreFile);
    } catch (err: any) {
      setError(err.message || "রিস্টোর শুরু করতে ব্যর্থ হয়েছে।");
      setRestoring(false);
    }
  };

  const handleManualCheckpoint = async () => {
    setCheckpointing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/database/checkpoint", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessNotice(
          language === "bn"
            ? "WAL চেকপয়েন্ট সফলভাবে সম্পন্ন হয়েছে। সমস্ত ডাটা মেমোরি থেকে ডিস্কে কমিট হয়েছে।"
            : "WAL Checkpoint executed. All pending writes committed to disk.",
        );
        setTimeout(() => setSuccessNotice(null), 4000);
        await fetchStatus();
      } else {
        setError(data.error || "চেকপয়েন্ট ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setCheckpointing(false);
    }
  };

  const handleExecuteSql = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqlQuery.trim()) return;

    setSqlRunning(true);
    setSqlError(null);
    setSqlResults(null);

    try {
      const res = await apiFetch("/api/database/query", {
        method: "POST",
        body: JSON.stringify({ sql: sqlQuery.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSqlResults(data.rows || []);
      } else {
        setSqlError(data.error || "SQL Execution failed");
      }
    } catch (err: any) {
      setSqlError(err.message || "Error running SQL");
    } finally {
      setSqlRunning(false);
    }
  };

  const roleStr = currentUser?.role as string | undefined;
  const isAdmin =
    roleStr === "Super Admin" ||
    roleStr === "Admin" ||
    roleStr === "Head Office Admin" ||
    roleStr === "HeadOfficeAdmin";

  return (
    <div className="p-6 overflow-y-auto flex-1 max-w-5xl space-y-6">
      {/* Hidden file input for restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".sqlite,.db,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Success Notification */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isOcean
            ? "bg-sky-950/40 border-sky-800 text-sky-100"
            : isDark
              ? "bg-slate-800/60 border-slate-700 text-slate-100"
              : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isOcean
                ? "bg-sky-600/30 text-sky-400"
                : isDark
                  ? "bg-emerald-600/30 text-emerald-400"
                  : "bg-emerald-600 text-white"
            }`}
          >
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">
                {dbStatus?.isRemote
                  ? "ক্লাউড ডাটাবেজ (Turso / LibSQL Cloud)"
                  : language === "bn"
                    ? "SQLite হাই-স্পিড ডাটাবেজ"
                    : "SQLite High-Performance Database"}
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />{" "}
                {dbStatus?.isRemote ? "Cloud Sync Active" : "WAL Mode Active"}
              </span>
            </div>
            <p className="text-xs opacity-75 mt-0.5">
              {language === "bn"
                ? "সিস্টেমের সমস্ত ডাটা নির্ভরযোগ্য, স্থায়ী ও দ্রুতগতির ডাটাবেজে রিয়েল-টাইমে সংরক্ষিত হচ্ছে।"
                : "All system data is securely and natively managed by an ACID-compliant database engine."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition ${
              isOcean
                ? "border-sky-700 hover:bg-sky-900/60"
                : isDark
                  ? "border-slate-600 hover:bg-slate-700"
                  : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            }`}
            title="রিফ্রেশ ডাটাবেজ স্ট্যাটাস"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            {language === "bn" ? "রিফ্রেশ" : "Refresh"}
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleManualCheckpoint}
                disabled={checkpointing}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition ${
                  isOcean
                    ? "border-sky-700 bg-sky-900/40 hover:bg-sky-900/80 text-sky-200"
                    : isDark
                      ? "border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200"
                      : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                }`}
                title="মেমোরির ডাটা তাৎক্ষণিক ডিস্কে পাকাপোক্তভাবে কমিট করুন"
              >
                <HardDrive
                  className={`w-3.5 h-3.5 ${checkpointing ? "animate-spin text-amber-500" : "text-emerald-500"}`}
                />
                {checkpointing
                  ? "কমিট হচ্ছে..."
                  : language === "bn"
                    ? "ডিস্কে সেভ (Checkpoint)"
                    : "Commit WAL"}
              </button>

              <button
                onClick={handleDownloadDb}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow flex items-center gap-1.5 text-white transition ${
                  isOcean
                    ? "bg-sky-600 hover:bg-sky-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
                title="সম্পূর্ণ SQLite বাইনারি ডাটাবেজ ফাইল ডাউনলোড করুন"
              >
                <Download className="w-3.5 h-3.5" />
                {language === "bn"
                  ? "ডাটাবেজ (.sqlite) ডাউনলোড"
                  : "Download SQLite DB"}
              </button>

              <button
                onClick={handleExportJson}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border shadow-sm flex items-center gap-1.5 transition ${
                  isOcean
                    ? "bg-slate-800 border-sky-700 hover:bg-slate-700 text-sky-100"
                    : isDark
                      ? "bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                      : "bg-white border-slate-300 hover:bg-slate-100 text-slate-800"
                }`}
                title="সমস্ত টেবিলের পূর্ণাঙ্গ JSON ব্যাকআপ ডাউনলোড করুন"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-500" />
                {language === "bn" ? "JSON ব্যাকআপ" : "JSON Backup"}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-bold rounded-xl shadow flex items-center gap-1.5 text-white bg-indigo-600 hover:bg-indigo-500 transition"
                title="ব্যাকআপ ফাইল (.sqlite বা .json) থেকে ডাটা রিস্টোর করুন"
              >
                <Upload className="w-3.5 h-3.5" />
                {language === "bn"
                  ? "ডাটাবেজ রিস্টোর / আপলোড"
                  : "Restore Database"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Database Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Engine Card */}
        <div
          className={`p-4 rounded-xl border ${
            isOcean
              ? "bg-slate-900/60 border-sky-900/50"
              : isDark
                ? "bg-slate-800/40 border-slate-700"
                : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold opacity-70 uppercase tracking-wider mb-2">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            {language === "bn" ? "ডাটাবেজ ইঞ্জিন" : "Database Engine"}
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-100">
            {dbStatus?.engine || "SQLite 3 (WAL)"}
          </div>
          <div className="text-xs opacity-65 mt-1">
            {language === "bn"
              ? "কনকারেন্ট রিড/রাইট মোড সক্রিয়"
              : "Concurrent Read/Write WAL Mode Active"}
          </div>
        </div>

        {/* Storage Size Card */}
        <div
          className={`p-4 rounded-xl border ${
            isOcean
              ? "bg-slate-900/60 border-sky-900/50"
              : isDark
                ? "bg-slate-800/40 border-slate-700"
                : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold opacity-70 uppercase tracking-wider mb-2">
            <Table className="w-4 h-4 text-sky-500" />
            {language === "bn" ? "ডাটাবেজ সাইজ" : "Database File Size"}
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-100">
            {dbStatus?.sizeFormatted || "Calculating..."}
          </div>
          <div
            className="text-xs opacity-65 mt-1 truncate"
            title={dbStatus?.location}
          >
            ফাইল:{" "}
            {dbStatus?.location
              ? dbStatus.location.split("/").pop()
              : "database.sqlite"}
          </div>
        </div>

        {/* Protection & Backup Card */}
        <div
          className={`p-4 rounded-xl border ${
            isOcean
              ? "bg-slate-900/60 border-sky-900/50"
              : isDark
                ? "bg-slate-800/40 border-slate-700"
                : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold opacity-70 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            {language === "bn" ? "স্বয়ংক্রিয় ব্যাকআপ" : "Automated Backup"}
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-100">
            {language === "bn" ? "প্রতিদিন স্বয়ংক্রিয়" : "Daily Snapshots"}
          </div>
          <div className="text-xs opacity-65 mt-1">
            {language === "bn"
              ? "রক্ষণাবেক্ষণ: ৩০ দিনের রোলিং ব্যাকআপ"
              : "Retention: 30-day auto cleanup"}
          </div>
        </div>
      </div>

      {/* Table Statistics Table */}
      <div
        className={`p-5 rounded-2xl border ${
          isOcean
            ? "bg-slate-900/50 border-sky-900/50"
            : isDark
              ? "bg-slate-800/40 border-slate-700"
              : "bg-white border-slate-200"
        }`}
      >
        <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 mb-3 flex items-center gap-2">
          <Table className="w-4 h-4 text-emerald-500" />
          {language === "bn"
            ? "টেবিল তালিকা ও রেকর্ড সংখ্যা"
            : "Database Tables & Record Counts"}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {dbStatus?.tables &&
            Object.entries(dbStatus.tables).map(([tableName, count]) => (
              <div
                key={tableName}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isOcean
                    ? "bg-slate-800/50 border-sky-800/40"
                    : isDark
                      ? "bg-slate-700/30 border-slate-700"
                      : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-xs font-medium opacity-80">
                  {tableName}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {count} {language === "bn" ? "টি" : ""}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Super Admin SQL Diagnostic Console */}
      {isAdmin && (
        <div
          className={`p-5 rounded-2xl border space-y-4 ${
            isOcean
              ? "bg-slate-900/50 border-sky-900/50"
              : isDark
                ? "bg-slate-800/40 border-slate-700"
                : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-500" />
              {language === "bn"
                ? "অ্যাডমিন SQL কোয়েরি কনসোল (SQL Console)"
                : "Admin SQL Diagnostic Console"}
            </h3>
            <span className="text-xs opacity-60">
              {language === "bn"
                ? "সরাসরি ডাটাবেজ থেকে ডাটা পর্যবেক্ষণ ও ফিল্টারিং"
                : "Direct SQLite querying"}
            </span>
          </div>

          <form onSubmit={handleExecuteSql} className="space-y-3">
            <div className="relative">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={3}
                className={`w-full font-mono text-xs p-3 rounded-xl border outline-none transition focus:ring-2 ${
                  isOcean
                    ? "bg-slate-950 border-sky-800 text-sky-200 focus:ring-sky-500"
                    : isDark
                      ? "bg-slate-950 border-slate-700 text-slate-200 focus:ring-slate-500"
                      : "bg-slate-900 border-slate-700 text-slate-100 focus:ring-emerald-500"
                }`}
                placeholder="SELECT * FROM Categories LIMIT 10;"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sqlQuery);
                  setCopiedQuery(true);
                  setTimeout(() => setCopiedQuery(false), 2000);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs opacity-75 hover:opacity-100"
                title="Copy Query"
              >
                {copiedQuery ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs opacity-70">
                <span>দ্রুত কোয়েরি টেমপ্লেট:</span>
                <button
                  type="button"
                  onClick={() =>
                    setSqlQuery(
                      "SELECT id, name, code, budgetHead FROM Categories",
                    )
                  }
                  className="underline hover:opacity-100"
                >
                  Categories
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() =>
                    setSqlQuery(
                      "SELECT id, userId, name, email, role FROM Users",
                    )
                  }
                  className="underline hover:opacity-100"
                >
                  Users
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() =>
                    setSqlQuery(
                      "SELECT id, memoNo, allocatedAmount, date FROM Allocations ORDER BY date DESC LIMIT 5",
                    )
                  }
                  className="underline hover:opacity-100"
                >
                  Allocations
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() =>
                    setSqlQuery(
                      "SELECT id, voucherNo, grossAmount, status FROM Expenses ORDER BY expenseDate DESC LIMIT 5",
                    )
                  }
                  className="underline hover:opacity-100"
                >
                  Expenses
                </button>
              </div>

              <button
                type="submit"
                disabled={sqlRunning}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition shadow"
              >
                {sqlRunning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {language === "bn" ? "কোয়েরি রান করুন" : "Execute SQL"}
              </button>
            </div>
          </form>

          {sqlError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs">
              {sqlError}
            </div>
          )}

          {sqlResults && (
            <div className="space-y-2">
              <div className="text-xs font-semibold opacity-75">
                ফলাফল ({sqlResults.length} টি রেকর্ড পাওয়া গেছে):
              </div>
              <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-700 bg-slate-950 p-2">
                {sqlResults.length === 0 ? (
                  <div className="text-xs text-slate-400 p-4 text-center">
                    কোনো রেকর্ড পাওয়া যায়নি।
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        {Object.keys(sqlResults[0]).map((key) => (
                          <th key={key} className="p-2 whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {sqlResults.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/60">
                          {Object.values(row).map((val: any, j) => (
                            <td
                              key={j}
                              className="p-2 whitespace-nowrap truncate max-w-xs"
                            >
                              {typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Device & Cloud Sync Guide */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isOcean
            ? "bg-slate-900/50 border-sky-900/50"
            : isDark
              ? "bg-slate-800/40 border-slate-700"
              : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Globe className="w-5 h-5 text-indigo-500" />
          <span>
            {language === "bn"
              ? "ভিন্ন কম্পিউটার বা ডিভাইসে ডাটা সিঙ্ক ও ব্যবহারের সমাধান"
              : "Multi-Device Cross-Computer Data Synchronization"}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-xs space-y-2 text-indigo-950 dark:text-indigo-200 leading-relaxed">
          <div className="font-semibold text-sm flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300">
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              কেন এক কম্পিউটারে এন্ট্রি করার কয়েক ঘন্টা পর অন্য কম্পিউটারে ডাটা
              দেখা যায় না?
            </span>
          </div>
          <p>
            <strong>১. ডেভেলপমেন্ট লিংক বনাম শেয়ার্ড লিংক:</strong> গুগল এআই
            স্টুডিওতে আপনার কোডিং সেশনের ইউআরএল (
            <code className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 font-mono">
              ais-dev-...
            </code>
            ) এবং টেস্ট বা শেয়ার্ড অ্যাপ ইউআরএল (
            <code className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 font-mono">
              ais-pre-...
            </code>
            ) দুটি সম্পূর্ণ ভিন্ন ক্লাউড রান কন্টেইনার। এক কম্পিউটারে যদি Dev
            লিংকে কাজ করা হয় এবং অন্য কম্পিউটারে Shared লিংকে ঢোকা হয়, তবে তাদের
            ডাটাবেজ এক থাকে না।{" "}
            <strong>সবসময় উভয় কম্পিউটার থেকে একই লিঙ্ক ব্যবহার করুন।</strong>
          </p>
          <p>
            <strong>২. সার্ভারলেস কন্টেইনার লাইফসাইকেল:</strong> ক্লাউড
            কন্টেইনার বেশ কয়েক ঘন্টা ব্যবহার না হলে তা স্লিপে যায় এবং লোকাল
            ফাইলের ডাটা কখনো কখনো ফ্রেশ স্টেটে ফিরে যায়।
          </p>
        </div>

        {/* Actionable Solutions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Solution 1: Instant Backup & Restore */}
          <div
            className={`p-4 rounded-xl border space-y-2 ${
              isOcean
                ? "bg-slate-800/40 border-sky-900/40"
                : isDark
                  ? "bg-slate-800/60 border-slate-700"
                  : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              <Download className="w-4 h-4" />
              <span>সমাধান ১: এক-ক্লিকে ব্যাকআপ ও রিস্টোর</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">
              পিসি-১ এ কাজ শেষে উপরের{" "}
              <strong>"ডাটাবেজ (.sqlite) ডাউনলোড"</strong> অথবা{" "}
              <strong>"JSON ব্যাকআপ"</strong> বাটনে ক্লিক করে ফাইলটি সংরক্ষণ
              করুন। অন্য পিসিতে এসে এখানে{" "}
              <strong>"ডাটাবেজ রিস্টোর / আপলোড"</strong> বাটনে ক্লিক করে ফাইলটি
              সিলেক্ট করে দিলেই মুহূর্তের মধ্যে সব ডাটা চলে আসবে।
            </p>
          </div>

          {/* Solution 2: Permanent Live Cloud DB */}
          <div
            className={`p-4 rounded-xl border space-y-2 ${
              isOcean
                ? "bg-slate-800/40 border-sky-900/40"
                : isDark
                  ? "bg-slate-800/60 border-slate-700"
                  : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
              <Cloud className="w-4 h-4" />
              <span>সমাধান ২: ক্লাউড ডাটাবেজ (Turso / LibSQL Cloud)</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">
              ম্যানুয়াল ফাইল ট্রান্সফার ছাড়াই পৃথিবীর যেকোনো কম্পিউটার বা মোবাইল
              থেকে স্বয়ংক্রিয়ভাবে সার্বক্ষণিক লাইভ সিঙ্ক রাখতে বিনামূল্যে{" "}
              <a
                href="https://turso.tech"
                target="_blank"
                rel="noreferrer"
                className="underline font-bold text-sky-600 dark:text-sky-400"
              >
                Turso.tech
              </a>{" "}
              থেকে ডাটাবেজ তৈরি করে তার URL ও Auth Token টি এআই স্টুডিওর Secrets
              / Settings-এ{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">
                LIBSQL_URL
              </code>{" "}
              ও{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">
                LIBSQL_AUTH_TOKEN
              </code>{" "}
              ভেরিয়েবলে দিয়ে দিলে সিস্টেম নিজে থেকেই ক্লাউড মোডে সুইচ করবে!
            </p>
          </div>
        </div>
      </div>

      {/* Local PC Deployment FAQ / Guide */}
      <div
        className={`p-5 rounded-2xl border space-y-3 ${
          isOcean
            ? "bg-slate-900/50 border-sky-900/50"
            : isDark
              ? "bg-slate-800/40 border-slate-700"
              : "bg-white border-slate-200"
        }`}
      >
        <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-emerald-500" />
          {language === "bn"
            ? "লোকাল পিসিতে ব্যবহারের পূর্ণাঙ্গ নির্দেশনা"
            : "Local PC Deployment Guidelines"}
        </h3>
        <div className="text-xs space-y-2 opacity-80 leading-relaxed">
          <p>
            <strong>১. কোনো পৃথক ডাটাবেজ সার্ভার সফটওয়্যার লাগবে না:</strong>{" "}
            PostgreSQL বা MySQL এর মতো কোনো ভারী সার্ভার সফটওয়্যার (বা
            XAMPP/WAMP) লোকাল পিসিতে ইনস্টল করার কোনো প্রয়োজন নেই।
          </p>
          <p>
            <strong>২. স্বয়ংক্রিয় সেভ ও ফাইল লোকেশন:</strong> সিস্টেম রান করার
            সাথে সাথে{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">
              data/database.sqlite
            </code>{" "}
            ফাইলে স্বয়ংক্রিয়ভাবে সমস্ত ডাটা রিয়েল-টাইমে সংরক্ষিত হয়।
          </p>
          <p>
            <strong>৩. সরাসরি ভিউয়ার দিয়ে ওপেন করা:</strong> যেকোনো ফ্রি{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              DB Browser for SQLite
            </span>{" "}
            বা <span className="font-semibold">VS Code SQLite Viewer</span> দিয়ে
            সরাসরি{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">
              database.sqlite
            </code>{" "}
            ফাইলটি খুলে টেবিল, কোয়েরি এবং রেকর্ড সরাসরি দেখা বা এক্সপোর্ট করা
            যায়।
          </p>
          <p>
            <strong>৪. ব্যাকআপ ও রিস্টোরেশন:</strong> আপনি চাইলে যেকোনো সময়
            উপরের <em>"ডাটাবেজ (.sqlite) ডাউনলোড"</em> বা{" "}
            <em>"JSON ব্যাকআপ"</em> বাটনে ক্লিক করে পুরো সিস্টেমের ডাটা এক ফাইলে
            ব্যাকআপ রাখতে পারবেন এবং যেকোনো সময় রিস্টোর করতে পারবেন।
          </p>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedRestoreFile && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
              isOcean
                ? "bg-slate-900 border-sky-800 text-slate-100"
                : isDark
                  ? "bg-slate-800 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {language === "bn"
                    ? "ডাটাবেজ রিস্টোর নিশ্চিতকরণ"
                    : "Confirm Database Restore"}
                </h3>
                <p className="text-xs opacity-70">
                  {selectedRestoreFile.name} (
                  {(selectedRestoreFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>সতর্কতা:</strong> নির্বাচিত ব্যাকআপ ফাইলটি রিস্টোর করলে
              সিস্টেমের বর্তমান রেকর্ডগুলো প্রতিস্থাপিত হবে। রিস্টোর করার পূর্বে
              বর্তমান ডাটার একটি ডাউনলোড ব্যাকআপ রেখে নেওয়ার পরামর্শ দেওয়া
              হচ্ছে।
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setSelectedRestoreFile(null);
                }}
                disabled={restoring}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>রিস্টোর হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {language === "bn"
                        ? "হ্যাঁ, রিস্টোর করুন"
                        : "Yes, Restore Now"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
