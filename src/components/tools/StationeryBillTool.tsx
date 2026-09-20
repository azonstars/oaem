import React, { useState, useEffect } from "react";
import { User, SystemSettings, Office, FinancialYear } from "../../types";
import { apiFetch } from "../../api";
import { Database, Save, FolderOpen, CheckCircle2, Trash2 } from "lucide-react";

interface StationeryBillToolProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  offices?: Office[];
  financialYears?: FinancialYear[];
  selectedFY?: string;
  onBack: () => void;
}

const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (s: string | number) => String(s).replace(/[0-9]/g, (d) => BN[+d]);
const _toNum = (s: string | number) =>
  parseFloat(String(s).replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/,/g, "")) || 0;

function formatPriceBn(num: number | string): string {
  const n = typeof num === "number" ? num : parseFloat(String(num)) || 0;
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const intFormatted = parseInt(intPart).toLocaleString("en-IN");
  return toBn(intFormatted + "." + decPart);
}

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
    "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাফি", "আটাশি", "উননব্বই", "নব্বই",
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

interface StationeryItem {
  id: number;
  desc: string;
  qty: number;
  unit: string;
  v1_up: number;
  v1_note: string;
  v2_up: number;
  v2_note: string;
  v3_up: number;
  v3_note: string;
}

