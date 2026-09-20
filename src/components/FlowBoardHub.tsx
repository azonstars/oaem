import React, { useState, useMemo } from "react";
import {
  FlowBoardTool,
  User,
  SystemSettings,
  getUserToolAccess,
  getToolRoleTitle,
  canAccessTool,
} from "../types";
import { CATEGORY_LABELS } from "../config/flowTools";
import { useLanguage } from "../i18n";
import {
  Search,
  Plus,
  ArrowRight,
  Shield,
  Sparkles,
  Coins,
  FileCheck2,
  FileText,
  BarChart3,
  AppWindow,
  FolderPlus,
  CheckCircle2,
  Sliders,
  Briefcase,
  Cpu,
  Database,
  Globe,
  Trash2,
  X,
  Building,
  Calendar,
  Package,
  FileSpreadsheet,
  Receipt,
  Printer,
  Boxes,
  Calculator,
  Lock,
  ShieldCheck,
} from "lucide-react";

interface FlowBoardHubProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  tools: FlowBoardTool[];
  onSelectTool: (toolId: string, initialTab?: string) => void;
  onAddTool: (newTool: Partial<FlowBoardTool>) => Promise<boolean>;
  onDeleteTool?: (toolId: string) => Promise<boolean>;
  onOpenCentralManagement?: () => void;
  statsSummary?: {
    totalAllocated?: number;
    totalSpent?: number;
    totalExpenses?: number;
    pendingProposals?: number;
    totalNoteSheets?: number;
    activeFYName?: string;
  };
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Coins: Coins,
  FileCheck2: FileCheck2,
  FileText: FileText,
  BarChart3: BarChart3,
  Briefcase: Briefcase,
  Cpu: Cpu,
  Database: Database,
  Globe: Globe,
  AppWindow: AppWindow,
  Sliders: Sliders,
  Shield: Shield,
  Package: Package,
  FileSpreadsheet: FileSpreadsheet,
  Receipt: Receipt,
  Printer: Printer,
  Boxes: Boxes,
  Calculator: Calculator,
  ShieldCheck: ShieldCheck,
};

const GRADIENT_PRESETS = [
  { name: "Emerald Teal", value: "from-emerald-600 via-teal-600 to-cyan-700", color: "#059669" },
  { name: "Indigo Blue", value: "from-indigo-600 via-blue-600 to-violet-700", color: "#4f46e5" },
  { name: "Amber Orange", value: "from-amber-600 via-orange-600 to-red-700", color: "#d97706" },
  { name: "Cyan Teal", value: "from-cyan-600 via-teal-600 to-blue-700", color: "#0891b2" },
  { name: "Purple Fuchsia", value: "from-purple-600 via-fuchsia-600 to-pink-700", color: "#9333ea" },
  { name: "Rose Crimson", value: "from-rose-600 via-pink-600 to-red-700", color: "#e11d48" },
];

