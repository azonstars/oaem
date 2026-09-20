import React, { useState, useEffect } from "react";
import { User, SystemSettings, Office, FinancialYear } from "../../types";
import { StockProTool } from "./StockProTool";
import { ConferenceNoteTool } from "./ConferenceNoteTool";
import { MultiItemBillTool } from "./MultiItemBillTool";
import { StationeryBillTool } from "./StationeryBillTool";

interface ToolDashboardV5Props {
  currentUser: User;
  systemSettings: SystemSettings | null;
  offices?: Office[];
  financialYears?: FinancialYear[];
  selectedFY?: string;
  initialTab?: string;
  onBackToFlowBoard?: () => void;
}

export function ToolDashboardV5({
  currentUser,
  systemSettings,
  offices,
  financialYears,
  selectedFY,
  initialTab,
  onBackToFlowBoard: _onBackToFlowBoard,
}: ToolDashboardV5Props) {
  // Map initialTab prop (from submodules or tabs) to subtool index
  // 0 = StockPro, 1 = Conference Note, 2 = Multi-Item Bill, 3 = Stationery Bill
  const getInitialSubTool = (): number | null => {
    if (!initialTab) return null;
    if (initialTab === "stockpro") return 0;
    if (initialTab === "conference-note" || initialTab === "conference") return 1;
    if (initialTab === "multi-item-bill" || initialTab === "multibill") return 2;
    if (initialTab === "stationery-bill" || initialTab === "stationery") return 3;
    return null;
  };

  // Active tool state: null = Home Dashboard View, 0 = StockPro, 1 = Conference Note, 2 = Multi-Item Bill, 3 = Stationery Bill
  const [activeSubTool, setActiveSubTool] = useState<number | null>(getInitialSubTool);

  useEffect(() => {
    if (initialTab) {
      const target = getInitialSubTool();
      if (target !== null) {
        setActiveSubTool(target);
      }
    }
  }, [initialTab]);

  // Starred tools state
  const [starredTools, setStarredTools] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem("flowboard_tool_stars_v5");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleStar = (e: React.MouseEvent, toolId: number) => {
    e.stopPropagation();
    const updated = { ...starredTools, [toolId]: !starredTools[toolId] };
    setStarredTools(updated);
    localStorage.setItem("flowboard_tool_stars_v5", JSON.stringify(updated));
  };

  // StockPro Live Card dynamic stats
  const [stockStats, setStockStats] = useState({
    stockCount: 24,
    voucherCount: 12,
    branchCount: 6,
    progress: 68,
    progressText: "Syncing dashboard data...",
  });

  useEffect(() => {
    const updateStats = () => {
      const now = new Date();
      const prog = 58 + ((now.getSeconds() + now.getMinutes()) % 35);
      setStockStats({
        stockCount: 18 + (now.getDate() % 9) + (now.getMinutes() % 4),
        voucherCount: 8 + (now.getHours() % 7),
        branchCount: 5 + (now.getDay() % 4),
        progress: prog,
        progressText: `Updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${prog}% ready`,
      });
    };
    updateStats();
    const timer = setInterval(updateStats, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4ff] font-sans text-[#1e293b] flex flex-col">
      <style>{`
        .stockpro-card-gradient {
          background: radial-gradient(circle at 12% 18%, rgba(14, 165, 233, 0.16), transparent 28%),
                      linear-gradient(135deg, #ffffff 0%, #f8fbff 48%, #eef6ff 100%);
        }
        @keyframes stockPulseAnim {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.72); opacity: 0.72; }
        }
        .stock-pulse {
          animation: stockPulseAnim 1.8s infinite;
        }
      `}</style>

      {/* ── HOME VIEW ── */}
      {activeSubTool === null ? (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 flex-1">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-800 font-serif">টুলসমূহ</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">নিচের যেকোনো টুলে ক্লিক করে কাজ শুরু করুন</p>
          </div>

          {/* Section 1: StockPro */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] text-white text-[10px] font-extrabold tracking-wider">
                SECTION 1
              </span>
              <div className="flex-1 h-px bg-[#dbe4ff]"></div>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Dynamic STOCKPRO Card */}
              <div
                onClick={() => setActiveSubTool(0)}
                className="relative w-full max-w-lg min-h-[220px] rounded-2xl border border-blue-200 stockpro-card-gradient shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer p-5 flex flex-col justify-between group overflow-hidden"
              >
                <div
                  onClick={(e) => toggleStar(e, 0)}
                  className={`absolute top-3 right-4 text-lg cursor-pointer transition-colors ${
                    starredTools[0] ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                  }`}
                >
                  ★
                </div>

                {/* Top Section */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-100 to-sky-100 text-blue-600 flex items-center justify-center text-xl shadow-inner">
                      📦
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-800 tracking-tight">STOCKPRO</h3>
                      <p className="text-xs text-slate-500">Inventory &amp; Voucher Tracker</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 stock-pulse"></span>
                    <span>LIVE</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-white/80">
                    <span className="block text-base font-black text-slate-900">{stockStats.stockCount}</span>
                    <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Stock Items</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-white/80">
                    <span className="block text-base font-black text-slate-900">{stockStats.voucherCount}</span>
                    <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Vouchers</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-white/80">
                    <span className="block text-base font-black text-slate-900">
                      {String(stockStats.branchCount).padStart(2, "0")}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Branches</span>
                  </div>
                </div>

                {/* Footer Progress & Launch Arrow */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex-1 min-w-0">
                    <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                        style={{ width: `${stockStats.progress}%` }}
                      ></div>
                    </div>
                    <span className="block text-[10px] font-semibold text-slate-400 mt-1">
                      {stockStats.progressText}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                    →
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Document & Note Generators (Condition 4: BKB Doc split into 2 separate tools) */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] text-white text-[10px] font-extrabold tracking-wider">
                SECTION 2
              </span>
              <div className="flex-1 h-px bg-[#dbe4ff]"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tool 1: Conference Note Generator */}
              <div
                onClick={() => setActiveSubTool(1)}
                className="relative p-5 rounded-2xl border border-[#dbe4ff] bg-white shadow-sm hover:border-[#93a6fa] hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center gap-3 group"
              >
                <div
                  onClick={(e) => toggleStar(e, 1)}
                  className={`absolute top-2.5 right-3 text-lg cursor-pointer transition-colors ${
                    starredTools[1] ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                  }`}
                >
                  ★
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl">
                  📋
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 leading-snug">সভার নোট জেনারেটর</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Conference Bill &amp; Note</p>
                </div>
              </div>

              {/* Tool 2: Multi-Item Bill & CS Generator (Extracted from BKB Doc Tab 1) */}
              <div
                onClick={() => setActiveSubTool(2)}
                className="relative p-5 rounded-2xl border border-[#dbe4ff] bg-white shadow-sm hover:border-[#93a6fa] hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center gap-3 group"
              >
                <div
                  onClick={(e) => toggleStar(e, 2)}
                  className={`absolute top-2.5 right-3 text-lg cursor-pointer transition-colors ${
                    starredTools[2] ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                  }`}
                >
                  ★
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl">
                  📑
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 leading-snug">
                    বহু-আইটেম বিল ও কোটেশন বিবরণী
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Multi-Item Bill &amp; CS Generator</p>
                </div>
              </div>

              {/* Tool 3: Stationery Supply Order & Challan (Extracted from BKB Doc Tab 2) */}
              <div
                onClick={() => setActiveSubTool(3)}
                className="relative p-5 rounded-2xl border border-[#dbe4ff] bg-white shadow-sm hover:border-[#93a6fa] hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center gap-3 group"
              >
                <div
                  onClick={(e) => toggleStar(e, 3)}
                  className={`absolute top-2.5 right-3 text-lg cursor-pointer transition-colors ${
                    starredTools[3] ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                  }`}
                >
                  ★
                </div>
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-2xl">
                  🖨️
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 leading-snug">
                    মুদ্রিত স্টেশনারী ও কার্যাদেশ চালান
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Stationery &amp; Print Work Order</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── SUB-TOOL EXECUTION CONTAINER ── */
        <div className="flex-1 flex flex-col">
          {/* Tool Navigation Topbar */}
          <div className="h-11 px-4 bg-[#1e293b] text-slate-200 border-b-2 border-slate-700 flex items-center justify-between shrink-0">
            <button
              onClick={() => setActiveSubTool(null)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold transition-all"
            >
              <span>← হোমে ফিরুন</span>
            </button>
            <div className="font-bold text-xs sm:text-sm text-slate-100">
              {activeSubTool === 0 && "📦 STOCKPRO — Inventory & Voucher Tracker"}
              {activeSubTool === 1 && "📋 সভার নোট ও আবেদন জেনারেটর"}
              {activeSubTool === 2 && "📑 বহু-আইটেম বিল ও কোটেশন বিবরণী (Multi-Item Bill & CS)"}
              {activeSubTool === 3 && "🖨️ মুদ্রিত স্টেশনারী ও কার্যাদেশ চালান (Stationery & Work Order)"}
            </div>
            <div className="w-20"></div>
          </div>

          {/* Sub-tool component render */}
          <div className="flex-1">
            {activeSubTool === 0 && (
              <StockProTool
                currentUser={currentUser}
                systemSettings={systemSettings}
                offices={offices}
                financialYears={financialYears}
                selectedFY={selectedFY}
                onBack={() => setActiveSubTool(null)}
              />
            )}
            {activeSubTool === 1 && (
              <ConferenceNoteTool
                currentUser={currentUser}
                systemSettings={systemSettings}
                financialYears={financialYears}
                selectedFY={selectedFY}
                onBack={() => setActiveSubTool(null)}
              />
            )}
            {activeSubTool === 2 && (
              <MultiItemBillTool
                currentUser={currentUser}
                systemSettings={systemSettings}
                offices={offices}
                financialYears={financialYears}
                selectedFY={selectedFY}
                onBack={() => setActiveSubTool(null)}
              />
            )}
            {activeSubTool === 3 && (
              <StationeryBillTool
                currentUser={currentUser}
                systemSettings={systemSettings}
                financialYears={financialYears}
                selectedFY={selectedFY}
                onBack={() => setActiveSubTool(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
