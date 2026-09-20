import React, { useState, useEffect } from "react";
import { User, SystemSettings, Office, FinancialYear } from "../../types";
import { apiFetch } from "../../api";
import { Database, Save, FolderOpen, CheckCircle2, Trash2 } from "lucide-react";

interface MultiItemBillToolProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  offices?: Office[];
  financialYears?: FinancialYear[];
  selectedFY?: string;
  onBack: () => void;
}

const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (s: string | number) => String(s).replace(/[0-9]/g, (d) => BN[+d]);
const toNum = (s: string | number) =>
  parseFloat(String(s).replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/,/g, "")) || 0;

function formatPriceBn(num: number | string): string {
  const n = typeof num === "number" ? num : parseFloat(String(num)) || 0;
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const intFormatted = parseInt(intPart).toLocaleString("en-IN");
  return toBn(intFormatted + "." + decPart) + "/-";
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

interface ItemVendor {
  name: string;
  unit: number | string;
  qty: number;
  price: number | string;
  vat: number;
  tax: number;
  note: string;
}

interface ItemBlock {
  id: number;
  desc: string;
  item_qty: number;
  item_qty_words: string;
  v1: ItemVendor;
  v2: ItemVendor;
  v3: ItemVendor;
}

interface BranchEntry {
  id: number;
  code: string;
  itemIdx: number;
  qty: number;
  amt: number;
}

const DEFAULT_BRANCH_LIST = [
  { code: "3301", name: "কাপ্তাই শাখা" },
  { code: "3302", name: "রাইখালী বাজার শাখা" },
  { code: "3303", name: "বিলাইছড়ি শাখা" },
  { code: "3304", name: "রাজস্থলী শাখা" },
  { code: "3501", name: "রাঙ্গামাটি শাখা" },
  { code: "3502", name: "নানিয়ারচর শাখা" },
  { code: "3503", name: "বরকল শাখা" },
  { code: "3504", name: "লংগদু শাখা" },
  { code: "3505", name: "কাউখালী শাখা" },
  { code: "3506", name: "জুরাছড়ি শাখা" },
  { code: "3507", name: "বাঘাইছড়ি শাখা" },
];

export function MultiItemBillTool({ currentUser, systemSettings, offices, financialYears, selectedFY, onBack }: MultiItemBillToolProps) {
  const activeFY = financialYears?.find((f) => f.id === selectedFY)?.name || "2024-25";

  const userOffice = offices?.find((o) => o.id === currentUser.officeId)?.name;

  // General fields
  const [branchName, setBranchName] = useState(
    userOffice
      ? `${systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"}, ${userOffice}`
      : "বাংলাদেশ কৃষি ব্যাংক, লংগদু শাখা, রাঙ্গামাটি",
  );
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [memoNoOrder, setMemoNoOrder] = useState("সূত্র নং-প্রশা-১(১৪)/২০২৪-২০২৫/");
  const [memoNoForward, setMemoNoForward] = useState("সূত্র নং-কম্পিউ-০৪ (অংশ-০৩)/২০২৪-২০২৫/");
  const [accountHead, setAccountHead] = useState("১৩৯/০৬");
  const [hasMusk, setHasMusk] = useState(false);
  const [muskChallanNo, setMuskChallanNo] = useState("");
  const [muskChallanDate, setMuskChallanDate] = useState("");
  const [muskChallanAmount, setMuskChallanAmount] = useState(0);

  // Recipient
  const [recipientName, setRecipientName] = useState("প্রোপাইটর");
  const [recipientTitle, setRecipientTitle] = useState("প্রোপাইটর");
  const [recipientOrg, setRecipientOrg] = useState("আইডিয়াল কম্পিউটার, আদালত সড়ক, খাগড়াছড়ি");

  // Items state
  const [items, setItems] = useState<ItemBlock[]>([
    {
      id: 1,
      desc: "নতুন DVR (Hikvision Turbo HD DVR-7100)",
      item_qty: 1,
      item_qty_words: "এক",
      v1: {
        name: "আইডিয়াল কম্পিউটার, আদালত সড়ক, খাগড়াছড়ি",
        unit: 6720,
        qty: 1,
        price: 6720,
        vat: 15,
        tax: 5,
        note: "সর্বনিম্ন দরদাতা",
      },
      v2: {
        name: "পিসি ওয়ার্ল্ড, বনরূপা, রাঙ্গামাটি",
        unit: 7500,
        qty: 1,
        price: 7500,
        vat: 15,
        tax: 5,
        note: "সর্বোচ্চ দরদাতা",
      },
      v3: {
        name: "অটোনমিক্স কম্পিউটার সিস্টেম, বনরূপা, রাঙ্গামাটি",
        unit: 7350,
        qty: 1,
        price: 7350,
        vat: 15,
        tax: 5,
        note: "২য় সর্বনিম্ন দরদাতা",
      },
    },
  ]);

  // Branch allocations
  const [branches, setBranches] = useState<BranchEntry[]>([
    { id: 1, code: "3504", itemIdx: 0, qty: 1, amt: 6720 },
  ]);

  // Budget
  const [budgetAlloc, setBudgetAlloc] = useState(200000);
  const [budgetPrev, setBudgetPrev] = useState(191238);
  const [budgetExtra, setBudgetExtra] = useState(0);
  const [budgetTillNow, setBudgetTillNow] = useState(0);
  const [budgetYear, setBudgetYear] = useState(toBn(activeFY));

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentModalPage, setCurrentModalPage] = useState(0);

  const handleAddItem = () => {
    const newId = (items.length > 0 ? Math.max(...items.map((i) => i.id)) : 0) + 1;
    const v1n = items[0]?.v1.name || "আইডিয়াল কম্পিউটার, আদালত সড়ক, খাগড়াছড়ি";
    const v2n = items[0]?.v2.name || "পিসি ওয়ার্ল্ড, বনরূপা, রাঙ্গামাটি";
    const v3n = items[0]?.v3.name || "অটোনমিক্স কম্পিউটার সিস্টেম, বনরূপা, রাঙ্গামাটি";
    setItems([
      ...items,
      {
        id: newId,
        desc: "",
        item_qty: 1,
        item_qty_words: "এক",
        v1: { name: v1n, unit: "", qty: 1, price: "", vat: 15, tax: 5, note: "সর্বনিম্ন দরদাতা" },
        v2: { name: v2n, unit: "", qty: 1, price: "", vat: 15, tax: 5, note: "সর্বোচ্চ দরদাতা" },
        v3: { name: v3n, unit: "", qty: 1, price: "", vat: 15, tax: 5, note: "২য় সর্বনিম্ন দরদাতা" },
      },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: number, updater: (prev: ItemBlock) => ItemBlock) => {
    setItems(items.map((it) => (it.id === id ? updater(it) : it)));
  };

  const handleAddBranch = () => {
    const newId = (branches.length > 0 ? Math.max(...branches.map((b) => b.id)) : 0) + 1;
    setBranches([...branches, { id: newId, code: DEFAULT_BRANCH_LIST[0].code, itemIdx: 0, qty: 1, amt: 0 }]);
  };

  const handleRemoveBranch = (id: number) => {
    setBranches(branches.filter((b) => b.id !== id));
  };

  // Grand Total calculation
  const grandTotalRaw = items.reduce((sum, it) => sum + (toNum(it.v1.price) || 0), 0);
  const totalAlloc = budgetAlloc + budgetPrev;
  const grandAlloc = totalAlloc + budgetExtra;
  const spentTotal = budgetTillNow + grandTotalRaw;
  const remBudget = grandAlloc - spentTotal;

  // Formatted date
  const formattedDate = docDate
    ? (() => {
        const d = new Date(docDate);
        return `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}/${toBn(d.getFullYear())}`;
      })()
    : "[তারিখ]";

  // All item descriptions formatted
  const allItemDescs =
    items.length === 1
      ? `${toBn(items[0].item_qty)} (${items[0].item_qty_words}) টি ${items[0].desc}`
      : items.map((it, i) => `(${toBn(i + 1)}) ${toBn(it.item_qty)} (${it.item_qty_words}) টি ${it.desc}`).join(", ");

  const primaryV1Name = items[0]?.v1.name || recipientOrg;

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
          setSavedDocs(data.filter((d: any) => d.toolType === "multi_item_bill"));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch saved multi item bills:", e);
    }
  };

  useEffect(() => {
    loadSavedDocs();
  }, []);

  const handleSaveToDatabase = async () => {
    setIsSavingDb(true);
    const docId = `multi-${Date.now()}`;
    const payload = {
      branchName,
      docDate,
      memoNoOrder,
      memoNoForward,
      accountHead,
      hasMusk,
      muskChallanNo,
      muskChallanDate,
      muskChallanAmount,
      recipientName,
      recipientTitle,
      recipientOrg,
      items,
      branches,
      budgetAlloc,
      budgetPrev,
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
          toolType: "multi_item_bill",
          title: `বহু-আইটেম বিল (${items.length} টি পণ্য)`,
          docDate,
          totalAmount: grandTotalRaw,
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
    if (p.branchName) setBranchName(p.branchName);
    if (p.docDate) setDocDate(p.docDate);
    if (p.memoNoOrder) setMemoNoOrder(p.memoNoOrder);
    if (p.memoNoForward) setMemoNoForward(p.memoNoForward);
    if (p.accountHead) setAccountHead(p.accountHead);
    if (p.hasMusk !== undefined) setHasMusk(p.hasMusk);
    if (p.muskChallanNo) setMuskChallanNo(p.muskChallanNo);
    if (p.muskChallanDate) setMuskChallanDate(p.muskChallanDate);
    if (p.muskChallanAmount !== undefined) setMuskChallanAmount(p.muskChallanAmount);
    if (p.recipientName) setRecipientName(p.recipientName);
    if (p.recipientTitle) setRecipientTitle(p.recipientTitle);
    if (p.recipientOrg) setRecipientOrg(p.recipientOrg);
    if (p.items) setItems(p.items);
    if (p.branches) setBranches(p.branches);
    if (p.budgetAlloc !== undefined) setBudgetAlloc(p.budgetAlloc);
    if (p.budgetPrev !== undefined) setBudgetPrev(p.budgetPrev);
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Database size={12} /> SQLite সেন্ট্রাল ডাটাবেজ
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 font-serif">
              বহু-আইটেম বিল ও কোটেশন জেনারেটর (Multi-Item Bill &amp; CS)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              একাদিক পণ্যের ৩-দরদাতা তুলনামূলক বিবরণী (CS), নোটশিট, সরবরাহ আদেশ এবং ফরোয়ার্ডিং চিঠি প্রস্তুতকরণ
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
              <span>সংরক্ষিত বিলসমূহ ({savedDocs.length})</span>
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
              onClick={() => {
                setShowModal(true);
                setCurrentModalPage(0);
              }}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>📑 Generate Templates</span>
            </button>
          </div>
        </div>

        {/* Section 1: General Info */}
        <div className="mb-6">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 mb-4">
            ১. সাধারণ তথ্য
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">শাখা/অফিসের নাম</label>
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
              <label className="text-xs font-semibold text-slate-600 mb-1 block">মেমো/সূত্র নম্বর (সরবরাহ আদেশ)</label>
              <input
                type="text"
                value={memoNoOrder}
                onChange={(e) => setMemoNoOrder(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">মেমো/সূত্র নম্বর (ফরোয়ার্ডিং)</label>
              <input
                type="text"
                value={memoNoForward}
                onChange={(e) => setMemoNoForward(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">হিসাব খাত ও কোড (DEBIT)</label>
              <select
                value={accountHead}
                onChange={(e) => setAccountHead(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="১৩৯/০৬">১৩৯/০৬ (কম্পিউটার ও সরঞ্জামাদি)</option>
                <option value="১৩৯/০৭">১৩৯/০৭ (আসবাবপত্র ও সামগ্রী)</option>
                <option value="১৩২">১৩২ (স্টেশনারী সামগ্রী)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Items & 3 Vendors each */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 mb-4">
            <span>২. ক্রয়কৃত আইটেম ও দরদাতা বিবরণী</span>
            <button
              onClick={handleAddItem}
              className="px-3 py-1 bg-white text-emerald-700 hover:bg-emerald-100 rounded-md font-bold shadow-sm"
            >
              + নতুন আইটেম যোগ করুন
            </button>
          </div>

          <div className="space-y-6">
            {items.map((it, idx) => (
              <div key={it.id} className="border-2 border-emerald-600 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-emerald-50 p-3 px-4 flex items-center justify-between border-b border-emerald-200 font-bold text-emerald-900 text-sm">
                  <span>📦 আইটেম {toBn(idx + 1)}</span>
                  {items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(it.id)}
                      className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                    >
                      ✕ মুছুন
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        পণ্যের পূর্ণ বিবরণ (যেমন: নতুন DVR Hikvision Turbo HD...)
                      </label>
                      <textarea
                        value={it.desc}
                        onChange={(e) =>
                          handleItemChange(it.id, (prev) => ({ ...prev, desc: e.target.value }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">পরিমাণ (সংখ্যা ও কথায়)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={it.item_qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            handleItemChange(it.id, (prev) => ({
                              ...prev,
                              item_qty: val,
                              item_qty_words: numberToWordsBn(val),
                            }));
                          }}
                          className="w-20 px-2 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          value={it.item_qty_words}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm border border-emerald-300 rounded-lg bg-emerald-50 text-emerald-900 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vendor 1 (Winning Bidder) */}
                  <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-3">
                    <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                      <span>🏆 দরদাতা ১ (সর্বনিম্ন দরদাতা - পেমেন্ট পাবেন)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">নাম ও ঠিকানা</label>
                        <input
                          type="text"
                          value={it.v1.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(it.id, (prev) => ({
                              ...prev,
                              v1: { ...prev.v1, name: val },
                            }));
                            if (idx === 0) setRecipientOrg(val);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">একক মূল্য (৳)</label>
                        <input
                          type="number"
                          value={it.v1.unit}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleItemChange(it.id, (prev) => ({
                              ...prev,
                              v1: { ...prev.v1, unit: val, price: val * (prev.v1.qty || 1) },
                            }));
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">মোট মূল্য (৳)</label>
                        <input
                          type="number"
                          value={it.v1.price}
                          readOnly
                          className="w-full px-3 py-1.5 text-xs border border-emerald-400 bg-emerald-100/70 text-emerald-900 rounded font-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vendor 2 & Vendor 3 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-semibold text-xs text-slate-700">দরদাতা ২</div>
                      <input
                        type="text"
                        value={it.v2.name}
                        onChange={(e) =>
                          handleItemChange(it.id, (prev) => ({
                            ...prev,
                            v2: { ...prev.v2, name: e.target.value },
                          }))
                        }
                        placeholder="নাম ও ঠিকানা"
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={it.v2.unit}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleItemChange(it.id, (prev) => ({
                              ...prev,
                              v2: { ...prev.v2, unit: val, price: val * (prev.v2.qty || 1) },
                            }));
                          }}
                          placeholder="দর"
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                        <input
                          type="text"
                          value={it.v2.note}
                          onChange={(e) =>
                            handleItemChange(it.id, (prev) => ({
                              ...prev,
                              v2: { ...prev.v2, note: e.target.value },
                            }))
                          }
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-semibold text-xs text-slate-700">দরদাতা ৩</div>
                      <input
                        type="text"
                        value={it.v3.name}
                        onChange={(e) =>
                          handleItemChange(it.id, (prev) => ({
                            ...prev,
                            v3: { ...prev.v3, name: e.target.value },
                          }))
                        }
                        placeholder="নাম ও ঠিকানা"
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={it.v3.unit}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleItemChange(it.id, (prev) => ({
                              ...prev,
                              v3: { ...prev.v3, unit: val, price: val * (prev.v3.qty || 1) },
                            }));
                          }}
                          placeholder="দর"
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                        <input
                          type="text"
                          value={it.v3.note}
                          onChange={(e) =>
                            handleItemChange(it.id, (prev) => ({
                              ...prev,
                              v3: { ...prev.v3, note: e.target.value },
                            }))
                          }
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Branch Entries (1114) */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 mb-4">
            <span>৩. ১১১৪ শাখা এন্ট্রি (ডেবিট সারসংক্ষেপ)</span>
            <button
              onClick={handleAddBranch}
              className="px-3 py-1 bg-white text-emerald-700 hover:bg-emerald-100 rounded-md font-bold shadow-sm"
            >
              + শাখা যোগ করুন
            </button>
          </div>

          <div className="space-y-3">
            {branches.map((br) => {
              return (
                <div
                  key={br.id}
                  className="p-3 bg-slate-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-center gap-3 text-xs"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">শাখার নাম</label>
                    <select
                      value={br.code}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBranches(branches.map((b) => (b.id === br.id ? { ...b, code: val } : b)));
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      {DEFAULT_BRANCH_LIST.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">আইটেম</label>
                    <select
                      value={br.itemIdx}
                      onChange={(e) => {
                        const idxVal = parseInt(e.target.value);
                        const selItem = items[idxVal];
                        const unitVal = toNum(selItem?.v1.unit) || 0;
                        setBranches(
                          branches.map((b) =>
                            b.id === br.id
                              ? { ...b, itemIdx: idxVal, amt: unitVal * b.qty }
                              : b,
                          ),
                        );
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      {items.map((it, idx) => (
                        <option key={it.id} value={idx}>
                          {toBn(idx + 1)}. {it.desc || `আইটেম ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">পরিমাণ</label>
                    <input
                      type="number"
                      min={1}
                      value={br.qty}
                      onChange={(e) => {
                        const q = parseInt(e.target.value) || 1;
                        const selItem = items[br.itemIdx];
                        const unitVal = toNum(selItem?.v1.unit) || 0;
                        setBranches(
                          branches.map((b) =>
                            b.id === br.id ? { ...b, qty: q, amt: unitVal * q } : b,
                          ),
                        );
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">টাকা (৳)</label>
                    <input
                      type="number"
                      value={br.amt}
                      onChange={(e) => {
                        const a = parseFloat(e.target.value) || 0;
                        setBranches(branches.map((b) => (b.id === br.id ? { ...b, amt: a } : b)));
                      }}
                      className="w-full px-2.5 py-1.5 border border-emerald-400 bg-emerald-50 rounded font-bold text-emerald-900"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveBranch(br.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Budget */}
        <div className="mb-6">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 mb-4">
            ৪. বাজেট ও আর্থিক তথ্য
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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
              <label className="text-xs font-semibold text-slate-600 mb-1 block">পূর্ববর্তী খরচ/প্রভিশন (৳)</label>
              <input
                type="number"
                value={budgetPrev}
                onChange={(e) => setBudgetPrev(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">অতিরিক্ত বরাদ্দ (ঐচ্ছিক)</label>
              <input
                type="number"
                value={budgetExtra}
                onChange={(e) => setBudgetExtra(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">অর্থ-বছর</label>
              <input
                type="text"
                value={budgetYear}
                onChange={(e) => setBudgetYear(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">এ পর্যন্ত খরচ (আপ টু ডেট)</label>
              <input
                type="number"
                value={budgetTillNow}
                onChange={(e) => setBudgetTillNow(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-bold flex flex-col justify-center">
              <div>মোট বিল খরচ: ৳ {formatPriceBn(grandTotalRaw)}</div>
              <div>অবশিষ্ট বরাদ্দ: ৳ {formatPriceBn(remBudget)}</div>
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
            className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <span>📑 Preview &amp; Generate Documents</span>
          </button>
        </div>
      </div>

      {/* Modal Multi-Page Document View */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Top Bar */}
            <div className="bg-emerald-800 text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm sm:text-base font-serif">
                  ডকুমেন্ট প্রিভিউ (পৃষ্ঠা {toBn(currentModalPage + 1)} / ৩)
                </span>
                <span className="text-xs bg-emerald-700 px-2.5 py-0.5 rounded-full">
                  {currentModalPage === 0
                    ? "১. নোট শিট"
                    : currentModalPage === 1
                      ? "২. সরবরাহ আদেশ"
                      : "৩. ফরোয়ার্ডিং চিঠি"}
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
            <div
              id="multi-item-doc-area"
              className="flex-1 overflow-y-auto p-6 sm:p-10 font-serif leading-relaxed text-sm bg-white"
            >
              {/* PAGE 1: Note Sheet */}
              {currentModalPage === 0 && (
                <div className="space-y-4">
                  <div className="text-center font-bold text-base underline leading-snug">
                    বিষয় :- {allItemDescs} ক্রয়ের বিল প্রদান প্রসঙ্গে।
                  </div>
                  <p className="text-justify leading-relaxed">
                    অত্র অঞ্চলের শাখা কার্যালয়ের চাহিদার প্রেক্ষিতে {allItemDescs} ক্রয়ের নিমিত্তে ৩ টি প্রতিষ্ঠানের
                    দরপত্র সংগ্রহ করা হয়। প্রাপ্ত দরপত্রসমূহের মধ্যে সর্বনিম্ন দরদাতা প্রতিষ্ঠান ‘{primaryV1Name}’
                    হতে ১৫% মূসক ও ৫% আয়করসহ মোট ৳= {formatPriceBn(grandTotalRaw)} ({numberToWordsBn(grandTotalRaw)}) টাকা
                    মাত্র মূল্যে পণ্য সরবরাহ গ্রহণ করা হয়েছে।
                  </p>

                  <table className="w-full border-collapse my-3 text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-700 p-1.5 text-center">ক্রম</th>
                        <th className="border border-slate-700 p-1.5 text-left">পণ্যের বিবরণ</th>
                        <th className="border border-slate-700 p-1.5 text-left">দরদাতা প্রতিষ্ঠানের নাম</th>
                        <th className="border border-slate-700 p-1.5 text-center">একক মূল্য</th>
                        <th className="border border-slate-700 p-1.5 text-right">মোট মূল্য</th>
                        <th className="border border-slate-700 p-1.5 text-center">মন্তব্য</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <React.Fragment key={it.id}>
                          <tr>
                            <td rowSpan={3} className="border border-slate-700 p-1.5 text-center font-bold">
                              {toBn(idx + 1)}
                            </td>
                            <td rowSpan={3} className="border border-slate-700 p-1.5 text-left">
                              {toBn(it.item_qty)} ({it.item_qty_words}) টি {it.desc}
                            </td>
                            <td className="border border-slate-700 p-1 text-left">{it.v1.name}</td>
                            <td className="border border-slate-700 p-1 text-center">= {formatPriceBn(it.v1.unit)}</td>
                            <td className="border border-slate-700 p-1 text-right">= {formatPriceBn(it.v1.price)}</td>
                            <td className="border border-slate-700 p-1 text-center">{it.v1.note}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-700 p-1 text-left">{it.v2.name}</td>
                            <td className="border border-slate-700 p-1 text-center">= {formatPriceBn(it.v2.unit)}</td>
                            <td className="border border-slate-700 p-1 text-right">= {formatPriceBn(it.v2.price)}</td>
                            <td className="border border-slate-700 p-1 text-center">{it.v2.note}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-700 p-1 text-left">{it.v3.name}</td>
                            <td className="border border-slate-700 p-1 text-center">= {formatPriceBn(it.v3.unit)}</td>
                            <td className="border border-slate-700 p-1 text-right">= {formatPriceBn(it.v3.price)}</td>
                            <td className="border border-slate-700 p-1 text-center">{it.v3.note}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-slate-50">
                        <td colSpan={4} className="border border-slate-700 p-2 text-right">
                          সর্বমোট (সর্বনিম্ন দরদাতা অনুযায়ী)
                        </td>
                        <td className="border border-slate-700 p-2 text-right">= {formatPriceBn(grandTotalRaw)}</td>
                        <td className="border border-slate-700 p-2 text-center">-</td>
                      </tr>
                    </tfoot>
                  </table>

                  <p className="text-justify leading-relaxed">
                    উক্ত দরপত্রসমূহের মধ্যে সর্বনিম্ন দরদাতা প্রতিষ্ঠান ‘{primaryV1Name}’ হতে মোট ৳=
                    {formatPriceBn(grandTotalRaw)} ({numberToWordsBn(grandTotalRaw)}) টাকা মাত্র মূল্যে উক্ত সামগ্রী
                    সরবরাহ গ্রহণ করা হয়েছে। উক্ত বিলটি অনুমোদনের জন্য উপস্থাপন করা হলো।
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

              {/* PAGE 2: Supply Order */}
              {currentModalPage === 1 && (
                 <div className="space-y-4">
                   <div className="text-center font-bold text-lg text-emerald-900 border-b pb-2">
                    {systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"}
                  </div>
                  <div className="text-center text-xs text-slate-600">{branchName}</div>

                  <div className="flex justify-between text-xs pt-2 border-b pb-1">
                    <span>{memoNoOrder}</span>
                    <span>তারিখ : {formattedDate}</span>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p>
                      <strong>{recipientTitle},</strong>
                    </p>
                    <p>{recipientOrg}</p>
                  </div>

                  <div className="text-center font-bold text-sm underline pt-2">
                    বিষয় : {allItemDescs} সরবরাহের আদেশ।
                  </div>

                  <p className="text-justify leading-relaxed">
                    প্রিয় মহোদয়,
                    <br />
                    উপর্যুক্ত বিষয়ে আপনার দাখিলকৃত কোটেশনের সর্বনিম্ন দর গৃহীত হওয়ায় নিম্নবর্ণিত শর্ত সাপেক্ষে মালামাল
                    সরবরাহের আদেশ প্রদান করা হলোঃ
                  </p>

                  <div className="space-y-1 pl-4 text-xs">
                    <p>১) আদেশের ৭ (সাত) দিনের মধ্যে মালামাল অত্র কার্যালয়ে সরবরাহ করতে হবে।</p>
                    <p>২) মালামাল যথাযথভাবে পরীক্ষা-নিরীক্ষার পর সন্তোষজনক পাওয়া গেলে বিল পরিশোধ করা হবে।</p>
                    <p>৩) সরকারি বিধি মোতাবেক প্রযোজ্য মূসক ও আয়কর কর্তন করা হবে।</p>
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

              {/* PAGE 3: Forwarding Letter */}
              {currentModalPage === 2 && (
                 <div className="space-y-4">
                   <div className="text-center font-bold text-lg text-emerald-900 border-b pb-2">
                    {systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"}
                  </div>
                  <div className="text-center text-xs text-slate-600">{branchName}</div>

                  <div className="flex justify-between text-xs pt-2 border-b pb-1">
                    <span>{memoNoForward}</span>
                    <span>তারিখ : {formattedDate}</span>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p>ব্যবস্থাপক</p>
                    <p>{systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"}</p>
                    <p>রাঙ্গামাটি শাখা, রাঙ্গামাটি।</p>
                  </div>

                  <div className="text-center font-bold text-sm underline pt-2">
                    বিষয় : {allItemDescs} ক্রয়ের বিল পরিশোধ প্রসঙ্গে।
                  </div>

                  <p className="text-justify leading-relaxed">
                    জনাব,
                    <br />
                    উপর্যুক্ত বিষয়ে জানানো যাচ্ছে যে, সর্বনিম্ন দরদাতা প্রতিষ্ঠান ‘{primaryV1Name}’ হতে সরবরাহকৃত মালামালের
                    মোট বিল বাবদ ৳= {formatPriceBn(grandTotalRaw)} ({numberToWordsBn(grandTotalRaw)}) টাকা মাত্র নিম্নোক্ত
                    খাতসমূহে ডেবিট ও ক্রেডিট করার জন্য অনুরোধ করা হলোঃ
                  </p>

                  <table className="w-full border-collapse my-3 text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th colSpan={3} className="border border-slate-700 p-1.5 text-center">
                          ডেবিট (Debit)
                        </th>
                        <th colSpan={2} className="border border-slate-700 p-1.5 text-center">
                          ক্রেডিট (Credit)
                        </th>
                      </tr>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-700 p-1 text-left">হিসাব খাত</th>
                        <th className="border border-slate-700 p-1 text-left">বিবরণ</th>
                        <th className="border border-slate-700 p-1 text-right">টাকা</th>
                        <th className="border border-slate-700 p-1 text-left">হিসাব খাত</th>
                        <th className="border border-slate-700 p-1 text-right">টাকা</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((br) => {
                        const bObj = DEFAULT_BRANCH_LIST.find((b) => b.code === br.code);
                        return (
                          <tr key={br.id}>
                            <td className="border border-slate-700 p-1">১১১৪- {bObj?.name}</td>
                            <td className="border border-slate-700 p-1">{allItemDescs}</td>
                            <td className="border border-slate-700 p-1 text-right">{formatPriceBn(br.amt)}</td>
                            <td className="border border-slate-700 p-1">PO (পে-অর্ডার)</td>
                            <td className="border border-slate-700 p-1 text-right">{formatPriceBn(br.amt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

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

            {/* Modal Bottom Pagination Controls */}
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
                  Page {currentModalPage + 1} of 3
                </span>
                <button
                  disabled={currentModalPage >= 2}
                  onClick={() => setCurrentModalPage((p) => Math.min(2, p + 1))}
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
                <Database className="text-emerald-400" size={18} />
                <h3 className="font-bold text-sm">SQLite সেন্ট্রাল ডাটাবেজে সংরক্ষিত বহু-আইটেম বিল তালিকা</h3>
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
                  <p className="text-sm font-semibold">কোনো সংরক্ষিত বিল পাওয়া যায়নি।</p>
                  <p className="text-xs text-slate-400 mt-1">
                    "SQLite-এ সংরক্ষণ" বাটনে ক্লিক করে বর্তমান বিলটি সেন্ট্রাল ডাটাবেজে সংরক্ষণ করতে পারেন।
                  </p>
                </div>
              ) : (
                savedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleRestoreDoc(doc)}
                    className="p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 group-hover:text-emerald-700">
                        {doc.title || "বহু-আইটেম বিল"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        তারিখ: {doc.docDate || "N/A"} • মোট বিল: {formatPriceBn(doc.totalAmount || 0)}
                      </p>
                      <span className="text-[10px] text-slate-400">ID: {doc.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-sm">
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