export function FlowBoardHub({
  currentUser,
  systemSettings: _systemSettings,
  tools,
  onSelectTool,
  onAddTool,
  onDeleteTool,
  onOpenCentralManagement,
  statsSummary,
}: FlowBoardHubProps) {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating a new tool
  const [toolForm, setToolForm] = useState<Partial<FlowBoardTool>>({
    name: "",
    nameBn: "",
    description: "",
    descriptionBn: "",
    category: "custom",
    icon: "AppWindow",
    color: "#3b82f6",
    gradient: "from-indigo-600 via-blue-600 to-violet-700",
    badge: "New Module",
    badgeBn: "নতুন মডিউল",
    version: "1.0.0",
    status: "active",
    routeOrTab: "dashboard",
    tags: ["Project", "Module"],
  });

  const accessibleTools = useMemo(() => {
    return tools.filter((tool) => canAccessTool(currentUser, tool.id));
  }, [tools, currentUser]);

  const filteredTools = useMemo(() => {
    return accessibleTools.filter((tool) => {
      const matchCat = selectedCategory === "all" || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;

      const matchQuery =
        tool.name.toLowerCase().includes(q) ||
        (tool.nameBn && tool.nameBn.toLowerCase().includes(q)) ||
        tool.description.toLowerCase().includes(q) ||
        (tool.descriptionBn && tool.descriptionBn.toLowerCase().includes(q)) ||
        (tool.tags && tool.tags.some((tag) => tag.toLowerCase().includes(q)));

      return matchCat && matchQuery;
    });
  }, [accessibleTools, selectedCategory, searchQuery]);

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolForm.name?.trim()) return;
    setSubmitting(true);
    try {
      const success = await onAddTool(toolForm);
      if (success) {
        setShowAddModal(false);
        setToolForm({
          name: "",
          nameBn: "",
          description: "",
          descriptionBn: "",
          category: "custom",
          icon: "AppWindow",
          color: "#3b82f6",
          gradient: "from-indigo-600 via-blue-600 to-violet-700",
          badge: "New Module",
          badgeBn: "নতুন মডিউল",
          version: "1.0.0",
          status: "active",
          routeOrTab: "dashboard",
          tags: ["Project", "Module"],
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getToolStats = (statsKey?: string) => {
    if (!statsSummary) return null;
    if (statsKey === "expenses") {
      return {
        label: language === "bn" ? "মোট ব্যয় এন্ট্রি" : "Expense Records",
        value: `${statsSummary.totalExpenses || 0} টি`,
      };
    }
    if (statsKey === "postfacto") {
      return {
        label: language === "bn" ? "খরচোত্তর প্রস্তাব" : "Pending Proposals",
        value: `${statsSummary.pendingProposals || 0} টি`,
      };
    }
    if (statsKey === "notesheets") {
      return {
        label: language === "bn" ? "তৈরিকৃত নোটশিট" : "Generated Note Sheets",
        value: `${statsSummary.totalNoteSheets || 0} টি`,
      };
    }
    if (statsKey === "analytics") {
      return {
        label: language === "bn" ? "সক্রিয় অর্থবছর" : "Active FY",
        value: statsSummary.activeFYName || "2025-2026",
      };
    }
    return null;
  };

  const isStaff = [
    "Super Admin",
    "Admin",
    "Head Office Admin",
    "HeadOfficeAdmin",
    "Moderator",
  ].includes(currentUser.role);

  const canAccessCentral = [
    "Super Admin",
    "Admin",
    "Head Office Admin",
    "HeadOfficeAdmin",
  ].includes(currentUser.role);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Dynamic Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 p-6 md:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>FlowBoard Enterprise Hub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>
                {language === "bn" ? "স্বাগতম," : "Welcome,"} {currentUser.name}
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {language === "bn"
                ? "FlowBoard-এর কেন্দ্রীয় ড্যাশবোর্ডে আপনাকে স্বাগতম। এখান থেকে আপনার প্রজেক্ট, স্বাধীন মডিউল এবং আর্থিক টুলস পৃথকভাবে পরিচালনা ও সম্পাদন করুন।"
                : "Welcome to FlowBoard Workspace Hub. Access, launch, and execute your independent financial modules, note drafting studios, and custom projects with complete state isolation."}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentUser.role}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <Building className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {language === "bn"
                    ? "ফ্লোবোর্ড এন্টারপ্রাইজ প্ল্যাটফর্ম"
                    : "FlowBoard Workspace Platform"}
                </span>
              </div>
              {statsSummary?.activeFYName && (
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{statsSummary.activeFYName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            {canAccessTool(currentUser, "budget-expense") && (
              <button
                id="flagship-launch-btn"
                onClick={() => onSelectTool("budget-expense")}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{language === "bn" ? "প্রধান বরাদ্দ ওয়ার্কস্পেস খুলুন" : "Launch Flagship Workspace"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {canAccessCentral && (
              <button
                id="hub-central-management-btn"
                onClick={onOpenCentralManagement ? onOpenCentralManagement : () => onSelectTool("central-management")}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-xs border border-indigo-400/40 shadow-md shadow-indigo-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                title={language === "bn" ? "ফ্লোবোর্ড সার্বজনীন সেন্ট্রাল ম্যানেজমেন্ট খুলুন" : "Open FlowBoard Central Management"}
              >
                <Shield className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                <span>{language === "bn" ? "🛡️ সেন্ট্রাল ম্যানেজমেন্ট" : "🛡️ Central Management"}</span>
              </button>
            )}

            {isStaff && (
              <button
                id="add-tool-modal-btn"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700/80 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{language === "bn" ? "নতুন টুল / মডিউল যোগ করুন" : "Add New Tool / Module"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
              const hasToolsInCat = catKey === "all" || accessibleTools.some((t) => t.category === catKey);
              if (!hasToolsInCat && accessibleTools.length > 0) return null;
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                      : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60"
                  }`}
                >
                  <span>{language === "bn" ? catInfo.bn : catInfo.en}</span>
                </button>
              );
            })}

            {canAccessCentral && (
              <button
                id="category-bar-central-btn"
                onClick={onOpenCentralManagement ? onOpenCentralManagement : () => onSelectTool("central-management")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 shadow-xs cursor-pointer"
                title={language === "bn" ? "সেন্ট্রাল ম্যানেজমেন্ট" : "Central Management"}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>{language === "bn" ? "সেন্ট্রাল ম্যানেজমেন্ট" : "Central Management"}</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="flowboard-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === "bn" ? "টুল বা মডিউল খুঁজুন..." : "Search tools & modules..."}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 transition text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Tool Cards Grid */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredTools.map((tool) => {
            const IconComponent = ICON_MAP[tool.icon] || AppWindow;
            const stat = getToolStats(tool.statsCountKey);
            const isFlagship = tool.id === "budget-expense";
            const accessLevel = getUserToolAccess(currentUser, tool.id);
            const customRoleTitle = getToolRoleTitle(currentUser, tool.id);
            const isAllowed = canAccessTool(currentUser, tool.id);

            return (
              <div
                key={tool.id}
                id={`tool-card-${tool.id}`}
                className={`group relative bg-white dark:bg-slate-900/90 rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between hover:shadow-xl ${
                  !isAllowed
                    ? "border-slate-200 dark:border-slate-800 opacity-70 grayscale-[30%]"
                    : isFlagship
                      ? "border-emerald-500/40 dark:border-emerald-500/30 hover:border-emerald-500 shadow-md shadow-emerald-500/5"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
              {/* Card Header Ambient Background */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Tool Icon with Gradient */}
                    <div
                      className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${
                        tool.gradient || "from-blue-600 to-indigo-600"
                      } text-white flex items-center justify-center p-3 shadow-lg shadow-slate-900/10 group-hover:scale-105 transition-transform shrink-0`}
                    >
                      <IconComponent className="w-7 h-7" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {language === "bn" && tool.nameBn ? tool.nameBn : tool.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          v{tool.version}
                        </span>
                        {tool.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                            {language === "bn" && tool.badgeBn ? tool.badgeBn : tool.badge}
                          </span>
                        )}

                        {/* RBAC Access Badge */}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            accessLevel === "full"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : accessLevel === "operate"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                : accessLevel === "view"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              accessLevel === "full"
                                ? "bg-emerald-500"
                                : accessLevel === "operate"
                                  ? "bg-blue-500"
                                  : accessLevel === "view"
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                            }`}
                          />
                          <span>
                            {accessLevel === "full"
                              ? language === "bn"
                                ? "পূর্ণ নিয়ন্ত্রণ"
                                : "Full Access"
                              : accessLevel === "operate"
                                ? language === "bn"
                                  ? "অপারেটর"
                                  : "Operator"
                                : accessLevel === "view"
                                  ? language === "bn"
                                    ? "শুধুমাত্র পরিদর্শন"
                                    : "Viewer"
                                  : language === "bn"
                                    ? "লকড"
                                    : "Locked"}
                          </span>
                          {customRoleTitle && (
                            <span className="font-mono opacity-80">
                              ({customRoleTitle})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Delete if custom */}
                  {onDeleteTool && !tool.isDefault && isStaff && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete tool "${tool.name}"?`)) {
                          onDeleteTool(tool.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100"
                      title="Remove Tool"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {language === "bn" && tool.descriptionBn
                    ? tool.descriptionBn
                    : tool.description}
                </p>

                {/* Tags */}
                {tool.tags && tool.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tool.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sub-Modules / Embedded Integrated Features */}
                {tool.subModules && tool.subModules.length > 0 && isAllowed && (
                  <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <span>{language === "bn" ? "অন্তর্ভুক্ত মডিউলসমূহ:" : "Integrated Sub-Modules:"}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {tool.subModules.map((sub) => {
                        const SubIcon = (sub.icon && ICON_MAP[sub.icon]) || ArrowRight;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTool(tool.id, sub.tab);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-xs bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/60 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/70 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 transition group/sub"
                            title={language === "bn" ? `${sub.nameBn} ওপেন করুন` : `Open ${sub.name}`}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover/sub:text-emerald-600 dark:group-hover/sub:text-emerald-400" />
                            <span className="truncate font-medium text-[11px]">
                              {language === "bn" ? sub.nameBn : sub.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Metrics & Launch Trigger */}
              <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3">
                {stat ? (
                  <div className="text-xs">
                    <span className="text-slate-400">{stat.label}: </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {stat.value}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {isAllowed
                        ? language === "bn"
                          ? "প্রস্তুত ও সক্রিয়"
                          : "Ready & Active"
                        : language === "bn"
                          ? "অনুমতি সীমাবদ্ধ"
                          : "Access Restricted"}
                    </span>
                  </div>
                )}

                {isAllowed ? (
                  <button
                    id={`launch-btn-${tool.id}`}
                    onClick={() => onSelectTool(tool.id, tool.routeOrTab)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isFlagship
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                    }`}
                  >
                    <span>{language === "bn" ? "টুল চালু করুন" : "Open Tool"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                    <Lock className="w-3.5 h-3.5 text-rose-500" />
                    <span>{language === "bn" ? "এক্সেস বন্ধ" : "Locked"}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <div className="w-full text-center py-16 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <AppWindow className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
            {searchQuery
              ? language === "bn"
                ? "কোনো টুল খুঁজে পাওয়া যায়নি"
                : "No tools found matching your search"
              : language === "bn"
                ? "আপনার আইডির জন্য কোনো টুল বরাদ্দ নেই"
                : "No tools currently assigned to your account"}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? language === "bn"
                ? "ভিন্ন কীওয়ার্ড দিয়ে অনুসন্ধান করুন।"
                : "Try searching with a different term."
              : language === "bn"
                ? "প্রয়োজনে অ্যাডমিন বা ঊর্ধ্বতন কর্মকর্তার সাথে যোগাযোগ করুন।"
                : "Please contact an administrator if you need access to specific modules."}
          </p>
        </div>
      )}

      {/* Dynamic Add Tool Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {language === "bn" ? "নতুন টুল বা মডিউল যোগ করুন" : "Add New Tool / Module"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === "bn"
                      ? "FlowBoard-এ যেকোনো নতুন প্রজেক্ট স্বতন্ত্র টুল হিসেবে যুক্ত করুন"
                      : "Register an independent project or module into FlowBoard"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTool} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tool Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={toolForm.name || ""}
                    onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                    placeholder="e.g. Asset & Inventory Hub"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    টুলের নাম (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={toolForm.nameBn || ""}
                    onChange={(e) => setToolForm({ ...toolForm, nameBn: e.target.value })}
                    placeholder="যেমন: সম্পদ ও ইনভেন্টরি হাব"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / বিবরণ
                </label>
                <textarea
                  rows={2}
                  value={toolForm.description || ""}
                  onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                  placeholder="Detailed functional purpose of this independent tool..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category / বিভাগ
                  </label>
                  <select
                    value={toolForm.category}
                    onChange={(e) => setToolForm({ ...toolForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 dark:text-white"
                  >
                    <option value="custom">Custom Module</option>
                    <option value="finance">Finance & Accounts</option>
                    <option value="documents">Documents & Notes</option>
                    <option value="compliance">Compliance & Sanctions</option>
                    <option value="analytics">Analytics & Audit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Icon / আইকন
                  </label>
                  <select
                    value={toolForm.icon}
                    onChange={(e) => setToolForm({ ...toolForm, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 dark:text-white"
                  >
                    <option value="AppWindow">AppWindow (Standard)</option>
                    <option value="Briefcase">Briefcase (Business)</option>
                    <option value="Database">Database (Data Hub)</option>
                    <option value="Cpu">Cpu (System / AI)</option>
                    <option value="Globe">Globe (Portal)</option>
                    <option value="BarChart3">BarChart3 (Analytics)</option>
                    <option value="FileText">FileText (Documents)</option>
                    <option value="Coins">Coins (Financial)</option>
                  </select>
                </div>
              </div>

              {/* Gradient Color Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Theme Gradient Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADIENT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setToolForm({ ...toolForm, gradient: p.value, color: p.color })}
                      className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 text-[11px] transition ${
                        toolForm.gradient === p.value
                          ? "border-emerald-500 bg-emerald-500/10 font-bold"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${p.value}`}
                      />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Adding Tool..." : "Add to FlowBoard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
