import React, { useState, useEffect } from "react";
import { User, SystemSettings, Office, FinancialYear } from "../../types";
import { apiFetch } from "../../api";
import { Database, Save, FolderOpen, CheckCircle2, Trash2 } from "lucide-react";

interface ConferenceNoteToolProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  offices?: Office[];
  financialYears?: FinancialYear[];
  selectedFY?: string;
  onBack: () => void;
}

const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (s: string | number) => String(s).replace(/[0-9]/g, (d) => BN[+d]);
const allBn = (s: string | number) => String(s).replace(/\d+/g, (m) => toBn(m));
const toNum = (s: string | number) =>
  parseFloat(String(s).replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/,/g, "")) || 0;
const fmt = (n: number | string) => (isNaN(Number(n)) ? "০.০০" : toBn(parseFloat(String(n)).toFixed(2)));

function numberToWordsBn(n: number): string {
  n = Math.round(n);
  if (!n) return "শূন্য";
  const o = [
    "", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ",
    "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ", "বিশ",
    "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আঠাশ", "উনত্রিশ", "ত্রিশ",
    "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাতত্রিশ", "আটত্রিশ", "উনচল্লিশ", "চল্লিশ",
    "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চৌচল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "উনপঞ্চাশ", "পঞ্চাশ",
    "একান্ন", "বায়ান্ন", "তেপান্ন", "চৌপান্ন", "পঞ্চান্ন", "ছাপান্ন", "সাতান্ন", "আটান্ন", "উনষাট", "ষাট",
    "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "উনসত্তর", "সত্তর",
    "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "উনআশি", "আশি",
    "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "আটাশি", "উননব্বই", "নব্বই",
    "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিনানব্বই",
  ];
  const h = (x: number) => (x < 100 ? o[x] : o[Math.floor(x / 100)] + " শত" + (x % 100 ? " " + o[x % 100] : ""));
  const p: string[] = [];
  let r = n;
  const cr = Math.floor(r / 10000000);
  r %= 10000000;
  const lk = Math.floor(r / 100000);
  r %= 100000;
  const hz = Math.floor(r / 1000);
  r %= 1000;
  if (cr) p.push(h(cr) + " কোটি");
  if (lk) p.push(h(lk) + " লাখ");
  if (hz) p.push(h(hz) + " হাজার");
  if (r) p.push(h(r));
  return p.join(" ");
}

interface ExpenseRow {
  id: number;
  d: string;
  q: string;
  u: string;
  p: string;
  a: string;
}