export function StationeryBillTool({ currentUser, systemSettings, offices, financialYears, selectedFY, onBack }: StationeryBillToolProps) {
  const activeFY = financialYears?.find((f) => f.id === selectedFY)?.name || "2024-25";

  const userOffice = offices?.find((o) => o.id === currentUser.officeId)?.name;

  // General fields
  const [branchName, setBranchName] = useState(
    userOffice
      ? `${systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"}, ${userOffice}`
      : "বাংলাদেশ কৃষি ব্যাংক, আঞ্চলিক কার্যালয়, রাঙ্গামাটি",
  );
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [memoNote, setMemoNote] = useState("নথি নং-প্রশা-১(৪০)/২০২৪-২০২৫/");
  const [memoOrder, setMemoOrder] = useState("সূত্র নং-প্রশা-১(৪০)/২০২৪-২০২৫/");
  const [memoForward, setMemoForward] = useState("সূত্র নং-মুদ্রণ-০২/২০২৪-২০২৫/");
  const [woQuoteDate, setWoQuoteDate] = useState("৩০/০৩/২০২৫");
  const [accountHead, setAccountHead] = useState("১৩২");
  const [vatRate, setVatRate] = useState(10);
  const [taxRate, setTaxRate] = useState(5);

  // Recipient
  const [recipientName, setRecipientName] = useState("প্রোপাইটর");
  const [recipientTitle, setRecipientTitle] = useState("প্রোপাইটর");
  const [woAddress1, setWoAddress1] = useState("নজির আহমেদ চৌধুরী রোড");
  const [woAddress2, setWoAddress2] = useState("আন্দরকিল্লা, চট্টগ্রাম।");

  // 3 Bidder vendor names
  const [v1Name, setV1Name] = useState(
    "ইউনিক প্রিন্টার্স, ১নং আলী খানেকী সেন্টার, নজির আহমদ চৌধুরী রোড, আন্দরকিল্লা, চট্টগ্রাম।",
  );
  const [v2Name, setV2Name] = useState(
    "আইডিয়াল পেপার এন্ড প্রিন্টার্স, ১৭, রাজা পুকুর লেন, আন্দরকিল্লা, চট্টগ্রাম।",
  );
  const [v3Name, setV3Name] = useState(
    "পুবালী আর্ট প্রেস এন্ড স্টেশনারীজ, হাসান মার্কেট, মোমিন রোড, চট্টগ্রাম।",
  );

  // Forwarding fields
  const [fwdToName, setFwdToName] = useState("ব্যবস্থাপক");
  const [fwdBranch, setFwdBranch] = useState("বাংলাদেশ কৃষি ব্যাংক");
  const [fwdBranchAddr, setFwdBranchAddr] = useState("রাঙ্গামাটি শাখা, রাঙ্গামাটি।");

  // Items
  const [items, setItems] = useState<StationeryItem[]>([
    {
      id: 1,
      desc: "সঞ্চয়ী হিসাব জমা বহি",
      qty: 1000,
      unit: "টি",
      v1_up: 9.35,
      v1_note: "সর্বনিম্ন দরদাতা",
      v2_up: 8.08,
      v2_note: "সর্বোচ্চ দরদাতা",
      v3_up: 8.2,
      v3_note: "২য় সর্বনিম্ন দরদাতা",
    },
    {
      id: 2,
      desc: "চলতি হিসাব জমা বহি",
      qty: 500,
      unit: "টি",
      v1_up: 12.5,
      v1_note: "সর্বনিম্ন দরদাতা",
      v2_up: 14.0,
      v2_note: "সর্বোচ্চ দরদাতা",
      v3_up: 13.2,
      v3_note: "২য় সর্বনিম্ন দরদাতা",
    },
  ]);

  // Budget
  const [budgetAlloc, setBudgetAlloc] = useState(150000);
  const [budgetPrev, setBudgetPrev] = useState(66950);
  const [budgetPrevLabel, setBudgetPrevLabel] = useState("৩০ জুন ২০২৪ এ প্রভিশন");
  const [budgetExtra, setBudgetExtra] = useState(120000);
  const [budgetTillNow, setBudgetTillNow] = useState(321304);
  const [budgetYear, setBudgetYear] = useState(toBn(activeFY));

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentModalPage, setCurrentModalPage] = useState(0);

  const handleAddItem = () => {
    const newId = (items.length > 0 ? Math.max(...items.map((i) => i.id)) : 0) + 1;
    setItems([
      ...items,
      {
        id: newId,
        desc: "",
        qty: 100,
        unit: "টি",
        v1_up: 0,
        v1_note: "সর্বনিম্ন দরদাতা",
        v2_up: 0,
        v2_note: "সর্বোচ্চ দরদাতা",
        v3_up: 0,
        v3_note: "২য় সর্বনিম্ন দরদাতা",
      },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: number, updater: (prev: StationeryItem) => StationeryItem) => {
    setItems(items.map((it) => (it.id === id ? updater(it) : it)));
  };

  // Grand totals
  const grandTotalV1 = items.reduce((sum, it) => sum + Math.round((it.v1_up || 0) * (it.qty || 1)), 0);
  const totalAlloc = budgetAlloc + budgetPrev;
  const grandAlloc = totalAlloc + budgetExtra;
  const spentTotal = budgetTillNow + grandTotalV1;
  const _remBudget = grandAlloc - spentTotal;

  const _deductRate = vatRate + taxRate;
  const vatDeductAmt = Math.round((grandTotalV1 * vatRate) / (100 + vatRate));
  const taxDeductAmt = Math.round((grandTotalV1 * taxRate) / (100 + vatRate));
  const totalDeduct = vatDeductAmt + taxDeductAmt;
  const netPayment = grandTotalV1 - totalDeduct;

  const vatTaxStr = taxRate > 0 ? `${toBn(vatRate)}% মূসক ও ${toBn(taxRate)}% উৎস করসহ` : `${toBn(vatRate)}% মূসকসহ`;

  const formattedDate = docDate
    ? (() => {
        const d = new Date(docDate);
        return `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}/${toBn(d.getFullYear())}`;
      })()
    : "[তারিখ]";

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
          setSavedDocs(data.filter((d: any) => d.toolType === "stationery_bill"));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch saved stationery bills:", e);
    }
  };

  useEffect(() => {
    loadSavedDocs();
  }, []);

  const handleSaveToDatabase = async () => {
    setIsSavingDb(true);
    const docId = `stat-${Date.now()}`;
    const payload = {
      branchName,
      docDate,
      memoNote,
      memoOrder,
      memoForward,
      woQuoteDate,
      accountHead,
      vatRate,
      taxRate,
      recipientName,
      recipientTitle,
      woAddress1,
      woAddress2,
      v1Name,
      v2Name,
      v3Name,
      fwdToName,
      fwdBranch,
      fwdBranchAddr,
      items,
      budgetAlloc,
      budgetPrev,
      budgetPrevLabel,
      budgetExtra,
      budgetTillNow,
      budgetYear,
    };

    try {
      const res = await apiFetch("/api/tooldocuments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: docId,
          toolType: "stationery_bill",
          title: `মুদ্রিত স্টেশনারী চালান (${items.length} টি আইটেম)`,
          docDate,
          totalAmount: netPayment,
          payload,
          createdBy: currentUser.userId,
        }),
      });

      if (res.ok) {
        setDbSuccessMsg(
          currentUser?.role === "Super Admin"
            ? "সেন্ট্রাল SQLite ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে!"
            : "সফলভাবে সংরক্ষিত হয়েছে!"
        );
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
    if (p.branchName) setBranchName(p.branchName);
    if (p.docDate) setDocDate(p.docDate);
    if (p.memoNote) setMemoNote(p.memoNote);
    if (p.memoOrder) setMemoOrder(p.memoOrder);
    if (p.memoForward) setMemoForward(p.memoForward);
    if (p.woQuoteDate) setWoQuoteDate(p.woQuoteDate);
    if (p.accountHead) setAccountHead(p.accountHead);
    if (p.vatRate !== undefined) setVatRate(p.vatRate);
    if (p.taxRate !== undefined) setTaxRate(p.taxRate);
    if (p.recipientName) setRecipientName(p.recipientName);
    if (p.recipientTitle) setRecipientTitle(p.recipientTitle);
    if (p.woAddress1) setWoAddress1(p.woAddress1);
    if (p.woAddress2) setWoAddress2(p.woAddress2);
    if (p.v1Name) setV1Name(p.v1Name);
    if (p.v2Name) setV2Name(p.v2Name);
    if (p.v3Name) setV3Name(p.v3Name);
    if (p.fwdToName) setFwdToName(p.fwdToName);
    if (p.fwdBranch) setFwdBranch(p.fwdBranch);
    if (p.fwdBranchAddr) setFwdBranchAddr(p.fwdBranchAddr);
    if (p.items) setItems(p.items);
    if (p.budgetAlloc !== undefined) setBudgetAlloc(p.budgetAlloc);
    if (p.budgetPrev !== undefined) setBudgetPrev(p.budgetPrev);
    if (p.budgetPrevLabel) setBudgetPrevLabel(p.budgetPrevLabel);
    if (p.budgetExtra !== undefined) setBudgetExtra(p.budgetExtra);
    if (p.budgetTillNow !== undefined) setBudgetTillNow(p.budgetTillNow);
    if (p.budgetYear) setBudgetYear(p.budgetYear);
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
      <div className="max-w-5xl mx-auto bg-white border border-[#dbe4ff] rounded-2xl p-6 sm:p-8 shadow-sm">
        {dbSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{dbSuccessMsg}</span>
          </div>
        )}

        {/* Header */}
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
              {currentUser?.role === "Super Admin" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Database size={12} /> SQLite সেন্ট্রাল ডাটাবেজ
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 font-serif">
              মুদ্রিত স্টেশনারী ও ভাউচার চালান জেনারেটর (Stationery &amp; Print Order)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              মুদ্রণ সামগ্রীর ৩-দরপত্র পর্যালোচনা, মূসক/আয়কর হিসাব, নোট শিট ও ৬-শর্তযুক্ত কার্যাদেশ তৈরি
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
              <span>সংরক্ষিত চালানসমূহ ({savedDocs.length})</span>
            </button>

            <button
              onClick={handleSaveToDatabase}
              disabled={isSavingDb}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Save size={15} />
              <span>
                {isSavingDb
                  ? "সংরক্ষণ হচ্ছে..."
                  : currentUser?.role === "Super Admin"
                    ? "SQLite-এ সংরক্ষণ"
                    : "সংরক্ষণ করুন"}
              </span>
            </button>

            <button
              onClick={() => {
                setShowModal(true);
                setCurrentModalPage(0);
              }}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>📑 Generate Templates</span>
            </button>
          </div>
        </div>

        {/* Section 1: General Info */}
        <div className="mb-6">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 mb-4">
            ১. সাধারণ তথ্য ও কোড
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">কার্যালয়ের নাম</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">তারিখ</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">নথি/সূত্র নম্বর (নোট শিট)</label>
              <input
                type="text"
                value={memoNote}
                onChange={(e) => setMemoNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">মেমো/সূত্র নম্বর (কার্যাদেশ)</label>
              <input
                type="text"
                value={memoOrder}
                onChange={(e) => setMemoOrder(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">কোটেশন তারিখ (কার্যাদেশে উল্লেখিত)</label>
              <input
                type="text"
                value={woQuoteDate}
                onChange={(e) => setWoQuoteDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">বাজেট খাত কোড</label>
              <input
                type="text"
                value={accountHead}
                onChange={(e) => setAccountHead(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">VAT হার (%)</label>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">উৎস কর / TAX হার (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: 3 Bidders */}
        <div className="mb-6">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 mb-4">
            ২. দরপত্রদাতা ৩টি প্রতিষ্ঠানের নাম ও ঠিকানা
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-blue-900 block mb-1">
                🏆 প্রতিষ্ঠান ১ (সর্বনিম্ন দরদাতা - কার্যাদেশ ও পেমেন্ট প্রাপ্ত)
              </label>
              <input
                type="text"
                value={v1Name}
                onChange={(e) => setV1Name(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-blue-400 rounded-lg bg-blue-50/50 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">প্রতিষ্ঠান ২ (২য় দরদাতা)</label>
              <input
                type="text"
                value={v2Name}
                onChange={(e) => setV2Name(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">প্রতিষ্ঠান ৩ (৩য় দরদাতা)</label>
              <input
                type="text"
                value={v3Name}
                onChange={(e) => setV3Name(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Stationery Items */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 mb-4">
            <span>৩. মুদ্রিত সামগ্রী ও দরের তালিকা</span>
            <button
              onClick={handleAddItem}
              className="px-3 py-1 bg-white text-blue-700 hover:bg-blue-100 rounded-md font-bold shadow-sm"
            >
              + নতুন সামগ্রী যোগ করুন
            </button>
          </div>

          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={it.id} className="border border-slate-300 rounded-xl p-4 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-sm text-slate-800">
                    আইটেম {toBn(idx + 1)}: {it.desc || "নতুন সামগ্রী"}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(it.id)}
                      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-medium"
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">দ্রব্যাদির বিবরণ</label>
                    <input
                      type="text"
                      value={it.desc}
                      onChange={(e) =>
                        handleItemChange(it.id, (prev) => ({ ...prev, desc: e.target.value }))
                      }
                      placeholder="যেমন: সঞ্চয়ী হিসাব জমা বহি"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">পরিমাণ</label>
                    <input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => {
                        const q = parseInt(e.target.value) || 1;
                        handleItemChange(it.id, (prev) => ({ ...prev, qty: q }));
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">একক</label>
                    <input
                      type="text"
                      value={it.unit}
                      onChange={(e) =>
                        handleItemChange(it.id, (prev) => ({ ...prev, unit: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200">
                    <span className="text-[10px] font-bold text-blue-900 block mb-1">প্রতিষ্ঠান ১ একক দর (৳)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={it.v1_up}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleItemChange(it.id, (prev) => ({ ...prev, v1_up: val }));
                      }}
                      className="w-full px-2 py-1 text-xs border border-blue-300 rounded font-bold bg-white"
                    />
                    <span className="text-[10px] text-blue-700 mt-1 block font-bold">
                      মোট: ৳ {formatPriceBn(it.v1_up * it.qty)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">প্রতিষ্ঠান ২ একক দর (৳)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={it.v2_up}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleItemChange(it.id, (prev) => ({ ...prev, v2_up: val }));
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      মোট: ৳ {formatPriceBn(it.v2_up * it.qty)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">প্রতিষ্ঠান ৩ একক দর (৳)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={it.v3_up}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleItemChange(it.id, (prev) => ({ ...prev, v3_up: val }));
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      মোট: ৳ {formatPriceBn(it.v3_up * it.qty)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Summary Pill */}
          <div className="mt-4 p-4 bg-blue-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-xs opacity-80 uppercase block">সর্বনিম্ন দরদাতা মোট বিল</span>
              <span className="text-xl font-black">৳ {formatPriceBn(grandTotalV1)}</span>
            </div>
            <div className="text-xs text-right space-y-0.5 sm:border-l sm:border-blue-700 sm:pl-4">
              <div>মূসক ({toBn(vatRate)}%): ৳ {formatPriceBn(vatDeductAmt)}</div>
              <div>উৎস কর ({toBn(taxRate)}%): ৳ {formatPriceBn(taxDeductAmt)}</div>
              <div className="font-bold text-emerald-300">নিট প্রদেয়: ৳ {formatPriceBn(netPayment)}</div>
            </div>
          </div>
        </div>

        {/* Section 4: Budget */}
        <div className="mb-6">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 mb-4">
            ৪. বাজেট তথ্য
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">বাজেট বরাদ্দ (৳)</label>
              <input
                type="number"
                value={budgetAlloc}
                onChange={(e) => setBudgetAlloc(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">পূর্ববর্তী প্রভিশন (৳)</label>
              <input
                type="number"
                value={budgetPrev}
                onChange={(e) => setBudgetPrev(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">অতিরিক্ত বরাদ্দ (৳)</label>
              <input
                type="number"
                value={budgetExtra}
                onChange={(e) => setBudgetExtra(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">এ পর্যন্ত খরচ (৳)</label>
              <input
                type="number"
                value={budgetTillNow}
                onChange={(e) => setBudgetTillNow(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center pt-4 border-t border-slate-200">
          <button
            onClick={() => {
              setShowModal(true);
              setCurrentModalPage(0);
            }}
            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <span>📑 Preview &amp; Generate Documents</span>
          </button>
        </div>
      </div>

      {/* Modal View */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Top Bar */}
            <div className="bg-blue-900 text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm sm:text-base font-serif">
                  ডকুমেন্ট প্রিভিউ (পৃষ্ঠা {toBn(currentModalPage + 1)} / ২)
                </span>
                <span className="text-xs bg-blue-800 px-2.5 py-0.5 rounded-full">
                  {currentModalPage === 0 ? "১. নোট শিট" : "২. কার্যাদেশ (Work Order)"}
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-serif leading-relaxed text-sm bg-white">
              {/* PAGE 1: Note Sheet */}
              {currentModalPage === 0 && (
                <div className="space-y-4">
                  <div className="text-center font-bold text-base underline leading-snug">
                    বিষয় :- অঞ্চলাধীন শাখাসমূহের জন্য মুদ্রিত স্টেশনারী সামগ্রী মুদ্রণ বাবদ বিল প্রদান প্রসঙ্গে ।
                  </div>
                  <p className="text-justify leading-relaxed">
                    অত্র অঞ্চলাধীন শাখাসমূহের চাহিদার প্রেক্ষিতে নিম্নোক্ত {toBn(items.length)} টি আইটেমের মুদ্রিত
                    স্টেশনারী দ্রব্যাদি ক্রয়/মুদ্রণ প্রক্রিয়ায় স্থানীয় ৩ (তিন) টি সরবরাহকারী প্রতিষ্ঠান হতে কোটেশন চাওয়া
                    হয়। প্রাপ্ত ৩ টি দরপত্রের তুলনামূলক বিবরণী পর্যালোচনা করে সর্বনিম্ন দরদাতা প্রতিষ্ঠান ‘{v1Name.split(",")[0]}’
                    হতে {vatTaxStr} মোট ৳= {formatPriceBn(grandTotalV1)} ({numberToWordsBn(grandTotalV1)}) টাকা মাত্র
                    মূল্যে মালামাল মুদ্রণ ও সরবরাহ গ্রহণ করা হয়েছে।
                  </p>

                  <table className="w-full border-collapse my-3 text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th rowSpan={2} className="border border-slate-700 p-1.5 text-center">
                          ক্রম
                        </th>
                        <th rowSpan={2} className="border border-slate-700 p-1.5 text-left">
                          দ্রব্যাদির বিবরণ
                        </th>
                        <th rowSpan={2} className="border border-slate-700 p-1.5 text-center">
                          পরিমাণ
                        </th>
                        <th colSpan={2} className="border border-slate-700 p-1.5 text-center">
                          {v1Name.split(",")[0]}
                        </th>
                        <th colSpan={2} className="border border-slate-700 p-1.5 text-center">
                          {v2Name.split(",")[0]}
                        </th>
                        <th colSpan={2} className="border border-slate-700 p-1.5 text-center">
                          {v3Name.split(",")[0]}
                        </th>
                        <th rowSpan={2} className="border border-slate-700 p-1.5 text-center">
                          মন্তব্য
                        </th>
                      </tr>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-700 p-1">একক দর</th>
                        <th className="border border-slate-700 p-1">মোট</th>
                        <th className="border border-slate-700 p-1">একক দর</th>
                        <th className="border border-slate-700 p-1">মোট</th>
                        <th className="border border-slate-700 p-1">একক দর</th>
                        <th className="border border-slate-700 p-1">মোট</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id}>
                          <td className="border border-slate-700 p-1 text-center">{toBn(idx + 1)}</td>
                          <td className="border border-slate-700 p-1 text-left">{it.desc}</td>
                          <td className="border border-slate-700 p-1 text-center">
                            {toBn(it.qty)} {it.unit}
                          </td>
                          <td className="border border-slate-700 p-1 text-right">{formatPriceBn(it.v1_up)}</td>
                          <td className="border border-slate-700 p-1 text-right">
                            {formatPriceBn(it.v1_up * it.qty)}
                          </td>
                          <td className="border border-slate-700 p-1 text-right">{formatPriceBn(it.v2_up)}</td>
                          <td className="border border-slate-700 p-1 text-right">
                            {formatPriceBn(it.v2_up * it.qty)}
                          </td>
                          <td className="border border-slate-700 p-1 text-right">{formatPriceBn(it.v3_up)}</td>
                          <td className="border border-slate-700 p-1 text-right">
                            {formatPriceBn(it.v3_up * it.qty)}
                          </td>
                          <td className="border border-slate-700 p-1 text-center font-bold text-blue-900">
                            {it.v1_note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-slate-100">
                        <td colSpan={3} className="border border-slate-700 p-2 text-right">
                          {vatTaxStr} সর্বমোট =
                        </td>
                        <td colSpan={2} className="border border-slate-700 p-2 text-right font-black text-blue-950">
                          ৳ {formatPriceBn(grandTotalV1)}
                        </td>
                        <td colSpan={2} className="border border-slate-700 p-2 text-right">
                          ৳ {formatPriceBn(items.reduce((s, it) => s + it.v2_up * it.qty, 0))}
                        </td>
                        <td colSpan={2} className="border border-slate-700 p-2 text-right">
                          ৳ {formatPriceBn(items.reduce((s, it) => s + it.v3_up * it.qty, 0))}
                        </td>
                        <td className="border border-slate-700 p-2 text-center">-</td>
                      </tr>
                    </tfoot>
                  </table>

                  <p className="text-justify leading-relaxed">
                    অতএব, বর্ণিত দ্রব্যাদির সরবরাহ গ্রহণপূর্বক সর্বনিম্ন দরদাতা প্রতিষ্ঠান ‘{v1Name.split(",")[0]}’ কে{" "}
                    {vatTaxStr} মোট ৳= {formatPriceBn(grandTotalV1)} ({numberToWordsBn(grandTotalV1)}) টাকা মাত্র বিল
                    প্রদানের সুপারিশ করা হলো।
                  </p>

                  <div className="pt-6 space-y-4">
                    <p>
                      <u>
                        <b>আঞ্চলিক ব্যবস্থাপক ঃ-</b>
                      </u>{" "}
                      অনুমোদিত।
                    </p>
                  </div>
                </div>
              )}

              {/* PAGE 2: Work Order */}
              {currentModalPage === 1 && (
                <div className="space-y-4">
                  <div className="text-center font-bold text-lg text-blue-950 border-b pb-2">
                    {systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"}
                  </div>
                  <div className="text-center text-xs text-slate-600">{branchName}</div>

                  <div className="flex justify-between text-xs pt-2 border-b pb-1">
                    <span>{memoOrder}</span>
                    <span>তারিখ : {formattedDate}</span>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p>
                      <strong>{recipientTitle},</strong>
                    </p>
                    <p>{v1Name}</p>
                  </div>

                  <div className="text-center font-bold text-sm underline pt-2">
                    বিষয় ঃ মনোহরী দ্রব্যাদি মুদ্রণ ও সরবরাহের কার্যাদেশ ।
                  </div>

                  <p className="text-justify leading-relaxed">
                    প্রিয় মহোদয়,
                    <br />
                    আপনার দাখিলকৃত {woQuoteDate} তারিখের কোটেশনে প্রস্তাবিত দর সর্বনিম্ন বিবেচিত হওয়ায় নিম্নবর্ণিত শর্তাবলী
                    অনুযায়ী দ্রব্যাদি মুদ্রণপূর্বক অত্র কার্যালয়ে সরবরাহের কার্যাদেশ প্রদান করা হলো ঃ
                  </p>

                  <div className="space-y-1.5 pl-4 text-xs">
                    <p>১। অত্র কার্যালয় কর্তৃক সরবরাহকৃত নমুনা অনুযায়ী দ্রব্যাদি নির্ভুল মুদ্রণ করতে হবে।</p>
                    <p>২। নিম্নমানের কাগজ, কালি বা বাঁধাই গ্রহণীয় হবে না।</p>
                    <p>৩। কার্যাদেশ প্রদানের ৭ (সাত) দিনের মধ্যে দ্রব্যাদি অত্র কার্যালয়ে সরবরাহ করতে হবে।</p>
                    <p>৪। মালামাল সরবরাহের পর যথাযথ যাচাই সাপেক্ষে বিল অনুমোদন ও পরিশোধ করা হবে।</p>
                    <p>৫। সরকারি বিধি মোতাবেক বিল হতে {toBn(vatRate)}% হারে মূসক ও {toBn(taxRate)}% হারে আয়কর কর্তন করা হবে।</p>
                    <p>৬। কোনো প্রকার শর্ত লঙ্ঘন হলে কার্যাদেশ বাতিল করার অধিকার কর্তৃপক্ষ সংরক্ষণ করে।</p>
                  </div>

                  <div className="flex justify-end pt-12">
                    <div className="text-center">
                      <p>আপনার বিশ্বস্ত,</p>
                      <div className="h-10"></div>
                      <p className="font-bold">আঞ্চলিক ব্যবস্থাপক</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-slate-100 p-4 px-6 flex items-center justify-between border-t border-slate-300">
              <div className="flex items-center gap-2">
                <button
                  disabled={currentModalPage <= 0}
                  onClick={() => setCurrentModalPage((p) => Math.max(0, p - 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold transition-all"
                >
                  ◀ Previous Page
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Page {currentModalPage + 1} of 2
                </span>
                <button
                  disabled={currentModalPage >= 1}
                  onClick={() => setCurrentModalPage((p) => Math.min(1, p + 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold transition-all"
                >
                  Next Page ▶
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5"
                >
                  <span>⬇️ Print / PDF</span>
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs transition-all"
                >
                  Close
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
                <h3 className="font-bold text-sm">
                  {currentUser?.role === "Super Admin"
                    ? "SQLite সেন্ট্রাল ডাটাবেজে সংরক্ষিত স্টেশনারী চালান তালিকা"
                    : "সংরক্ষিত স্টেশনারী চালান তালিকা"}
                </h3>
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
                  <p className="text-sm font-semibold">কোনো সংরক্ষিত চালান পাওয়া যায়নি।</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {currentUser?.role === "Super Admin"
                      ? '"SQLite-এ সংরক্ষণ" বাটনে ক্লিক করে বর্তমান চালানটি সেন্ট্রাল ডাটাবেজে সংরক্ষণ করতে পারেন।'
                      : 'সংরক্ষণ বাটনে ক্লিক করে বর্তমান চালানটি সংরক্ষণ করতে পারেন।'}
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
                        {doc.title || "স্টেশনারী চালান"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        তারিখ: {doc.docDate || "N/A"} • প্রদেয় টাকা: ৳={formatPriceBn(doc.totalAmount || 0)}/-
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
