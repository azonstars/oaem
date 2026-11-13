import React, { useState, useMemo } from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  Check,
  Building2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import {
  Office,
  Category,
  FinancialYear,
  User,
  SystemSettings,
} from "../types";
import {
  getCleanInstitutionName,
} from "../utils/documentBranding";

export interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: string;
  reportTitle: string;
  reportSubtitle?: string;
  offices: Office[];
  categories: Category[];
  financialYears: FinancialYear[];
  selectedFY: string;
  filterOffice: string;
  filterCategory: string;
  filterDateFrom?: string;
  filterDateTo?: string;
  currentUser: User;
  systemSettings?: SystemSettings | null;
  displayData: any[];
  tableType: "consolidated" | "expense" | "combined";
  combinedCategories?: string[];
  filteredAllocations?: any[];
  filteredExpenses?: any[];
  formatCurrency: (amount: number) => string;
}

export function ReportPrintModal({
  isOpen,
  onClose,
  reportType,
  reportTitle,
  reportSubtitle,
  offices,
  categories,
  financialYears,
  selectedFY,
  filterOffice,
  filterCategory,
  filterDateFrom,
  filterDateTo,
  currentUser,
  systemSettings,
  displayData,
  tableType,
  combinedCategories = [],
  filteredAllocations = [],
  filteredExpenses = [],
  formatCurrency,
}: ReportPrintModalProps) {
  // Print & layout configuration states
  const [pageSize, setPageSize] = useState<"A4" | "Legal">("Legal");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [fontSizePt, setFontSizePt] = useState<number>(9.5);
  const [lineSpacing, setLineSpacing] = useState<number>(1.25);
  const [showPadHeader, setShowPadHeader] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [marginsMm, setMarginsMm] = useState<{ top: number; bottom: number; left: number; right: number }>({
    top: 10,
    bottom: 10,
    left: 12,
    right: 12,
  });
  const [activeTab, setActiveTab] = useState<"layout" | "header" | "signatures">("layout");
  const [zoom, setZoom] = useState<number>(0.9);

  // Signatures configuration
  const [preparedByTitle, setPreparedByTitle] = useState<string>("প্রস্তুতকারী (সহকারী/কর্মকর্তা)");
  const [preparedByName, setPreparedByName] = useState<string>(currentUser.name || "");
  const [verifiedByTitle, setVerifiedByTitle] = useState<string>("যাচাইকারী (হিসাব/নিরীক্ষা কর্মকর্তা)");
  const [verifiedByName, setVerifiedByName] = useState<string>("");
  const [approvedByTitle, setApprovedByTitle] = useState<string>("অনুমোদনকারী (আঞ্চলিক ব্যবস্থাপক/উপ-মহাব্যবস্থাপক)");
  const [approvedByName, setApprovedByName] = useState<string>("");

  const currentFYObj = financialYears.find((f) => f.id === selectedFY);
  const selectedOfficeObj = offices.find((o) => o.id === filterOffice);
  const selectedOfficeName = selectedOfficeObj?.name || "সকল শাখা/উপ-শাখা কার্যালয়";
  const selectedCatObj = categories.find((c) => c.id === filterCategory);

  const cleanInstName = getCleanInstitutionName(
    systemSettings?.brandingPolicy?.institutionName ||
      systemSettings?.institutionName ||
      "বাংলাদেশ কৃষি ব্যাংক"
  );

  const branding = systemSettings?.brandingPolicy;
  const logoUrl = branding?.logoUrl || systemSettings?.logoUrl;
  const slogan = branding?.slogan || "গণমানুষের ব্যাংক";
  const websiteUrl = branding?.websiteUrl || "www.krishibank.gov.bd";

  // Calculate totals for Consolidated table
  const totals = useMemo(() => {
    if (tableType !== "consolidated") return null;
    let opening = 0;
    let initial = 0;
    let addlAdj = 0;
    let totalAlloc = 0;
    let expense = 0;
    let balance = 0;

    displayData.forEach((row) => {
      opening += Number(row.opening || 0);
      initial += Number(row.initial || 0);
      addlAdj += Number(row.additional || 0) + Number(row.adjustment || 0);
      totalAlloc += Number(row.totalAlloc || 0);
      expense += Number(row.expense || 0);
      balance += Number(row.balance || 0);
    });

    return { opening, initial, addlAdj, totalAlloc, expense, balance };
  }, [displayData, tableType]);

  // Calculate totals for Expense table
  const expenseTotals = useMemo(() => {
    if (tableType !== "expense") return null;
    let base = 0;
    let vat = 0;
    let tax = 0;
    let net = 0;
    let gross = 0;

    displayData.forEach((e) => {
      base += Number(e.baseAmount || e.amount || 0);
      vat += Number(e.vatAmount || 0);
      tax += Number(e.taxAmount || 0);
      net += Number(e.netPayable || e.baseAmount || e.amount || 0);
      gross += Number(e.grossAmount || e.amount || 0);
    });

    return { base, vat, tax, net, gross };
  }, [displayData, tableType]);

  // Printable HTML builder for Native Iframe / Window Printing
  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=1200,height=900");
    if (!printWin) {
      alert("পপ-আপ উইন্ডো ব্লক করা রয়েছে। অনুগ্রহ করে ব্রাউজারের পপ-আপ অনুমোদন করুন।");
      return;
    }

    const reportContentHtml = document.getElementById("report-modal-printable-content")?.innerHTML || "";

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${reportTitle} - ${selectedOfficeName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
            
            @page {
              size: ${pageSize.toLowerCase()} ${orientation};
              margin: ${marginsMm.top}mm ${marginsMm.right}mm ${marginsMm.bottom}mm ${marginsMm.left}mm;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;
              font-size: ${fontSizePt}pt;
              line-height: ${lineSpacing};
            }

            .report-print-container {
              width: 100%;
              position: relative;
            }

            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
              font-size: inherit;
              margin-top: 4pt;
              margin-bottom: 8pt;
            }

            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            thead {
              display: table-header-group !important;
            }

            th {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              font-weight: 700 !important;
              border: 1pt solid #475569 !important;
              padding: 4pt 5pt !important;
              text-align: center;
              vertical-align: middle;
            }

            td {
              border: 1pt solid #64748b !important;
              padding: 3.5pt 5pt !important;
              vertical-align: middle;
            }

            .pad-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1.5pt solid #000000;
              padding-bottom: 6pt;
              margin-bottom: 10pt;
              width: 100%;
            }

            .pad-header-title {
              font-size: 1.5em;
              font-weight: 700;
              color: #000000;
              line-height: 1.1;
            }

            .pad-header-subtitle {
              font-size: 1.1em;
              font-weight: 700;
              color: #000000;
              margin-top: 2pt;
            }

            .pad-header-tagline {
              font-size: 0.9em;
              font-weight: 700;
              color: #000000;
            }

            .pad-header-url {
              font-size: 0.75em;
              color: #222222;
              margin-top: 2pt;
            }

            .watermark-container {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              pointer-events: none;
              z-index: 0;
              user-select: none;
              opacity: 0.055;
            }

            .signatures-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 25pt;
              padding-top: 10pt;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .sig-block {
              text-align: center;
              width: 28%;
            }

            .sig-line {
              border-top: 1pt dashed #000000;
              margin-bottom: 4pt;
              width: 85%;
              margin-left: auto;
              margin-right: auto;
            }

            .break-before-page {
              page-break-before: always;
              break-before: page;
            }

            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="report-print-container">
            ${reportContentHtml}
          </div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 400);
            });
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      {/* Top Modal Header */}
      <div className="w-full max-w-[1440px] bg-slate-900 border border-slate-800 rounded-t-2xl px-5 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600/20 text-emerald-400 p-2 rounded-xl border border-emerald-500/30">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                {reportTitle} - প্রিন্ট প্রিভিউ ও ফরম্যাটিং
              </h2>
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold rounded-full">
                অফিসিয়াল প্যাড
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {cleanInstName} • {selectedOfficeName} • অর্থবছর: {currentFYObj?.name || selectedFY}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700 text-slate-300">
            <button
              onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
              className="p-1 hover:text-white rounded-lg hover:bg-slate-700 transition"
              title="জুম কমান"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(1.5, prev + 0.1))}
              className="p-1 hover:text-white rounded-lg hover:bg-slate-700 transition"
              title="জুম বাড়ান"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(0.9)}
              className="p-1 hover:text-white rounded-lg hover:bg-slate-700 transition text-[11px]"
              title="রিসেট জুম"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট করুন / PDF সংরক্ষণ</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Controls Sidebar + Right Virtual Sheet */}
      <div className="w-full max-w-[1440px] flex-1 bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl flex overflow-hidden shadow-2xl">
        {/* Left Formatting Sidebar */}
        <div className="w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-3 p-2 bg-slate-950/60 border-b border-slate-800 gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("layout")}
              className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                activeTab === "layout"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> লেআউট
            </button>
            <button
              onClick={() => setActiveTab("header")}
              className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                activeTab === "header"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> প্যাড হেডার
            </button>
            <button
              onClick={() => setActiveTab("signatures")}
              className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                activeTab === "signatures"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Check className="w-3.5 h-3.5" /> স্বাক্ষর
            </button>
          </div>

          {/* Controls Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {activeTab === "layout" && (
              <>
                {/* Paper Size & Orientation */}
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                  <label className="text-slate-200 font-bold block">
                    কাগজের সাইজ (Paper Size)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPageSize("Legal")}
                      className={`p-2.5 rounded-xl border text-center font-medium transition ${
                        pageSize === "Legal"
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                          : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-bold">Legal (লিগ্যাল)</div>
                      <div className="text-[10px] text-slate-400">8.5 × 14 ইঞ্চি</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageSize("A4")}
                      className={`p-2.5 rounded-xl border text-center font-medium transition ${
                        pageSize === "A4"
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                          : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-bold">A4 সাইজ</div>
                      <div className="text-[10px] text-slate-400">8.27 × 11.69 ইঞ্চি</div>
                    </button>
                  </div>

                  <label className="text-slate-200 font-bold block pt-2">
                    অরিয়েন্টেশন (Orientation)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientation("landscape")}
                      className={`p-2.5 rounded-xl border text-center font-medium transition ${
                        orientation === "landscape"
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                          : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-bold">Landscape (আড়াআড়ি)</div>
                      <div className="text-[10px] text-slate-400">প্রশস্ত টেবিল ও লেজারের জন্য</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation("portrait")}
                      className={`p-2.5 rounded-xl border text-center font-medium transition ${
                        orientation === "portrait"
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                          : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-bold">Portrait (খাড়া)</div>
                      <div className="text-[10px] text-slate-400">ছোট তালিকার জন্য</div>
                    </button>
                  </div>
                </div>

                {/* Typography and Margins */}
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-200 font-bold">টেক্সট সাইজ (Font Size)</label>
                    <span className="text-emerald-400 font-mono font-bold">{fontSizePt} pt</span>
                  </div>
                  <input
                    type="range"
                    min="7"
                    max="14"
                    step="0.5"
                    value={fontSizePt}
                    onChange={(e) => setFontSizePt(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>৭ pt (কমপ্যাক্ট)</span>
                    <span>৯.৫ pt (আদর্শ)</span>
                    <span>১৪ pt (বড়)</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-200 font-bold">লাইন স্পেসিং (Line Spacing)</label>
                      <span className="text-emerald-400 font-mono font-bold">{lineSpacing}</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="1.8"
                      step="0.05"
                      value={lineSpacing}
                      onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>১.০ (টাইট)</span>
                      <span>১.২৫ (আদর্শ)</span>
                      <span>১.৮ (প্রশস্ত)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="text-slate-200 font-bold block mb-1">
                      মার্জিন (Margin Preset)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMarginsMm({ top: 8, bottom: 8, left: 10, right: 10 })}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-center font-semibold"
                      >
                        কমপ্যাক্ট (৮mm)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarginsMm({ top: 12, bottom: 12, left: 14, right: 14 })}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-center font-semibold"
                      >
                        আদর্শ (১২mm)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarginsMm({ top: 20, bottom: 15, left: 18, right: 18 })}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-center font-semibold"
                      >
                        প্রশস্ত (২০mm)
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "header" && (
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPadHeader}
                    onChange={(e) => setShowPadHeader(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-slate-200 font-bold">অফিসিয়াল ব্যাংক প্যাড হেডার প্রদর্শন</span>
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  বাংলাদেশ কৃষি ব্যাংকের মনোগ্রাম, কার্যালয়ের নাম ও স্লোগান সংবলিত স্ট্যান্ডার্ড প্যাড হেডার যুক্ত হবে।
                </p>

                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-800">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-slate-200 font-bold">জলছাপ (Bank Emblem Watermark)</span>
                </label>

                <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                  <div><strong>প্রতিষ্ঠান:</strong> {cleanInstName}</div>
                  <div><strong>কার্যালয়:</strong> {selectedOfficeName}</div>
                  <div><strong>স্লোগান:</strong> {slogan}</div>
                  <div><strong>ওয়েবসাইট:</strong> {websiteUrl}</div>
                </div>
              </div>
            )}

            {activeTab === "signatures" && (
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-slate-200 font-bold">স্বাক্ষর ব্লক প্রিন্ট করুন</span>
                </label>

                {showSignatures && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">১ম স্বাক্ষর পদবী</label>
                      <input
                        type="text"
                        value={preparedByTitle}
                        onChange={(e) => setPreparedByTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="নাম (ঐচ্ছিক)"
                        value={preparedByName}
                        onChange={(e) => setPreparedByName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">২য় স্বাক্ষর পদবী</label>
                      <input
                        type="text"
                        value={verifiedByTitle}
                        onChange={(e) => setVerifiedByTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="নাম (ঐচ্ছিক)"
                        value={verifiedByName}
                        onChange={(e) => setVerifiedByName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">৩য় স্বাক্ষর পদবী (অনুমোদনকারী)</label>
                      <input
                        type="text"
                        value={approvedByTitle}
                        onChange={(e) => setApprovedByTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="নাম (ঐচ্ছিক)"
                        value={approvedByName}
                        onChange={(e) => setApprovedByName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Scrollable Virtual Sheet */}
        <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/90 relative select-none">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              width: orientation === "landscape" ? "350mm" : "216mm",
              minHeight: orientation === "landscape" ? "216mm" : "350mm",
            }}
            className="bg-white text-slate-900 shadow-2xl rounded-sm transition-all duration-150 flex flex-col relative shrink-0 border border-slate-300 p-8 my-4"
          >
            {/* Embedded Printable Content */}
            <div id="report-modal-printable-content" className="relative z-10 w-full">
              {/* Optional Watermark */}
              {showWatermark && (
                <div
                  className="watermark-container"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    zIndex: 0,
                    opacity: 0.055,
                  }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Watermark"
                      style={{
                        maxHeight: "260px",
                        maxWidth: "260px",
                        width: "260px",
                        height: "260px",
                        objectFit: "contain",
                        filter: "grayscale(100%)",
                        display: "block",
                      }}
                    />
                  ) : (
                    <svg width="260" height="260" viewBox="0 0 100 100" style={{ display: "block" }}>
                      <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" strokeWidth="5" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" strokeWidth="1.5" strokeDasharray="3,2" />
                      <path
                        d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82"
                        fill="none"
                        stroke="#006a4e"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle cx="50" cy="22" r="3" fill="#f42a41" />
                    </svg>
                  )}
                </div>
              )}

              {/* Bank Pad Header */}
              {showPadHeader && (
                <div
                  className="pad-header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1.5pt solid #000",
                    paddingBottom: "6pt",
                    marginBottom: "10pt",
                    width: "100%",
                  }}
                >
                  <div style={{ width: "70px", display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{ maxHeight: "55px", maxWidth: "65px", objectFit: "contain", display: "block" }}
                      />
                    ) : (
                      <svg width="55" height="55" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" strokeWidth="6" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" strokeWidth="1.5" strokeDasharray="3,2" />
                        <path
                          d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82"
                          fill="none"
                          stroke="#006a4e"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="50" cy="22" r="3" fill="#f42a41" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: "center", padding: "0 10px" }}>
                    <div className="pad-header-title" style={{ fontSize: "1.55em", fontWeight: "bold", color: "#000", lineHeight: 1.1 }}>
                      {cleanInstName}
                    </div>
                    <div className="pad-header-subtitle" style={{ fontSize: "1.1em", fontWeight: "bold", color: "#000", marginTop: "2pt" }}>
                      {selectedOfficeName}
                    </div>
                  </div>
                  <div style={{ width: "130px", textAlign: "right", lineHeight: 1.2 }}>
                    <div className="pad-header-tagline" style={{ fontSize: "0.9em", fontWeight: "bold", color: "#000" }}>
                      {slogan}
                    </div>
                    <div className="pad-header-url" style={{ fontSize: "0.75em", color: "#222", marginTop: "2pt" }}>
                      {websiteUrl}
                    </div>
                  </div>
                </div>
              )}

              {/* Report Title & Metadata Sub-header */}
              <div style={{ textAlign: "center", marginBottom: "12pt" }}>
                <h2 style={{ fontSize: "1.25em", fontWeight: "bold", color: "#0f172a", margin: "2pt 0" }}>
                  {reportTitle}
                </h2>
                {reportSubtitle && (
                  <p style={{ fontSize: "0.9em", color: "#475569", margin: "1pt 0" }}>
                    {reportSubtitle}
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "14pt", fontSize: "0.85em", color: "#334155", marginTop: "4pt" }}>
                  <span><strong>অর্থবছর:</strong> {currentFYObj?.name || selectedFY}</span>
                  <span>•</span>
                  <span><strong>কার্যালয়:</strong> {selectedOfficeName}</span>
                  {selectedCatObj && (
                    <>
                      <span>•</span>
                      <span><strong>ব্যয়ের খাত:</strong> {selectedCatObj.name} ({selectedCatObj.budgetHead})</span>
                    </>
                  )}
                  {filterDateFrom && (
                    <>
                      <span>•</span>
                      <span><strong>তারিখ:</strong> {filterDateFrom} হতে {filterDateTo || "বর্তমান"}</span>
                    </>
                  )}
                  <span>•</span>
                  <span><strong>প্রিন্ট তারিখ:</strong> {new Date().toLocaleDateString("bn-BD")}</span>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ width: "100%", fontSize: `${fontSizePt}pt`, lineHeight: lineSpacing }}>
                {tableType === "consolidated" && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "4%", textAlign: "center" }}>ক্রম</th>
                        {reportType !== "CATEGORY_WISE" && (
                          <th style={{ textAlign: "left", width: "18%" }}>কার্যালয় / শাখা</th>
                        )}
                        {reportType !== "OFFICE_WISE" && (
                          <th style={{ textAlign: "left", width: "20%" }}>ব্যয়ের খাত ও কোড</th>
                        )}
                        <th style={{ textAlign: "right", width: "10%" }}>ওপেনিং স্থিতি</th>
                        <th style={{ textAlign: "right", width: "11%" }}>মূল বাজেট বরাদ্দ</th>
                        <th style={{ textAlign: "right", width: "11%" }}>অতিরিক্ত / সমন্বয়</th>
                        <th style={{ textAlign: "right", width: "12%" }}>সর্বমোট বরাদ্দ</th>
                        <th style={{ textAlign: "right", width: "12%" }}>মোট ব্যয়</th>
                        <th style={{ textAlign: "right", width: "12%" }}>অবশিষ্ট স্থিতি</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((row, idx) => {
                        const off = offices.find((o) => o.id === row.officeId)?.name || (row.officeId === "ALL" ? "সকল অফিস" : "-");
                        const cat = categories.find((c) => c.id === row.categoryId)?.name || (row.categoryId === "ALL" ? "সকল খাত" : "-");
                        const addl = Number(row.additional || 0) + Number(row.adjustment || 0);

                        return (
                          <tr key={idx}>
                            <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                            {reportType !== "CATEGORY_WISE" && <td>{off}</td>}
                            {reportType !== "OFFICE_WISE" && <td>{cat}</td>}
                            <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(row.opening || 0)}</td>
                            <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(row.initial || 0)}</td>
                            <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                              {addl > 0 ? `+${formatCurrency(addl)}` : formatCurrency(addl)}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>
                              {formatCurrency(row.totalAlloc || 0)}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", color: "#b91c1c", fontWeight: "bold" }}>
                              {formatCurrency(row.expense || 0)}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontFamily: "monospace",
                                fontWeight: "bold",
                                color: (row.balance || 0) < 0 ? "#dc2626" : "#1d4ed8",
                              }}
                            >
                              {formatCurrency(row.balance || 0)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Grand Total Row */}
                      {totals && (
                        <tr style={{ backgroundColor: "#f8fafc", fontWeight: "bold", borderTop: "2pt solid #0f172a" }}>
                          <td
                            colSpan={(reportType !== "CATEGORY_WISE" ? 1 : 0) + (reportType !== "OFFICE_WISE" ? 1 : 0) + 1}
                            style={{ textAlign: "right", paddingRight: "10pt" }}
                          >
                            সর্বমোট (Grand Total):
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(totals.opening)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(totals.initial)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(totals.addlAdj)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", color: "#047857" }}>{formatCurrency(totals.totalAlloc)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{formatCurrency(totals.expense)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", color: totals.balance < 0 ? "#dc2626" : "#1d4ed8" }}>
                            {formatCurrency(totals.balance)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {tableType === "expense" && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "4%", textAlign: "center" }}>ক্রম</th>
                        <th style={{ width: "9%", textAlign: "center" }}>তারিখ</th>
                        <th style={{ width: "10%", textAlign: "center" }}>ভাউচার নং</th>
                        <th style={{ width: "16%", textAlign: "left" }}>কার্যালয়</th>
                        <th style={{ width: "16%", textAlign: "left" }}>ব্যয়ের খাত</th>
                        <th style={{ width: "15%", textAlign: "left" }}>আবেদনকারী/বিবরণ</th>
                        <th style={{ width: "10%", textAlign: "right" }}>মূল বিল</th>
                        <th style={{ width: "6%", textAlign: "right" }}>ভ্যাট</th>
                        <th style={{ width: "6%", textAlign: "right" }}>ট্যাক্স</th>
                        <th style={{ width: "8%", textAlign: "right" }}>নিট প্রদেয়</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((e, idx) => {
                        const off = offices.find((o) => o.id === e.officeId)?.name || "-";
                        const cat = categories.find((c) => c.id === e.categoryId)?.name || "-";
                        const base = e.baseAmount || e.amount || 0;
                        const vat = e.vatAmount || 0;
                        const tax = e.taxAmount || 0;
                        const net = e.netPayable || base;

                        return (
                          <tr key={idx}>
                            <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ textAlign: "center", fontFamily: "monospace" }}>{e.expenseDate}</td>
                            <td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: "600" }}>{e.voucherNo || "-"}</td>
                            <td>{off}</td>
                            <td>{cat}</td>
                            <td>
                              <div>{e.applicant?.name || "-"}</div>
                              {e.applicant?.designation && (
                                <div style={{ fontSize: "0.85em", color: "#475569" }}>{e.applicant.designation}</div>
                              )}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(base)}</td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", color: "#047857" }}>{formatCurrency(vat)}</td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{formatCurrency(tax)}</td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>
                              {formatCurrency(net)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Grand Total Row */}
                      {expenseTotals && (
                        <tr style={{ backgroundColor: "#f8fafc", fontWeight: "bold", borderTop: "2pt solid #0f172a" }}>
                          <td colSpan={6} style={{ textAlign: "right", paddingRight: "10pt" }}>
                            সর্বমোট (Grand Total):
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(expenseTotals.base)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", color: "#047857" }}>{formatCurrency(expenseTotals.vat)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>{formatCurrency(expenseTotals.tax)}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", color: "#1d4ed8" }}>{formatCurrency(expenseTotals.net)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {tableType === "combined" && (
                  <div>
                    {combinedCategories.map((catId, catIdx) => {
                      const cat = categories.find((c) => c.id === catId);
                      const catAlloc = filteredAllocations.filter((a) => a.categoryId === catId);
                      const catExp = filteredExpenses.filter((e) => e.categoryId === catId);
                      const totalAlloc = catAlloc.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
                      const totalExp = catExp.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      const rem = totalAlloc - totalExp;

                      return (
                        <div key={catId} className={catIdx > 0 ? "break-before-page pt-6" : "pt-2"} style={{ marginBottom: "20pt" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1.5pt solid #0f172a", paddingBottom: "4pt", marginBottom: "6pt" }}>
                            <div>
                              <h3 style={{ fontSize: "1.15em", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
                                {catIdx + 1}. {cat?.name}
                              </h3>
                              <span style={{ fontSize: "0.85em", color: "#475569" }}>
                                বাজেট হেড কোড: <strong>{cat?.budgetHead}</strong> • অর্থবছর: {currentFYObj?.name}
                              </span>
                            </div>
                            <div style={{ textAlign: "right", fontSize: "0.9em", fontFamily: "monospace" }}>
                              <span>বরাদ্দ: <strong>{formatCurrency(totalAlloc)}</strong></span> |{" "}
                              <span>ব্যয়: <strong>{formatCurrency(totalExp)}</strong></span> |{" "}
                              <span>অবশিষ্ট: <strong style={{ color: rem < 0 ? "#dc2626" : "#047857" }}>{formatCurrency(rem)}</strong></span>
                            </div>
                          </div>

                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th style={{ width: "5%", textAlign: "center" }}>ক্রম</th>
                                <th style={{ width: "12%", textAlign: "center" }}>তারিখ</th>
                                <th style={{ width: "12%", textAlign: "center" }}>ভাউচার নং</th>
                                <th style={{ width: "25%", textAlign: "left" }}>কার্যালয়</th>
                                <th style={{ width: "26%", textAlign: "left" }}>আবেদনকারী/বিবরণ</th>
                                <th style={{ width: "20%", textAlign: "right" }}>টাকার পরিমাণ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catExp.map((e, idx) => {
                                const off = offices.find((o) => o.id === e.officeId)?.name || "-";
                                return (
                                  <tr key={e.id}>
                                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                    <td style={{ textAlign: "center", fontFamily: "monospace" }}>{e.expenseDate}</td>
                                    <td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{e.voucherNo || "-"}</td>
                                    <td>{off}</td>
                                    <td>{e.applicant?.name || "-"}</td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>
                                      {formatCurrency(Number(e.amount || 0))}
                                    </td>
                                  </tr>
                                );
                              })}
                              {catExp.length === 0 && (
                                <tr>
                                  <td colSpan={6} style={{ textAlign: "center", padding: "10pt", color: "#94a3b8", fontStyle: "italic" }}>
                                    এই খাতের জন্য কোনো ব্যয়ের এন্ট্রি পাওয়া যায়নি।
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Signatures Row */}
              {showSignatures && (
                <div
                  className="signatures-row"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginTop: "30pt",
                    paddingTop: "15pt",
                  }}
                >
                  <div className="sig-block" style={{ textAlign: "center", width: "28%" }}>
                    <div className="sig-line" style={{ borderTop: "1pt dashed #000", marginBottom: "4pt" }}></div>
                    <div style={{ fontWeight: "bold", fontSize: "0.95em" }}>{preparedByName || currentUser.name}</div>
                    <div style={{ fontSize: "0.85em", color: "#475569" }}>{preparedByTitle}</div>
                  </div>

                  <div className="sig-block" style={{ textAlign: "center", width: "28%" }}>
                    <div className="sig-line" style={{ borderTop: "1pt dashed #000", marginBottom: "4pt" }}></div>
                    <div style={{ fontWeight: "bold", fontSize: "0.95em" }}>{verifiedByName || "________________"}</div>
                    <div style={{ fontSize: "0.85em", color: "#475569" }}>{verifiedByTitle}</div>
                  </div>

                  <div className="sig-block" style={{ textAlign: "center", width: "28%" }}>
                    <div className="sig-line" style={{ borderTop: "1pt dashed #000", marginBottom: "4pt" }}></div>
                    <div style={{ fontWeight: "bold", fontSize: "0.95em" }}>{approvedByName || "________________"}</div>
                    <div style={{ fontSize: "0.85em", color: "#475569" }}>{approvedByTitle}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