export function ConferenceNoteTool({ currentUser, systemSettings, offices, financialYears, selectedFY, onBack }: ConferenceNoteToolProps) {
  const activeFY = financialYears?.find((f) => f.id === selectedFY)?.name || "2024-25";
  const userOffice = offices?.find((o) => o.id === currentUser.officeId)?.name;

  // Form states initialized with session/user defaults
  const [meetingDate, setMeetingDate] = useState("২৬/০৮/২০২৩");
  const [meetingBar, setMeetingBar] = useState("শনিবার");
  const [totalAttendees, setTotalAttendees] = useState("৩১");
  const [regMgrTitle, setRegMgrTitle] = useState("আঞ্চলিক ব্যবস্থাপক");
  const [sabhaName, setSabhaName] = useState("শাখা ব্যবস্থাপক ও মাঠ কর্মকর্তাদের পর্যালোচনা সভা-২০২৩");
  const [venue, setVenue] = useState(userOffice || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি");
  const [divOff, setDivOff] = useState("বিভাগীয় কার্যালয়, চট্টগ্রাম");
  const [chiefGuest, setChiefGuest] = useState("মহাব্যবস্থাপক");
  const [auditOff, setAuditOff] = useState("আঞ্চলিক নিরীক্ষা কার্যালয়, রাঙ্গামাটি");
  const [auditTitle, setAuditTitle] = useState("আঞ্চলিক নিরীক্ষা কর্মকর্তা");

  // Advance and Budget
  const [includeAdv, setIncludeAdv] = useState(true);
  const [advDate, setAdvDate] = useState("২৩/০৮/২০২৩");
  const [advNo, setAdvNo] = useState("১৩১/১১");
  const [advAmt, setAdvAmt] = useState("১০০০০");
  const [fiscalYear, setFiscalYear] = useState(toBn(activeFY));
  const [budgetCode, setBudgetCode] = useState("১৩৩/১৩-বি");
  const [budgetAlloc, setBudgetAlloc] = useState("২০০০0");
  const [prevSpent, setPrevSpent] = useState("০");

  const [includeExtra, setIncludeExtra] = useState(false);
  const [extraAlloc, setExtraAlloc] = useState("০");
  const [includeTotalAlloc, setIncludeTotalAlloc] = useState(false);

  // Applicant info
  const [applicantName, setApplicantName] = useState(currentUser.name || "মিছেলী চাকমা");
  const [applicantTitle, setApplicantTitle] = useState(currentUser.designation || "কর্মকর্তা");
  const [applicantBank, setApplicantBank] = useState(systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক");
  const [applicantOffice, setApplicantOffice] = useState(userOffice || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি");
  const [auditNoteApp, setAuditNoteApp] = useState("খরচকৃত টাকা ১৩৩/১৩(বি) খাত বিযোজন পূর্বক প্রদান করা যেতে পারে।");
  const [auditNoteNote, setAuditNoteNote] = useState("শাখা ব্যবস্থাপক ও মাঠকর্মীদের পর্যালোচনা সভা-২০২৩ এর আয়োজন বাবদ আর্থিক সমতি প্রদান করা হলো।");
  const [ccList, setCcList] = useState("০১। ব্যবস্থাপক, বিকেবি, রাঙ্গামাটি শাখা।");

  // Expenses rows
  const [expenses, setExpenses] = useState<ExpenseRow[]>([
    { id: 1, d: "৩১ জনের নাস্তা ও দুপুরের খাবার প্যাকেট বাবদ", q: "৩১", u: "টি", p: "৮০০", a: "১২৮০০.০০" },
    { id: 2, d: "ব্যানার তৈরী বাবদ খরচ", q: "", u: "", p: "", a: "৫৬০.০০" },
    { id: 3, d: "সাউন্ড সিস্টেম ও সাজসজ্জা বাবদ খরচ", q: "", u: "", p: "", a: "১৫০০.০০" },
  ]);

  // Modal and preview tab state
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"note" | "app">("note");

  const handleAddRow = () => {
    const newId = (expenses.length > 0 ? Math.max(...expenses.map((r) => r.id)) : 0) + 1;
    setExpenses([...expenses, { id: newId, d: "", q: "", u: "", p: "", a: "" }]);
  };

  const handleRemoveRow = (id: number) => {
    setExpenses(expenses.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: number, field: keyof ExpenseRow, val: string) => {
    setExpenses(
      expenses.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        if (field === "q" || field === "p") {
          const qVal = toNum(field === "q" ? val : r.q);
          const pVal = toNum(field === "p" ? val : r.p);
          if (qVal && pVal) {
            updated.a = fmt(qVal * pVal);
          }
        }
        return updated;
      }),
    );
  };

  // Calculations
  const curExpenseTotal = expenses.reduce((sum, r) => sum + toNum(r.a), 0);
  const al = toNum(budgetAlloc);
  const ex = includeExtra ? toNum(extraAlloc) : 0;
  const prevSp = toNum(prevSpent);
  const totalAl = al + ex;
  const totalSp = prevSp + curExpenseTotal;
  const effectiveAl = includeTotalAlloc ? totalAl : al;
  const remBudget = effectiveAl - totalSp;

  const adv = includeAdv ? toNum(advAmt) : 0;
  const extAmt = curExpenseTotal - adv;

  // Print PDF helper
  const handlePrint = () => {
    window.print();
  };

  // Word export
  const handleDownloadWord = () => {
    const isNote = activeTab === "note";
    const label = isNote ? "নোট" : "আবেদন";
    const elem = document.getElementById(isNote ? "doc-preview-note" : "doc-preview-app");
    if (!elem) return;

    const content = elem.innerHTML;
    const wordDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/><title>${label}</title>
<style>
  @page Section1 { size: 21cm 29.7cm; margin: 2cm; }
  body { font-family: 'Vrinda', 'Noto Serif Bengali', serif; font-size: 12pt; line-height: 1.8; color: #111; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
  th, td { border: 1pt solid #333; padding: 4pt 6pt; text-align: center; }
  .nt { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 12pt; }
</style>
</head>
<body><div class="Section1">${content}</div></body></html>`;

    const blob = new Blob([wordDoc], { type: "application/vnd.ms-word;charset=UTF-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1200);
  };

  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbSuccessMsg, setDbSuccessMsg] = useState("");

  const loadSavedDocs = async () => {
    try {
      const res = await apiFetch("/api/tooldocuments");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSavedDocs(data.filter((d: any) => d.toolType === "conference_note"));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch saved conference notes:", e);
    }
  };

  useEffect(() => {
    loadSavedDocs();
  }, []);

  const handleSaveToDatabase = async () => {
    setIsSavingDb(true);
    const docId = `conf-${Date.now()}`;
    const payload = {
      meetingDate,
      meetingBar,
      totalAttendees,
      regMgrTitle,
      sabhaName,
      venue,
      divOff,
      chiefGuest,
      auditOff,
      auditTitle,
      includeAdv,
      advDate,
      advNo,
      advAmt,
      fiscalYear,
      budgetCode,
      budgetAlloc,
      prevSpent,
      includeExtra,
      extraAlloc,
      includeTotalAlloc,
      applicantName,
      applicantTitle,
      applicantBank,
      applicantOffice,
      auditNoteApp,
      auditNoteNote,
      ccList,
      expenses,
    };

    try {
      const res = await apiFetch("/api/tooldocuments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: docId,
          toolType: "conference_note",
          title: sabhaName || "পর্যালোচনা সভা সংক্রান্ত নোট",
          docDate: meetingDate,
          totalAmount: curExpenseTotal,
          payload,
          createdBy: currentUser.userId,
        }),
      });

      if (res.ok) {
        setDbSuccessMsg("সেন্ট্রাল SQLite ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে!");
        setTimeout(() => setDbSuccessMsg(""), 4000);
        loadSavedDocs();
      }
    } catch (err) {
      console.warn("Save to DB failed:", err);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleRestoreDoc = (doc: any) => {
    if (!doc.payload) return;
    const p = typeof doc.payload === "string" ? JSON.parse(doc.payload) : doc.payload;
    if (p.meetingDate) setMeetingDate(p.meetingDate);
    if (p.meetingBar) setMeetingBar(p.meetingBar);
    if (p.totalAttendees) setTotalAttendees(p.totalAttendees);
    if (p.regMgrTitle) setRegMgrTitle(p.regMgrTitle);
    if (p.sabhaName) setSabhaName(p.sabhaName);
    if (p.venue) setVenue(p.venue);
    if (p.divOff) setDivOff(p.divOff);
    if (p.chiefGuest) setChiefGuest(p.chiefGuest);
    if (p.auditOff) setAuditOff(p.auditOff);
    if (p.auditTitle) setAuditTitle(p.auditTitle);
    if (p.includeAdv !== undefined) setIncludeAdv(p.includeAdv);
    if (p.advDate) setAdvDate(p.advDate);
    if (p.advNo) setAdvNo(p.advNo);
    if (p.advAmt) setAdvAmt(p.advAmt);
    if (p.fiscalYear) setFiscalYear(p.fiscalYear);
    if (p.budgetCode) setBudgetCode(p.budgetCode);
    if (p.budgetAlloc) setBudgetAlloc(p.budgetAlloc);
    if (p.prevSpent) setPrevSpent(p.prevSpent);
    if (p.includeExtra !== undefined) setIncludeExtra(p.includeExtra);
    if (p.extraAlloc) setExtraAlloc(p.extraAlloc);
    if (p.includeTotalAlloc !== undefined) setIncludeTotalAlloc(p.includeTotalAlloc);
    if (p.applicantName) setApplicantName(p.applicantName);
    if (p.applicantTitle) setApplicantTitle(p.applicantTitle);
    if (p.applicantBank) setApplicantBank(p.applicantBank);
    if (p.applicantOffice) setApplicantOffice(p.applicantOffice);
    if (p.auditNoteApp) setAuditNoteApp(p.auditNoteApp);
    if (p.auditNoteNote) setAuditNoteNote(p.auditNoteNote);
    if (p.ccList) setCcList(p.ccList);
    if (p.expenses) setExpenses(p.expenses);
    setShowSavedModal(false);
    setDbSuccessMsg("ডাটাবেজ থেকে সফলভাবে লোড হয়েছে!");
    setTimeout(() => setDbSuccessMsg(""), 3000);
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("আপনি কি নিশ্চিত এই রেকর্ডটি মুছে ফেলতে চান?")) return;
    try {
      await apiFetch(`/api/tooldocuments/${id}`, { method: "DELETE" });
      loadSavedDocs();
    } catch (e) {
      console.warn("Delete doc error:", e);
    }
  };

  return (
    <div className="bg-[#f0f4ff] min-h-screen p-4 sm:p-6 font-sans text-slate-800 animate-fadeIn">
      {/* Container */}
      <div className="max-w-5xl mx-auto bg-white border border-[#dbe4ff] rounded-2xl p-6 sm:p-8 shadow-sm">
        {dbSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{dbSuccessMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all mr-1"
                >
                  <span>← FlowBoard Hub</span>
                </button>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Database size={12} /> SQLite সেন্ট্রাল ডাটাবেজ
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 font-serif">
              শাখা ব্যবস্থাপক ও মাঠকর্মীদের পর্যালোচনা সভা — নোট ও আবেদন জেনারেটর
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              স্বয়ংক্রিয় ব্যয়ের হিসাব, বাজেট সারসংক্ষেপ এবং অফিসিয়াল নোট ও আবেদন তৈরি
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => {
                loadSavedDocs();
                setShowSavedModal(true);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <FolderOpen size={15} />
              <span>সংরক্ষিত নোটসমূহ ({savedDocs.length})</span>
            </button>

            <button
              onClick={handleSaveToDatabase}
              disabled={isSavingDb}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Save size={15} />
              <span>{isSavingDb ? "সংরক্ষণ হচ্ছে..." : "SQLite-এ সংরক্ষণ"}</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <span>⚙️ Generate করুন</span>
            </button>
          </div>
        </div>

        {/* Section 1: Meeting Info */}
        <div className="mb-6">
          <div className="text-xs font-bold text-[#1a3a5c] uppercase tracking-wider border-b-2 border-[#1a3a5c] pb-1 mb-4">
            ১. সভার তথ্য
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">সভার তারিখ</label>
              <input
                type="text"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">বার</label>
              <input
                type="text"
                value={meetingBar}
                onChange={(e) => setMeetingBar(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">মোট উপস্থিত</label>
              <input
                type="text"
                value={totalAttendees}
                onChange={(e) => setTotalAttendees(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">আঞ্চলিক ব্যবস্থাপকের পদবি</label>
              <input
                type="text"
                value={regMgrTitle}
                onChange={(e) => setRegMgrTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="sm:col-span-2 md:col-span-4">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">সভার নাম</label>
              <input
                type="text"
                value={sabhaName}
                onChange={(e) => setSabhaName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">সভার স্থান</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">বিভাগীয় কার্যালয়</label>
              <input
                type="text"
                value={divOff}
                onChange={(e) => setDivOff(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">প্রধান অতিথির পদবি</label>
              <input
                type="text"
                value={chiefGuest}
                onChange={(e) => setChiefGuest(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">আঞ্চলিক নিরীক্ষা কার্যালয়</label>
              <input
                type="text"
                value={auditOff}
                onChange={(e) => setAuditOff(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">নিরীক্ষা কর্মকর্তার পদবি</label>
              <input
                type="text"
                value={auditTitle}
                onChange={(e) => setAuditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Advance & Budget */}
        <div className="mb-6">
          <div className="text-xs font-bold text-[#1a3a5c] uppercase tracking-wider border-b-2 border-[#1a3a5c] pb-1 mb-4">
            ২. অগ্রিম ও বাজেট তথ্য
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="conf-ck-adv"
                checked={includeAdv}
                onChange={(e) => setIncludeAdv(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="conf-ck-adv" className="text-xs font-bold text-slate-700 cursor-pointer">
                গৃহীত অগ্রিম তথ্য অন্তর্ভুক্ত করুন
              </label>
            </div>
            <div className="hidden sm:block"></div>
            <div className="hidden sm:block"></div>

            <div className={includeAdv ? "" : "opacity-40 pointer-events-none"}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">অগ্রিম গ্রহণের তারিখ</label>
              <input
                type="text"
                value={advDate}
                onChange={(e) => setAdvDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className={includeAdv ? "" : "opacity-40 pointer-events-none"}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">অগ্রিম মঞ্জুরি নম্বর</label>
              <input
                type="text"
                value={advNo}
                onChange={(e) => setAdvNo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className={includeAdv ? "" : "opacity-40 pointer-events-none"}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">গৃহীত অগ্রিম (৳)</label>
              <input
                type="text"
                value={advAmt}
                onChange={(e) => setAdvAmt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">অর্থ-বছর</label>
              <input
                type="text"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">বাজেট কোড</label>
              <input
                type="text"
                value={budgetCode}
                onChange={(e) => setBudgetCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">বাজেট বরাদ্দ (৳)</label>
              <input
                type="text"
                value={budgetAlloc}
                onChange={(e) => setBudgetAlloc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">পূর্ববর্তী মোট খরচ (৳)</label>
              <input
                type="text"
                value={prevSpent}
                onChange={(e) => setPrevSpent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Budget Breakdown Summary Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-lg space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">বাজেট বরাদ্দ:</span>
              <span className="font-bold text-slate-800">৳ {fmt(al)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={includeExtra}
                  onChange={(e) => setIncludeExtra(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>অতিরিক্ত বরাদ্দ:</span>
              </label>
              <input
                type="text"
                value={extraAlloc}
                disabled={!includeExtra}
                onChange={(e) => setExtraAlloc(e.target.value)}
                className="w-32 px-2 py-1 text-right text-xs border border-slate-300 rounded bg-white font-bold disabled:opacity-40"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={includeTotalAlloc}
                  onChange={(e) => setIncludeTotalAlloc(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>মোট বাজেট বরাদ্দ (অটো):</span>
              </label>
              <span className="font-bold text-slate-800">{includeTotalAlloc ? `৳ ${fmt(totalAl)}` : "—"}</span>
            </div>
            <div className="border-t border-dashed border-slate-300 pt-2 flex items-center justify-between">
              <span className="text-slate-600">পূর্ববর্তী মোট খরচ:</span>
              <span className="font-semibold text-slate-700">৳ {fmt(prevSp)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">বর্তমান খরচ:</span>
              <span className="font-semibold text-slate-700">৳ {fmt(curExpenseTotal)}</span>
            </div>
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
              <span className="text-indigo-900 font-bold">এ পর্যন্ত মোট খরচ:</span>
              <span className="font-black text-indigo-900">৳ {fmt(totalSp)}</span>
            </div>
            <div className="flex items-center justify-between bg-amber-50 p-2 rounded-lg">
              <span className="text-red-700 font-bold">অবশিষ্ট বরাদ্দ:</span>
              <span className="font-black text-red-700">৳ {fmt(remBudget)}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Expenses Table */}
        <div className="mb-6">
          <div className="text-xs font-bold text-[#1a3a5c] uppercase tracking-wider border-b-2 border-[#1a3a5c] pb-1 mb-4 flex items-center justify-between">
            <span>৩. ব্যয়ের খাতসমূহ</span>
            <button
              onClick={handleAddRow}
              className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-all"
            >
              + সারি যোগ করুন
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1a3a5c] text-white">
                  <th className="p-2.5 text-center w-12 border-r border-slate-600">ক্রম</th>
                  <th className="p-2.5 border-r border-slate-600">বিবরণ</th>
                  <th className="p-2.5 text-center w-20 border-r border-slate-600">পরিমাণ</th>
                  <th className="p-2.5 text-center w-16 border-r border-slate-600">একক</th>
                  <th className="p-2.5 text-right w-24 border-r border-slate-600">একক মূল্য (৳)</th>
                  <th className="p-2.5 text-right w-28 border-r border-slate-600">খরচ (৳)</th>
                  <th className="p-2.5 text-center w-16">মুছুন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {expenses.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200">
                      {toBn(idx + 1)}
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.d}
                        onChange={(e) => handleRowChange(row.id, "d", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-600 rounded"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.q}
                        onChange={(e) => handleRowChange(row.id, "q", e.target.value)}
                        className="w-full px-2 py-1 text-xs text-center border border-transparent hover:border-slate-300 focus:border-indigo-600 rounded"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.u}
                        onChange={(e) => handleRowChange(row.id, "u", e.target.value)}
                        className="w-full px-2 py-1 text-xs text-center border border-transparent hover:border-slate-300 focus:border-indigo-600 rounded"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.p}
                        onChange={(e) => handleRowChange(row.id, "p", e.target.value)}
                        className="w-full px-2 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-indigo-600 rounded"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.a}
                        onChange={(e) => handleRowChange(row.id, "a", e.target.value)}
                        className="w-full px-2 py-1 text-xs text-right font-bold text-indigo-900 border border-transparent hover:border-slate-300 focus:border-indigo-600 rounded"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded"
                      >
                        মুছুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={5} className="p-3 text-right text-slate-700">
                    মোট খরচ =
                  </td>
                  <td className="p-3 text-right text-indigo-900 text-sm font-black">
                    ৳ {fmt(curExpenseTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 4: Applicant & Endorsements */}
        <div className="mb-6">
          <div className="text-xs font-bold text-[#1a3a5c] uppercase tracking-wider border-b-2 border-[#1a3a5c] pb-1 mb-4">
            ৪. আবেদনকারী ও অনুমোদন তথ্য
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">নাম (নোটে পরিদর্শক হিসেবে যাবে)</label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">পদবি</label>
              <input
                type="text"
                value={applicantTitle}
                onChange={(e) => setApplicantTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">প্রতিষ্ঠান / ব্যাংক</label>
              <input
                type="text"
                value={applicantBank}
                onChange={(e) => setApplicantBank(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">কার্যালয়</label>
              <input
                type="text"
                value={applicantOffice}
                onChange={(e) => setApplicantOffice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">নিরীক্ষা কর্মকর্তার অনুমোদন বার্তা (আবেদন)</label>
              <input
                type="text"
                value={auditNoteApp}
                onChange={(e) => setAuditNoteApp(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">নিরীক্ষা কর্মকর্তার অনুমোদন বার্তা (নোট)</label>
              <input
                type="text"
                value={auditNoteNote}
                onChange={(e) => setAuditNoteNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">অনুলিপি প্রেরণ</label>
              <textarea
                value={ccList}
                onChange={(e) => setCcList(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>

        {/* Generate Trigger */}
        <div className="flex justify-center pt-4 border-t border-slate-200">
          <button
            onClick={() => setShowModal(true)}
            className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <span>⚙️ Preview &amp; Generate করুন</span>
          </button>
        </div>
      </div>

      {/* Modal Preview & Export */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#f5f0e8] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1a3a5c] text-white px-6 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base font-serif">
                প্রিভিউ ও ডাউনলোড — যেকোনো লেখা সরাসরি এডিট করুন
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-slate-200 border-b border-slate-300 px-4">
              <button
                onClick={() => setActiveTab("note")}
                className={`px-5 py-2.5 font-bold font-serif text-sm border-b-2 transition-all ${
                  activeTab === "note"
                    ? "bg-white text-[#1a3a5c] border-[#1a3a5c]"
                    : "text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                📋 নোট শিট
              </button>
              <button
                onClick={() => setActiveTab("app")}
                className={`px-5 py-2.5 font-bold font-serif text-sm border-b-2 transition-all ${
                  activeTab === "app"
                    ? "bg-white text-[#1a3a5c] border-[#1a3a5c]"
                    : "text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                📝 আবেদনপত্র
              </button>
            </div>

            {/* Modal Document Body */}
            <div className="flex-1 overflow-y-auto bg-white p-6 sm:p-10 font-serif leading-relaxed text-sm">
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-800 mb-4 flex items-center gap-2">
                <span>✏️</span>
                <span>যেকোনো লেখায় সরাসরি ক্লিক করে এডিট করতে পারবেন।</span>
              </div>

              {/* Note Tab */}
              {activeTab === "note" && (
                <div id="doc-preview-note" contentEditable suppressContentEditableWarning className="space-y-4">
                  <div className="text-center font-bold text-base underline leading-snug">
                    {allBn(meetingDate)} ইং তারিখে অনুষ্ঠিত "{sabhaName}" এর উপস্থিতি
                    <br />
                    অতিথিদের আপ্যায়ন ও অন্যান্য খরচের অনুমোদনসহ খরচকৃত অর্থ প্রদান প্রসঙ্গে।
                  </div>
                  <p className="text-justify leading-relaxed">
                    {allBn(meetingDate)} ইং তারিখ রোজ {meetingBar} সারাদিন ব্যাপী বিকবি, {divOff} এর {chiefGuest} মহোদয়ের
                    প্রধান অতিথি হিসেবে উপস্থিতিতে অত্র অঞ্চলের {sabhaName} {venue}তে অনুষ্ঠিত হয়। উক্ত সভায় অত্র
                    অঞ্চলাধীন শাখা ব্যবস্থাপক ও মাঠ কর্মকর্তাসহ সর্বমোট {allBn(totalAttendees)} জন উপস্থিত ছিলেন। সভায়
                    উপস্থিত মোট {allBn(totalAttendees)} জনের আপ্যায়ন বাবদ নিম্নোক্তভাবে খরচ করা হয়ঃ-
                  </p>

                  <table className="w-full border-collapse my-3 text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-700 p-1.5 text-center">ক্রম</th>
                        <th className="border border-slate-700 p-1.5 text-left">বিবরণ</th>
                        <th className="border border-slate-700 p-1.5 text-center">পরিমাণ</th>
                        <th className="border border-slate-700 p-1.5 text-center">একক</th>
                        <th className="border border-slate-700 p-1.5 text-center">একক মূল্য</th>
                        <th className="border border-slate-700 p-1.5 text-center">=</th>
                        <th className="border border-slate-700 p-1.5 text-right">খরচের পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((r, i) => (
                        <tr key={r.id}>
                          <td className="border border-slate-700 p-1 text-center">{toBn(i + 1)}</td>
                          <td className="border border-slate-700 p-1 text-left">{r.d}</td>
                          <td className="border border-slate-700 p-1 text-center">{allBn(r.q)}</td>
                          <td className="border border-slate-700 p-1 text-center">{r.u}</td>
                          <td className="border border-slate-700 p-1 text-center">{r.p ? `${allBn(r.p)}/-` : ""}</td>
                          <td className="border border-slate-700 p-1 text-center">=</td>
                          <td className="border border-slate-700 p-1 text-right">{fmt(toNum(r.a))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-slate-50">
                        <td colSpan={5} className="border border-slate-700 p-2 text-right">
                          মোট = {numberToWordsBn(curExpenseTotal)} টাকা মাত্র।
                        </td>
                        <td className="border border-slate-700 p-2 text-center">=</td>
                        <td className="border border-slate-700 p-2 text-right">{fmt(curExpenseTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <p className="text-justify leading-relaxed">
                    অত্র কার্যালয়ের পরিদর্শক, {applicantTitle} {applicantName} এর আবেদনের প্রেক্ষিতে উক্ত সভায় উপস্থিত{" "}
                    {allBn(totalAttendees)} জন অতিথিদের আপ্যায়ন বাবদ সর্বমোট খরচকৃত ৳={fmt(curExpenseTotal)}/- (
                    {numberToWordsBn(curExpenseTotal)}) টাকা মাত্র {auditOff} এর আর্থিক সমতিক্রমে অনুমোদন
                    {includeAdv && (
                      <>
                        {" "}
                        এবং বিগত {allBn(advDate)} ইং তারিখে সেমিনার খরচ বাবদ গৃহীত অগ্রিম ({advNo}) ৳=
                        {allBn(Math.round(adv))}/- ({numberToWordsBn(adv)}) টাকা সমন্বয় এবং অতিরিক্ত খরচকৃত টাকা=
                        {fmt(Math.abs(extAmt))}/- ({numberToWordsBn(Math.abs(extAmt))}) নগদে প্রদানের অনুমোদন
                      </>
                    )}
                    {" "}দেওয়া যেতে পারে।
                  </p>

                  <p className="font-bold">উল্লেখ্য যে,</p>
                  <table className="w-auto border-collapse my-2 text-xs">
                    <tbody>
                      <tr>
                        <td className="border border-slate-700 p-1.5 text-left">
                          {allBn(fiscalYear)} অর্থ বছরে ({budgetCode}) মাঠ পর্যায়ে সেমিনার খাতে বাজেট বরাদ্দ
                        </td>
                        <td className="border border-slate-700 p-1.5 text-center">=</td>
                        <td className="border border-slate-700 p-1.5 text-right">{fmt(al)}</td>
                      </tr>
                      {includeExtra && (
                        <tr>
                          <td className="border border-slate-700 p-1.5 text-left">অতিরিক্ত বরাদ্দ</td>
                          <td className="border border-slate-700 p-1.5 text-center">=</td>
                          <td className="border border-slate-700 p-1.5 text-right">{fmt(ex)}</td>
                        </tr>
                      )}
                      {includeTotalAlloc && (
                        <tr className="font-bold">
                          <td className="border border-slate-700 p-1.5 text-left">মোট বাজেট বরাদ্দ</td>
                          <td className="border border-slate-700 p-1.5 text-center">=</td>
                          <td className="border border-slate-700 p-1.5 text-right">{fmt(totalAl)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="border border-slate-700 p-1.5 text-left">
                          এ পর্যন্ত খরচ ({fmt(prevSp)} + {fmt(curExpenseTotal)})
                        </td>
                        <td className="border border-slate-700 p-1.5 text-center">=</td>
                        <td className="border border-slate-700 p-1.5 text-right">{fmt(totalSp)}</td>
                      </tr>
                      <tr className="font-bold">
                        <td className="border border-slate-700 p-1.5 text-left">অবশিষ্ট</td>
                        <td className="border border-slate-700 p-1.5 text-center">=</td>
                        <td className="border border-slate-700 p-1.5 text-right">{fmt(remBudget)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="pt-4 space-y-4">
                    <p>
                      <u>
                        <b>{regMgrTitle} ঃ-</b>
                      </u>{" "}
                      সেমিনার বাবদ খরচকৃত ৳={fmt(curExpenseTotal)}/- ({numberToWordsBn(curExpenseTotal)}) টাকা মাত্র এর
                      বিলখানাসহ খরচের আর্থিক সমতির জন্য {auditOff} এর বরাবরে নথি উপস্থাপন করুন।
                    </p>
                    <p>
                      <u>
                        <b>{auditTitle} ঃ-</b>
                      </u>{" "}
                      {auditNoteNote}
                    </p>
                    <p>
                      <u>
                        <b>{regMgrTitle} ঃ-</b>
                      </u>{" "}
                      অনুমোদিত।
                    </p>
                  </div>
                </div>
              )}

              {/* Application Tab */}
              {activeTab === "app" && (
                <div id="doc-preview-app" contentEditable suppressContentEditableWarning className="space-y-4">
                  <div className="leading-relaxed">
                    {regMgrTitle}
                    <br />
                    {applicantBank}
                    <br />
                    {venue}।
                  </div>
                  <p className="font-bold">
                    <u>বিষয় ঃ</u> {allBn(meetingDate)} ইং তারিখে অনুষ্ঠিত {sabhaName} এর সভা আয়োজনের জন্য আপ্যায়ন ও
                    অন্যান্য খরচ নির্বাহের লক্ষ্যে গৃহীত অগ্রিমের খরচকৃত টাকা অনুমোদনসহ সমন্বয় ও খরচকৃত অর্থ প্রদানের আবেদন।
                  </p>
                  <p>
                    <b>প্রিয় মহোদয়,</b>
                  </p>
                  <p className="text-justify leading-relaxed">
                    যথাবিহীত সম্মানপূর্বক নিবেদন এই, গত {allBn(meetingDate)} ইং তারিখ রোজ {meetingBar} অঞ্চলাধীন সকল শাখা
                    ব্যবস্থাপকদের উপস্থিতিতে ব্যবসায়িক কর্মকান্ড পরিকল্পনা সংক্রান্ত পর্যালোচনা সভা অনুষ্ঠিত হয়। উক্ত
                    সভায় {chiefGuest}, {divOff} এর সদয় উপস্থিতিসহ {auditTitle}, {regMgrTitle} এবং রাঙ্গামাটি
                    অঞ্চলাধীন সকল শাখা ব্যবস্থাপক ও মাঠকর্মকর্তাসহ মোট {allBn(totalAttendees)} জন উপস্থিত ছিলেন।
                  </p>
                  <p className="text-justify leading-relaxed">
                    ০২। উক্ত পর্যালোচনা সভার বিভিন্ন খরচ নির্বাহের নিমিত্তে {allBn(advDate)} ইং তারিখে ৳=
                    {allBn(Math.round(adv))}/- ({numberToWordsBn(adv)}) অগ্রিম গ্রহণ করা হয়। পর্যালোচনা সভায় আগত
                    অতিথি ও অংশগ্রহণকারী ব্যবস্থাপকদের জন্য আপ্যায়ন ও আনুষাঙ্গিক খরচ বাবদ নিম্নবর্ণিত বিবরণ অনুযায়ী খরচ
                    করা হয় ঃ-
                  </p>

                  <div className="space-y-1 my-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {expenses.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs py-1">
                        <span>{r.d}</span>
                        <span className="font-bold">৳= {r.a}/-</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold pt-2 border-t border-slate-300">
                      <span>মোট = {numberToWordsBn(curExpenseTotal)} টাকা মাত্র।</span>
                      <span>৳= {fmt(curExpenseTotal)}/-</span>
                    </div>
                  </div>

                  <p className="text-justify leading-relaxed">
                    ০৩। অতএব আমার খরচকৃত ৳={fmt(curExpenseTotal)}/- ({numberToWordsBn(curExpenseTotal)}) মাত্র সদয়
                    অনুমোদনসহ গৃহীত অগ্রিম ৳={allBn(Math.round(adv))}/- ({numberToWordsBn(adv)}) টাকা সমন্বয় করার আদেশ
                    দানের জন্য বিনীত অনুরোধ করা হলো।
                  </p>

                  <div className="flex justify-between items-end pt-8">
                    <div>
                      <u>
                        <b>{auditTitle} মহোদয়ের আর্থিক সমতিক্রমে</b>
                      </u>
                      <br />
                      <br />
                      {auditNoteApp}
                    </div>
                    <div className="text-center">
                      আপনার বিশ্বস্ত
                      <div className="h-10"></div>({applicantName})<br />
                      {applicantTitle}
                      <br />
                      {applicantBank}
                      <br />
                      {applicantOffice}।
                    </div>
                  </div>

                  <div className="pt-6 text-xs">
                    <b>সদয় অবগতি ও প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য অনুলিপিঃ</b>
                    {ccList.split("\n").filter(Boolean).map((l, i) => (
                      <p key={i}>{l}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 p-4 px-6 flex items-center justify-between gap-3 border-t border-slate-300">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5"
              >
                <span>⬇️ PDF / Print</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadWord}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5"
                >
                  <span>⬇️ Word (.doc) ডাউনলোড</span>
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs transition-all"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Documents Drawer / Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="text-blue-400" size={18} />
                <h3 className="font-bold text-sm">SQLite সেন্ট্রাল ডাটাবেজে সংরক্ষিত নোট ও আবেদন তালিকা</h3>
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {savedDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Database size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">কোনো সংরক্ষিত ডকুমেন্ট পাওয়া যায়নি।</p>
                  <p className="text-xs text-slate-400 mt-1">
                    "SQLite-এ সংরক্ষণ" বাটনে ক্লিক করে বর্তমান নোটটি সেন্ট্রাল ডাটাবেজে সংরক্ষণ করতে পারেন।
                  </p>
                </div>
              ) : (
                savedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleRestoreDoc(doc)}
                    className="p-4 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-700">
                        {doc.title || "পর্যালোচনা সভা"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        তারিখ: {doc.docDate || "N/A"} • মোট ব্যয়: ৳={fmt(doc.totalAmount || 0)}/-
                      </p>
                      <span className="text-[10px] text-slate-400">ID: {doc.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-sm">
                        লোড করুন ↵
                      </span>
                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
