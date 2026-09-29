import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Shield,
  Users,
  Layers,
  Settings,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Download,
  ExternalLink,
  Sliders,
  Check,
  X,
  KeyRound,
  UserPlus,
  Building2,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  FileText,
  Boxes,
  Calculator,
  Receipt,
  FileCheck2,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Stamp,
  Eye,
  Printer,
  Sparkles,
  Package,
  ArrowUpRight,
  CheckCheck,
} from "lucide-react";
import {
  User,
  Office,
  FlowBoardTool,
  SystemSettings,
  AuditLog,
  UserRole,
  ToolAccessLevel,
  DEFAULT_ROLE_TOOL_ACCESS,
  getRoleToolAccess,
  getUserToolAccess,
  setGlobalRoleToolAccess,
  BrandingDocumentRule,
} from "../types";
import { DEFAULT_FLOW_TOOLS } from "../config/flowTools";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../api";
import { ProposeUserModal } from "./ProposeUserModal";
import { getCleanInstitutionName } from "../utils/documentBranding";

export interface ToolDocumentSpec {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  sampleSubject?: string;
  sampleBody?: string;
}

export interface ToolDocumentGroup {
  toolId: string;
  toolName: string;
  toolNameBn: string;
  icon: string;
  color: string;
  routeOrTab?: string;
  category: "finance" | "documents" | "compliance" | "analytics" | "custom";
  documents: ToolDocumentSpec[];
}

export const TOOL_DOCUMENT_CATALOG: Record<string, ToolDocumentGroup> = {
  "budget-expense": {
    toolId: "budget-expense",
    toolName: "Office Allocation & Expense Management",
    toolNameBn: "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম",
    icon: "Coins",
    color: "#059669",
    routeOrTab: "dashboard",
    category: "finance",
    documents: [
      {
        id: "form1-forwarding",
        name: "Form-1 Forwarding Letter",
        nameBn: "ফর্ম-১ ফরোয়ার্ডিং পত্র",
        description: "Official memo & forwarding letter for stationery and branch supplies distribution.",
        descriptionBn: "অত্র অঞ্চলাধীন শাখাসমূহের জন্য স্টেশনারী মালামাল প্রেরণ সংক্রান্ত ফরোয়ার্ডিং পত্র।",
        sampleSubject: "বিষয়ঃ অত্র কার্যালয় ও অত্র অঞ্চলাধীন শাখাসমূহের জন্য মুদ্রিত স্টেশনারী দ্রব্যাদি সরবরাহকরণ প্রসঙ্গে।",
      },
      {
        id: "form1-supplyorder",
        name: "Form-1 Supply Order",
        nameBn: "ফর্ম-১ সাপ্লাই অর্ডার / কার্যাদেশ",
        description: "Procurement supply order letter issued to supplier/bidder.",
        descriptionBn: "নির্বাচিত সরবরাহকারী প্রতিষ্ঠানের বরাবরে মালামাল সরবরাহের আনুষ্ঠানিক কার্যাদেশ।",
        sampleSubject: "বিষয়ঃ অনুমোদিত কোটেশনের আলোকে প্রয়োজনীয় মালামাল সরবরাহ আদেশ (Supply Order)।",
      },
      {
        id: "form1-notesheet",
        name: "Form-1 Approval Note Sheet",
        nameBn: "ফর্ম-১ ব্যয় অনুমোদন নোটশিট",
        description: "Official note sheet and approval sanction draft.",
        descriptionBn: "ব্যয় ও বরাদ্দ সংস্থান সংক্রান্ত অফিশিয়াল নোটশিট ও প্রশাসনিক অনুমোদন ড্রাফট।",
        sampleSubject: "বিষয়ঃ প্রশাসনিক ও আর্থিক ব্যয় অনুমোদন প্রসঙ্গে।",
      },
      {
        id: "motor-fuel-forwarding",
        name: "Motor Fuel Forwarding Letter",
        nameBn: "মোটর ফুয়েল ফরোয়ার্ডিং পত্র",
        description: "Fuel and POL reimbursement forwarding letter to audit/finance.",
        descriptionBn: "অফিসিয়াল গাড়ীর জ্বালানী (তেল/সিএনজি) বিল পরিশোধ ও ফরোয়ার্ডিং পত্র।",
        sampleSubject: "বিষয়ঃ অত্র কার্যালয়ের ব্যবহৃত গাড়ীর জ্বালানী বিলের আর্থিক সম্মতি গ্রহণ ও ফরোয়ার্ডিং প্রসঙ্গে।",
      },
      {
        id: "motor-fuel-supplyorder",
        name: "Motor Fuel Supply Order",
        nameBn: "মোটর ফুয়েল জ্বালানী সরবরাহ আদেশ",
        description: "Official fuel supply order issued to designated petrol pump station.",
        descriptionBn: "নির্দিষ্ট পেট্রোল পাম্প ফিলিং স্টেশনের বরাবরে গাড়ীর জ্বালানী সরবরাহ আদেশ।",
        sampleSubject: "বিষয়ঃ অত্র কার্যালয়ের ব্যবহৃত গাড়ীর জ্বালানী সরবরাহের আদেশ (Supply Order)।",
      },
      {
        id: "motor-vehicle-forwarding",
        name: "Motor Vehicle Maintenance Forwarding",
        nameBn: "মোটর ভেহিকেল সার্ভিসিং ফরোয়ার্ডিং",
        description: "Vehicle maintenance, servicing and repair billing forwarding letter.",
        descriptionBn: "অফিসিয়াল গাড়ী মেরামত, চাকা ও যন্ত্রাংশ প্রতিস্থাপন বিল ফরোয়ার্ডিং পত্র।",
        sampleSubject: "বিষয়ঃ অত্র কার্যালয়ের ব্যবহৃত গাড়ীর মেরামত ও পার্টস প্রতিস্থাপন বিলের আর্থিক সম্মতি গ্রহণ প্রসঙ্গে।",
      },
      {
        id: "postfacto-forwarding",
        name: "Post-Facto Sanction Forwarding",
        nameBn: "খরচোত্তর অনুমোদন ফরোয়ার্ডিং",
        description: "Forwarding letter for post-facto expenditure approval.",
        descriptionBn: "জরুরি প্রশাসনিক কার্যক্রমের খরচোত্তর আর্থিক সম্মতি ও মঞ্জুরি ফরোয়ার্ডিং পত্র।",
        sampleSubject: "বিষয়ঃ খরচোত্তর আর্থিক সম্মতি ও ব্যয় মঞ্জুরি গ্রহণ প্রসঙ্গে।",
      },
      {
        id: "postfacto-supplyorder",
        name: "Post-Facto Work Order",
        nameBn: "খরচোত্তর কার্যাদেশ / সরবরাহ পত্র",
        description: "Supply/work order record for post-facto expenditures.",
        descriptionBn: "খরচোত্তর কার্যাবলীর সরবরাহ ও সম্পাদন পত্র রেকর্ড।",
        sampleSubject: "বিষয়ঃ সম্পাদিত জরুরি কাজের কার্যাদেশ নথি।",
      },
      {
        id: "postfacto-sanction",
        name: "Post-Facto Sanction Letter",
        nameBn: "খরচোত্তর আর্থিক মঞ্জুরি পত্র",
        description: "Official financial sanction approval letter from approving authority.",
        descriptionBn: "যথাযথ কর্তৃপক্ষ কর্তৃক অনুমোদিত আর্থিক সম্মতি ও মঞ্জুরি আদেশ পত্র।",
        sampleSubject: "বিষয়ঃ খরচোত্তর আর্থিক মঞ্জুরি আদেশ প্রদান প্রসঙ্গে।",
      },
    ],
  },
  "stockpro": {
    toolId: "stockpro",
    toolName: "StockPro Inventory & Voucher Tracker",
    toolNameBn: "স্টকপ্রো ইনভেন্টরি ট্র্যাকার",
    icon: "Package",
    color: "#3b82f6",
    routeOrTab: "stockpro",
    category: "finance",
    documents: [
      {
        id: "stockpro-challan",
        name: "Delivery Challan & Invoice",
        nameBn: "মালামাল বিতরণ চালান ও ইনভয়েস",
        description: "Stock distribution challan, item ledger, and branch acknowledgement invoice.",
        descriptionBn: "শাখা বা গ্রাহকের বরাবরে কেন্দ্রীয় গুদাম হতে মালামাল ডেলিভারি চালান ও প্রাপ্তি স্বীকারপত্র।",
        sampleSubject: "চালান বিবরণী ও মালামাল সরবরাহ ডেলিভারি রসিদ।",
      },
      {
        id: "stockpro-requisition",
        name: "Stock Requisition Voucher",
        nameBn: "স্টক রিকুইজিশন ভাউচার",
        description: "Branch inventory demand and stock ledger verification requisition voucher.",
        descriptionBn: "শাখা হতে প্রেরিত মালামালের চাহিদা ও মজুদ নিরীক্ষা ভাউচার।",
        sampleSubject: "মালামাল চাহিদা পত্র ও স্টক বরাদ্দ রিকুইজিশন।",
      },
    ],
  },
  "conference-note": {
    toolId: "conference-note",
    toolName: "Conference Bill & Note Generator",
    toolNameBn: "সভার নোট জেনারেটর",
    icon: "FileSpreadsheet",
    color: "#d97706",
    routeOrTab: "conference-note",
    category: "documents",
    documents: [
      {
        id: "conf-notesheet",
        name: "Conference Expense Note Sheet",
        nameBn: "কনফারেন্স ও সভার ব্যয় নোট শিট",
        description: "Official meeting expense and refreshments approval note pad.",
        descriptionBn: "শাখা ব্যবস্থাপক সম্মেলন ও সভার আপ্যায়ন ব্যয় অনুমোদন নোটশিট।",
        sampleSubject: "বিষয়ঃ শাখা ব্যবস্থাপক সম্মেলন ও পর্যালোচনা সভার ব্যয় নির্বাহের অনুমোদন প্রসঙ্গে।",
      },
      {
        id: "conf-resolution",
        name: "Meeting Minutes & Resolution",
        nameBn: "সভার কার্যবিবরণী ও সিদ্ধান্ত",
        description: "Official agenda minutes, resolution summary and signatures page.",
        descriptionBn: "সম্মেলনের বিস্তারিত কার্যবিবরণী, গৃহীত সিদ্ধান্ত ও স্বাক্ষর পেপার।",
        sampleSubject: "বিষয়ঃ অনুষ্ঠিত পর্যালোচনা সভার কার্যবিবরণী ও রেজুলেশন।",
      },
      {
        id: "conf-forwarding",
        name: "Conference Forwarding Pad",
        nameBn: "কনফারেন্স ফরোয়ার্ডিং প্যাড",
        description: "Forwarding letter to head office or division for conference bill sanction.",
        descriptionBn: "সভার বিল অনুমোদনের নিমিত্তে প্রধান কার্যালয়/বিভাগে প্রেরিত ফরোয়ার্ডিং পত্র।",
        sampleSubject: "বিষয়ঃ অনুষ্ঠিত সভার বিলের আর্থিক সম্মতি গ্রহণের ফরোয়ার্ডিং পত্র।",
      },
    ],
  },
  "multi-item-bill": {
    toolId: "multi-item-bill",
    toolName: "Multi-Item Bill & CS Generator",
    toolNameBn: "বহু-আইটেম বিল ও কোটেশন বিবরণী",
    icon: "Receipt",
    color: "#0891b2",
    routeOrTab: "multi-item-bill",
    category: "finance",
    documents: [
      {
        id: "multi-cs",
        name: "Comparative Statement (CS)",
        nameBn: "তুলনামূলক বিবরণী (CS)",
        description: "Multi-bidder price comparison evaluation sheet.",
        descriptionBn: "একাধিক দরদাতার কোটেশন মূল্যায়ন ও সর্বনিম্ন দরদাতা নির্ধারণ বিবরণী (CS)।",
        sampleSubject: "বিষয়ঃ উন্মুক্ত কোটেশন মূল্যায়নের তুলনামূলক বিবরণী (CS)।",
      },
      {
        id: "multi-supplyorder",
        name: "Multi-Item Supply Order",
        nameBn: "মাল্টি-আইটেম কার্যাদেশ",
        description: "Detailed procurement work order issued to lowest evaluated bidder.",
        descriptionBn: "আইটেমভিত্তিক দর ও স্পেসিফিকেশনসহ নির্বাচিত দরদাতাকে কার্যাদেশ প্রদান।",
        sampleSubject: "বিষয়ঃ দরপত্রের আলোকে মালামাল সরবরাহের কার্যাদেশ প্রদান।",
      },
      {
        id: "multi-forwarding",
        name: "Multi-Item Forwarding Letter",
        nameBn: "মাল্টি-আইটেম ফরোয়ার্ডিং পত্র",
        description: "Billing forwarding memo to regional audit/accounts officer.",
        descriptionBn: "বিল পরিশোধ ও নিরীক্ষা সম্মতির জন্য ফরোয়ার্ডিং পত্র।",
        sampleSubject: "বিষয়ঃ ক্রয়কৃত মালামালের বিলের আর্থিক সম্মতি গ্রহণের ফরোয়ার্ডিং পত্র।",
      },
    ],
  },
  "stationery-bill": {
    toolId: "stationery-bill",
    toolName: "Printed Stationery & Work Order Challan",
    toolNameBn: "মুদ্রিত স্টেশনারী ও কার্যাদেশ চালান",
    icon: "Printer",
    color: "#8b5cf6",
    routeOrTab: "stationery-bill",
    category: "documents",
    documents: [
      {
        id: "stationery-supplyorder",
        name: "Printing Supply Order",
        nameBn: "মুদ্রিত স্টেশনারী কার্যাদেশ",
        description: "Work order for printing bank registers, vouchers, and ledgers.",
        descriptionBn: "ব্যাংক ফরম, রেজিস্টার ও লেজার বই মুদ্রণের জন্য প্রেস কার্যাদেশ।",
        sampleSubject: "বিষয়ঃ অত্র অঞ্চলের শাখাসমূহের জন্য প্রয়োজনীয় ফরম ও খাতা মুদ্রণের কার্যাদেশ।",
      },
      {
        id: "stationery-challan",
        name: "Delivery Challan",
        nameBn: "মুদ্রিত মালামাল চালান পত্র",
        description: "Delivery challan and stock entry verification voucher.",
        descriptionBn: "প্রেস হতে প্রাপ্ত মুদ্রিত রেজিস্টার ও ভাউচারের চালান ভেরিফিকেশন।",
        sampleSubject: "বিষয়ঃ মুদ্রিত স্টেশনারী মালামাল গ্রহণ ও ডেলিভারি চালান।",
      },
      {
        id: "stationery-notesheet",
        name: "Printing Approval Note Sheet",
        nameBn: "মুদ্রণ ব্যয় অনুমোদন নোটশিট",
        description: "Administrative expense note sheet for printing stationery.",
        descriptionBn: "বার্ষিক মুদ্রণ ব্যয় অনুমোদন সংক্রান্ত প্রশাসনিক নোটশিট।",
        sampleSubject: "বিষয়ঃ মুদ্রিত সামগ্রী ক্রয় বাবদ ব্যয় অনুমোদন প্রসঙ্গে।",
      },
    ],
  },
  "miscellaneous": {
    toolId: "miscellaneous",
    toolName: "Miscellaneous & Form Overlay Studio",
    toolNameBn: "বিবিধ ও ফর্ম ওভারলে স্টুডিও",
    icon: "Layers",
    color: "#6366f1",
    routeOrTab: "miscellaneous",
    category: "documents",
    documents: [
      {
        id: "misc-bankpad",
        name: "Official Bank Pad Overlay",
        nameBn: "অফিসিয়াল ব্যাংক প্যাড ও জলছাপ ওভারলে",
        description: "Standard official pad layout for custom letters and announcements.",
        descriptionBn: "কাস্টম চিঠি, সার্কুলার ও বিজ্ঞপ্তির জন্য প্রমিত ব্যাংক প্যাড ও জলছাপ।",
        sampleSubject: "বিষয়ঃ বিবিধ আনুষ্ঠানিক বিজ্ঞপ্তি ও প্রশাসনিক নির্দেশনা।",
      },
      {
        id: "misc-certificate",
        name: "Official Certificate & Memo",
        nameBn: "কাস্টম অফিস স্মারক ও প্রত্যয়ন পত্র",
        description: "Official certification, authorization, and administrative memo overlay.",
        descriptionBn: "কর্মকর্তা/শাখার প্রত্যয়নপত্র ও বিশেষ স্মারক ড্রাফটিং ফরম্যাট।",
        sampleSubject: "বিষয়ঃ অফিস প্রত্যয়ন পত্র ও প্রশাসনিক স্মারক।",
      },
    ],
  },
  "office-monitoring": {
    toolId: "office-monitoring",
    toolName: "Office Monitoring Management System",
    toolNameBn: "অফিস মনিটরিং ম্যানেজমেন্ট সিস্টেম",
    icon: "ShieldCheck",
    color: "#cc785c",
    routeOrTab: "office-monitoring",
    category: "compliance",
    documents: [
      {
        id: "monitoring-report",
        name: "Inspection & Monitoring Report",
        nameBn: "পরিদর্শন ও মনিটরিং প্রতিবেদন",
        description: "Comprehensive branch performance, audit score, and monitoring summary report.",
        descriptionBn: "শাখা পরিদর্শন, অডিট স্কোর ও কেন্দ্রীয় মনিটরিং প্রতিবেদন নথি।",
        sampleSubject: "বিষয়ঃ শাখা পরিদর্শন ও সার্বিক কার্যসম্পাদন মনিটরিং প্রতিবেদন।",
      },
      {
        id: "monitoring-receipt",
        name: "Branch Submission Receipt",
        nameBn: "শাখা দাখিলপত্র রশিদ",
        description: "Official acknowledgment receipt for branch compliance submissions.",
        descriptionBn: "শাখা কর্তৃক দাখিলকৃত রিটার্ন ও কমপ্লায়েন্স তথ্যের আনুষ্ঠানিক রসিদ।",
        sampleSubject: "বিষয়ঃ শাখা তথ্য দাখিল ও কমপ্লায়েন্স প্রাপ্তিস্বীকার পত্র।",
      },
    ],
  },
};

interface FlowBoardCentralManagementProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  offices: Office[];
  tools: FlowBoardTool[];
  setTools?: React.Dispatch<React.SetStateAction<FlowBoardTool[]>>;
  auditLogs?: AuditLog[];
  onBackToHub: () => void;
  onRefreshData?: () => void;
  onAddTool?: (newTool: Partial<FlowBoardTool>) => Promise<boolean>;
  onDeleteTool?: (toolId: string) => Promise<boolean>;
  onSelectTool?: (toolId: string, initialTab?: string) => void;
}

export function FlowBoardCentralManagement({
  currentUser,
  systemSettings,
  users,
  setUsers,
  offices,
  tools,
  setTools: _setTools,
  auditLogs = [],
  onBackToHub,
  onRefreshData,
  onAddTool,
  onDeleteTool,
  onSelectTool,
}: FlowBoardCentralManagementProps) {
  const { language } = useLanguage();
  const { theme, isCustom } = useTheme();
  const isDark = theme === "dark";

  const buildRoleToolAccessMap = (
    savedSettings?: Record<string, Record<string, ToolAccessLevel>> | null,
    toolsList: FlowBoardTool[] = []
  ): Record<string, Record<string, ToolAccessLevel>> => {
    const result: Record<string, Record<string, ToolAccessLevel>> = {};
    const roles = [
      "Admin",
      "Head Office Admin",
      "Moderator",
      "Divisional Admin",
      "Divisional Moderator",
      "Regional Admin",
      "Regional Moderator",
      "Branch Admin",
      "Branch User",
      "Head Office User",
      "Sub-office User",
      "User",
      "Report Viewer",
    ];
    const allTools = toolsList.length > 0 ? toolsList : DEFAULT_FLOW_TOOLS;

    roles.forEach((r) => {
      result[r] = {};
      allTools.forEach((t) => {
        if (savedSettings && savedSettings[r] && savedSettings[r][t.id] !== undefined) {
          result[r][t.id] = savedSettings[r][t.id];
        } else if (DEFAULT_ROLE_TOOL_ACCESS[r] && DEFAULT_ROLE_TOOL_ACCESS[r][t.id] !== undefined) {
          result[r][t.id] = DEFAULT_ROLE_TOOL_ACCESS[r][t.id];
        } else {
          result[r][t.id] = "none";
        }
      });
    });
    return result;
  };

  const [activeTab, setActiveTab] = useState<"rbac" | "role-permissions" | "tools" | "branding-watermark" | "audit" | "policy">("rbac");
  const [roleToolAccessDraft, setRoleToolAccessDraft] = useState<Record<string, Record<string, ToolAccessLevel>>>(
    () => buildRoleToolAccessMap(systemSettings?.roleToolAccess, tools)
  );
  const [isSavingRolePermissions, setIsSavingRolePermissions] = useState(false);
  const [rolePermissionsSuccessMsg, setRolePermissionsSuccessMsg] = useState("");

  // Branding & Watermark Policy State
  const defaultBrandingRules = useMemo(() => {
    const rules: Record<string, BrandingDocumentRule> = {};
    Object.values(TOOL_DOCUMENT_CATALOG).forEach((toolSpec) => {
      toolSpec.documents.forEach((doc) => {
        const key = `${toolSpec.toolId}:${doc.id}`;
        rules[key] = {
          logoHeaderEnabled: true,
          watermarkEnabled: true,
          a4LayoutEnabled: true,
        };
      });
    });
    return rules;
  }, []);

  const [brandingRulesDraft, setBrandingRulesDraft] = useState<Record<string, BrandingDocumentRule>>(() => {
    const saved = systemSettings?.brandingPolicy?.documentRules;
    return saved ? { ...defaultBrandingRules, ...saved } : defaultBrandingRules;
  });

  const [brandingHeaderDraft, setBrandingHeaderDraft] = useState({
    institutionName: systemSettings?.brandingPolicy?.institutionName || systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক",
    officeName: systemSettings?.brandingPolicy?.officeName || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি",
    slogan: systemSettings?.brandingPolicy?.slogan || "গণমানুষের ব্যাংক",
    websiteUrl: systemSettings?.brandingPolicy?.websiteUrl || "www.krishibank.gov.bd",
    logoUrl: systemSettings?.brandingPolicy?.logoUrl || systemSettings?.logoUrl || "",
    showLogo: systemSettings?.brandingPolicy?.showLogo ?? true,
    showWatermark: systemSettings?.brandingPolicy?.showWatermark ?? true,
    watermarkOpacity: systemSettings?.brandingPolicy?.watermarkOpacity ?? 0.065,
    defaultPageSize: systemSettings?.brandingPolicy?.defaultPageSize || "A4",
  });

  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert(
        language === "bn"
          ? "ছবির সাইজ সর্বোচ্চ ৩ মেগাবাইট হতে পারবে।"
          : "Image size must be less than 3MB."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBrandingHeaderDraft((prev) => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSuccessMsg, setBrandingSuccessMsg] = useState("");
  const [selectedBrandingToolFilter, setSelectedBrandingToolFilter] = useState<string>("all");
  const [brandingSearchQuery, setBrandingSearchQuery] = useState<string>("");
  const [previewDocModal, setPreviewDocModal] = useState<{
    toolId: string;
    docId: string;
    docName: string;
    docNameBn: string;
    sampleSubject?: string;
  } | null>(null);

  useEffect(() => {
    if (systemSettings?.brandingPolicy) {
      if (systemSettings.brandingPolicy.documentRules) {
        setBrandingRulesDraft((prev) => ({
          ...defaultBrandingRules,
          ...prev,
          ...systemSettings.brandingPolicy?.documentRules,
        }));
      }
      setBrandingHeaderDraft({
        institutionName: systemSettings.brandingPolicy.institutionName || systemSettings.institutionName || "বাংলাদেশ কৃষি ব্যাংক",
        officeName: systemSettings.brandingPolicy.officeName || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি",
        slogan: systemSettings.brandingPolicy.slogan || "গণমানুষের ব্যাংক",
        websiteUrl: systemSettings.brandingPolicy.websiteUrl || "www.krishibank.gov.bd",
        logoUrl: systemSettings.brandingPolicy.logoUrl || systemSettings.logoUrl || "",
        showLogo: systemSettings.brandingPolicy.showLogo ?? true,
        showWatermark: systemSettings.brandingPolicy.showWatermark ?? true,
        watermarkOpacity: systemSettings.brandingPolicy.watermarkOpacity ?? 0.065,
        defaultPageSize: systemSettings.brandingPolicy.defaultPageSize || "A4",
      });
    } else if (systemSettings) {
      setBrandingHeaderDraft((prev) => ({
        ...prev,
        institutionName: systemSettings.institutionName || prev.institutionName,
        logoUrl: systemSettings.logoUrl || prev.logoUrl,
      }));
    }
  }, [systemSettings, defaultBrandingRules]);

  useEffect(() => {
    setRoleToolAccessDraft(buildRoleToolAccessMap(systemSettings?.roleToolAccess, tools));
  }, [systemSettings, tools]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRolePermTab, setSelectedRolePermTab] = useState<string>("Admin");
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [togglingUserIds, setTogglingUserIds] = useState<Set<string>>(new Set());

  const roleStr = currentUser?.role as string | undefined;
  const isSuperAdminUser = roleStr === "Super Admin";
  const isAdmin =
    roleStr === "Super Admin" ||
    roleStr === "Admin" ||
    roleStr === "Head Office Admin" ||
    roleStr === "HeadOfficeAdmin";

  // Visible Users: Admin users must NOT see Super Admin in the list!
  const visibleUsers = useMemo(() => {
    return users.filter((u) => {
      if (!isSuperAdminUser && u.role === "Super Admin") {
        return false;
      }
      return true;
    });
  }, [users, isSuperAdminUser]);

  // Selected User for Granular Tool Permission Modal/Drawer
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [userPermissionsDraft, setUserPermissionsDraft] = useState<Record<string, { access?: ToolAccessLevel; roleTitle?: string; notes?: string }>>({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionSuccessMsg, setPermissionSuccessMsg] = useState("");

  // Create/Edit User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    userId: "",
    name: "",
    email: "",
    role: "User" as UserRole,
    officeId: offices[0]?.id || "",
    designation: "",
    status: "Active" as "Active" | "Inactive",
    password: "",
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userFormError, setUserFormError] = useState("");

  // Add Tool Modal
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [newToolForm, setNewToolForm] = useState({
    name: "",
    nameBn: "",
    description: "",
    descriptionBn: "",
    category: "custom" as any,
    icon: "Boxes",
    version: "1.0.0",
    routeOrTab: "custom",
  });

  // Global Settings Draft
  const [policyDraft, setPolicyDraft] = useState({
    institutionName: systemSettings?.institutionName || "FlowBoard Workspace Platform",
    webAppName: systemSettings?.webAppName || "FlowBoard Enterprise",
    loginLogoUrl: systemSettings?.loginLogoUrl || "",
    requireExpenseApproval: systemSettings?.requireExpenseApproval ?? true,
    showNoticeBar: systemSettings?.showNoticeBar ?? true,
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policySuccessMsg, setPolicySuccessMsg] = useState("");

  useEffect(() => {
    if (systemSettings) {
      setPolicyDraft((prev) => ({
        ...prev,
        institutionName: systemSettings.institutionName || prev.institutionName,
        webAppName: systemSettings.webAppName || prev.webAppName,
        loginLogoUrl: systemSettings.loginLogoUrl ?? prev.loginLogoUrl,
        requireExpenseApproval: systemSettings.requireExpenseApproval ?? prev.requireExpenseApproval,
        showNoticeBar: systemSettings.showNoticeBar ?? prev.showNoticeBar,
      }));
    }
  }, [systemSettings]);

  const handleLoginLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(language === "bn" ? "অনুগ্রহ করে একটি ছবি (Image) ফাইল নির্বাচন করুন।" : "Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(language === "bn" ? "ফাইলের আকার সর্বোচ্চ ২ মেগাবাইট হতে পারবে।" : "Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPolicyDraft((prev) => ({ ...prev, loginLogoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Filtered Users (based on visibleUsers so Admins cannot see Super Admin)
  const filteredUsers = useMemo(() => {
    return visibleUsers.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q);

      const matchesOffice =
        selectedOfficeFilter === "all" || u.officeId === selectedOfficeFilter;
      const matchesRole =
        selectedRoleFilter === "all" || u.role === selectedRoleFilter;
      const matchesStatus =
        selectedStatusFilter === "all" || u.status === selectedStatusFilter;

      return matchesSearch && matchesOffice && matchesRole && matchesStatus;
    });
  }, [visibleUsers, searchQuery, selectedOfficeFilter, selectedRoleFilter, selectedStatusFilter]);

  // Visible Audit Logs: Hide Super Admin activity logs from Admin users
  const visibleAuditLogs = useMemo(() => {
    if (isSuperAdminUser) return auditLogs;
    const superAdminUserIds = new Set(
      users
        .filter((u) => u.role === "Super Admin")
        .map((u) => (u.userId || "").toLowerCase())
    );
    return auditLogs.filter(
      (log) => !superAdminUserIds.has((log.userId || "").toLowerCase())
    );
  }, [auditLogs, users, isSuperAdminUser]);

  // Open Permission Modal
  const handleOpenPermissionsModal = (user: User) => {
    setSelectedUserForPermissions(user);
    const draft: Record<string, { access?: ToolAccessLevel; roleTitle?: string; notes?: string }> = {};

    tools.forEach((tool) => {
      const explicitAccess = user.toolPermissions?.[tool.id]?.access;
      const customTitle = user.toolPermissions?.[tool.id]?.roleTitle || "";
      const notes = user.toolPermissions?.[tool.id]?.notes || "";
      draft[tool.id] = {
        access: explicitAccess,
        roleTitle: customTitle,
        notes: notes,
      };
    });

    setUserPermissionsDraft(draft);
    setPermissionSuccessMsg("");
  };

  // Save Permissions for Selected User
  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;
    setIsSavingPermissions(true);
    setPermissionSuccessMsg("");

    try {
      const updatedUser: User = {
        ...selectedUserForPermissions,
        toolPermissions: userPermissionsDraft,
      };

      const res = await apiFetch(`/api/users/${selectedUserForPermissions.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      });

      if (!res.ok) {
        throw new Error(language === "bn" ? "পারমিশন সংরক্ষণ ব্যর্থ হয়েছে" : "Failed to save permissions");
      }

      const savedUser = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserForPermissions.id ? { ...u, ...savedUser } : u))
      );

      setPermissionSuccessMsg(
        language === "bn"
          ? "টুলভিত্তিক RBAC পারমিশন সফলভাবে সংরক্ষিত হয়েছে!"
          : "Tool-wise RBAC permissions updated successfully!"
      );

      setTimeout(() => {
        setSelectedUserForPermissions(null);
        setPermissionSuccessMsg("");
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Failed to update tool permissions");
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Create or Update User
  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError("");
    setIsSubmittingUser(true);

    try {
      if (editingUser) {
        const payload: any = {
          ...editingUser,
          ...userFormData,
        };
        if (!payload.password) delete payload.password;

        const res = await apiFetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update user");
        }

        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)));
      } else {
        const payload = {
          ...userFormData,
          id: `usr-${Date.now()}`,
          toolPermissions: {},
        };

        const res = await apiFetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to create user");
        }

        const created = await res.json();
        setUsers((prev) => [...prev, created]);
      }

      setShowUserModal(false);
      setEditingUser(null);
    } catch (err: any) {
      setUserFormError(err.message || "Operation failed");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      alert(language === "bn" ? "নিজের আইডি মুছে ফেলা সম্ভব নয়" : "Cannot delete your own user ID");
      return;
    }
    const conf = window.confirm(
      language === "bn"
        ? `আপনি কি নিশ্চিতভাবে "${user.name}" ব্যবহারকারীকে মুছে ফেলতে চান?`
        : `Are you sure you want to delete user "${user.name}"?`
    );
    if (!conf) return;

    try {
      const res = await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    }
  };

  // Reset Password
  const handleAdminResetPassword = async (targetUser: User) => {
    const newPass = prompt(
      language === "bn"
        ? `"${targetUser.name}" (${targetUser.userId})-এর জন্য নতুন পাসওয়ার্ড লিখুন:`
        : `Enter new password for "${targetUser.name}" (${targetUser.userId}):`,
      "password123"
    );
    if (!newPass || !newPass.trim()) return;

    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser.id, newPassword: newPass.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(
          language === "bn"
            ? `"${targetUser.name}"-এর পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!`
            : "Password successfully reset by Admin!"
        );
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || "Failed to reset password");
      }
    } catch {
      alert("Error resetting password");
    }
  };

  // Toggle User Active/Inactive Status
  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    setTogglingUserIds((prev) => new Set(prev).add(user.id));

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );

    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          status: nextStatus,
        }),
      });
      if (!res.ok) {
        // Rollback
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u))
        );
        const errData = await res.json().catch(() => ({}));
        alert(
          errData.error ||
            (language === "bn"
              ? "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।"
              : "Failed to toggle status.")
        );
      } else {
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      // Rollback
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u))
      );
      alert("Failed to toggle status: " + (err.message || err));
    } finally {
      setTogglingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  // Add Tool Submit
  const handleAddToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTool) return;
    const ok = await onAddTool({
      ...newToolForm,
      color: "#2563eb",
      gradient: "from-blue-600 via-indigo-600 to-sky-700",
      status: "active",
    });
    if (ok) {
      setShowAddToolModal(false);
      setNewToolForm({
        name: "",
        nameBn: "",
        description: "",
        descriptionBn: "",
        category: "custom",
        icon: "Boxes",
        version: "1.0.0",
        routeOrTab: "custom",
      });
    }
  };

  // Save Policy Settings
  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    setPolicySuccessMsg("");
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyDraft),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setPolicySuccessMsg(
        language === "bn" ? "পলিসি ও গ্লোবাল সেটিংস সংরক্ষিত হয়েছে!" : "Policy settings updated successfully!"
      );
      setTimeout(() => setPolicySuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleSaveRolePermissions = async () => {
    setIsSavingRolePermissions(true);
    setRolePermissionsSuccessMsg("");
    try {
      const updatedSettings = {
        ...systemSettings,
        roleToolAccess: roleToolAccessDraft,
      };
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error("Failed to save role permissions");
      setGlobalRoleToolAccess(roleToolAccessDraft);
      setRolePermissionsSuccessMsg(
        language === "bn"
          ? "রোল ভিত্তিক টুল পারমিশন সফলভাবে সংরক্ষিত হয়েছে!"
          : "Role-based tool permissions updated successfully!"
      );
      if (onRefreshData) {
        onRefreshData();
      }
      setTimeout(() => setRolePermissionsSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      alert(language === "bn" ? "সংরক্ষণ করতে ব্যর্থ হয়েছে" : "Failed to save settings");
    } finally {
      setIsSavingRolePermissions(false);
    }
  };

  const handleUpdateRolePerm = (role: string, toolId: string, level: ToolAccessLevel) => {
    setRoleToolAccessDraft((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [toolId]: level,
      },
    }));
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    setBrandingSuccessMsg("");
    try {
      const updatedSettings: SystemSettings = {
        ...(systemSettings || ({} as SystemSettings)),
        institutionName: brandingHeaderDraft.institutionName || "বাংলাদেশ কৃষি ব্যাংক",
        logoUrl: brandingHeaderDraft.logoUrl,
        brandingPolicy: {
          institutionName: brandingHeaderDraft.institutionName,
          officeName: brandingHeaderDraft.officeName,
          slogan: brandingHeaderDraft.slogan,
          websiteUrl: brandingHeaderDraft.websiteUrl,
          logoUrl: brandingHeaderDraft.logoUrl,
          showLogo: brandingHeaderDraft.showLogo,
          showWatermark: brandingHeaderDraft.showWatermark,
          watermarkOpacity: brandingHeaderDraft.watermarkOpacity,
          defaultPageSize: brandingHeaderDraft.defaultPageSize as any,
          documentRules: brandingRulesDraft,
        },
      };

      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });

      if (!res.ok) throw new Error("Failed to save branding settings");
      setBrandingSuccessMsg(
        language === "bn"
          ? "লোগো, হেডার ও জলছাপ পলিসি সফলভাবে সংরক্ষিত হয়েছে!"
          : "Logo, header, and watermark policy saved successfully!"
      );
      if (onRefreshData) {
        onRefreshData();
      }
      setTimeout(() => setBrandingSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      alert(language === "bn" ? "সংরক্ষণ করতে ব্যর্থ হয়েছে" : "Failed to save branding policy");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleToggleDocRule = (
    key: string,
    field: "logoHeaderEnabled" | "watermarkEnabled" | "a4LayoutEnabled"
  ) => {
    setBrandingRulesDraft((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { logoHeaderEnabled: true, watermarkEnabled: true, a4LayoutEnabled: true }),
        [field]: !prev[key]?.[field],
      },
    }));
  };

  const handleToggleToolAll = (toolId: string, enable: boolean) => {
    const toolGroup = TOOL_DOCUMENT_CATALOG[toolId];
    if (!toolGroup) return;
    setBrandingRulesDraft((prev) => {
      const next = { ...prev };
      toolGroup.documents.forEach((doc) => {
        const key = `${toolId}:${doc.id}`;
        next[key] = {
          logoHeaderEnabled: enable,
          watermarkEnabled: enable,
          a4LayoutEnabled: enable,
        };
      });
      return next;
    });
  };

  const handleToggleGlobalAll = (enable: boolean) => {
    setBrandingRulesDraft((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = {
          logoHeaderEnabled: enable,
          watermarkEnabled: enable,
          a4LayoutEnabled: enable,
        };
      });
      return next;
    });
  };

  const getOfficeName = (id: string) => {
    return offices.find((o) => o.id === id)?.name || id;
  };

  const renderToolIcon = (iconName: string, className: string = "w-4 h-4") => {
    switch (iconName) {
      case "Coins":
        return <Coins className={className} />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className={className} />;
      case "FileText":
        return <FileText className={className} />;
      case "Receipt":
        return <Receipt className={className} />;
      case "Calculator":
        return <Calculator className={className} />;
      case "FileCheck2":
        return <FileCheck2 className={className} />;
      case "ShieldCheck":
        return <ShieldCheck className={className} />;
      case "Package":
        return <Package className={className} />;
      case "Printer":
        return <Printer className={className} />;
      case "Stamp":
        return <Stamp className={className} />;
      case "Layers":
        return <Layers className={className} />;
      default:
        return <Boxes className={className} />;
    }
  };

  return (
    <div
      id="flowboard-central-management-root"
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? "bg-slate-950 text-slate-100" : isCustom ? "bg-slate-900 text-purple-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Central Management Top Bar */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            id="central-back-to-hub-btn"
            onClick={onBackToHub}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title={language === "bn" ? "ফ্লোবোর্ড হাবে ফিরুন" : "Back to FlowBoard Hub"}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "bn" ? "ফ্লোবোর্ড হাব" : "Hub"}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-900/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  {language === "bn" ? "ফ্লোবোর্ড সেন্ট্রাল ম্যানেজমেন্ট" : "FlowBoard Central Management"}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  RBAC & Multi-Tool
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "bn"
                  ? "সকল টুলস, সেন্ট্রাল ইউজার ডিরেক্টরি ও রোল-বেসড পারমিশন নিয়ন্ত্রণ"
                  : "Central directory, multi-tool permissions, and enterprise hub security"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{users.length}</span>
              <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "ইউজার" : "Users"}</span>
            </div>
            <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{tools.length}</span>
              <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "টুলস" : "Tools"}</span>
            </div>
            <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{offices.length}</span>
              <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "অফিস" : "Offices"}</span>
            </div>
          </div>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-xs"
              title={language === "bn" ? "ডাটা রিফ্রেশ" : "Refresh Data"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            id="central-create-user-btn"
            onClick={() => {
              setEditingUser(null);
              setUserFormData({
                userId: "",
                name: "",
                email: "",
                role: "User",
                officeId: offices[0]?.id || "",
                designation: "",
                status: "Active",
                password: "",
              });
              setUserFormError("");
              setShowUserModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "bn" ? "নতুন ব্যবহারকারী" : "New User"}</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 px-4 sm:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          <button
            id="central-tab-rbac"
            onClick={() => setActiveTab("rbac")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "rbac"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{language === "bn" ? "ব্যবহারকারী ও RBAC ম্যাট্রিক্স" : "Users & Tool RBAC Matrix"}</span>
          </button>

          <button
            id="central-tab-role-permissions"
            onClick={() => setActiveTab("role-permissions")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "role-permissions"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{language === "bn" ? "রোল ভিত্তিক পারমিশন" : "Role-Based Permissions"}</span>
          </button>

          <button
            id="central-tab-tools"
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "tools"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{language === "bn" ? "টুলস ও মডিউল রেজিস্ট্রি" : "Tools & Modules Registry"}</span>
          </button>

          <button
            id="central-tab-branding-watermark"
            onClick={() => setActiveTab("branding-watermark")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "branding-watermark"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>{language === "bn" ? "লোগো ও জলছাপ পলিসি" : "Logo & Watermark Policy"}</span>
          </button>

          <button
            id="central-tab-audit"
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{language === "bn" ? "সেন্ট্রাল অডিট ও নিরাপত্তা লগ" : "Central Audit & Logs"}</span>
          </button>

          <button
            id="central-tab-policy"
            onClick={() => setActiveTab("policy")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "policy"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{language === "bn" ? "হাব পলিসি ও কনফিগারেশন" : "Hub Policies & Config"}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: USERS & RBAC MATRIX                               */}
        {/* ======================================================== */}
        {activeTab === "rbac" && (
          <div className="space-y-4">
            {/* Top Bar with Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === "bn" ? "ব্যবহারকারী তালিকা ও RBAC ব্যবস্থাপনা" : "User Directory & RBAC Matrix"}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    {filteredUsers.length} / {users.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === "bn"
                    ? "সকল স্বতন্ত্র টুলের জন্য কেন্দ্রীয়ভাবে ব্যবহারকারীর রোল, অফিস পদবি ও এক্সেস পারমিশন পরিচালনা করুন"
                    : "Centrally manage user credentials, office assignment, global roles, and granular tool access levels"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isAdmin ? (
                  <button
                    id="central-table-add-user-btn"
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormData({
                        userId: "",
                        name: "",
                        email: "",
                        role: "Sub-office User",
                        officeId: offices[0]?.id || "",
                        designation: "",
                        status: "Active",
                        password: "password123",
                      });
                      setUserFormError("");
                      setShowUserModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === "bn" ? "+ নতুন ব্যবহারকারী" : "+ Add User"}</span>
                  </button>
                ) : (
                  <button
                    id="central-table-propose-user-btn"
                    onClick={() => setShowProposalModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{language === "bn" ? "সহকর্মীর আইডি প্রস্তাব দিন" : "Propose Colleague"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === "bn"
                      ? "নাম, ইউজার আইডি, ইমেইল বা পদবি দিয়ে খুঁজুন..."
                      : "Search by name, user ID, email, or designation..."
                  }
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "ফিল্টার:" : "Filter:"}</span>
                </div>

                <select
                  value={selectedOfficeFilter}
                  onChange={(e) => setSelectedOfficeFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">{language === "bn" ? "সকল অফিস" : "All Offices"}</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">{language === "bn" ? "সকল রোল" : "All Roles"}</option>
                  {isSuperAdminUser && <option value="Super Admin">Super Admin</option>}
                  <option value="Admin">Admin</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Divisional Admin">Divisional Admin (বিভাগীয় এডমিন)</option>
                  <option value="Divisional Moderator">Divisional Moderator (বিভাগীয় মডারেটর)</option>
                  <option value="Regional Admin">Regional Admin (আঞ্চলিক এডমিন)</option>
                  <option value="Regional Moderator">Regional Moderator (আঞ্চলিক মডারেটর)</option>
                  <option value="Branch Admin">Branch Admin (শাখার এডমিন)</option>
                  <option value="Branch User">Branch User (শাখা ইউজার)</option>
                  <option value="Head Office Admin">Head Office Admin</option>
                  <option value="Sub-office User">Sub-office User</option>
                  <option value="User">User</option>
                  <option value="Report Viewer">Report Viewer</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">{language === "bn" ? "সকল স্ট্যাটাস" : "All Status"}</option>
                  <option value="Active">{language === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
                  <option value="Inactive">{language === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{language === "bn" ? "ইউজার আইডি ও নাম" : "User ID & Name"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "পদবি" : "Designation"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "সিস্টেম রোল" : "System Role"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "অফিস" : "Office"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "টুল এক্সেস ম্যাট্রিক্স (RBAC)" : "Tool Access Matrix (RBAC)"}</th>
                      <th className="py-3 px-4 text-center">{language === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                      <th className="py-3 px-4 text-right">{language === "bn" ? "অ্যাকশন" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          {language === "bn"
                            ? "কোন ব্যবহারকারী পাওয়া যায়নি।"
                            : "No users found matching your filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* USER ID & NAME */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                    {user.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    ID: {user.userId}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* DESIGNATION */}
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              {user.designation || "-"}
                            </td>

                            {/* SYSTEM ROLE */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  user.role === "Super Admin"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                                    : user.role === "Admin" || user.role === "Head Office Admin"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                      : user.role === "Moderator"
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                                        : user.role === "Report Viewer"
                                          ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>

                            {/* OFFICE */}
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 dark:text-slate-200 font-medium">
                                {getOfficeName(user.officeId)}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                {user.email}
                              </div>
                            </td>

                            {/* TOOL ACCESS MATRIX */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap max-w-sm">
                                {tools.slice(0, 8).map((tool) => {
                                  const access = getUserToolAccess(user, tool.id, roleToolAccessDraft);
                                  const shortName =
                                    tool.id === "budget-expense"
                                      ? "বরাদ্দ"
                                      : tool.id === "stockpro"
                                        ? "স্টকপ্রো"
                                        : tool.id === "conference-note"
                                          ? "সভার নোট"
                                          : tool.id === "multi-item-bill"
                                            ? "বহু-আইটেম"
                                            : tool.id === "stationery-bill"
                                              ? "মুদ্রিত"
                                              : tool.id === "miscellaneous"
                                                ? "বিবিধ"
                                                : tool.nameBn ? tool.nameBn.slice(0, 6) : tool.name.slice(0, 6);

                                  return (
                                    <span
                                      key={tool.id}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                                        access === "full"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                          : access === "operate"
                                            ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                                            : access === "view"
                                              ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                              : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/80 dark:text-slate-500 dark:border-slate-700 line-through opacity-70"
                                      }`}
                                      title={`${tool.name}: ${access.toUpperCase()}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          access === "full"
                                            ? "bg-emerald-500"
                                            : access === "operate"
                                              ? "bg-blue-500"
                                              : access === "view"
                                                ? "bg-amber-500"
                                                : "bg-slate-400"
                                        }`}
                                      />
                                      <span>
                                        {shortName}:
                                        {access === "full"
                                          ? (language === "bn" ? "পূর্ণ" : "Full")
                                          : access === "operate"
                                            ? (language === "bn" ? "অপারেট" : "Operate")
                                            : access === "view"
                                              ? (language === "bn" ? "ভিউ" : "View")
                                              : (language === "bn" ? "বন্ধ" : "None")}
                                      </span>
                                    </span>
                                  );
                                })}
                                {tools.length > 5 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    +{tools.length - 5}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* STATUS */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  user.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                }`}
                              >
                                {user.status === "Active"
                                  ? (language === "bn" ? "সক্রিয়" : "Active")
                                  : (language === "bn" ? "নিষ্ক্রিয়" : "Inactive")}
                              </span>
                            </td>

                            {/* ACTIONS */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Edit Profile */}
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setUserFormData({
                                      userId: user.userId,
                                      name: user.name,
                                      email: user.email,
                                      role: user.role,
                                      officeId: user.officeId,
                                      designation: user.designation || "",
                                      status: user.status,
                                      password: "",
                                    });
                                    setUserFormError("");
                                    setShowUserModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                                  title={language === "bn" ? "তথ্য সম্পাদনা করুন" : "Edit Profile"}
                                >
                                  <Edit2 className="w-3 h-3 text-slate-500" />
                                  <span>{language === "bn" ? "সম্পাদনা" : "Edit"}</span>
                                </button>

                                {/* Reset Password */}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleAdminResetPassword(user)}
                                    className="px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                                    title={language === "bn" ? "পাসওয়ার্ড রিসেট করুন" : "Reset Password"}
                                  >
                                    <KeyRound className="w-3 h-3 text-sky-500" />
                                    <span>Reset</span>
                                  </button>
                                )}

                                {/* Toggle Active/Inactive */}
                                {isAdmin && user.id !== currentUser.id && (
                                  <button
                                    disabled={togglingUserIds.has(user.id)}
                                    onClick={() => handleToggleUserStatus(user)}
                                    className={`px-2 py-1 rounded-lg border transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                                      user.status === "Active"
                                        ? "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        : "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    }`}
                                    title={
                                      user.status === "Active"
                                        ? (language === "bn" ? "অ্যাকাউন্ট নিষ্ক্রিয় করুন" : "Deactivate Account")
                                        : (language === "bn" ? "অ্যাকাউন্ট সক্রিয় করুন" : "Activate Account")
                                    }
                                  >
                                    {user.status === "Active" ? (
                                      <>
                                        <X className="w-3 h-3 text-slate-400" />
                                        <span>{language === "bn" ? "নিষ্ক্রিয় করুন" : "Deactivate"}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-500" />
                                        <span>{language === "bn" ? "সক্রিয় করুন" : "Activate"}</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Tool RBAC Config */}
                                <button
                                  onClick={() => handleOpenPermissionsModal(user)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-300 dark:border-indigo-800/80 transition flex items-center gap-1 cursor-pointer"
                                  title={language === "bn" ? "টুলভিত্তিক RBAC পারমিশন কনফিগার করুন" : "Configure Tool-wise RBAC"}
                                >
                                  <Sliders className="w-3 h-3 text-indigo-500" />
                                  <span>{language === "bn" ? "টুল পারমিশন" : "Tool RBAC"}</span>
                                </button>

                                {/* Delete User */}
                                {isAdmin && user.id !== currentUser.id && (
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                    title={language === "bn" ? "মুছে ফেলুন" : "Delete User"}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: ROLE-BASED GLOBAL PERMISSION SETTINGS                */}
        {/* ======================================================== */}
        {activeTab === "role-permissions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "রোল ভিত্তিক গ্লোবাল টুল পারমিশন সেটিংস" : "Role-Based Global Tool Permission Settings"}
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "bn"
                    ? "ইউজারদের আলাদা করে পারমিশন দেওয়ার পরিবর্তে নির্দিষ্ট রোলের জন্য ডিফল্ট এক্সেস লেভেল সেট করুন"
                    : "Assign default access levels for specific roles globally instead of assigning permissions manually per user"}
                </p>
              </div>

              <div>
                <button
                  id="save-role-permissions-btn"
                  onClick={handleSaveRolePermissions}
                  disabled={isSavingRolePermissions}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSavingRolePermissions
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : language === "bn"
                        ? "পারমিশন সংরক্ষণ করুন"
                        : "Save Role Permissions"}
                  </span>
                </button>
              </div>
            </div>

            {rolePermissionsSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{rolePermissionsSuccessMsg}</span>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left sidebar: Roles */}
              <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 lg:pr-4">
                {[
                  { name: "Admin", labelBn: "অ্যাডমিন (Admin)", labelEn: "Admin" },
                  { name: "Head Office Admin", labelBn: "প্রধান কার্যালয় অ্যাডমিন", labelEn: "Head Office Admin" },
                  { name: "Moderator", labelBn: "মডারেটর (Moderator)", labelEn: "Moderator" },
                  { name: "Divisional Admin", labelBn: "বিভাগীয় এডমিন (Divisional Admin)", labelEn: "Divisional Admin" },
                  { name: "Divisional Moderator", labelBn: "বিভাগীয় মডারেটর", labelEn: "Divisional Moderator" },
                  { name: "Regional Admin", labelBn: "আঞ্চলিক এডমিন (Regional Admin)", labelEn: "Regional Admin" },
                  { name: "Regional Moderator", labelBn: "আঞ্চলিক মডারেটর", labelEn: "Regional Moderator" },
                  { name: "Branch Admin", labelBn: "শাখার এডমিন (Branch Admin)", labelEn: "Branch Admin" },
                  { name: "Branch User", labelBn: "শাখা ইউজার (Branch User)", labelEn: "Branch User" },
                  { name: "Head Office User", labelBn: "প্রধান কার্যালয় ব্যবহারকারী", labelEn: "Head Office User" },
                  { name: "Sub-office User", labelBn: "উপ-শাখা ব্যবহারকারী", labelEn: "Sub-office User" },
                  { name: "User", labelBn: "সাধারণ ব্যবহারকারী (User)", labelEn: "General User" },
                  { name: "Report Viewer", labelBn: "রিপোর্ট পরিদর্শক", labelEn: "Report Viewer" },
                ].map((role) => {
                  const isActive = selectedRolePermTab === role.name;
                  return (
                    <button
                      key={role.name}
                      onClick={() => setSelectedRolePermTab(role.name)}
                      className={`px-4 py-2.5 rounded-xl text-left text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-between w-full ${
                        isActive
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span>{language === "bn" ? role.labelBn : role.labelEn}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Right panel: Tool list for selected role */}
              <div className="flex-1 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === "bn" ? `${selectedRolePermTab} রোলের জন্য অনুমোদিত টুল পারমিশন:` : `Configuring permissions for ${selectedRolePermTab}:`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-full">
                      {selectedRolePermTab}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tools.map((tool) => {
                    const currentLevel =
                      roleToolAccessDraft[selectedRolePermTab]?.[tool.id] ||
                      getRoleToolAccess(selectedRolePermTab, tool.id, roleToolAccessDraft);
                    return (
                      <div
                        key={tool.id}
                        className={`p-4 rounded-2xl border transition-colors ${
                          isCustom
                            ? "bg-[#18132e]/90 border-[#322754]"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-start gap-3 justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {renderToolIcon(tool.icon, "w-4 h-4")}
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {language === "bn" ? tool.nameBn || tool.name : tool.name}
                              </h3>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 max-w-[200px]">
                                {language === "bn" ? tool.descriptionBn || tool.description : tool.description}
                              </p>
                            </div>
                          </div>

                          <div>
                            <select
                              value={currentLevel}
                              onChange={(e) =>
                                handleUpdateRolePerm(
                                  selectedRolePermTab,
                                  tool.id,
                                  e.target.value as ToolAccessLevel
                                )
                              }
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
                              <option value="none">{language === "bn" ? "কোনো প্রবেশাধিকার নেই (বন্ধ)" : "No Access (Disabled)"}</option>
                              <option value="view">{language === "bn" ? "শুধু পরিদর্শন (View)" : "View Only"}</option>
                              <option value="operate">{language === "bn" ? "অপারেশনাল কাজ (Operate)" : "Operate Only"}</option>
                              <option value="full">{language === "bn" ? "পূর্ণ ক্ষমতা (Full)" : "Full Access"}</option>
                            </select>
                          </div>
                        </div>

                        {/* Visual Badge Indicator */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">{language === "bn" ? "বর্তমান অবস্থা:" : "Current Level:"}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              currentLevel === "full"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : currentLevel === "operate"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                  : currentLevel === "view"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20"
                            }`}
                          >
                            {currentLevel === "full"
                              ? language === "bn" ? "পূর্ণ ক্ষমতা" : "Full"
                              : currentLevel === "operate"
                                ? language === "bn" ? "অপারেশনাল" : "Operate"
                                : currentLevel === "view"
                                  ? language === "bn" ? "শুধু ভিউ" : "View"
                                  : language === "bn" ? "বন্ধ" : "None"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TOOLS & MODULES REGISTRY                          */}
        {/* ======================================================== */}
        {activeTab === "tools" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "নিবন্ধিত সকল টুলস ও মডিউল রেজিস্ট্রি" : "Registered Tools & Modules Registry"}
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "bn"
                    ? "ফ্লোবোর্ড হাবে সংযুক্ত যেকোনো টুলের সক্রিয়তা ও রোল এক্সেস নীতি নির্ধারণ করুন"
                    : "Manage active status and allowed roles for tools registered in the FlowBoard Hub"}
                </p>
              </div>

              {onAddTool && (
                <button
                  onClick={() => setShowAddToolModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === "bn" ? "নতুন টুল রেজিস্টার করুন" : "Register New Tool"}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool) => {
                const isFlagship = tool.id === "budget-expense";
                return (
                  <div
                    key={tool.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {renderToolIcon(tool.icon, "w-5 h-5")}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{language === "bn" ? tool.nameBn : tool.name}</span>
                              {tool.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                  {language === "bn" ? tool.badgeBn || tool.badge : tool.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">v{tool.version} • ID: {tool.id}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tool.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {tool.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {language === "bn" ? tool.descriptionBn : tool.description}
                      </p>

                      {tool.subModules && tool.subModules.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tool.subModules.map((sm) => (
                            <span
                              key={sm.id}
                              className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {language === "bn" ? sm.nameBn : sm.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {onSelectTool && (
                        <button
                          onClick={() => onSelectTool(tool.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "লঞ্চ করুন" : "Launch"}</span>
                        </button>
                      )}

                      {!isFlagship && onDeleteTool && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete tool ${tool.name}?`)) {
                              await onDeleteTool(tool.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          title="Delete Tool"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CENTRAL AUDIT & LOGS                              */}
        {/* ======================================================== */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "সেন্ট্রাল অডিট ও নিরাপত্তা লগ" : "Central Audit Trail"}
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "bn"
                    ? "সেন্ট্রাল হাব ও সকল টুলসের ব্যবহারকারী কার্যক্রমের পূর্ণাঙ্গ রেকর্ড"
                    : "Comprehensive log of user activity, logins, and system operations"}
                </p>
              </div>

              <button
                onClick={() => {
                  const csvContent =
                    "data:text/csv;charset=utf-8," +
                    ["Timestamp,User,Action,Details"]
                      .concat(
                        visibleAuditLogs.map(
                          (l) =>
                            `"${l.timestamp}","${l.userId}","${l.action}","${(l.details || "").replace(/"/g, '""')}"`
                        )
                      )
                      .join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `flowboard_audit_logs_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "CSV ডাউনলোড" : "Export CSV"}</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold backdrop-blur">
                    <tr>
                      <th className="py-2.5 px-4">{language === "bn" ? "সময় ও তারিখ" : "Timestamp"}</th>
                      <th className="py-2.5 px-4">{language === "bn" ? "ব্যবহারকারী" : "User"}</th>
                      <th className="py-2.5 px-4">{language === "bn" ? "অ্যাকশন" : "Action"}</th>
                      <th className="py-2.5 px-4">{language === "bn" ? "বিবরণ" : "Details"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          {language === "bn" ? "কোন অডিট লগ পাওয়া যায়নি" : "No audit logs recorded yet"}
                        </td>
                      </tr>
                    ) : (
                      visibleAuditLogs.slice(0, 100).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {log.timestamp}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {log.userId}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-md truncate">
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: BRANDING & WATERMARK POLICY (LATEST DEDICATED ENGINE) */}
        {/* ======================================================== */}
        {activeTab === "branding-watermark" && (
          <div className="space-y-6">
            {/* Top Overview & Save Bar */}
            <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                    <Stamp className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold">
                    {language === "bn"
                      ? "লোগো, হেডার ও জলছাপ পলিসি ইঞ্জিন (Global Branding & Watermark Engine)"
                      : "Global Header & Watermark Branding Engine"}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-950">
                    Enterprise A4
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {language === "bn"
                    ? "সিস্টেমের যেকোনো টুলে প্রস্তুতকৃত ফরোয়ার্ডিং, সাপ্লাই অর্ডার, কার্যাদেশ, চালান ও নোটশিটের অফিসিয়াল হেডার (১.৬em : ১.১em অনুপাত) এবং জলছাপ নির্দিষ্ট নথিতে সক্রিয় বা নিষ্ক্রিয় করুন। এখান থেকে সরাসরি যেকোনো টুলে রিডাইরেক্ট করে লাইভ পরীক্ষা করা যাবে।"
                    : "Centrally configure official pad headers and watermark overlays for Forwarding, Supply Orders, Challans, and Note Sheets across all registered tools."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleToggleGlobalAll(true)}
                  className="px-3 py-2 rounded-xl border border-emerald-400/40 bg-emerald-800/40 hover:bg-emerald-700/50 text-emerald-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Enable everywhere"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "সবগুলোতে চালু" : "Enable All"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleGlobalAll(false)}
                  className="px-3 py-2 rounded-xl border border-rose-400/30 bg-rose-900/30 hover:bg-rose-800/40 text-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Disable everywhere"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "সবগুলোতে বন্ধ" : "Disable All"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  disabled={isSavingBranding}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingBranding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>
                    {isSavingBranding
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : language === "bn"
                        ? "পলিসি সংরক্ষণ করুন"
                        : "Save Policy"}
                  </span>
                </button>
              </div>
            </div>

            {brandingSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">{brandingSuccessMsg}</span>
              </div>
            )}

            {/* Quick Metrics & Preset Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {Object.values(TOOL_DOCUMENT_CATALOG).reduce((acc, t) => acc + t.documents.length, 0)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {language === "bn" ? "মোট সমর্থিত নথি (৭টি টুল)" : "Registered Documents"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {(Object.values(brandingRulesDraft) as BrandingDocumentRule[]).filter((r) => r.logoHeaderEnabled).length}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {language === "bn" ? "লোগো হেডার সক্রিয়" : "Active Headers"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                  <Stamp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {(Object.values(brandingRulesDraft) as BrandingDocumentRule[]).filter((r) => r.watermarkEnabled).length}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {language === "bn" ? "জলছাপ সক্রিয়" : "Active Watermarks"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {brandingHeaderDraft.defaultPageSize || "A4"} Standard
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {language === "bn" ? "ডিফল্ট প্রিন্ট সাইজ" : "Default Paper Size"}
                  </div>
                </div>
              </div>
            </div>

            {/* Global Header & Watermark Customization Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{language === "bn" ? "গ্লোবাল ব্যাংক প্যাড ও জলছাপ কনফিগারেশন" : "Global Pad & Watermark Specifications"}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === "bn"
                      ? "এখানে নির্ধারিত শিরোনাম ও স্লোগান সমস্ত টুলে আনুপাতিক স্কেলিংয়ে রেন্ডার হবে।"
                      : "Configured texts and watermark opacity will be proportionately applied to all approved documents."}
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                  {language === "bn" ? "অনুপাত: ১.৬em (শীর্ষ) / ১.১em (অফিস)" : "Ratio: 1.6em (Bank) / 1.1em (Office)"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "প্রতিষ্ঠানের নাম (১.৬em বড়)" : "Institution Name (1.6em)"}
                  </label>
                  <input
                    type="text"
                    value={brandingHeaderDraft.institutionName}
                    onChange={(e) => setBrandingHeaderDraft({ ...brandingHeaderDraft, institutionName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="বাংলাদেশ কৃষি ব্যাংক"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "অফিসের নাম / সাব-হেডার (১.১em)" : "Office Name / Sub-header (1.1em)"}
                  </label>
                  <input
                    type="text"
                    value={brandingHeaderDraft.officeName}
                    onChange={(e) => setBrandingHeaderDraft({ ...brandingHeaderDraft, officeName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="আঞ্চলিক কার্যালয়, রাঙ্গামাটি"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "অফিশিয়াল স্লোগান" : "Official Tagline / Slogan"}
                  </label>
                  <input
                    type="text"
                    value={brandingHeaderDraft.slogan}
                    onChange={(e) => setBrandingHeaderDraft({ ...brandingHeaderDraft, slogan: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="গণমানুষের ব্যাংক"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "অফিশিয়াল ওয়েবসাইট পোর্টাল" : "Website Portal"}
                  </label>
                  <input
                    type="text"
                    value={brandingHeaderDraft.websiteUrl}
                    onChange={(e) => setBrandingHeaderDraft({ ...brandingHeaderDraft, websiteUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="www.krishibank.gov.bd"
                  />
                </div>
              </div>

              {/* Logo Upload & Custom Emblem Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === "bn" ? "অফিসিয়াল লোগো / এম্বলিম আপলোড ও ব্যবস্থাপনা" : "Official Logo & Custom Emblem Management"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PNG, JPG, SVG, WebP (Max 3MB)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Logo Preview Box */}
                  <div className="w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-1.5 shrink-0 shadow-sm relative overflow-hidden">
                    {brandingHeaderDraft.logoUrl ? (
                      <img
                        src={brandingHeaderDraft.logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <svg width="44" height="44" viewBox="0 0 100 100">
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

                  {/* Actions & URL Input */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={logoFileInputRef}
                        onChange={handleLogoFileUpload}
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "নতুন লোগো আপলোড করুন" : "Upload New Logo"}</span>
                      </button>

                      {brandingHeaderDraft.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setBrandingHeaderDraft((prev) => ({ ...prev, logoUrl: "" }))}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "ডিফল্ট এম্বলিমে রিসেট করুন" : "Reset to Default"}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={brandingHeaderDraft.logoUrl}
                        onChange={(e) => setBrandingHeaderDraft({ ...brandingHeaderDraft, logoUrl: e.target.value })}
                        placeholder={language === "bn" ? "অথবা সরাসরি লোগো ছবির লিংক/URL পেস্ট করুন..." : "Or paste direct logo image URL..."}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sliders & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>{language === "bn" ? "জলছাপের অস্বচ্ছতা (Opacity)" : "Watermark Opacity"}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {Math.round(brandingHeaderDraft.watermarkOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.25"
                    step="0.005"
                    value={brandingHeaderDraft.watermarkOpacity}
                    onChange={(e) =>
                      setBrandingHeaderDraft({
                        ...brandingHeaderDraft,
                        watermarkOpacity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "ডিফল্ট পেপার ফরম্যাট" : "Default Paper Size"}
                  </label>
                  <select
                    value={brandingHeaderDraft.defaultPageSize}
                    onChange={(e) =>
                      setBrandingHeaderDraft({
                        ...brandingHeaderDraft,
                        defaultPageSize: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="A4">A4 (210mm × 297mm) - Recommended</option>
                    <option value="Legal">Legal (8.5" × 14")</option>
                    <option value="Letter">Letter (8.5" × 11")</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={brandingHeaderDraft.showLogo}
                      onChange={(e) =>
                        setBrandingHeaderDraft({ ...brandingHeaderDraft, showLogo: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                    />
                    <span>{language === "bn" ? "লোগো এম্বলিম দৃশ্যমান" : "Show Emblem Logo"}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={brandingHeaderDraft.showWatermark}
                      onChange={(e) =>
                        setBrandingHeaderDraft({ ...brandingHeaderDraft, showWatermark: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                    />
                    <span>{language === "bn" ? "জলছাপ সক্রিয়" : "Watermark Enabled"}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-wrap">
                <button
                  onClick={() => setSelectedBrandingToolFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedBrandingToolFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {language === "bn" ? "সকল টুলস" : "All Tools"}
                </button>
                {Object.values(TOOL_DOCUMENT_CATALOG).map((tg) => (
                  <button
                    key={tg.toolId}
                    onClick={() => setSelectedBrandingToolFilter(tg.toolId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      selectedBrandingToolFilter === tg.toolId
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {renderToolIcon(tg.icon, "w-3.5 h-3.5")}
                    <span>{language === "bn" ? tg.toolNameBn : tg.toolName}</span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={brandingSearchQuery}
                  onChange={(e) => setBrandingSearchQuery(e.target.value)}
                  placeholder={language === "bn" ? "ডকুমেন্টের নাম বা ধরন অনুসন্ধান..." : "Search documents..."}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Tool-by-Tool & Document-by-Document Assignment Matrix */}
            <div className="space-y-6">
              {Object.values(TOOL_DOCUMENT_CATALOG)
                .filter(
                  (tg) => selectedBrandingToolFilter === "all" || selectedBrandingToolFilter === tg.toolId
                )
                .map((toolGroup) => {
                  const filteredDocs = toolGroup.documents.filter((doc) => {
                    if (!brandingSearchQuery) return true;
                    const q = brandingSearchQuery.toLowerCase();
                    return (
                      doc.name.toLowerCase().includes(q) ||
                      doc.nameBn.toLowerCase().includes(q) ||
                      doc.description.toLowerCase().includes(q) ||
                      doc.descriptionBn.toLowerCase().includes(q)
                    );
                  });

                  if (filteredDocs.length === 0) return null;

                  const activeInTool = toolGroup.documents.filter(
                    (d) => brandingRulesDraft[`${toolGroup.toolId}:${d.id}`]?.logoHeaderEnabled
                  ).length;

                  return (
                    <div
                      key={toolGroup.toolId}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                      {/* Tool Header */}
                      <div className="p-4 sm:px-6 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center"
                            style={{ backgroundColor: toolGroup.color }}
                          >
                            {renderToolIcon(toolGroup.icon, "w-5 h-5")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {language === "bn" ? toolGroup.toolNameBn : toolGroup.toolName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                {toolGroup.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {activeInTool}/{toolGroup.documents.length}{" "}
                              {language === "bn" ? "নথিতে লোগো হেডার সক্রিয়" : "documents active"}
                            </p>
                          </div>
                        </div>

                        {/* Direct Redirect / Launch Button & Tool Batch Toggles */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleToolAll(toolGroup.toolId, true)}
                            className="px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            {language === "bn" ? "সব চালু" : "Enable All"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleToolAll(toolGroup.toolId, false)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            {language === "bn" ? "সব বন্ধ" : "Disable All"}
                          </button>

                          {/* DIRECT REDIRECT / LAUNCH BUTTON */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectTool) {
                                onSelectTool(toolGroup.toolId, toolGroup.routeOrTab);
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                            title={language === "bn" ? "সরাসরি এই টুলে প্রবেশ করুন" : "Launch & Open this Tool"}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>{language === "bn" ? "সরাসরি টুলে যান" : "Open Tool"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Documents Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-800/30 text-slate-500 font-semibold text-[11px]">
                              <th className="py-2.5 px-4 sm:px-6">{language === "bn" ? "নথি ও বিবরণ" : "Document & Description"}</th>
                              <th className="py-2.5 px-3 text-center">{language === "bn" ? "লোগো হেডার" : "Logo Header"}</th>
                              <th className="py-2.5 px-3 text-center">{language === "bn" ? "জলছাপ" : "Watermark"}</th>
                              <th className="py-2.5 px-3 text-center">{language === "bn" ? "A4 সাইজ" : "A4 Layout"}</th>
                              <th className="py-2.5 px-4 text-right">{language === "bn" ? "অ্যাকশন" : "Action"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredDocs.map((doc) => {
                              const key = `${toolGroup.toolId}:${doc.id}`;
                              const rule = brandingRulesDraft[key] || {
                                logoHeaderEnabled: true,
                                watermarkEnabled: true,
                                a4LayoutEnabled: true,
                              };

                              return (
                                <tr
                                  key={doc.id}
                                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  <td className="py-3 px-4 sm:px-6">
                                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-slate-400" />
                                      <span>{language === "bn" ? doc.nameBn : doc.name}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {language === "bn" ? doc.descriptionBn : doc.description}
                                    </p>
                                  </td>

                                  {/* Logo Header Toggle */}
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDocRule(key, "logoHeaderEnabled")}
                                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                        rule.logoHeaderEnabled
                                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                      }`}
                                    >
                                      {rule.logoHeaderEnabled
                                        ? language === "bn"
                                          ? "✓ সক্রিয়"
                                          : "✓ Active"
                                        : language === "bn"
                                          ? "✕ বন্ধ"
                                          : "✕ Off"}
                                    </button>
                                  </td>

                                  {/* Watermark Toggle */}
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDocRule(key, "watermarkEnabled")}
                                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                        rule.watermarkEnabled
                                          ? "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800"
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                      }`}
                                    >
                                      {rule.watermarkEnabled
                                        ? language === "bn"
                                          ? "✓ সক্রিয়"
                                          : "✓ Active"
                                        : language === "bn"
                                          ? "✕ বন্ধ"
                                          : "✕ Off"}
                                    </button>
                                  </td>

                                  {/* A4 Layout Toggle */}
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDocRule(key, "a4LayoutEnabled")}
                                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                        rule.a4LayoutEnabled
                                          ? "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800"
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                      }`}
                                    >
                                      {rule.a4LayoutEnabled ? "A4" : "Normal"}
                                    </button>
                                  </td>

                                  {/* Live Preview Button */}
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewDocModal({
                                          toolId: toolGroup.toolId,
                                          docId: doc.id,
                                          docName: doc.name,
                                          docNameBn: doc.nameBn,
                                          sampleSubject: doc.sampleSubject,
                                        })
                                      }
                                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                      title="Live Preview"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      <span>{language === "bn" ? "প্রিভিউ" : "Preview"}</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HUB POLICIES & SETTINGS                           */}
        {/* ======================================================== */}
        {activeTab === "policy" && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language === "bn" ? "সেন্ট্রাল হাব পলিসি ও সিস্টেম কনফিগারেশন" : "Central Hub Policies & Configuration"}
              </h2>
              <p className="text-xs text-slate-500">
                {language === "bn"
                  ? "সকল টুলস ও ব্যবহারকারীদের জন্য প্রযোজ্য সার্বজনীন নিরাপত্তা ও প্রতিষ্ঠান পলিসি"
                  : "Global branding, organizational rules, and security enforcement"}
              </p>
            </div>

            {policySuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{policySuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === "bn" ? "প্রতিষ্ঠানের নাম (Organization / Bank Name)" : "Institution Name"}
                </label>
                <input
                  type="text"
                  value={policyDraft.institutionName}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, institutionName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === "bn" ? "সেন্ট্রাল হাবের নাম (Hub Web App Name)" : "Web App Name"}
                </label>
                <input
                  type="text"
                  value={policyDraft.webAppName}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, webAppName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Official Institutional Logo & Document Branding Direct Section */}
              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Stamp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === "bn" ? "অফিসিয়াল প্রাতিষ্ঠানিক লোগো ও জলছাপ পলিসি" : "Official Logo & Watermark Policy"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {language === "bn"
                        ? "সকল টুলের ডকুমেন্টের প্যাড হেডার ও জলছাপের কেন্দ্রীয় লোগো পরিচালনা করুন।"
                        : "Manage global logo & watermark applied across all documents."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("branding-watermark")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>{language === "bn" ? "লোগো ও জলছাপ পলিসি ট্যাবে যান" : "Open Branding Tab"}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-sm">
                    {brandingHeaderDraft.logoUrl ? (
                      <img
                        src={brandingHeaderDraft.logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <svg width="40" height="40" viewBox="0 0 100 100">
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

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "নতুন প্রাতিষ্ঠানিক লোগো আপলোড করুন" : "Upload Official Logo"}</span>
                      </button>

                      {brandingHeaderDraft.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setBrandingHeaderDraft((prev) => ({ ...prev, logoUrl: "" }))}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-medium border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "ডিফল্ট এম্বলিমে রিসেট" : "Reset"}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {brandingHeaderDraft.logoUrl
                        ? (language === "bn" ? "✅ কাস্টম লোগো আপলোড করা রয়েছে এবং সকল ডকুমেন্টের হেডার ও জলছাপে সিংক হচ্ছে।" : "Custom logo is active and synced across document headers and watermarks.")
                        : (language === "bn" ? "ℹ️ বর্তমানে ডিফল্ট অফিসিয়াল এম্বলিম কার্যকর রয়েছে।" : "Default official emblem is active.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Login Page Logo Customization */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <span>{language === "bn" ? "লগইন কার্ডের লোগো (Login Card Logo)" : "Login Card Central Logo"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {language === "bn"
                        ? "শুধুমাত্র লগইন কার্ডের মাঝখানে প্রদর্শিত লোগোটি এখান থেকে আপলোড বা পরিবর্তন করতে পারেন।"
                        : "Upload or configure the specific logo displayed inside the Login Card."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shrink-0 shadow-inner">
                    {policyDraft.loginLogoUrl ? (
                      <img
                        src={policyDraft.loginLogoUrl}
                        alt="Login Logo Preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-6 h-6 text-slate-500 mx-auto" />
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">Default</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "লোগো আপলোড করুন" : "Upload Logo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLoginLogoFileUpload}
                          className="hidden"
                        />
                      </label>

                      {policyDraft.loginLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setPolicyDraft({ ...policyDraft, loginLogoUrl: "" })}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-medium border border-rose-500/30 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "লোগো সরান" : "Remove"}</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder={language === "bn" ? "অথবা সরাসরি ছবির URL পেস্ট করুন (যেমন: https://...)" : "Or enter direct Image URL (e.g. https://...)"}
                        value={policyDraft.loginLogoUrl}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, loginLogoUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyDraft.requireExpenseApproval}
                    onChange={(e) =>
                      setPolicyDraft({ ...policyDraft, requireExpenseApproval: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "ব্যয় অনুমোদনের বাধ্যবাধকতা" : "Enforce Expense Verification"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "bn"
                        ? "মডারেটর বা অ্যাডমিনের সম্মতি ছাড়া কোনো বিল মঞ্জুর হবে না"
                        : "Requires admin/moderator approval before expense is final"}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyDraft.showNoticeBar}
                    onChange={(e) =>
                      setPolicyDraft({ ...policyDraft, showNoticeBar: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "সেন্ট্রাল নোটিশ বার প্রদর্শন" : "Show Central Notice Bar"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "bn" ? "শীর্ষবারে চলমান নোটিশ স্ক্রোল করবে" : "Displays marquee notices across the hub"}
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSavePolicy}
                  disabled={isSavingPolicy}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSavingPolicy
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : language === "bn"
                        ? "পলিসি আপডেট করুন"
                        : "Save Policy"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: GRANULAR TOOL RBAC PERMISSIONS PER USER           */}
      {/* ======================================================== */}
      {selectedUserForPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center shadow-md">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === "bn" ? "টুলভিত্তিক RBAC পারমিশন নিয়ন্ত্রণ" : "Tool-wise RBAC Permissions"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUserForPermissions.name} ({selectedUserForPermissions.userId}) •{" "}
                    {getOfficeName(selectedUserForPermissions.officeId)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForPermissions(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Tools List with Interactive Role Selector */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {permissionSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{permissionSuccessMsg}</span>
                </div>
              )}

              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="font-semibold">{language === "bn" ? "নির্দেশনা:" : "Note:"} </span>
                {language === "bn"
                  ? "প্রতিটি টুলের জন্য ব্যবহারকারীর সুনির্দিষ্ট এক্সেস লেভেল এবং প্রয়োজনে কাস্টম পদবি (যেমন: 'স্টক ইনচার্জ', 'নোট অনুমোদনকারী') নির্ধারণ করুন।"
                  : "Assign access levels and custom roles for each tool. Access changes apply immediately."}
              </div>

              <div className="space-y-3">
                {tools.map((tool) => {
                  const currentConfig = userPermissionsDraft[tool.id] || {
                    access: "operate",
                    roleTitle: "",
                  };

                  return (
                    <div
                      key={tool.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                          {renderToolIcon(tool.icon, "w-4 h-4")}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {language === "bn" ? tool.nameBn : tool.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tool.id} • {tool.category}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Access Level Selector */}
                        <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setUserPermissionsDraft((prev) => {
                                const next = { ...prev };
                                if (next[tool.id]) {
                                  next[tool.id] = { ...next[tool.id], access: undefined };
                                }
                                return next;
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                              currentConfig.access === undefined
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            {language === "bn" ? "রোল থেকে ইনহেরিট" : "Inherit from Role"}
                          </button>
                          
                          {(
                            [
                              { key: "full", label: language === "bn" ? "অ্যাডমিন" : "Admin", color: "text-emerald-700 dark:text-emerald-300" },
                              { key: "operate", label: language === "bn" ? "অপারেটর" : "Operator", color: "text-blue-700 dark:text-blue-300" },
                              { key: "view", label: language === "bn" ? "ভিউয়ার" : "Viewer", color: "text-amber-700 dark:text-amber-300" },
                              { key: "none", label: language === "bn" ? "বন্ধ" : "None", color: "text-slate-400" },
                            ] as const
                          ).map((lvl) => {
                            const isSelected = currentConfig.access === lvl.key;
                            return (
                              <button
                                key={lvl.key}
                                type="button"
                                onClick={() => {
                                  setUserPermissionsDraft((prev) => ({
                                    ...prev,
                                    [tool.id]: {
                                      ...prev[tool.id],
                                      access: lvl.key,
                                    },
                                  }));
                                }}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                  isSelected
                                    ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs font-bold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                              >
                                {lvl.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Role Title in Tool */}
                        <input
                          type="text"
                          value={currentConfig.roleTitle || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUserPermissionsDraft((prev) => ({
                              ...prev,
                              [tool.id]: {
                                ...prev[tool.id],
                                roleTitle: val,
                              },
                            }));
                          }}
                          placeholder={language === "bn" ? "কাস্টম পদবি (ঐচ্ছিক)" : "Tool Role Title"}
                          className="w-32 sm:w-36 px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedUserForPermissions(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSavingPermissions}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSavingPermissions
                    ? language === "bn"
                      ? "সংরক্ষণ হচ্ছে..."
                      : "Saving..."
                    : language === "bn"
                      ? "পারমিশন সংরক্ষণ করুন"
                      : "Save Permissions"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT USER                                */}
      {/* ======================================================== */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingUser
                    ? language === "bn"
                      ? "ব্যবহারকারী প্রোফাইল সম্পাদনা"
                      : "Edit User Profile"
                    : language === "bn"
                      ? "নতুন ব্যবহারকারী তৈরি"
                      : "Create New User"}
                </h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserForm} className="p-5 space-y-4">
              {userFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "ইউজার আইডি *" : "User ID *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.userId}
                    onChange={(e) => setUserFormData({ ...userFormData, userId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "পুরো নাম *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "ইমেইল *" : "Email *"}
                  </label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "পদবি" : "Designation"}
                  </label>
                  <input
                    type="text"
                    value={userFormData.designation}
                    onChange={(e) => setUserFormData({ ...userFormData, designation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "গ্লোবাল রোল *" : "Global Role *"}
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {isSuperAdminUser && <option value="Super Admin">Super Admin</option>}
                    <option value="Admin">Admin</option>
                    <option value="Moderator">Moderator</option>
                    <option value="Divisional Admin">Divisional Admin (বিভাগীয় এডমিন)</option>
                    <option value="Divisional Moderator">Divisional Moderator (বিভাগীয় মডারেটর)</option>
                    <option value="Regional Admin">Regional Admin (আঞ্চলিক এডমিন)</option>
                    <option value="Regional Moderator">Regional Moderator (আঞ্চলিক মডারেটর)</option>
                    <option value="Branch Admin">Branch Admin (শাখার এডমিন)</option>
                    <option value="Branch User">Branch User (শাখা ইউজার)</option>
                    <option value="User">User</option>
                    <option value="Sub-office User">Sub-office User</option>
                    <option value="Report Viewer">Report Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "নির্ধারিত অফিস *" : "Assigned Office *"}
                  </label>
                  <select
                    value={userFormData.officeId}
                    onChange={(e) => setUserFormData({ ...userFormData, officeId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUser
                      ? language === "bn"
                        ? "পাসওয়ার্ড (পরিবর্তন করতে চাইলে)"
                        : "Password (leave blank to keep)"
                      : language === "bn"
                        ? "পাসওয়ার্ড *"
                        : "Password *"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "স্ট্যাটাস" : "Status"}
                  </label>
                  <select
                    value={userFormData.status}
                    onChange={(e) =>
                      setUserFormData({
                        ...userFormData,
                        status: e.target.value as "Active" | "Inactive",
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmittingUser
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : language === "bn"
                        ? "ব্যবহারকারী সংরক্ষণ করুন"
                        : "Save User"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER NEW TOOL                                 */}
      {/* ======================================================== */}
      {showAddToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-sky-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "নতুন টুল / মডিউল রেজিস্টার" : "Register New Tool"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddToolModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddToolSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "bn" ? "টুলের নাম (ইংরেজি) *" : "Tool Name (English) *"}
                </label>
                <input
                  type="text"
                  required
                  value={newToolForm.name}
                  onChange={(e) => setNewToolForm({ ...newToolForm, name: e.target.value })}
                  placeholder="e.g. Asset Registry"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "bn" ? "টুলের নাম (বাংলা) *" : "Tool Name (Bengali) *"}
                </label>
                <input
                  type="text"
                  required
                  value={newToolForm.nameBn}
                  onChange={(e) => setNewToolForm({ ...newToolForm, nameBn: e.target.value })}
                  placeholder="যেমন: সম্পদ রেজিস্ট্রি"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "bn" ? "বিবরণ (বাংলা)" : "Description"}
                </label>
                <textarea
                  rows={2}
                  value={newToolForm.descriptionBn}
                  onChange={(e) => setNewToolForm({ ...newToolForm, descriptionBn: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "ক্যাটাগরি" : "Category"}
                  </label>
                  <select
                    value={newToolForm.category}
                    onChange={(e) => setNewToolForm({ ...newToolForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="finance">finance</option>
                    <option value="documents">documents</option>
                    <option value="compliance">compliance</option>
                    <option value="analytics">analytics</option>
                    <option value="custom">custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "আইকন" : "Icon"}
                  </label>
                  <select
                    value={newToolForm.icon}
                    onChange={(e) => setNewToolForm({ ...newToolForm, icon: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Boxes">Boxes</option>
                    <option value="Coins">Coins</option>
                    <option value="FileSpreadsheet">FileSpreadsheet</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Calculator">Calculator</option>
                    <option value="FileText">FileText</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddToolModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-900/20"
                >
                  {language === "bn" ? "সংযুক্ত করুন" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Propose User Modal */}
      {showProposalModal && (
        <ProposeUserModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          officeName={currentUser?.officeId ? getOfficeName(currentUser.officeId) : undefined}
          onSuccess={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* Live Document Preview Modal with Global Header & Watermark */}
      {previewDocModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header Bar */}
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Stamp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {language === "bn" ? previewDocModal.docNameBn : previewDocModal.docName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {TOOL_DOCUMENT_CATALOG[previewDocModal.toolId]?.toolNameBn || previewDocModal.toolId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {language === "bn"
                      ? "A4 সাইজে গ্লোবাল হেডার (১.৬em : ১.১em) ও জলছাপ লাইভ প্রিভিউ"
                      : "A4 Live Preview with Proportional 1.6em / 1.1em Header & Watermark"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Direct Redirect to Tool */}
                <button
                  type="button"
                  onClick={() => {
                    const toolSpec = TOOL_DOCUMENT_CATALOG[previewDocModal.toolId];
                    if (onSelectTool && toolSpec) {
                      setPreviewDocModal(null);
                      onSelectTool(toolSpec.toolId, toolSpec.routeOrTab);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "সরাসরি এই টুলে যান" : "Open Tool"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDocModal(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Realistic Simulated A4 Document */}
            <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div
                className="bg-white text-black p-8 sm:p-12 rounded-lg shadow-xl max-w-[760px] w-full min-h-[900px] relative font-['Hind_Siliguri','Kalpurush',sans-serif] leading-relaxed select-none"
                style={{ fontSize: "11pt" }}
              >
                {/* Official Circular Watermark Overlay */}
                {brandingHeaderDraft.showWatermark && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
                    style={{ opacity: brandingHeaderDraft.watermarkOpacity }}
                  >
                    {brandingHeaderDraft.logoUrl ? (
                      <img
                        src={brandingHeaderDraft.logoUrl}
                        alt="Watermark Logo"
                        style={{
                          maxHeight: "280px",
                          maxWidth: "280px",
                          width: "280px",
                          height: "280px",
                          objectFit: "contain",
                          filter: "grayscale(100%)",
                          display: "block",
                        }}
                      />
                    ) : (
                      <svg width="320" height="320" viewBox="0 0 100 100">
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

                {/* Content Container (Layered above watermark) */}
                <div className="relative z-10 space-y-6">
                  {/* Official Global Bank Pad Header */}
                  {brandingHeaderDraft.showLogo && (
                    <div className="flex justify-between items-center border-b-[1.5px] border-black pb-2 mb-4 w-full">
                      {/* Left: Official Emblem or Uploaded Custom Logo */}
                      <div className="w-[70px] flex items-center justify-start">
                        {brandingHeaderDraft.logoUrl ? (
                          <img
                            src={brandingHeaderDraft.logoUrl}
                            alt="Logo"
                            className="w-[56px] h-[56px] object-contain"
                          />
                        ) : (
                          <svg width="56" height="56" viewBox="0 0 100 100">
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

                      {/* Center: Large Proportional Titles */}
                      <div className="flex-1 text-center px-2">
                        <div
                          className="font-bold text-black leading-[1.1]"
                          style={{ fontSize: "1.6em" }}
                        >
                          {getCleanInstitutionName(brandingHeaderDraft.institutionName)}
                        </div>
                        <div
                          className="font-bold text-black mt-0.5"
                          style={{ fontSize: "1.1em" }}
                        >
                          {brandingHeaderDraft.officeName || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি"}
                        </div>
                      </div>

                      {/* Right: Slogan & Web URL */}
                      <div className="w-[130px] text-right leading-[1.2]">
                        <div
                          className="font-bold text-black"
                          style={{ fontSize: "0.9em" }}
                        >
                          {brandingHeaderDraft.slogan || "গণমানুষের ব্যাংক"}
                        </div>
                        <div
                          className="text-[#222] mt-0.5"
                          style={{ fontSize: "0.75em" }}
                        >
                          {brandingHeaderDraft.websiteUrl || "www.krishibank.gov.bd"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document Meta / Reference & Date Bar */}
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-800 border-b border-dashed border-slate-300 pb-2">
                    <div>
                      <strong>স্মারক / সূত্র নং:</strong> আঃ কাঃ (বাংলা) প্রশা-১(৪)/২০২৬-২০২৭/
                    </div>
                    <div>
                      <strong>তারিখ:</strong> {new Date().toLocaleDateString("bn-BD")}
                    </div>
                  </div>

                  {/* Document Subject Line */}
                  <div className="font-bold text-slate-950 text-sm underline pt-1">
                    {previewDocModal.sampleSubject || "বিষয়ঃ দাপ্তরিক কার্যক্রম ও আর্থিক অনুমোদন সংক্রান্ত পত্র।"}
                  </div>

                  {/* Sample Body Content */}
                  <div className="space-y-3 text-justify text-xs leading-relaxed text-slate-900">
                    <p>
                      উপর্যুক্ত বিষয়ের প্রেক্ষিতে জানানো যাচ্ছে যে, অত্র অঞ্চলের দাপ্তরিক প্রয়োজনীয়তা ও বিধি মোতাবেক
                      মালামাল সরবরাহ, বিল ভাউচার নিরীক্ষা এবং প্রশাসনিক কার্যক্রম সুষ্ঠুভাবে সম্পাদনের লক্ষ্যে প্রয়োজনীয়
                      নথিপত্র প্রস্তুতপূর্বক পরবর্তী প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য প্রেরণ করা হলো।
                    </p>

                    {/* Sample Table Preview */}
                    <div className="pt-2">
                      <table className="w-full border-collapse border border-slate-400 text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-center font-bold">
                            <th className="border border-slate-400 p-1.5">ক্রমিক</th>
                            <th className="border border-slate-400 p-1.5 text-left">বিবরণ / আইটেমের নাম</th>
                            <th className="border border-slate-400 p-1.5">পরিমাণ</th>
                            <th className="border border-slate-400 p-1.5 text-right">মোট প্রাক্কলিত মূল্য (৳)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-slate-400 p-1.5 text-center">০১</td>
                            <td className="border border-slate-400 p-1.5">মুদ্রিত সামগ্রী ও অফিসিয়াল রেজিস্টার সরবরাহ</td>
                            <td className="border border-slate-400 p-1.5 text-center">০৫ টি শাখা</td>
                            <td className="border border-slate-400 p-1.5 text-right font-mono">৳ ২৫,৪৫০/-</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-1.5 text-center">০২</td>
                            <td className="border border-slate-400 p-1.5">জ্বালানী ও পরিবহন আনুষঙ্গিক ব্যয় সংস্থান</td>
                            <td className="border border-slate-400 p-1.5 text-center">১ মাস</td>
                            <td className="border border-slate-400 p-1.5 text-right font-mono">৳ ১২,৮০০/-</td>
                          </tr>
                          <tr className="font-bold bg-slate-50">
                            <td colSpan={3} className="border border-slate-400 p-1.5 text-right">
                              সর্বমোট (ভ্যাট ও ট্যাক্সসহ):
                            </td>
                            <td className="border border-slate-400 p-1.5 text-right font-mono">৳ ৩৮,২৫০/-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="pt-2">
                      এমতাবস্থায়, অত্র অঞ্চলের কার্যক্রম সুষ্ঠুভাবে পরিচালনার নিমিত্তে বর্ণিত বিল ও নথির উপর যথাযথ আর্থিক
                      সম্মতি ও প্রশাসনিক অনুমোদন প্রদানের জন্য অনুরোধ করা হলো।
                    </p>
                  </div>

                  {/* Signatures & Seal Section */}
                  <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-900">
                    <div>
                      <div className="border-t border-slate-800 pt-1.5 inline-block min-w-[160px]">
                        প্রস্তুতকারী কর্মকর্তা
                      </div>
                      <div className="text-[10px] text-slate-600 font-normal">আঞ্চলিক কার্যালয়, রাঙ্গামাটি</div>
                    </div>

                    <div>
                      <div className="border-t border-slate-800 pt-1.5 inline-block min-w-[160px]">
                        আঞ্চলিক ব্যবস্থাপক
                      </div>
                      <div className="text-[10px] text-slate-600 font-normal">বাংলাদেশ কৃষি ব্যাংক</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {language === "bn"
                  ? "✓ এই নথিতে গ্লোবাল হেডার ও জলছাপ সক্রিয় রয়েছে।"
                  : "✓ Global header and watermark active on this document."}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDocModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {language === "bn" ? "বন্ধ করুন" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
