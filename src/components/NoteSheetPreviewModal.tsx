import React, { useState, useRef, useMemo, useEffect } from "react";
import JoditEditor from "jodit-react";
import {
  X,
  Printer,
  Sliders,
  Layout,
  MoveVertical,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Check,
  RotateCcw,
  FileText,
  BookmarkCheck,
  BookmarkPlus,
  Eye,
  EyeOff,
  Settings2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Bold,
  Italic,
  Underline,
  Plus,
  Minus,
  ChevronDown,
  Download,
  Copy,
  FileDown,
  ExternalLink,
  Table as TableIcon,
  Edit,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Scissors,
} from "lucide-react";
import {
  NoteSheet,
  PrintLayoutSettings,
  ContentPosition,
  PageSize,
  Category,
  TextAlign,
} from "../types";
import { useLanguage } from "../i18n";
import { sanitizeHtml } from "../utils/sanitize";
import { apiFetch } from "../api";

interface NoteSheetPreviewModalProps {
  noteSheet: NoteSheet;
  onClose: () => void;
  categoryId?: string;
  categoryName?: string;
  officeName?: string;
  categories?: Category[];
  onUpdateNoteSheet?: () => void;
}

// Default Note Sheet Settings: Always Legal Size (216 × 356 mm) per official requirements
export const DEFAULT_NOTESHEET_SETTINGS: PrintLayoutSettings = {
  position: "TOP",
  customTopOffset: 20,
  customLeftOffset: 20,
  pageSize: "Legal",
  customWidth: 216,
  customHeight: 356,
  orientation: "portrait",
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
  },
  fontSizeScale: 100,
  fontSizePt: 12, // Google Docs standard 12pt
  lineSpacing: 1.5, // 1.5 line height standard
  textAlign: "justify", // standard official justification
  fontFamily: "'Hind Siliguri', 'Kalpurush', sans-serif",
  paragraphSpacing: 10, // 10pt space between paragraphs
  firstLineIndent: 0, // 0mm
  isBold: false,
  isItalic: false,
  isUnderline: false,
  letterSpacing: 0,
  includeHeader: false,
  includeSignatures: true,
};

// Default Forwarding & Supply Order Settings: Always A4 Size (210 × 297 mm)
export const DEFAULT_A4_SETTINGS: PrintLayoutSettings = {
  ...DEFAULT_NOTESHEET_SETTINGS,
  pageSize: "A4",
  customWidth: 210,
  customHeight: 297,
};

const DEFAULT_SETTINGS = DEFAULT_NOTESHEET_SETTINGS;

// Google Docs standard font size presets
const GOOGLE_DOCS_FONT_SIZES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28,
  32, 36, 40, 48, 56, 64, 72, 96, 120, 144, 200, 300, 500,
];

// Available Bengali and English font families
const FONT_FAMILIES = [
  {
    id: "'Hind Siliguri', 'Kalpurush', sans-serif",
    name: "হিন্দ শিলিগুড়ি (Hind Siliguri)",
  },
  { id: "'Kalpurush', 'Hind Siliguri', serif", name: "কালপুরুষ (Kalpurush)" },
  {
    id: "'SolaimanLipi', 'Hind Siliguri', sans-serif",
    name: "সোলায়মান লিপি (SolaimanLipi)",
  },
  {
    id: "'Times New Roman', 'Hind Siliguri', serif",
    name: "টাইমস নিউ রোমান (Times New Roman)",
  },
  { id: "'Arial', 'Hind Siliguri', sans-serif", name: "এরিয়াল (Arial)" },
  { id: "'Georgia', 'Kalpurush', serif", name: "জর্জিয়া (Georgia)" },
  { id: "'Courier New', monospace", name: "মনোস্পেস (Courier New)" },
];

// Jodit Editor Font and Size List mappings
const JODIT_FONT_LIST: Record<string, string> = {
  "'Hind Siliguri', 'Kalpurush', sans-serif": "হিন্দ শিলিগুড়ি (Hind Siliguri)",
  "'Kalpurush', 'Hind Siliguri', serif": "কালপুরুষ (Kalpurush)",
  "'SolaimanLipi', 'Hind Siliguri', sans-serif":
    "সোলায়মান লিপি (SolaimanLipi)",
  "'Times New Roman', 'Hind Siliguri', serif":
    "টাইমস নিউ রোমান (Times New Roman)",
  "'Arial', 'Hind Siliguri', sans-serif": "এরিয়াল (Arial)",
  "'Georgia', 'Kalpurush', serif": "জর্জিয়া (Georgia)",
  "'Courier New', monospace": "মনোস্পেস (Courier New)",
  "Hind Siliguri": "হিন্দ শিলিগুড়ি",
  Kalpurush: "কালপুরুষ",
  SolaimanLipi: "সোলায়মান লিপি",
  "Times New Roman": "Times New Roman",
  Arial: "Arial",
  Georgia: "Georgia",
  "Courier New": "Courier New",
};

const JODIT_FONT_SIZES = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56,
  64, 72,
];

// Line Spacing Presets
const LINE_SPACING_PRESETS = [
  { value: 1.0, label: "1.0 (Single)" },
  { value: 1.15, label: "1.15" },
  { value: 1.25, label: "1.25" },
  { value: 1.5, label: "1.5 (Standard)" },
  { value: 1.75, label: "1.75" },
  { value: 2.0, label: "2.0 (Double)" },
  { value: 2.5, label: "2.5" },
  { value: 3.0, label: "3.0" },
];

// Page Dimensions in mm
const PAGE_DIMENSIONS: Record<
  Exclude<PageSize, "Custom">,
  { width: number; height: number }
> = {
  A4: { width: 210, height: 297 },
  Legal: { width: 216, height: 356 },
  Letter: { width: 216, height: 279 },
};

export function NoteSheetPreviewModal({
  noteSheet,
  onClose,
  categoryId,
  categoryName,
  officeName,
  categories = [],
  onUpdateNoteSheet,
}: NoteSheetPreviewModalProps) {
  const { t, language } = useLanguage();
  const printContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  const [currentNoteSheet, setCurrentNoteSheet] =
    useState<NoteSheet>(noteSheet);
  const [activeDocTab, setActiveDocTab] = useState<
    "notesheet" | "forwarding" | "supplyorder"
  >("notesheet");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(noteSheet.title);
  const [editNoteSheetContent, setEditNoteSheetContent] = useState(
    noteSheet.content || "",
  );
  const [editForwardingContent, setEditForwardingContent] = useState(
    noteSheet.forwardingContent || "",
  );
  const [editSupplyOrderContent, setEditSupplyOrderContent] = useState(
    noteSheet.supplyOrderContent || "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [contentSaveSuccess, setContentSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Requirement 3: 3-part Legal sheet partition state for Regular Expense <= 1500 BDT
  const [legalPartition, setLegalPartition] = useState<
    "part1" | "part2" | "part3" | "all3" | "full"
  >("part1");

  // Determine if this is a regular expense bill within 1500 BDT
  const isRegularExpenseUnder1500 = useMemo(() => {
    if ((currentNoteSheet as any).isUnder1500 !== undefined) {
      return Boolean((currentNoteSheet as any).isUnder1500);
    }
    const content =
      (currentNoteSheet.content || "") + (editNoteSheetContent || "");
    if (content.includes("regular-signatures-single-line")) {
      return true;
    }
    if (
      content.includes("আঞ্চলিক নিরীক্ষা কর্মকর্তা") ||
      content.includes("দরপত্র") ||
      content.includes("কোটেশন") ||
      content.includes("quotation-bidders-table")
    ) {
      return false;
    }
    if (
      (currentNoteSheet as any).expenseGrossAmount &&
      (currentNoteSheet as any).expenseGrossAmount <= 1500
    ) {
      return true;
    }
    const amountMatch = content.match(/৳\s*=\s*([০-৯0-9,]+)/);
    if (amountMatch) {
      const rawNum = amountMatch[1]
        .replace(/,/g, "")
        .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
      const num = Number(rawNum);
      if (!isNaN(num) && num > 0) {
        return num <= 1500;
      }
    }
    return false;
  }, [currentNoteSheet, editNoteSheetContent]);

  // Determine if this notesheet already has internal multi-level approvals / Form1 hierarchy
  const hasInternalApproval = useMemo(() => {
    const content =
      (currentNoteSheet.content || "") + (editNoteSheetContent || "");
    return (
      content.includes("আঞ্চলিক নিরীক্ষা কর্মকর্তা") ||
      content.includes("আঞ্চলিক ব্যবস্থাপক :-") ||
      content.includes("regular-signatures-single-line") ||
      (currentNoteSheet as any).quotationFormType === "Form1" ||
      (currentNoteSheet as any).expenseType === "Quotation"
    );
  }, [currentNoteSheet, editNoteSheetContent]);

  // Default fallback templates for Forwarding Letter and Supply Order
  const getDefaultForwardingHtml = () => {
    const offName = officeName || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি";
    const dateStr = new Date()
      .toLocaleDateString("bn-BD", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
    return `
    <div style="line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      <div class="pad-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 12px; width: 100%;">
        <div style="width: 70px; display: flex; align-items: center; justify-content: flex-start;">
          <svg width="50" height="50" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" stroke-width="6"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" stroke-width="1.5" stroke-dasharray="3,2"/>
            <path d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82" fill="none" stroke="#006a4e" stroke-width="3" stroke-linecap="round"/>
            <circle cx="50" cy="22" r="3" fill="#f42a41"/>
          </svg>
        </div>
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <div class="pad-header-title" style="font-size: 20pt; font-weight: bold; color: #000; line-height: 1.1;">বাংলাদেশ কৃষি ব্যাংক</div>
          <div class="pad-header-subtitle" style="font-size: 12.5pt; font-weight: bold; color: #000; margin-top: 2px;">${offName}</div>
        </div>
        <div style="width: 125px; text-align: right; line-height: 1.2;">
          <div class="pad-header-tagline" style="font-size: 10.5pt; font-weight: bold; color: #000;">গণমানুষের ব্যাংক</div>
          <div class="pad-header-url" style="font-size: 8.5pt; color: #222; margin-top: 2px;">www.krishibank.gov.bd</div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 14pt;">
        <div><strong>সূত্র নং:</strong> আঃ কাঃ (বাংলা) প্রশা-১/২০২৫-২০২৬/</div>
        <div><strong>তারিখ:</strong> ${dateStr} খ্রিঃ</div>
      </div>
      <div style="margin-bottom: 12pt; line-height: 1.4;">
        উপ-মহাব্যবস্থাপক / বিভাগীয় প্রধান,<br/>
        প্রশাসন বিভাগ,<br/>
        বাংলাদেশ কৃষি ব্যাংক, প্রধান কার্যালয়, ঢাকা।
      </div>
      <div style="font-weight: bold; margin-bottom: 12pt;">
        বিষয়ঃ- ${currentNoteSheet?.title || "প্রশাসনিক ও বিল পরিশোধের ফরোয়ার্ডিং পত্র"}।
      </div>
      <p style="text-indent: 35px; margin-bottom: 10pt; line-height: 1.6;">
        উপযুক্ত বিষয়ের প্রেক্ষিতে জানানো যাচ্ছে যে, অত্র কার্যালয়ের প্রশাসনিক ও দাপ্তরিক ব্যয়ের বিবরণী ও সংশ্লিষ্ট ভাউচারাদি যাচাইপূর্বক যথাযথ অনুমোদনের জন্য অত্র পত্রের সাথে প্রেরণ করা হলো।
      </p>
      <div style="margin-top: 30pt; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 160pt;">
          <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">অনুমোদনকারী</div>
          <div style="font-size: 0.85em; color: #555;">আঞ্চলিক ব্যবস্থাপক</div>
        </div>
      </div>
    </div>
    `;
  };

  const getDefaultSupplyOrderHtml = () => {
    const offName = officeName || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি";
    const dateStr = new Date()
      .toLocaleDateString("bn-BD", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
    return `
    <div style="line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      <div class="pad-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 12px; width: 100%;">
        <div style="width: 70px; display: flex; align-items: center; justify-content: flex-start;">
          <svg width="50" height="50" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" stroke-width="6"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" stroke-width="1.5" stroke-dasharray="3,2"/>
            <path d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82" fill="none" stroke="#006a4e" stroke-width="3" stroke-linecap="round"/>
            <circle cx="50" cy="22" r="3" fill="#f42a41"/>
          </svg>
        </div>
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <div class="pad-header-title" style="font-size: 20pt; font-weight: bold; color: #000; line-height: 1.1;">বাংলাদেশ কৃষি ব্যাংক</div>
          <div class="pad-header-subtitle" style="font-size: 12.5pt; font-weight: bold; color: #000; margin-top: 2px;">${offName}</div>
        </div>
        <div style="width: 125px; text-align: right; line-height: 1.2;">
          <div class="pad-header-tagline" style="font-size: 10.5pt; font-weight: bold; color: #000;">গণমানুষের ব্যাংক</div>
          <div class="pad-header-url" style="font-size: 8.5pt; color: #222; margin-top: 2px;">www.krishibank.gov.bd</div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 14pt;">
        <div><strong>সূত্র নং:</strong> সূত্র নং-প্রশ-১(৪০)/২০২৬-২০২৭/</div>
        <div><strong>তারিখ:</strong> ${dateStr} খ্রিঃ</div>
      </div>
      <div style="margin-bottom: 12pt; line-height: 1.4;">
        স্বত্বাধিকারী / সরবরাহকারী প্রতিষ্ঠান,<br/>
        ঠিকানা: ...
      </div>
      <div style="font-weight: bold; margin-bottom: 12pt;">
        বিষয়ঃ- মালামাল/সেবা সরবরাহের কার্যাদেশ (সাপ্লাই অর্ডার)।
      </div>
      <p style="text-indent: 35px; margin-bottom: 8pt;">
        প্রিয় মহোদয়,<br/>
        বর্ণিত বিষয়ে আপনার দৃষ্টি আকর্ষণ করা যাচ্ছে।
      </p>
      <p style="text-indent: 35px; margin-bottom: 12pt; line-height: 1.6;">
        ০২। অত্র কার্যালয়ের প্রয়োজনীয় মালামাল/সেবা সরবরাহের নিমিত্তে দাখিলকৃত কোটেশন/দরপত্রের প্রেক্ষিতে বর্ণিত মালামাল সরবরাহের কার্যাদেশ প্রদান করা হলো।
      </p>
      <div style="margin-bottom: 10pt; font-weight: bold;">শর্তাবলী :</div>
      <ol style="margin-top: 0; padding-left: 20px; line-height: 1.7;">
        <li>সরবরাহকৃত নমুনা ও স্পেসিফিকেশন অনুযায়ী যথাযথ মান বজায় রেখে পণ্য সরবরাহ করতে হবে।</li>
        <li>কার্যাদেশ প্রদানের নির্ধারিত কার্যদিবসের মধ্যে পণ্য সরবরাহ সম্পন্ন করতে হবে।</li>
        <li>বিল দাখিল সাপেক্ষে সরকারি বিধি মোতাবেক ভ্যাট ও ট্যাক্স কর্তনপূর্বক বিল পরিশোধ করা হবে।</li>
      </ol>
      <div style="margin-top: 30pt; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 160pt;">
          <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">অনুমোদনকারী</div>
          <div style="font-size: 0.85em; color: #555;">আঞ্চলিক ব্যবস্থাপক</div>
        </div>
      </div>
    </div>
    `;
  };

  const activeEditContent =
    activeDocTab === "notesheet"
      ? editNoteSheetContent
      : activeDocTab === "forwarding"
        ? editForwardingContent ||
          currentNoteSheet.forwardingContent ||
          getDefaultForwardingHtml()
        : editSupplyOrderContent ||
          currentNoteSheet.supplyOrderContent ||
          getDefaultSupplyOrderHtml();

  const setActiveEditContent = (val: string) => {
    if (activeDocTab === "notesheet") setEditNoteSheetContent(val);
    else if (activeDocTab === "forwarding") setEditForwardingContent(val);
    else if (activeDocTab === "supplyorder") setEditSupplyOrderContent(val);
  };

  // Switch tabs smoothly while keeping unsaved edits in sync across tabs
  const handleSwitchDocTab = (
    tab: "notesheet" | "forwarding" | "supplyorder",
  ) => {
    if (tab === activeDocTab) return;

    if (isEditing && editorRef.current) {
      let currentVal = "";
      if (typeof editorRef.current.value === "string") {
        currentVal = editorRef.current.value;
      } else if (typeof editorRef.current.getEditorValue === "function") {
        currentVal = editorRef.current.getEditorValue();
      }
      if (currentVal !== undefined && currentVal !== null) {
        if (activeDocTab === "notesheet") setEditNoteSheetContent(currentVal);
        else if (activeDocTab === "forwarding")
          setEditForwardingContent(currentVal);
        else if (activeDocTab === "supplyorder")
          setEditSupplyOrderContent(currentVal);
      }
    }

    // Auto-initialize default templates if blank
    if (
      tab === "forwarding" &&
      !editForwardingContent &&
      !currentNoteSheet.forwardingContent
    ) {
      setEditForwardingContent(getDefaultForwardingHtml());
    } else if (
      tab === "supplyorder" &&
      !editSupplyOrderContent &&
      !currentNoteSheet.supplyOrderContent
    ) {
      setEditSupplyOrderContent(getDefaultSupplyOrderHtml());
    }

    setActiveDocTab(tab);
    // Ensure Requirement 1: Note sheets are Legal size, while Forwarding and Supply Orders are A4 size
    setSettingsMap((prev) => {
      const existing = prev[tab];
      if (tab === "notesheet") {
        return {
          ...prev,
          notesheet: {
            ...(existing || DEFAULT_NOTESHEET_SETTINGS),
            pageSize: "Legal",
            customWidth: 216,
            customHeight: 356,
          },
        };
      } else {
        return {
          ...prev,
          [tab]: {
            ...(existing || DEFAULT_A4_SETTINGS),
            pageSize: "A4",
            customWidth: 210,
            customHeight: 297,
          },
        };
      }
    });
  };

  useEffect(() => {
    setCurrentNoteSheet(noteSheet);
    setEditTitle(noteSheet.title);
    setEditNoteSheetContent(noteSheet.content || "");
    setEditForwardingContent(noteSheet.forwardingContent || "");
    setEditSupplyOrderContent(noteSheet.supplyOrderContent || "");
  }, [noteSheet]);

  const handleSyncFromExpense = async () => {
    const expId = currentNoteSheet.expenseId || noteSheet.expenseId;
    if (!expId) {
      setErrorMessage(
        language === "bn"
          ? "এই নোটশিটের সাথে সংযুক্ত ব্যয়ের আইডি পাওয়া যায়নি।"
          : "No linked expense ID found.",
      );
      return;
    }
    setIsSyncing(true);
    setErrorMessage("");
    try {
      const res = await apiFetch(`/api/expenses/${expId}/generate-notesheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (currentNoteSheet as any).createdBy || "system",
          force: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sync note sheet");
      }
      if (data.noteSheet) {
        setCurrentNoteSheet(data.noteSheet);
        setEditTitle(data.noteSheet.title || editTitle);
        setEditNoteSheetContent(data.noteSheet.content || "");
        setEditForwardingContent(data.noteSheet.forwardingContent || "");
        setEditSupplyOrderContent(data.noteSheet.supplyOrderContent || "");
        setIsEditing(false);
        setContentSaveSuccess(true);
        setTimeout(() => setContentSaveSuccess(false), 3500);
        if (onUpdateNoteSheet) {
          onUpdateNoteSheet();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "নোটশিট রিফ্রেশ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveNoteSheetContent = async () => {
    setIsSaving(true);
    setErrorMessage("");
    setContentSaveSuccess(false);
    try {
      let contentToSave = activeEditContent;
      if (editorRef.current) {
        if (typeof editorRef.current.value === "string") {
          contentToSave = editorRef.current.value;
        } else if (typeof editorRef.current.getEditorValue === "function") {
          contentToSave = editorRef.current.getEditorValue();
        }
      }

      let noteContent = editNoteSheetContent;
      let fwdContent = editForwardingContent;
      let soContent = editSupplyOrderContent;

      if (activeDocTab === "notesheet") {
        noteContent = contentToSave;
        setEditNoteSheetContent(contentToSave);
      } else if (activeDocTab === "forwarding") {
        fwdContent = contentToSave;
        setEditForwardingContent(contentToSave);
      } else if (activeDocTab === "supplyorder") {
        soContent = contentToSave;
        setEditSupplyOrderContent(contentToSave);
      }

      const payload: any = {
        isCustomEdited: true,
        title: editTitle,
        content: noteContent,
        forwardingContent: fwdContent,
        supplyOrderContent: soContent,
      };

      const res = await apiFetch(
        `/api/notesheets/${currentNoteSheet.id || noteSheet.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save note sheet changes");
      }

      setCurrentNoteSheet(data);
      setEditTitle(data.title || editTitle);
      setEditNoteSheetContent(data.content || noteContent);
      setEditForwardingContent(data.forwardingContent || fwdContent);
      setEditSupplyOrderContent(data.supplyOrderContent || soContent);

      setIsEditing(false);
      setContentSaveSuccess(true);
      setTimeout(() => setContentSaveSuccess(false), 3500);
      if (onUpdateNoteSheet) {
        onUpdateNoteSheet();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "সংরক্ষণ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsNoteTemplate = async () => {
    try {
      const templateTitle = window.prompt(
        language === "bn"
          ? "ভবিষ্যতে ব্যবহারের জন্য এই নোটশীটের টেমপ্লেট শিরোনাম লিখুন:"
          : "Enter template title to save for future use:",
        `${currentNoteSheet.title} (কাস্টম টেমপ্লেট)`,
      );
      if (!templateTitle || !templateTitle.trim()) return;

      let body =
        activeDocTab === "notesheet"
          ? currentNoteSheet.content
          : activeDocTab === "forwarding"
            ? currentNoteSheet.forwardingContent
            : currentNoteSheet.supplyOrderContent;
      if (isEditing && editorRef.current) {
        if (typeof (editorRef.current as any).value === "string") {
          body = (editorRef.current as any).value;
        } else if (
          typeof (editorRef.current as any).getEditorValue === "function"
        ) {
          body = (editorRef.current as any).getEditorValue();
        }
      }

      const res = await apiFetch("/api/notetemplates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId:
            effectiveCategoryId !== "default"
              ? effectiveCategoryId
              : categories?.[0]?.id || "all",
          title: templateTitle.trim(),
          bodyTemplate: body,
        }),
      });

      if (res.ok) {
        alert(
          language === "bn"
            ? "নোট টেমপ্লেট হিসেবে সফলভাবে সংরক্ষিত হয়েছে! এখন নোট টেমপ্লেট তালিকা থেকে যেকোনো সময় এটি ব্যবহার করতে পারবেন।"
            : "Successfully saved as a Note Template!",
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "টেমপ্লেট সংরক্ষণ করতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save template");
    }
  };

  // Resolve effective category ID
  const effectiveCategoryId = useMemo(() => {
    if (categoryId) return categoryId;
    if (categoryName && categories.length > 0) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
      );
      if (match) return match.id;
    }
    return "default";
  }, [categoryId, categoryName, categories]);

  const loadSettingsForDoc = (docType: string): PrintLayoutSettings => {
    const baseDefault =
      docType === "forwarding" || docType === "supplyorder"
        ? DEFAULT_A4_SETTINGS
        : DEFAULT_NOTESHEET_SETTINGS;
    try {
      const parseWithMigration = (jsonStr: string): PrintLayoutSettings => {
        const parsed = JSON.parse(jsonStr);
        let fontSizePt = parsed.fontSizePt;
        if (!fontSizePt && parsed.fontSizeScale) {
          fontSizePt = Math.max(1, Math.round(parsed.fontSizeScale * 0.12));
        }

        // Enforce Requirement 1: Note sheets default to Legal size, Forwarding and Supply Order default to A4 size
        let enforcedPageSize = parsed.pageSize;
        let enforcedWidth = parsed.customWidth;
        let enforcedHeight = parsed.customHeight;
        if (docType === "forwarding" || docType === "supplyorder") {
          enforcedPageSize = "A4";
          enforcedWidth = 210;
          enforcedHeight = 297;
        } else if (docType === "notesheet") {
          if (!enforcedPageSize || enforcedPageSize === "A4") {
            enforcedPageSize = "Legal";
            enforcedWidth = 216;
            enforcedHeight = 356;
          }
        }

        return {
          ...baseDefault,
          ...parsed,
          pageSize: enforcedPageSize || baseDefault.pageSize,
          customWidth: enforcedWidth || baseDefault.customWidth,
          customHeight: enforcedHeight || baseDefault.customHeight,
          fontSizePt: fontSizePt || baseDefault.fontSizePt,
          textAlign: parsed.textAlign || "justify",
          fontFamily: parsed.fontFamily || baseDefault.fontFamily,
          paragraphSpacing:
            parsed.paragraphSpacing ?? baseDefault.paragraphSpacing,
          firstLineIndent:
            parsed.firstLineIndent ?? baseDefault.firstLineIndent,
        };
      };

      const saved = localStorage.getItem(
        `notesheet_layout_${effectiveCategoryId}_${docType}`,
      );
      if (saved) return parseWithMigration(saved);
      const globalSaved = localStorage.getItem(
        `notesheet_layout_default_${docType}`,
      );
      if (globalSaved) return parseWithMigration(globalSaved);
      const generalSaved = localStorage.getItem(
        `notesheet_layout_${effectiveCategoryId}`,
      );
      if (generalSaved) return parseWithMigration(generalSaved);
    } catch (e) {
      console.warn("Failed to load saved print settings", e);
    }
    return baseDefault;
  };

  const [settingsMap, setSettingsMap] = useState<
    Record<string, PrintLayoutSettings>
  >(() => ({
    notesheet: loadSettingsForDoc("notesheet"),
    forwarding: loadSettingsForDoc("forwarding"),
    supplyorder: loadSettingsForDoc("supplyorder"),
  }));

  const settings =
    settingsMap[activeDocTab] ||
    (activeDocTab === "notesheet"
      ? DEFAULT_NOTESHEET_SETTINGS
      : DEFAULT_A4_SETTINGS);
  const setSettings = (
    updater:
      | PrintLayoutSettings
      | ((prev: PrintLayoutSettings) => PrintLayoutSettings),
  ) => {
    setSettingsMap((prev) => {
      const current =
        prev[activeDocTab] ||
        (activeDocTab === "notesheet"
          ? DEFAULT_NOTESHEET_SETTINGS
          : DEFAULT_A4_SETTINGS);
      const updated =
        typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [activeDocTab]: updated };
    });
  };

  const [activeTab, setActiveTab] = useState<
    "typography" | "position" | "page" | "margins"
  >("typography");
  const [zoom, setZoom] = useState<number>(0.75); // 75% default zoom
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate effective dimensions based on Page Size & Orientation
  const { pageWidthMm, pageHeightMm } = useMemo(() => {
    if (activeDocTab === "forwarding" || activeDocTab === "supplyorder") {
      return { pageWidthMm: 210, pageHeightMm: 297 };
    }

    let w = 216;
    let h = 356;

    if (settings.pageSize === "Custom") {
      w = Number(settings.customWidth) || 216;
      h = Number(settings.customHeight) || 356;
    } else {
      const standard =
        PAGE_DIMENSIONS[settings.pageSize] || PAGE_DIMENSIONS.Legal;
      w = standard.width;
      h = standard.height;
    }

    if (settings.orientation === "landscape") {
      return { pageWidthMm: Math.max(w, h), pageHeightMm: Math.min(w, h) };
    }
    return { pageWidthMm: Math.min(w, h), pageHeightMm: Math.max(w, h) };
  }, [
    settings.pageSize,
    settings.customWidth,
    settings.customHeight,
    settings.orientation,
    activeDocTab,
  ]);

  // Save current settings for this category & active doc tab
  const handleSaveForCategory = () => {
    try {
      localStorage.setItem(
        `notesheet_layout_${effectiveCategoryId}_${activeDocTab}`,
        JSON.stringify(settings),
      );
      if (effectiveCategoryId !== "default") {
        localStorage.setItem(
          `notesheet_layout_default_${activeDocTab}`,
          JSON.stringify(settings),
        );
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Reset to system defaults for active doc tab
  const handleResetDefaults = () => {
    const baseDefault =
      activeDocTab === "forwarding" || activeDocTab === "supplyorder"
        ? DEFAULT_A4_SETTINGS
        : DEFAULT_NOTESHEET_SETTINGS;
    setSettings(baseDefault);
    try {
      localStorage.removeItem(
        `notesheet_layout_${effectiveCategoryId}_${activeDocTab}`,
      );
    } catch (e) {}
  };

  // Update helper
  const updateSetting = <K extends keyof PrintLayoutSettings>(
    key: K,
    value: PrintLayoutSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateMargin = (
    side: keyof PrintLayoutSettings["margins"],
    val: number,
  ) => {
    setSettings((prev) => ({
      ...prev,
      margins: {
        ...prev.margins,
        [side]: Math.max(0, val),
      },
    }));
  };

  // Preset Margin Helpers
  const applyMarginPreset = (
    top: number,
    bottom: number,
    left: number,
    right: number,
  ) => {
    setSettings((prev) => ({
      ...prev,
      margins: { top, bottom, left, right },
    }));
  };

  // Font Size Steppers (Google Docs Style +/-)
  const adjustFontSize = (delta: number) => {
    setSettings((prev) => {
      const current = prev.fontSizePt || 12;
      const next = Math.max(1, Math.min(500, Math.round(current + delta)));
      return { ...prev, fontSizePt: next };
    });
  };

  // Compute CSS vertical positioning styles
  const positionStyles = useMemo(() => {
    const { position, customTopOffset, customLeftOffset, margins } = settings;

    let justify = "flex-start";
    let paddingTop = `${margins.top}mm`;
    let paddingBottom = `${margins.bottom}mm`;
    let paddingLeft = `${margins.left}mm`;
    const paddingRight = `${margins.right}mm`;
    let spacerTopFlex = 0;
    let spacerBottomFlex = 0;

    switch (position) {
      case "TOP":
        justify = "flex-start";
        paddingTop = `${margins.top}mm`;
        break;
      case "UPPER_MIDDLE":
        justify = "flex-start";
        spacerTopFlex = 1;
        spacerBottomFlex = 3;
        break;
      case "CENTER":
        justify = "center";
        spacerTopFlex = 1;
        spacerBottomFlex = 1;
        break;
      case "LOWER_MIDDLE":
        justify = "flex-end";
        spacerTopFlex = 3;
        spacerBottomFlex = 1;
        break;
      case "BOTTOM":
        justify = "flex-end";
        paddingBottom = `${margins.bottom}mm`;
        break;
      case "CUSTOM":
        justify = "flex-start";
        paddingTop = `${Math.max(0, customTopOffset)}mm`;
        paddingLeft = `${Math.max(0, customLeftOffset)}mm`;
        break;
    }

    return {
      justify,
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      spacerTopFlex,
      spacerBottomFlex,
    };
  }, [settings]);

  const [copySuccess, setCopySuccess] = useState(false);

  const getCleanHtmlContent = () => {
    let raw =
      activeDocTab === "notesheet"
        ? isEditing
          ? editNoteSheetContent
          : currentNoteSheet.content
        : activeDocTab === "forwarding"
          ? isEditing
            ? editForwardingContent
            : currentNoteSheet.forwardingContent || editForwardingContent || ""
          : isEditing
            ? editSupplyOrderContent
            : currentNoteSheet.supplyOrderContent ||
              editSupplyOrderContent ||
              "";

    if (!raw || raw.trim() === "") {
      if (activeDocTab === "forwarding") return getDefaultForwardingHtml();
      if (activeDocTab === "supplyorder") return getDefaultSupplyOrderHtml();
      return "";
    }

    // Strip standard hardcoded body font sizes across all tabs on paragraphs, divs, and spans
    // so the dynamic font size slider and toolbar controls take immediate effect on text
    // while preserving specialized compact font sizes within data tables
    raw = raw.replace(
      /(<(?:p|div|span|h[1-6])[^>]*?style="[^"]*?)font-size\s*:\s*(?:9(?:\.[0-9]+)?|10(?:\.[0-9]+)?|11(?:\.[0-9]+)?|12(?:\.[0-9]+)?|13(?:\.[0-9]+)?|14(?:\.[0-9]+)?|15(?:\.[0-9]+)?|16(?:\.[0-9]+)?|17(?:\.[0-9]+)?|18(?:\.[0-9]+)?)\s*(?:pt|px)\s*;?/gi,
      "$1",
    );

    if (
      !raw.includes("<p>") &&
      !raw.includes("<table") &&
      !raw.includes("<div>")
    ) {
      raw = raw.replace(/\n/g, "<br/>");
    }
    return sanitizeHtml(raw);
  };

  const getFullDocumentHtml = (forWord: boolean = false) => {
    const formattedContent = getCleanHtmlContent();
    const isForwardingOrSupplyOrder =
      activeDocTab === "forwarding" || activeDocTab === "supplyorder";
    const hasDocInternalApproval =
      formattedContent.includes("আঞ্চলিক নিরীক্ষা কর্মকর্তা") ||
      formattedContent.includes("আঞ্চলিক ব্যবস্থাপক :-") ||
      formattedContent.includes("regular-signatures-single-line") ||
      (currentNoteSheet as any).quotationFormType === "Form1" ||
      (currentNoteSheet as any).expenseType === "Quotation";
    // Note Sheet format strictly starts directly with the Subject without any pad/header format above it
    const govtHeaderHtml = "";

    const signaturesHtml =
      settings.includeSignatures &&
      !isForwardingOrSupplyOrder &&
      !hasDocInternalApproval &&
      !isRegularExpenseUnder1500
        ? forWord
          ? `
        <div class="signatures-section">
          <table style="border:none !important; width:100%; margin-top:20pt;">
            <tr>
              <td style="border:none !important; width:55%;"></td>
              <td style="border:none !important; text-align:center; width:45%;">
                <div style="border-top: 1pt solid #000; width: 80%; margin: 0 auto; padding-top: 4pt;">
                  <strong style="font-size:${settings.fontSizePt}pt;">${language === "bn" ? "অনুমোদনকারী" : "Approver"}</strong><br/>
                  <span style="font-size:${Math.max(8, settings.fontSizePt - 2)}pt; color:#555;">${language === "bn" ? "উপ-পরিচালক / যথাযথ কর্তৃপক্ষ" : "Authorized Signatory"}</span>
                </div>
              </td>
            </tr>
          </table>
        </div>
      `
          : `
        <div class="signatures-section" style="display: flex; justify-content: flex-end;">
          <div class="sig-col" style="width: 180pt;">
            <div class="sig-line"></div>
            <div class="sig-title" style="font-size:${settings.fontSizePt}pt; font-weight:700;">${language === "bn" ? "অনুমোদনকারী" : "Approver"}</div>
            <div class="sig-sub">${language === "bn" ? "উপ-পরিচালক / যথাযথ কর্তৃপক্ষ" : "Authorized Signatory"}</div>
          </div>
        </div>
      `
        : "";

    return { formattedContent, govtHeaderHtml, signaturesHtml };
  };

  // Browser Print / PDF Execution
  const handlePrint = () => {
    const { formattedContent, govtHeaderHtml, signaturesHtml } =
      getFullDocumentHtml(false);

    // Try popup window first for best print rendering and zero iframe restrictions
    try {
      const printWin = window.open("", "_blank", "width=900,height=950");
      if (printWin) {
        printWin.document.open();
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8"/>
              <title>${noteSheet.title || "Note_Sheet"}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap');
                
                @page {
                  size: ${pageWidthMm}mm ${pageHeightMm}mm ${settings.orientation};
                  margin: 0;
                }

                @media print {
                  .no-print { display: none !important; }
                  html, body {
                    width: ${pageWidthMm}mm !important;
                    height: ${pageHeightMm}mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .page-wrapper {
                    page-break-after: always;
                    break-after: page;
                  }
                }

                * { box-sizing: border-box; }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: ${settings.fontFamily};
                  color: #000000;
                  background: #f8fafc;
                  -webkit-font-smoothing: antialiased;
                }

                .print-toolbar {
                  background: #0f172a;
                  color: #ffffff;
                  padding: 12px 24px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                  position: sticky;
                  top: 0;
                  z-index: 9999;
                }

                .print-btn {
                  background: #059669;
                  color: #ffffff;
                  border: none;
                  padding: 8px 18px;
                  font-size: 13px;
                  font-weight: bold;
                  border-radius: 8px;
                  cursor: pointer;
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                }
                .print-btn:hover { background: #10b981; }

                .page-wrapper {
                  width: ${pageWidthMm}mm;
                  min-height: ${pageHeightMm}mm;
                  margin: 20px auto;
                  background: #ffffff;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                  padding-top: ${positionStyles.paddingTop};
                  padding-bottom: ${positionStyles.paddingBottom};
                  padding-left: ${positionStyles.paddingLeft};
                  padding-right: ${positionStyles.paddingRight};
                  display: flex;
                  flex-direction: column;
                  box-sizing: border-box;
                }

                @media print {
                  .page-wrapper {
                    margin: 0 !important;
                    box-shadow: none !important;
                    max-height: ${pageHeightMm}mm;
                    overflow: hidden;
                  }
                }

                .spacer-top { flex: ${positionStyles.spacerTopFlex}; min-height: 0; }
                .spacer-bottom { flex: ${positionStyles.spacerBottomFlex}; min-height: 0; }

                .content-container {
                  width: 100%;
                  font-size: ${settings.fontSizePt}pt;
                  line-height: ${settings.lineSpacing};
                  letter-spacing: ${settings.letterSpacing || 0}px;
                  font-weight: ${settings.isBold ? "700" : "400"};
                  font-style: ${settings.isItalic ? "italic" : "normal"};
                  text-decoration: ${settings.isUnderline ? "underline" : "none"};
                }

                .header-section {
                  text-align: center;
                  border-bottom: 1.5pt solid #000000;
                  padding-bottom: 8pt;
                  margin-bottom: ${settings.paragraphSpacing || 10}pt;
                }

                .header-main {
                  font-size: ${Math.max(12, settings.fontSizePt + 3)}pt;
                  font-weight: 700;
                  margin: 0;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                }

                .header-sub {
                  font-size: ${Math.max(10, settings.fontSizePt)}pt;
                  font-weight: 600;
                  margin: 4pt 0 0 0;
                  color: #1e293b;
                }

                .header-meta {
                  font-size: ${Math.max(7, settings.fontSizePt - 3.5)}pt;
                  font-family: monospace;
                  color: #475569;
                  margin-top: 5pt;
                }

                .sheet-body {
                  text-align: ${settings.textAlign};
                  ${settings.textAlign === "justify" ? "text-justify: inter-word;" : ""}
                  word-break: normal;
                  margin-top: ${settings.paragraphSpacing || 10}pt;
                  margin-bottom: ${(settings.paragraphSpacing || 10) * 1.5}pt;
                  white-space: normal;
                  text-indent: ${settings.firstLineIndent || 0}mm;
                }

                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin: 6pt 0 !important;
                  box-sizing: border-box !important;
                }
                table.budget-provision-table,
                .budget-provision-table {
                  border: none !important;
                  font-size: ${Math.max(10, settings.fontSizePt)}pt !important;
                }
                table.budget-provision-table td,
                .budget-provision-table td {
                  border: none !important;
                  font-size: ${Math.max(10, settings.fontSizePt)}pt !important;
                  line-height: 1.4 !important;
                }
                table:not(.budget-provision-table),
                table[border="1"],
                table[border="1.5"],
                .quotation-table,
                .quotation-bidders-table,
                .forwarding-table {
                  border-collapse: collapse !important;
                  border: 1pt solid #000000 !important;
                }
                table:not(.budget-provision-table) th,
                table:not(.budget-provision-table) td,
                table[border="1"] th,
                table[border="1"] td,
                table[border="1.5"] th,
                table[border="1.5"] td,
                .quotation-table th,
                .quotation-table td,
                .quotation-bidders-table th,
                .quotation-bidders-table td,
                .forwarding-table th,
                .forwarding-table td {
                  border: 1pt solid #000000 !important;
                }
                table.quotation-bidders-table,
                .quotation-bidders-table {
                  table-layout: fixed !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  font-size: ${Math.max(7.5, settings.fontSizePt - 3.5)}pt !important;
                }
                table.quotation-bidders-table th,
                .quotation-bidders-table th {
                  border: 1pt solid #000000 !important;
                  padding: 2.5pt 1.5pt !important;
                  background-color: #f1f5f9 !important;
                  font-weight: bold !important;
                  text-align: center !important;
                  vertical-align: middle !important;
                  font-size: ${Math.max(7.5, settings.fontSizePt - 3.5)}pt !important;
                  -webkit-print-color-adjust: exact !important;
                  word-break: break-word !important;
                  overflow-wrap: break-word !important;
                }
                table.quotation-bidders-table td,
                .quotation-bidders-table td {
                  border: 1pt solid #000000 !important;
                  padding: 2.5pt 1.5pt !important;
                  vertical-align: middle !important;
                  font-size: ${Math.max(7.5, settings.fontSizePt - 3.5)}pt !important;
                  word-break: break-word !important;
                  overflow-wrap: break-word !important;
                }
                table.forwarding-table,
                .forwarding-table {
                  table-layout: auto !important;
                  width: 100% !important;
                  font-size: ${Math.max(9.5, settings.fontSizePt - 1)}pt !important;
                }
                table.forwarding-table th,
                .forwarding-table th,
                table.forwarding-table td,
                .forwarding-table td {
                  border: 1pt solid #000000 !important;
                  padding: 3.5pt 4pt !important;
                }
                .watermark-container {
                  position: absolute !important;
                  top: 50% !important;
                  left: 50% !important;
                  transform: translate(-50%, -50%) !important;
                  pointer-events: none !important;
                  z-index: 0 !important;
                  user-select: none !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                .signatures-section {
                  margin-top: ${Math.max(15, (settings.paragraphSpacing || 10) * 2.5)}pt;
                  padding-top: 15pt;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                }

                .sig-col {
                  text-align: center;
                  width: 160pt;
                }

                .sig-line {
                  border-top: 1pt solid #000000;
                  margin-bottom: 5pt;
                }

                .sig-title {
                  font-size: ${settings.fontSizePt}pt;
                  font-weight: 700;
                  color: #000000;
                }

                .sig-sub {
                  font-size: ${Math.max(7, settings.fontSizePt - 4)}pt;
                  color: #475569;
                  margin-top: 2pt;
                }
              </style>
            </head>
            <body>
              <div class="print-toolbar no-print">
                <span style="font-size:13px; font-weight:600;">${currentNoteSheet.title || "Note Sheet"}</span>
                <div style="display:flex; gap:10px;">
                  <button onclick="window.print()" class="print-btn">🖨️ ${language === "bn" ? "প্রিন্ট করুন / Save as PDF" : "Print / Save PDF"}</button>
                  <button onclick="window.close()" style="background:#334155; color:#fff; border:none; padding:8px 14px; font-size:13px; border-radius:8px; cursor:pointer;">${language === "bn" ? "বন্ধ করুন" : "Close"}</button>
                </div>
              </div>
              ${
                activeDocTab === "notesheet" &&
                settings.pageSize === "Legal" &&
                isRegularExpenseUnder1500 &&
                legalPartition !== "full"
                  ? `
                <div class="legal-3part-container" style="width: ${pageWidthMm}mm; height: ${pageHeightMm}mm; max-height: ${pageHeightMm}mm; overflow: hidden; box-sizing: border-box; position: relative; margin: 0; padding: 0;">
                  <!-- Slot 1 (Top 1/3) -->
                  <div style="height: 118.66mm; max-height: 118.66mm; box-sizing: border-box; padding: 6mm ${settings.margins.right}mm 4mm ${settings.margins.left}mm; overflow: hidden; position: relative; ${legalPartition === "part1" || legalPartition === "all3" ? "" : "visibility: hidden;"}">
                    <div class="sheet-body" style="font-size: ${Math.min(settings.fontSizePt, 11)}pt; line-height: 1.4; margin: 0;">
                      ${formattedContent}
                    </div>
                  </div>

                  <!-- Cut line 1 -->
                  <div style="border-bottom: 1px dashed #cbd5e1; height: 0; width: 100%; box-sizing: border-box;"></div>

                  <!-- Slot 2 (Middle 1/3) -->
                  <div style="height: 118.66mm; max-height: 118.66mm; box-sizing: border-box; padding: 6mm ${settings.margins.right}mm 4mm ${settings.margins.left}mm; overflow: hidden; position: relative; ${legalPartition === "part2" || legalPartition === "all3" ? "" : "visibility: hidden;"}">
                    <div class="sheet-body" style="font-size: ${Math.min(settings.fontSizePt, 11)}pt; line-height: 1.4; margin: 0;">
                      ${formattedContent}
                    </div>
                  </div>

                  <!-- Cut line 2 -->
                  <div style="border-bottom: 1px dashed #cbd5e1; height: 0; width: 100%; box-sizing: border-box;"></div>

                  <!-- Slot 3 (Bottom 1/3) -->
                  <div style="height: 118.66mm; max-height: 118.66mm; box-sizing: border-box; padding: 6mm ${settings.margins.right}mm 4mm ${settings.margins.left}mm; overflow: hidden; position: relative; ${legalPartition === "part3" || legalPartition === "all3" ? "" : "visibility: hidden;"}">
                    <div class="sheet-body" style="font-size: ${Math.min(settings.fontSizePt, 11)}pt; line-height: 1.4; margin: 0;">
                      ${formattedContent}
                    </div>
                  </div>
                </div>
              `
                  : `
                <div class="page-wrapper">
                  ${positionStyles.spacerTopFlex > 0 ? `<div class="spacer-top"></div>` : ""}
                  <div class="content-container">
                    ${govtHeaderHtml}
                    <div class="sheet-body">
                      ${formattedContent}
                    </div>
                    ${signaturesHtml}
                  </div>
                  ${positionStyles.spacerBottomFlex > 0 ? `<div class="spacer-bottom"></div>` : ""}
                </div>
              `
              }
              <script>
                setTimeout(() => { window.print(); }, 500);
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
        return;
      }
    } catch (e) {
      console.warn("Popup blocked, falling back to iframe print", e);
    }

    // Fallback: Invisible iframe print
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.style.zIndex = "-999";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${noteSheet.title || "Note_Sheet"}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap');
            @page {
              size: ${pageWidthMm}mm ${pageHeightMm}mm ${settings.orientation};
              margin: 0;
            }
            @media print {
              html, body {
                width: ${pageWidthMm}mm !important;
                height: ${pageHeightMm}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .page-wrapper { page-break-after: always; break-after: page; }
            }
            * { box-sizing: border-box; }
            body {
              margin: 0; padding: 0;
              font-family: ${settings.fontFamily};
              color: #000; background: #fff;
              -webkit-font-smoothing: antialiased;
            }
            .page-wrapper {
              width: ${pageWidthMm}mm;
              height: ${pageHeightMm}mm;
              max-height: ${pageHeightMm}mm;
              padding-top: ${positionStyles.paddingTop};
              padding-bottom: ${positionStyles.paddingBottom};
              padding-left: ${positionStyles.paddingLeft};
              padding-right: ${positionStyles.paddingRight};
              display: flex; flex-direction: column;
              box-sizing: border-box; overflow: hidden;
            }
            .spacer-top { flex: ${positionStyles.spacerTopFlex}; min-height: 0; }
            .spacer-bottom { flex: ${positionStyles.spacerBottomFlex}; min-height: 0; }
            .content-container {
              width: 100%;
              font-size: ${settings.fontSizePt}pt;
              line-height: ${settings.lineSpacing};
              letter-spacing: ${settings.letterSpacing || 0}px;
              font-weight: ${settings.isBold ? "700" : "400"};
              font-style: ${settings.isItalic ? "italic" : "normal"};
              text-decoration: ${settings.isUnderline ? "underline" : "none"};
            }
            .header-section {
              text-align: center; border-bottom: 1.5pt solid #000;
              padding-bottom: 8pt; margin-bottom: ${settings.paragraphSpacing || 10}pt;
            }
            .header-main {
              font-size: ${Math.max(12, settings.fontSizePt + 3)}pt;
              font-weight: 700; margin: 0; text-transform: uppercase;
            }
            .header-sub {
              font-size: ${Math.max(10, settings.fontSizePt)}pt;
              font-weight: 600; margin: 4pt 0 0 0; color: #1e293b;
            }
            .header-meta {
              font-size: ${Math.max(7, settings.fontSizePt - 3.5)}pt;
              font-family: monospace; color: #475569; margin-top: 5pt;
            }
            .sheet-body {
              text-align: ${settings.textAlign};
              ${settings.textAlign === "justify" ? "text-justify: inter-word;" : ""}
              word-break: normal;
              margin-top: ${settings.paragraphSpacing || 10}pt;
              margin-bottom: ${(settings.paragraphSpacing || 10) * 1.5}pt;
              text-indent: ${settings.firstLineIndent || 0}mm;
            }
            .sheet-body, .sheet-body > p, .sheet-body > div {
              font-family: inherit !important;
              font-size: inherit !important;
              line-height: inherit !important;
              ${settings.isBold ? "font-weight: 700 !important;" : ""}
              ${settings.isItalic ? "font-style: italic !important;" : ""}
              ${settings.isUnderline ? "text-decoration: underline !important;" : ""}
            }
            table {
              width: 100% !important; border-collapse: collapse !important;
              margin: 6pt 0 !important;
              box-sizing: border-box !important;
            }
            table.budget-provision-table,
            .budget-provision-table {
              border: none !important;
              font-size: ${Math.max(10, settings.fontSizePt)}pt !important;
            }
            table.budget-provision-table td,
            .budget-provision-table td {
              border: none !important;
              font-size: ${Math.max(10, settings.fontSizePt)}pt !important;
              line-height: 1.4 !important;
            }
            table:not(.budget-provision-table),
            table[border="1"],
            table[border="1.5"],
            .quotation-table,
            .quotation-bidders-table,
            .forwarding-table {
              border-collapse: collapse !important;
              border: 1pt solid #000000 !important;
            }
            table:not(.budget-provision-table) th,
            table:not(.budget-provision-table) td,
            table[border="1"] th,
            table[border="1"] td,
            table[border="1.5"] th,
            table[border="1.5"] td,
            .quotation-table th,
            .quotation-table td,
            .quotation-bidders-table th,
            .quotation-bidders-table td,
            .forwarding-table th,
            .forwarding-table td {
              border: 1pt solid #000000 !important;
            }
            table.quotation-bidders-table,
            .quotation-bidders-table {
              table-layout: fixed !important;
              width: 100% !important;
              max-width: 100% !important;
              font-size: ${Math.max(9, settings.fontSizePt - 1)}pt !important;
            }
            table.quotation-bidders-table th,
            .quotation-bidders-table th {
              border: 1pt solid #000000 !important; padding: 3.5pt 2pt !important;
              background-color: #f1f5f9 !important; font-weight: bold !important;
              text-align: center !important; vertical-align: middle !important;
              font-size: ${Math.max(9, settings.fontSizePt - 1)}pt !important; -webkit-print-color-adjust: exact !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
            }
            table.quotation-bidders-table td,
            .quotation-bidders-table td {
              border: 1pt solid #000000 !important; padding: 3pt 2.5pt !important;
              vertical-align: middle !important; font-size: ${Math.max(8.5, settings.fontSizePt - 1.5)}pt !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
            }
            table.forwarding-table,
            .forwarding-table {
              table-layout: auto !important;
              width: 100% !important;
              font-size: ${Math.max(9.5, settings.fontSizePt - 1)}pt !important;
            }
            table.forwarding-table th,
            .forwarding-table th,
            table.forwarding-table td,
            .forwarding-table td {
              border: 1pt solid #000000 !important;
              padding: 3.5pt 4pt !important;
            }
            .watermark-container {
              position: absolute !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              pointer-events: none !important;
              z-index: 0 !important;
              user-select: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .signatures-section {
              margin-top: ${Math.max(15, (settings.paragraphSpacing || 10) * 2.5)}pt;
              padding-top: 15pt; display: flex; justify-content: space-between; align-items: flex-end;
            }
            .sig-col { text-align: center; width: 160pt; }
            .sig-line { border-top: 1pt solid #000; margin-bottom: 5pt; }
            .sig-title { font-size: ${settings.fontSizePt}pt; font-weight: 700; color: #000; }
            .sig-sub { font-size: ${Math.max(7, settings.fontSizePt - 4)}pt; color: #475569; margin-top: 2pt; }
          </style>
        </head>
        <body>
          ${
            activeDocTab === "notesheet" &&
            settings.pageSize === "Legal" &&
            isRegularExpenseUnder1500 &&
            legalPartition !== "full"
              ? `
            <div class="legal-3part-container" style="width: ${pageWidthMm}mm; height: ${pageHeightMm}mm; max-height: ${pageHeightMm}mm; overflow: hidden; box-sizing: border-box; position: relative; margin: 0; padding: 0;">
              <!-- Slot 1 (Top 1/3) -->
              <div style="height: 118.66mm; max-height: 118.66mm; box-sizing: border-box; padding: 6mm ${settings.margins.right}mm 4mm ${settings.margins.left}mm; overflow: hidden; position: relative; ${legalPartition === "part1" || legalPartition === "all3" ? "" : "visibility: hidden;"}">
                <div class="sheet-body" style="font-size: ${Math.min(settings.fontSizePt, 11)}pt; line-height: 1.4; margin: 0;">
                  ${formattedContent}
                </div>
              </div>

              <!-- Cut line 1 -->
              <div style="border-bottom: 1px dashed #cbd5e1; height: 0; width: 100%; box-sizing: border-box;"></div>

              <!-- Slot 2 (Middle 1/3) -->
              <div style="height: 118.66mm; max-height: 118.66mm; box-sizing: border-box; padding: 6mm ${settings.margins.right}mm 4mm ${settings.margins.left}mm; overflow: hidden; position: relative; ${legalPartition === "part2" || legalPartition === "all3" ? "" : "visibility: hidden;"}">
                <div class="sheet-body" style="font-size: ${Math.min(settings.fontSizePt, 11)}pt; line-height: 1.4; margin: 0;">
                  ${formattedContent}
                </div>
              </div>

              <!-- Cut line 2 -->
              <div style="border-bottom: 1px dashed #cbd5e1; height: 0; width: 100%; box-sizing: border-box;"></div>

              <!-- Slot 3 (Bottom 1/3) -->
              <div style="height: 118.66mm; max-height: 118.66mm; box-sizing: border-box; padding: 6mm ${settings.margins.right}mm 4mm ${settings.margins.left}mm; overflow: hidden; position: relative; ${legalPartition === "part3" || legalPartition === "all3" ? "" : "visibility: hidden;"}">
                <div class="sheet-body" style="font-size: ${Math.min(settings.fontSizePt, 11)}pt; line-height: 1.4; margin: 0;">
                  ${formattedContent}
                </div>
              </div>
            </div>
          `
              : `
            <div class="page-wrapper">
              ${positionStyles.spacerTopFlex > 0 ? `<div class="spacer-top"></div>` : ""}
              <div class="content-container">
                ${govtHeaderHtml}
                <div class="sheet-body">
                  ${formattedContent}
                </div>
                ${signaturesHtml}
              </div>
              ${positionStyles.spacerBottomFlex > 0 ? `<div class="spacer-bottom"></div>` : ""}
            </div>
          `
          }
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 400);
  };

  // Download as Word Document (.doc with full table styling & Bangla font)
  const handleDownloadWord = () => {
    const { formattedContent, govtHeaderHtml, signaturesHtml } =
      getFullDocumentHtml(true);

    const wordHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${noteSheet.title || "Note_Sheet"}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: ${pageWidthMm}mm ${pageHeightMm}mm ${settings.orientation};
            margin: ${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm;
            mso-header-margin: 10mm;
            mso-footer-margin: 10mm;
          }
          body {
            font-family: 'Hind Siliguri', 'Kalpurush', 'Times New Roman', 'Arial', sans-serif;
            font-size: ${settings.fontSizePt}pt;
            line-height: ${settings.lineSpacing};
            color: #000000;
            text-align: ${settings.textAlign};
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
          table, th, td {
            border: 1.5pt solid #000000;
          }
          th {
            background-color: #f1f5f9;
            font-weight: bold;
            padding: 6pt;
            text-align: center;
          }
          td {
            padding: 6pt;
            vertical-align: top;
          }
          .header-section {
            text-align: center;
            border-bottom: 2pt solid #000000;
            padding-bottom: 8pt;
            margin-bottom: 14pt;
          }
          .header-main {
            font-size: ${settings.fontSizePt + 4}pt;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
          }
          .header-sub {
            font-size: ${settings.fontSizePt + 1}pt;
            font-weight: bold;
            margin: 4pt 0 0 0;
          }
          .header-meta {
            font-size: ${Math.max(8, settings.fontSizePt - 3)}pt;
            color: #555555;
            margin-top: 4pt;
          }
          .signatures-section {
            margin-top: 30pt;
            padding-top: 20pt;
            width: 100%;
          }
        </style>
      </head>
      <body>
        ${govtHeaderHtml}
        <div style="font-size: ${settings.fontSizePt}pt; line-height: ${settings.lineSpacing}; text-align: ${settings.textAlign};">
          ${formattedContent}
        </div>
        ${signaturesHtml}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + wordHtml], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (currentNoteSheet.title || "Note_Sheet").replace(
      /[^a-zA-Z0-9_\u0980-\u09FF-]/g,
      "_",
    );
    a.download = `${safeTitle}_${noteSheet.id}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download as HTML file
  const handleDownloadHtml = () => {
    const { formattedContent, govtHeaderHtml, signaturesHtml } =
      getFullDocumentHtml(false);
    const standaloneHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${currentNoteSheet.title || "Note_Sheet"}</title>
  <style>
    body { font-family: ${settings.fontFamily}; font-size: ${settings.fontSizePt}pt; line-height: ${settings.lineSpacing}; max-width: 800px; margin: 30px auto; padding: 20px; color: #000; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; border: 1.5px solid #000; }
    th { border: 1px solid #000; padding: 6px 8px; background: #f1f5f9; text-align: center; }
    td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
    .header-section { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
    .header-main { font-size: ${settings.fontSizePt + 4}pt; margin: 0; }
    .header-sub { font-size: ${settings.fontSizePt + 1}pt; margin: 5px 0 0 0; }
    .signatures-section { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-col { text-align: center; width: 200px; border-top: 1px solid #000; padding-top: 5px; }
  </style>
</head>
<body>
  ${govtHeaderHtml}
  <div>${formattedContent}</div>
  ${signaturesHtml}
</body>
</html>`;

    const blob = new Blob([standaloneHtml], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (currentNoteSheet.title || "Note_Sheet").replace(
      /[^a-zA-Z0-9_\u0980-\u09FF-]/g,
      "_",
    );
    a.download = `${safeTitle}_${noteSheet.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy Formatted Text / Content
  const handleCopyContent = () => {
    const rawText = currentNoteSheet.content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s{2,}/g, " ");
    navigator.clipboard.writeText(rawText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Convert mm to screen pixels at the current zoom scale
  // 1 mm ≈ 3.7795 px at standard 96 DPI
  const scaleRatio = 3.779527559 * zoom;
  const paperWidthPx = pageWidthMm * scaleRatio;
  const paperHeightPx = pageHeightMm * scaleRatio;

  // Exact screen pixel size for font at current zoom:
  // 1pt = (96 / 72) px = 1.333333 px.
  const previewFontPx = (settings.fontSizePt || 12) * 1.333333 * zoom;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-2xl w-full max-w-[96vw] h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-slate-700 text-slate-100">
        {/* Top App Bar */}
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  {t.printLayoutTitle}
                </h3>
                {categoryName && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {categoryName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{t.printLayoutSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {contentSaveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-bold bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/50 shadow-lg shadow-emerald-950/50 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {language === "bn"
                  ? "নোট শিট সংরক্ষিত হয়েছে!"
                  : "Note sheet saved!"}
              </span>
            )}

            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> {t.settingsSaved}
              </span>
            )}

            {copySuccess && (
              <span className="text-xs text-teal-400 flex items-center gap-1 font-medium bg-teal-950/50 px-2.5 py-1 rounded-lg border border-teal-500/30 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />{" "}
                {language === "bn" ? "কপি হয়েছে!" : "Copied!"}
              </span>
            )}

            {/* Re-sync from Expense button */}
            {(currentNoteSheet.expenseId || noteSheet.expenseId) &&
              !isEditing && (
                <button
                  onClick={handleSyncFromExpense}
                  disabled={isSyncing}
                  title={
                    language === "bn"
                      ? "মূল ব্যয়ের বর্তমান আইটেম ও দরদাতার হিসাব অনুযায়ী নোটশিট পুনরায় তৈরি করুন"
                      : "Re-sync Note Sheet from current Expense items"
                  }
                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  <span>
                    {language === "bn"
                      ? "ব্যয় অনুযায়ী রিফ্রেশ"
                      : "Sync from Expense"}
                  </span>
                </button>
              )}

            {/* Edit / View Note Sheet Button */}
            <button
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setEditTitle(currentNoteSheet.title);
                  setEditNoteSheetContent(currentNoteSheet.content || "");
                  setEditForwardingContent(
                    currentNoteSheet.forwardingContent || "",
                  );
                  setEditSupplyOrderContent(
                    currentNoteSheet.supplyOrderContent || "",
                  );
                  setErrorMessage("");
                } else {
                  setIsEditing(true);
                }
              }}
              title={
                language === "bn"
                  ? "নোটশীটের লেখা সরাসরি এডিট করুন"
                  : "Directly edit note sheet text"
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                isEditing
                  ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40"
                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>
                {isEditing
                  ? language === "bn"
                    ? "এডিট বাতিল"
                    : "Cancel Edit"
                  : language === "bn"
                    ? "সরাসরি এডিট করুন"
                    : "Direct Edit"}
              </span>
            </button>

            {isEditing && (
              <button
                onClick={handleSaveNoteSheetContent}
                disabled={isSaving}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="animate-spin inline-block mr-1">⏳</span>
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                <span>
                  {language === "bn" ? "সংরক্ষণ করুন" : "Save Changes"}
                </span>
              </button>
            )}

            {!isEditing && (
              <>
                {/* Word .doc Download */}
                <button
                  onClick={handleDownloadWord}
                  title={
                    language === "bn"
                      ? "মাইক্রোসফট ওয়ার্ড (.doc) ফরম্যাটে ডাউনলোড করুন"
                      : "Download as Microsoft Word (.doc)"
                  }
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">
                    {language === "bn" ? "Word (.doc) ডাউনলোড" : "Word (.doc)"}
                  </span>
                </button>

                {/* HTML Download */}
                <button
                  onClick={handleDownloadHtml}
                  title={
                    language === "bn"
                      ? "HTML ফরম্যাটে ডাউনলোড করুন"
                      : "Download as HTML"
                  }
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">HTML</span>
                </button>

                {/* Copy Content */}
                <button
                  onClick={handleCopyContent}
                  title={
                    language === "bn"
                      ? "নোটশীটের টেক্সট কপি করুন"
                      : "Copy Content"
                  }
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Save as Note Template button */}
                <button
                  onClick={handleSaveAsNoteTemplate}
                  title={
                    language === "bn"
                      ? "ভবিষ্যতে ব্যবহারের জন্য এটিকে একটি 'নোট টেমপ্লেট' হিসেবে সংরক্ষণ করুন"
                      : "Save as reusable Note Template"
                  }
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden md:inline">
                    {language === "bn"
                      ? "টেমপ্লেটে সংরক্ষণ"
                      : "Save as Template"}
                  </span>
                </button>

                <button
                  onClick={handleSaveForCategory}
                  title={t.saveSettingsForCategory}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline">
                    {t.saveSettingsForCategory}
                  </span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition"
                >
                  <Printer className="w-4 h-4" /> {t.printPdf}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Controls + Right Live Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Controls Sidebar */}
          {!isEditing && (
            <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
              {/* Tab selector */}
              <div className="grid grid-cols-4 p-2 bg-slate-950/60 border-b border-slate-800 gap-1 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("typography")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${activeTab === "typography" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                >
                  <Type className="w-3.5 h-3.5" />{" "}
                  {language === "bn" ? "টেক্সট ও ফন্ট" : "Text & Font"}
                </button>
                <button
                  onClick={() => setActiveTab("position")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${activeTab === "position" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                >
                  <MoveVertical className="w-3.5 h-3.5" />{" "}
                  {language === "bn" ? "অবস্থান" : "Position"}
                </button>
                <button
                  onClick={() => setActiveTab("page")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${activeTab === "page" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                >
                  <Layout className="w-3.5 h-3.5" />{" "}
                  {language === "bn" ? "সাইজ" : "Page"}
                </button>
                <button
                  onClick={() => setActiveTab("margins")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${activeTab === "margins" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />{" "}
                  {language === "bn" ? "মার্জিন" : "Margins"}
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                {/* 1. TYPOGRAPHY, FONT SIZE (1-500+), LINE SPACING & JUSTIFICATION TAB */}
                {activeTab === "typography" && (
                  <div className="space-y-4">
                    {/* Google Docs Style Exact Font Size (1 to 500+ pt) */}
                    <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
                          <Type className="w-4 h-4 text-emerald-400" />
                          {t.fontSize}
                        </label>
                        <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                          {settings.fontSizePt} pt
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {language === "bn"
                          ? "গুগল ডকসের মতো ১ থেকে ৫০০+ সাইজ সরাসরি লিখুন অথবা +/- বোতাম দিয়ে পরিবর্তন করুন।"
                          : "Select or type exact font size in pt (1 to 500+), just like Google Docs."}
                      </p>

                      {/* Google Docs Style Stepper & Input */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustFontSize(-1)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-200 border border-slate-700 transition"
                          title={
                            language === "bn"
                              ? "ফন্ট সাইজ ১ কমান"
                              : "Decrease Font Size (-1pt)"
                          }
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        {/* Direct numeric input 1 to 500+ */}
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            step="1"
                            value={settings.fontSizePt || 12}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                updateSetting(
                                  "fontSizePt",
                                  Math.max(1, Math.min(500, val)),
                                );
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-center text-white font-mono font-bold text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                          <span className="absolute right-2.5 top-2 text-xs text-slate-500 font-mono pointer-events-none">
                            pt
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => adjustFontSize(1)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-slate-200 border border-slate-700 transition"
                          title={
                            language === "bn"
                              ? "ফন্ট সাইজ ১ বাড়ান"
                              : "Increase Font Size (+1pt)"
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {/* Preset Select Dropdown */}
                        <select
                          value={
                            GOOGLE_DOCS_FONT_SIZES.includes(settings.fontSizePt)
                              ? settings.fontSizePt
                              : ""
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              updateSetting(
                                "fontSizePt",
                                Number(e.target.value),
                              );
                            }
                          }}
                          className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500"
                          title={
                            language === "bn"
                              ? "স্ট্যান্ডার্ড সাইজ তালিকা"
                              : "Standard Size Preset"
                          }
                        >
                          <option value="" disabled>
                            {language === "bn" ? "সাইজ..." : "Sizes..."}
                          </option>
                          {GOOGLE_DOCS_FONT_SIZES.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz} pt
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quick Size Chip Buttons */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {[8, 9, 10, 11, 12, 13, 14, 16, 18, 24, 36].map(
                          (sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => updateSetting("fontSizePt", sz)}
                              className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition ${
                                settings.fontSizePt === sz
                                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {sz}
                            </button>
                          ),
                        )}
                      </div>

                      {/* Smooth Range Slider */}
                      <input
                        type="range"
                        min="4"
                        max="48"
                        step="0.5"
                        value={Math.min(
                          48,
                          Math.max(4, settings.fontSizePt || 12),
                        )}
                        onChange={(e) =>
                          updateSetting("fontSizePt", Number(e.target.value))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Text Alignment & Justify (৪ টি অ্যালাইনমেন্ট অপশন) */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">
                        {t.textAlign}
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "left")}
                          className={`p-2.5 rounded-xl border text-center font-medium transition flex flex-col items-center gap-1 ${
                            settings.textAlign === "left"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                          title={t.alignLeft}
                        >
                          <AlignLeft className="w-4 h-4" />
                          <span className="text-xs">
                            {language === "bn" ? "বাম" : "Left"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "center")}
                          className={`p-2.5 rounded-xl border text-center font-medium transition flex flex-col items-center gap-1 ${
                            settings.textAlign === "center"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                          title={t.alignCenter}
                        >
                          <AlignCenter className="w-4 h-4" />
                          <span className="text-xs">
                            {language === "bn" ? "মাঝামাঝি" : "Center"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "right")}
                          className={`p-2.5 rounded-xl border text-center font-medium transition flex flex-col items-center gap-1 ${
                            settings.textAlign === "right"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                          title={t.alignRight}
                        >
                          <AlignRight className="w-4 h-4" />
                          <span className="text-xs">
                            {language === "bn" ? "ডান" : "Right"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "justify")}
                          className={`p-2.5 rounded-xl border text-center font-medium transition flex flex-col items-center gap-1 ${
                            settings.textAlign === "justify"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                          title={t.alignJustify}
                        >
                          <AlignJustify className="w-4 h-4" />
                          <span className="text-xs font-bold">
                            {language === "bn" ? "জাস্টিফাই" : "Justify"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Line Spacing (লাইনের দূরত্ব) */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-300 font-semibold">
                          {t.lineSpacing}
                        </label>
                        <span className="text-emerald-400 font-mono font-bold text-xs">
                          {settings.lineSpacing}x
                        </span>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-4 gap-1">
                        {LINE_SPACING_PRESETS.slice(0, 4).map((lp) => (
                          <button
                            key={lp.value}
                            type="button"
                            onClick={() =>
                              updateSetting("lineSpacing", lp.value)
                            }
                            className={`py-1 px-1 rounded text-xs font-mono transition ${
                              settings.lineSpacing === lp.value
                                ? "bg-emerald-600 text-white font-bold"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {lp.value}x
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {LINE_SPACING_PRESETS.slice(4, 8).map((lp) => (
                          <button
                            key={lp.value}
                            type="button"
                            onClick={() =>
                              updateSetting("lineSpacing", lp.value)
                            }
                            className={`py-1 px-1 rounded text-xs font-mono transition ${
                              settings.lineSpacing === lp.value
                                ? "bg-emerald-600 text-white font-bold"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {lp.value}x
                          </button>
                        ))}
                      </div>

                      {/* Line spacing range slider */}
                      <input
                        type="range"
                        min="0.8"
                        max="3.0"
                        step="0.05"
                        value={settings.lineSpacing}
                        onChange={(e) =>
                          updateSetting("lineSpacing", Number(e.target.value))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* Font Family Selector */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {t.fontFamily}
                      </label>
                      <select
                        value={settings.fontFamily}
                        onChange={(e) =>
                          updateSetting("fontFamily", e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:ring-1 focus:ring-emerald-500"
                      >
                        {FONT_FAMILIES.map((ff) => (
                          <option key={ff.id} value={ff.id}>
                            {ff.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Formatting Styles: Bold, Italic, Underline */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">
                        {language === "bn" ? "টেক্সট স্টাইল" : "Text Styling"}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting("isBold", !settings.isBold)
                          }
                          className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                            settings.isBold
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <Bold className="w-3.5 h-3.5" />
                          <span>Bold</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateSetting("isItalic", !settings.isItalic)
                          }
                          className={`p-2 rounded-xl border italic flex items-center justify-center gap-1.5 transition ${
                            settings.isItalic
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <Italic className="w-3.5 h-3.5" />
                          <span>Italic</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateSetting("isUnderline", !settings.isUnderline)
                          }
                          className={`p-2 rounded-xl border underline flex items-center justify-center gap-1.5 transition ${
                            settings.isUnderline
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <Underline className="w-3.5 h-3.5" />
                          <span>Underline</span>
                        </button>
                      </div>
                    </div>

                    {/* Paragraph Spacing & First Line Indent */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">
                          {language === "bn"
                            ? "প্যারাগ্রাফ ব্যবধান (pt)"
                            : "Paragraph Gap (pt)"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          value={settings.paragraphSpacing || 10}
                          onChange={(e) =>
                            updateSetting(
                              "paragraphSpacing",
                              Number(e.target.value),
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-xs mb-1">
                          {language === "bn"
                            ? "প্রথম লাইন ইন্ডেন্ট (mm)"
                            : "First Line Indent (mm)"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={settings.firstLineIndent || 0}
                          onChange={(e) =>
                            updateSetting(
                              "firstLineIndent",
                              Number(e.target.value),
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. POSITION TAB */}
                {activeTab === "position" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-2">
                        {t.contentPosition}
                      </label>
                      <p className="text-xs text-slate-400 mb-3">
                        {language === "bn"
                          ? "প্রিন্ট পেজে লেখার উল্লম্ব অবস্থান নির্ধারণ করুন।"
                          : "Choose vertical placement of note sheet content on page."}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            "TOP",
                            "UPPER_MIDDLE",
                            "CENTER",
                            "LOWER_MIDDLE",
                            "BOTTOM",
                            "CUSTOM",
                          ] as ContentPosition[]
                        ).map((pos) => {
                          const labels: Record<ContentPosition, string> = {
                            TOP: t.posTop,
                            UPPER_MIDDLE: t.posUpperMiddle,
                            CENTER: t.posCenter,
                            LOWER_MIDDLE: t.posLowerMiddle,
                            BOTTOM: t.posBottom,
                            CUSTOM: t.posCustom,
                          };

                          const isSelected = settings.position === pos;
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => updateSetting("position", pos)}
                              className={`p-2.5 rounded-xl border text-left font-medium transition flex items-center justify-between ${
                                isSelected
                                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              <span className="truncate">{labels[pos]}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Offsets if CUSTOM selected */}
                    {settings.position === "CUSTOM" && (
                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 animate-in fade-in">
                        <div className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
                          <Settings2 className="w-3.5 h-3.5" />
                          {language === "bn"
                            ? "নির্দিষ্ট অফসেট মান (মিমি)"
                            : "Exact Offsets (mm)"}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">
                              {t.topOffset} (mm)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="250"
                              value={settings.customTopOffset}
                              onChange={(e) =>
                                updateSetting(
                                  "customTopOffset",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">
                              {t.leftOffset} (mm)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={settings.customLeftOffset}
                              onChange={(e) =>
                                updateSetting(
                                  "customLeftOffset",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300 block mb-1">
                        {language === "bn" ? "টিপস:" : "Usage Tip:"}
                      </span>
                      {language === "bn"
                        ? "প্যাডে বা প্রি-প্রিন্টেড লেটারহেডে প্রিন্ট করতে 'Upper Middle' অথবা 'Custom Position' ব্যবহার করে উপরের অংশ খালি রাখুন।"
                        : "For pre-printed letterhead forms, use 'Upper Middle' or 'Custom Position' to leave top space for official header."}
                    </div>
                  </div>
                )}

                {/* 3. PAGE SIZE & ORIENTATION TAB */}
                {activeTab === "page" && (
                  <div className="space-y-4">
                    {/* Page Size */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-2">
                        {t.pageSize}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          ["A4", "Legal", "Letter", "Custom"] as PageSize[]
                        ).map((size) => {
                          const labels: Record<
                            PageSize,
                            { name: string; dim: string }
                          > = {
                            A4: { name: "A4", dim: "210 × 297 mm" },
                            Legal: { name: "Legal", dim: "216 × 356 mm" },
                            Letter: { name: "Letter", dim: "216 × 279 mm" },
                            Custom: {
                              name: t.pageSizeCustom,
                              dim: "User-defined",
                            },
                          };

                          const isSelected = settings.pageSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => updateSetting("pageSize", size)}
                              className={`p-2.5 rounded-xl border text-left font-medium transition flex flex-col justify-between ${
                                isSelected
                                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-bold">
                                  {labels[size].name}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-mono mt-1">
                                {labels[size].dim}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Dimensions */}
                    {settings.pageSize === "Custom" && (
                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 animate-in fade-in">
                        <div className="font-semibold text-emerald-400 text-xs">
                          {language === "bn"
                            ? "কাস্টম পরিমাপ (মিমি)"
                            : "Custom Size (mm)"}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">
                              {t.pageWidth}
                            </label>
                            <input
                              type="number"
                              min="100"
                              max="500"
                              value={settings.customWidth}
                              onChange={(e) =>
                                updateSetting(
                                  "customWidth",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs mb-1">
                              {t.pageHeight}
                            </label>
                            <input
                              type="number"
                              min="100"
                              max="600"
                              value={settings.customHeight}
                              onChange={(e) =>
                                updateSetting(
                                  "customHeight",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Orientation */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-2">
                        {t.pageOrientation}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting("orientation", "portrait")
                          }
                          className={`p-3 rounded-xl border text-center font-medium transition flex items-center justify-center gap-2 ${
                            settings.orientation === "portrait"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <div className="w-3.5 h-5 border-2 border-current rounded-sm"></div>
                          <span>{t.portrait}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateSetting("orientation", "landscape")
                          }
                          className={`p-3 rounded-xl border text-center font-medium transition flex items-center justify-center gap-2 ${
                            settings.orientation === "landscape"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <div className="w-5 h-3.5 border-2 border-current rounded-sm"></div>
                          <span>{t.landscape}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. MARGINS & TOGGLES TAB */}
                {activeTab === "margins" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {t.margins}
                      </label>
                      <p className="text-xs text-slate-400 mb-3">
                        {language === "bn"
                          ? "প্রিন্ট পেজের চারদিকের ফাঁকা মার্জিন (মিমি)"
                          : "Printable page outer margins in millimeters."}
                      </p>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-3 gap-1.5 mb-4">
                        <button
                          type="button"
                          onClick={() => applyMarginPreset(20, 20, 20, 20)}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 font-semibold border border-slate-700 text-center"
                        >
                          Normal (20mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyMarginPreset(12, 12, 12, 12)}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 font-semibold border border-slate-700 text-center"
                        >
                          Narrow (12mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyMarginPreset(35, 20, 20, 20)}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 font-semibold border border-slate-700 text-center"
                        >
                          Letterhead (35mm)
                        </button>
                      </div>

                      {/* 4 Margin Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 text-xs mb-1">
                            {t.marginTop}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={settings.margins.top}
                              onChange={(e) =>
                                updateMargin("top", Number(e.target.value))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-slate-500 text-xs font-mono">
                              mm
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-xs mb-1">
                            {t.marginBottom}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={settings.margins.bottom}
                              onChange={(e) =>
                                updateMargin("bottom", Number(e.target.value))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-slate-500 text-xs font-mono">
                              mm
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-xs mb-1">
                            {t.marginLeft}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={settings.margins.left}
                              onChange={(e) =>
                                updateMargin("left", Number(e.target.value))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-slate-500 text-xs font-mono">
                              mm
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-xs mb-1">
                            {t.marginRight}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={settings.margins.right}
                              onChange={(e) =>
                                updateMargin("right", Number(e.target.value))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-slate-500 text-xs font-mono">
                              mm
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Header and Signature Toggles */}
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition">
                        <input
                          type="checkbox"
                          checked={settings.includeHeader}
                          onChange={(e) =>
                            updateSetting("includeHeader", e.target.checked)
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-slate-200 font-medium text-xs">
                          {t.govtHeaderToggle}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition">
                        <input
                          type="checkbox"
                          checked={settings.includeSignatures}
                          onChange={(e) =>
                            updateSetting("includeSignatures", e.target.checked)
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-slate-200 font-medium text-xs">
                          {t.signatureToggle}
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions of Sidebar */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3" /> {t.resetDefaults}
                </button>

                <div className="text-xs text-slate-500 font-mono">
                  {pageWidthMm} × {pageHeightMm} mm
                </div>
              </div>
            </div>
          )}

          {/* Right Live Print Preview Stage */}
          <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
            {/* Document Tabs Bar - Always accessible for independent custom editing & previewing */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0 gap-3">
              <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                <button
                  type="button"
                  onClick={() => handleSwitchDocTab("notesheet")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                    activeDocTab === "notesheet"
                      ? "bg-emerald-600 text-white shadow-sm font-bold ring-1 ring-emerald-400"
                      : "bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700"
                  }`}
                >
                  <span>📄</span>
                  <span>
                    {language === "bn" ? "নোট শিট (Note Sheet)" : "Note Sheet"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchDocTab("forwarding")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                    activeDocTab === "forwarding"
                      ? "bg-emerald-600 text-white shadow-sm font-bold ring-1 ring-emerald-400"
                      : "bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700"
                  }`}
                >
                  <span>📨</span>
                  <span>
                    {language === "bn"
                      ? "ফরোয়ার্ডিং পত্র (Forwarding)"
                      : "Forwarding Letter"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchDocTab("supplyorder")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                    activeDocTab === "supplyorder"
                      ? "bg-emerald-600 text-white shadow-sm font-bold ring-1 ring-emerald-400"
                      : "bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700"
                  }`}
                >
                  <span>📦</span>
                  <span>
                    {language === "bn"
                      ? "সাপ্লাই অর্ডার (Supply Order)"
                      : "Supply Order"}
                  </span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 shrink-0">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${isEditing ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}
                ></span>
                <span className="font-medium">
                  {isEditing
                    ? language === "bn"
                      ? `${activeDocTab === "notesheet" ? "নোট শিট" : activeDocTab === "forwarding" ? "ফরোয়ার্ডিং পত্র" : "সাপ্লাই অর্ডার"} কাস্টম এডিট মোড চালু`
                      : "Custom Edit Mode Active"
                    : language === "bn"
                      ? "প্রিভিউ ও প্রিন্ট মোড"
                      : "Preview & Print Mode"}
                </span>
              </div>
            </div>

            {isEditing ? (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full space-y-5 flex flex-col">
                {errorMessage && (
                  <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    {language === "bn"
                      ? activeDocTab === "notesheet"
                        ? "নোট শিটের বিষয়/শিরোনাম *"
                        : activeDocTab === "forwarding"
                          ? "ফরোয়ার্ডিং পত্রের বিষয়/শিরোনাম *"
                          : "সাপ্লাই অর্ডারের বিষয়/শিরোনাম *"
                      : activeDocTab === "notesheet"
                        ? "Note Sheet Subject/Title *"
                        : activeDocTab === "forwarding"
                          ? "Forwarding Letter Subject/Title *"
                          : "Supply Order Subject/Title *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm font-semibold rounded-xl bg-slate-900 border border-slate-750 text-white p-3 focus:outline-none focus:border-emerald-500"
                    placeholder={
                      language === "bn" ? "বিষয় লিখুন..." : "Enter subject..."
                    }
                  />
                </div>

                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex justify-between items-center shrink-0">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      {language === "bn"
                        ? activeDocTab === "notesheet"
                          ? "নোট শিট বডি কনটেন্ট (সরাসরি টেক্সট বা HTML) *"
                          : activeDocTab === "forwarding"
                            ? "ফরোয়ার্ডিং পত্র বডি কনটেন্ট (সরাসরি টেক্সট বা HTML) *"
                            : "সাপ্লাই অর্ডার বডি কনটেন্ট (সরাসরি টেক্সট বা HTML) *"
                        : activeDocTab === "notesheet"
                          ? "Note Sheet Body Content (Text or HTML) *"
                          : activeDocTab === "forwarding"
                            ? "Forwarding Body Content (Text or HTML) *"
                            : "Supply Order Body Content (Text or HTML) *"}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                        {language === "bn"
                          ? activeDocTab === "notesheet"
                            ? "নোট শিট এডিটিং"
                            : activeDocTab === "forwarding"
                              ? "ফরোয়ার্ডিং এডিটিং"
                              : "সাপ্লাই অর্ডার এডিটিং"
                          : activeDocTab === "notesheet"
                            ? "Editing Note Sheet"
                            : activeDocTab === "forwarding"
                              ? "Editing Forwarding"
                              : "Editing Supply Order"}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {language === "bn"
                          ? "রিচ টেক্সট এডিটর"
                          : "Rich Text Editor"}
                      </span>
                    </div>
                  </div>

                  {/* Edit Mode Quick Formatting Ribbon */}
                  <div className="p-2 bg-slate-900 border border-slate-750 rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs shadow-sm">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
                        <Type className="w-3.5 h-3.5 text-emerald-400" />
                        {language === "bn" ? "ডিফল্ট ফন্ট:" : "Default Font:"}
                      </span>

                      {/* Font Selector */}
                      <select
                        value={settings.fontFamily}
                        onChange={(e) =>
                          updateSetting("fontFamily", e.target.value)
                        }
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[190px] truncate"
                      >
                        {FONT_FAMILIES.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>

                      <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

                      {/* Font Size Stepper */}
                      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting(
                              "fontSizePt",
                              Math.max(1, (settings.fontSizePt || 12) - 1),
                            )
                          }
                          className="px-1.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          title="Decrease font size (-1pt)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={settings.fontSizePt || 12}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val))
                              updateSetting(
                                "fontSizePt",
                                Math.max(1, Math.min(500, val)),
                              );
                          }}
                          className="w-10 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                          title={
                            language === "bn"
                              ? "সরাসরি ফন্ট সাইজ লিখুন (১-৫০০+)"
                              : "Exact font size (1-500+ pt)"
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting(
                              "fontSizePt",
                              Math.min(500, (settings.fontSizePt || 12) + 1),
                            )
                          }
                          className="px-1.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          title="Increase font size (+1pt)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Size Preset Dropdown */}
                      <select
                        value={
                          GOOGLE_DOCS_FONT_SIZES.includes(settings.fontSizePt)
                            ? settings.fontSizePt
                            : ""
                        }
                        onChange={(e) => {
                          if (e.target.value)
                            updateSetting("fontSizePt", Number(e.target.value));
                        }}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      >
                        <option value="" disabled>
                          {settings.fontSizePt} pt
                        </option>
                        {GOOGLE_DOCS_FONT_SIZES.map((sz) => (
                          <option key={sz} value={sz}>
                            {sz} pt
                          </option>
                        ))}
                      </select>

                      <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

                      {/* Alignments */}
                      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "left")}
                          className={`p-1 rounded transition ${settings.textAlign === "left" ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                          title="Align Left"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "center")}
                          className={`p-1 rounded transition ${settings.textAlign === "center" ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                          title="Align Center"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "right")}
                          className={`p-1 rounded transition ${settings.textAlign === "right" ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                          title="Align Right"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSetting("textAlign", "justify")}
                          className={`p-1 rounded transition ${settings.textAlign === "justify" ? "bg-emerald-600 text-white font-bold" : "text-slate-300 hover:text-white"}`}
                          title="Justify (Standard official alignment)"
                        >
                          <AlignJustify className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Spacing */}
                      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 gap-1">
                        <span className="text-slate-400 font-mono">↕</span>
                        <select
                          value={settings.lineSpacing}
                          onChange={(e) =>
                            updateSetting("lineSpacing", Number(e.target.value))
                          }
                          className="bg-transparent text-slate-200 font-mono focus:outline-none cursor-pointer text-xs"
                        >
                          {LINE_SPACING_PRESETS.map((lp) => (
                            <option
                              key={lp.value}
                              value={lp.value}
                              className="bg-slate-900 text-slate-100"
                            >
                              {lp.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white text-black rounded overflow-hidden border border-slate-700">
                    <JoditEditor
                      key={activeDocTab}
                      ref={editorRef}
                      value={activeEditContent}
                      config={{
                        readonly: false,
                        minHeight: 500,
                        height: "auto",
                        style: {
                          fontFamily: settings.fontFamily,
                          fontSize: `${settings.fontSizePt}pt`,
                          lineHeight: settings.lineSpacing,
                          textAlign: settings.textAlign,
                        },
                        placeholder:
                          language === "bn"
                            ? activeDocTab === "notesheet"
                              ? "নোট শিটের বিবরণ লিখুন..."
                              : activeDocTab === "forwarding"
                                ? "ফরোয়ার্ডিং পত্রের বিবরণ লিখুন..."
                                : "সাপ্লাই অর্ডারের বিবরণ লিখুন..."
                            : "Enter document body...",
                        defaultActionOnPaste: "insert_as_html",
                        askBeforePasteHTML: false,
                        askBeforePasteFromWord: false,
                        showCharsCounter: false,
                        showWordsCounter: false,
                        showXPathInStatusbar: false,
                        buttons: [
                          "source",
                          "|",
                          "bold",
                          "italic",
                          "underline",
                          "strikethrough",
                          "|",
                          "font",
                          "fontsize",
                          "brush",
                          "paragraph",
                          "|",
                          "align",
                          "|",
                          "ul",
                          "ol",
                          "|",
                          "table",
                          "link",
                          "hr",
                          "|",
                          "undo",
                          "redo",
                          "|",
                          "eraser",
                          "fullsize",
                        ],
                        buttonsMD: [
                          "bold",
                          "italic",
                          "underline",
                          "|",
                          "font",
                          "fontsize",
                          "brush",
                          "|",
                          "align",
                          "|",
                          "ul",
                          "ol",
                          "table",
                          "|",
                          "undo",
                          "redo",
                        ],
                        buttonsSM: [
                          "bold",
                          "italic",
                          "underline",
                          "|",
                          "font",
                          "fontsize",
                          "|",
                          "align",
                          "|",
                          "table",
                          "undo",
                          "redo",
                        ],
                        buttonsXS: [
                          "bold",
                          "italic",
                          "|",
                          "font",
                          "fontsize",
                          "|",
                          "align",
                          "table",
                        ],
                        controls: {
                          font: {
                            list: JODIT_FONT_LIST,
                          },
                          fontsize: {
                            list: JODIT_FONT_SIZES,
                          },
                        },
                      }}
                      onBlur={(newContent) => setActiveEditContent(newContent)}
                      onChange={(newContent) =>
                        setActiveEditContent(newContent)
                      }
                    />
                  </div>

                  {/* Edit Action Bar */}
                  <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {contentSaveSuccess ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {language === "bn"
                            ? "সফলভাবে সংরক্ষিত হয়েছে!"
                            : "Saved successfully!"}
                        </span>
                      ) : (
                        <span>
                          {language === "bn"
                            ? "টেক্সট পরিবর্তন শেষে নিচের সংরক্ষণ বাটনে ক্লিক করুন।"
                            : "Click Save when finished making changes."}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(currentNoteSheet.title);
                          setEditNoteSheetContent(
                            currentNoteSheet.content || "",
                          );
                          setEditForwardingContent(
                            currentNoteSheet.forwardingContent || "",
                          );
                          setEditSupplyOrderContent(
                            currentNoteSheet.supplyOrderContent || "",
                          );
                          setErrorMessage("");
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                      >
                        {language === "bn" ? "বাতিল" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAsNoteTemplate}
                        className="px-3.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        title={
                          language === "bn"
                            ? "বর্তমান লেখাটি নতুন নোট টেমপ্লেট হিসেবে সংরক্ষণ করুন"
                            : "Save as reusable Note Template"
                        }
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 text-purple-300" />
                        <span>
                          {language === "bn"
                            ? "টেমপ্লেটে সেভ"
                            : "Save as Template"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNoteSheetContent}
                        disabled={isSaving}
                        className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
                      >
                        {isSaving ? (
                          <span className="animate-spin inline-block">⏳</span>
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {language === "bn" ? "সংরক্ষণ করুন" : "Save Changes"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5 shrink-0">
                  <p className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {language === "bn"
                      ? "এডিটর নির্দেশিকা:"
                      : "Editor Guidelines:"}
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>
                      {language === "bn"
                        ? "আপনি সরাসরি সাধারণ টেক্সট টাইপ করতে পারেন। প্রতিটি লাইনের শেষে নতুন লাইন বজায় থাকবে।"
                        : "You can type standard plain text directly. Line breaks will be preserved."}
                    </li>
                    <li>
                      {language === "bn"
                        ? "অথবা আপনি সুন্দর ফরম্যাটিং ও বিল বা তালিকার জন্য HTML ট্যাগ ব্যবহার করতে পারেন (যেমন: <table>, <tr>, <td>, <p>, <b> ইত্যাদি)।"
                        : "Or you can use HTML tags (e.g., <table>, <tr>, <td>, <p>, <b> etc.) for rich tabular alignment."}
                    </li>
                    <li>
                      {language === "bn"
                        ? "ব্যয় বা বরাদ্দ সম্পর্কিত নোট শিটটি প্রয়োজনে ম্যানুয়াল পরিবর্তন করার পর 'সংরক্ষণ করুন' বাটনে ক্লিক করুন।"
                        : "After editing, click the 'Save Changes' button in the top bar to apply your direct edits."}
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {/* Google Docs-Style Quick Formatting Ribbon */}
                <div className="p-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs shadow-sm">
                  {/* Left Formatting Tools */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    {/* Font Selector */}
                    <select
                      value={settings.fontFamily}
                      onChange={(e) =>
                        updateSetting("fontFamily", e.target.value)
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[170px] truncate"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>

                    <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

                    {/* Google Docs Style Font Size Stepper & Direct Input */}
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => adjustFontSize(-1)}
                        className="px-1.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                        title={
                          language === "bn"
                            ? "ফন্ট সাইজ ১ কমান"
                            : "Decrease Font Size (-1pt)"
                        }
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={settings.fontSizePt || 12}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val))
                            updateSetting(
                              "fontSizePt",
                              Math.max(1, Math.min(500, val)),
                            );
                        }}
                        className="w-10 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                        title={
                          language === "bn"
                            ? "সরাসরি ফন্ট সাইজ লিখুন (১-৫০০+)"
                            : "Exact font size (1-500+ pt)"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => adjustFontSize(1)}
                        className="px-1.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                        title={
                          language === "bn"
                            ? "ফন্ট সাইজ ১ বাড়ান"
                            : "Increase Font Size (+1pt)"
                        }
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Quick Font Size Dropdown */}
                    <select
                      value={
                        GOOGLE_DOCS_FONT_SIZES.includes(settings.fontSizePt)
                          ? settings.fontSizePt
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value)
                          updateSetting("fontSizePt", Number(e.target.value));
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="" disabled>
                        pt
                      </option>
                      {GOOGLE_DOCS_FONT_SIZES.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz} pt
                        </option>
                      ))}
                    </select>

                    <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

                    {/* Text Styles: B, I, U */}
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateSetting("isBold", !settings.isBold)
                        }
                        className={`p-1 rounded font-bold transition ${settings.isBold ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSetting("isItalic", !settings.isItalic)
                        }
                        className={`p-1 rounded italic transition ${settings.isItalic ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSetting("isUnderline", !settings.isUnderline)
                        }
                        className={`p-1 rounded underline transition ${settings.isUnderline ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                        title="Underline"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

                    {/* Text Alignment Ribbon Buttons */}
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateSetting("textAlign", "left")}
                        className={`p-1 rounded transition ${settings.textAlign === "left" ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                        title={t.alignLeft}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("textAlign", "center")}
                        className={`p-1 rounded transition ${settings.textAlign === "center" ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                        title={t.alignCenter}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("textAlign", "right")}
                        className={`p-1 rounded transition ${settings.textAlign === "right" ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"}`}
                        title={t.alignRight}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("textAlign", "justify")}
                        className={`p-1 rounded transition ${settings.textAlign === "justify" ? "bg-emerald-600 text-white font-bold" : "text-slate-300 hover:text-white"}`}
                        title={t.alignJustify}
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Spacing Selector */}
                    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs">
                      <span className="text-slate-400 font-mono">↕</span>
                      <select
                        value={settings.lineSpacing}
                        onChange={(e) =>
                          updateSetting("lineSpacing", Number(e.target.value))
                        }
                        className="bg-transparent text-slate-200 font-mono focus:outline-none cursor-pointer"
                        title={t.lineSpacing}
                      >
                        {LINE_SPACING_PRESETS.map((lp) => (
                          <option
                            key={lp.value}
                            value={lp.value}
                            className="bg-slate-900 text-slate-200"
                          >
                            {lp.value}x
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right View & Zoom Controls */}
                  <div className="flex items-center gap-2">
                    {/* Guidelines toggle */}
                    <button
                      onClick={() => setShowGuidelines(!showGuidelines)}
                      title={t.guidelinesToggle}
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
                        showGuidelines
                          ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      {showGuidelines ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline text-xs">
                        {language === "bn" ? "গাইড রেখা" : "Guides"}
                      </span>
                    </button>

                    {/* Zoom controls */}
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                      <button
                        onClick={() =>
                          setZoom((prev) =>
                            Math.max(0.3, Number((prev - 0.1).toFixed(1))),
                          )
                        }
                        className="p-1 text-slate-300 hover:text-white rounded"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1.5 text-xs font-mono text-slate-200 min-w-[38px] text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        onClick={() =>
                          setZoom((prev) =>
                            Math.min(2.0, Number((prev + 0.1).toFixed(1))),
                          )
                        }
                        className="p-1 text-slate-300 hover:text-white rounded"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3-Part Legal Sheet Partition Selector for Regular Expense <= 1500 BDT */}
                {activeDocTab === "notesheet" &&
                  settings.pageSize === "Legal" &&
                  isRegularExpenseUnder1500 && (
                    <div className="p-2 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 font-bold text-amber-300">
                          <Scissors className="w-3.5 h-3.5 text-amber-400" />
                          {language === "bn"
                            ? "লিগ্যাল পেজ ৩-অংশে বিভাজন (১৫০০/- টাকার বিল):"
                            : "Legal Sheet 3-Part Partition (<= 1500 BDT):"}
                        </span>
                        <span className="text-slate-400 hidden sm:inline text-[11px]">
                          {language === "bn"
                            ? "যেকোনো নির্দিষ্ট ১/৩ অংশে অথবা একসাথে ৩টি কপি প্রিন্ট করতে সিলেক্ট করুন"
                            : "Select which 1/3 slot to print or print all 3"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setLegalPartition("part1")}
                          className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1 ${
                            legalPartition === "part1"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-700"
                          }`}
                          title={
                            language === "bn"
                              ? "১ম অংশ (শীর্ষ ১/৩)"
                              : "Part 1 (Top 1/3)"
                          }
                        >
                          <span>
                            {language === "bn" ? "১ম অংশ (Top)" : "Part 1"}
                          </span>
                          {legalPartition === "part1" && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setLegalPartition("part2")}
                          className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1 ${
                            legalPartition === "part2"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-700"
                          }`}
                          title={
                            language === "bn"
                              ? "২য় অংশ (মাঝের ১/৩)"
                              : "Part 2 (Middle 1/3)"
                          }
                        >
                          <span>
                            {language === "bn" ? "২য় অংশ (Middle)" : "Part 2"}
                          </span>
                          {legalPartition === "part2" && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setLegalPartition("part3")}
                          className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1 ${
                            legalPartition === "part3"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-700"
                          }`}
                          title={
                            language === "bn"
                              ? "৩য় অংশ (নিচের ১/৩)"
                              : "Part 3 (Bottom 1/3)"
                          }
                        >
                          <span>
                            {language === "bn" ? "৩য় অংশ (Bottom)" : "Part 3"}
                          </span>
                          {legalPartition === "part3" && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setLegalPartition("all3")}
                          className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1 ${
                            legalPartition === "all3"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-700"
                          }`}
                          title={
                            language === "bn"
                              ? "একই লিগ্যাল পাতায় ৩টি কপি প্রিন্ট"
                              : "Print 3 copies on 1 Legal page"
                          }
                        >
                          <span>
                            {language === "bn" ? "৩টি একসাথে" : "All 3 Copies"}
                          </span>
                          {legalPartition === "all3" && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setLegalPartition("full")}
                          className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1 ${
                            legalPartition === "full"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-700"
                          }`}
                          title={
                            language === "bn"
                              ? "সম্পূর্ণ সাধারণ পাতা"
                              : "Full Sheet"
                          }
                        >
                          <span>
                            {language === "bn" ? "সম্পূর্ণ পাতা" : "Full"}
                          </span>
                          {legalPartition === "full" && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                {/* Scrollable Stage with Paper Sheet */}
                <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/90 relative select-none">
                  {/* Virtual Paper Sheet */}
                  <div
                    ref={printContainerRef}
                    style={{
                      width: `${paperWidthPx}px`,
                      minHeight: `${paperHeightPx}px`,
                      transformOrigin: "top center",
                      fontFamily: settings.fontFamily,
                    }}
                    className="bg-white text-slate-900 shadow-2xl rounded-sm transition-all duration-150 flex flex-col relative shrink-0 border border-slate-300 mb-20"
                  >
                    {/* Margin guideline overlays (for interactive visual guidance) */}
                    {showGuidelines && (
                      <div
                        style={{
                          position: "absolute",
                          top: `${settings.margins.top * scaleRatio}px`,
                          bottom: `${settings.margins.bottom * scaleRatio}px`,
                          left: `${settings.margins.left * scaleRatio}px`,
                          right: `${settings.margins.right * scaleRatio}px`,
                          border: "1px dashed rgba(16, 185, 129, 0.45)",
                          pointerEvents: "none",
                          zIndex: 10,
                        }}
                      >
                        <span className="absolute -top-3.5 left-0 text-[8px] font-mono text-emerald-600 bg-white/80 px-1 rounded">
                          {settings.position} ({settings.margins.top}mm top) •{" "}
                          {settings.fontSizePt}pt • {settings.textAlign}
                        </span>
                      </div>
                    )}

                    {/* 3-Part Partition Virtual View for Regular Expense <= 1500 BDT on Legal Paper */}
                    {activeDocTab === "notesheet" &&
                    settings.pageSize === "Legal" &&
                    isRegularExpenseUnder1500 &&
                    legalPartition !== "full" ? (
                      <div className="w-full h-full flex flex-col box-border">
                        {/* Slot 1 (Top 1/3) */}
                        <div
                          style={{
                            height: `${paperHeightPx / 3}px`,
                            padding: `${6 * scaleRatio}px ${settings.margins.right * scaleRatio}px ${4 * scaleRatio}px ${settings.margins.left * scaleRatio}px`,
                            boxSizing: "border-box",
                            overflow: "hidden",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            background:
                              legalPartition === "part1" ||
                              legalPartition === "all3"
                                ? "#ffffff"
                                : "#fbfcfe",
                          }}
                          onClick={() => {
                            if (legalPartition !== "all3")
                              setLegalPartition("part1");
                          }}
                          className={`cursor-pointer transition-colors ${legalPartition === "part1" ? "ring-2 ring-emerald-500/50" : ""}`}
                        >
                          {legalPartition === "part1" ||
                          legalPartition === "all3" ? (
                            <div className="relative w-full">
                              <div className="absolute top-0 right-0 z-10">
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shadow-xs flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  {language === "bn"
                                    ? "১ম অংশ (প্রিন্ট হবে)"
                                    : "Part 1 (Will Print)"}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: `${Math.min(previewFontPx, 13 * zoom)}px`,
                                  lineHeight: 1.4,
                                  fontFamily: settings.fontFamily,
                                  textAlign: settings.textAlign,
                                }}
                                className="leading-relaxed text-slate-900 preview-sheet-content"
                                dangerouslySetInnerHTML={{
                                  __html: getCleanHtmlContent(),
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-250 rounded-lg p-4 bg-slate-50/60 hover:bg-emerald-50/40 transition">
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <Scissors className="w-3.5 h-3.5 text-slate-400" />
                                {language === "bn"
                                  ? "১ম অংশ (খালি রাখা হয়েছে) • এখানে প্রিন্ট করতে ক্লিক করুন"
                                  : "Part 1 (Blank) • Click to print here"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Cut Line 1 */}
                        <div
                          className="w-full relative flex items-center justify-center shrink-0"
                          style={{ height: "0px" }}
                        >
                          <div className="w-full border-b border-dashed border-slate-400"></div>
                          <span className="absolute bg-white px-2 py-0.5 text-[9px] font-mono text-slate-500 border border-slate-250 rounded flex items-center gap-1 select-none shadow-xs">
                            <Scissors className="w-2.5 h-2.5 text-amber-500" />
                            {language === "bn"
                              ? "কাটার দাগ / Cut Line (১ম ও ২য় অংশের মাঝে)"
                              : "Cut Line (Between Part 1 & 2)"}
                          </span>
                        </div>

                        {/* Slot 2 (Middle 1/3) */}
                        <div
                          style={{
                            height: `${paperHeightPx / 3}px`,
                            padding: `${6 * scaleRatio}px ${settings.margins.right * scaleRatio}px ${4 * scaleRatio}px ${settings.margins.left * scaleRatio}px`,
                            boxSizing: "border-box",
                            overflow: "hidden",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            background:
                              legalPartition === "part2" ||
                              legalPartition === "all3"
                                ? "#ffffff"
                                : "#fbfcfe",
                          }}
                          onClick={() => {
                            if (legalPartition !== "all3")
                              setLegalPartition("part2");
                          }}
                          className={`cursor-pointer transition-colors ${legalPartition === "part2" ? "ring-2 ring-emerald-500/50" : ""}`}
                        >
                          {legalPartition === "part2" ||
                          legalPartition === "all3" ? (
                            <div className="relative w-full">
                              <div className="absolute top-0 right-0 z-10">
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shadow-xs flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  {language === "bn"
                                    ? "২য় অংশ (প্রিন্ট হবে)"
                                    : "Part 2 (Will Print)"}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: `${Math.min(previewFontPx, 13 * zoom)}px`,
                                  lineHeight: 1.4,
                                  fontFamily: settings.fontFamily,
                                  textAlign: settings.textAlign,
                                }}
                                className="leading-relaxed text-slate-900 preview-sheet-content"
                                dangerouslySetInnerHTML={{
                                  __html: getCleanHtmlContent(),
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-250 rounded-lg p-4 bg-slate-50/60 hover:bg-emerald-50/40 transition">
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <Scissors className="w-3.5 h-3.5 text-slate-400" />
                                {language === "bn"
                                  ? "২য় অংশ (খালি রাখা হয়েছে) • এখানে প্রিন্ট করতে ক্লিক করুন"
                                  : "Part 2 (Blank) • Click to print here"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Cut Line 2 */}
                        <div
                          className="w-full relative flex items-center justify-center shrink-0"
                          style={{ height: "0px" }}
                        >
                          <div className="w-full border-b border-dashed border-slate-400"></div>
                          <span className="absolute bg-white px-2 py-0.5 text-[9px] font-mono text-slate-500 border border-slate-250 rounded flex items-center gap-1 select-none shadow-xs">
                            <Scissors className="w-2.5 h-2.5 text-amber-500" />
                            {language === "bn"
                              ? "কাটার দাগ / Cut Line (২য় ও ৩য় অংশের মাঝে)"
                              : "Cut Line (Between Part 2 & 3)"}
                          </span>
                        </div>

                        {/* Slot 3 (Bottom 1/3) */}
                        <div
                          style={{
                            height: `${paperHeightPx / 3}px`,
                            padding: `${6 * scaleRatio}px ${settings.margins.right * scaleRatio}px ${4 * scaleRatio}px ${settings.margins.left * scaleRatio}px`,
                            boxSizing: "border-box",
                            overflow: "hidden",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            background:
                              legalPartition === "part3" ||
                              legalPartition === "all3"
                                ? "#ffffff"
                                : "#fbfcfe",
                          }}
                          onClick={() => {
                            if (legalPartition !== "all3")
                              setLegalPartition("part3");
                          }}
                          className={`cursor-pointer transition-colors ${legalPartition === "part3" ? "ring-2 ring-emerald-500/50" : ""}`}
                        >
                          {legalPartition === "part3" ||
                          legalPartition === "all3" ? (
                            <div className="relative w-full">
                              <div className="absolute top-0 right-0 z-10">
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shadow-xs flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  {language === "bn"
                                    ? "৩য় অংশ (প্রিন্ট হবে)"
                                    : "Part 3 (Will Print)"}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: `${Math.min(previewFontPx, 13 * zoom)}px`,
                                  lineHeight: 1.4,
                                  fontFamily: settings.fontFamily,
                                  textAlign: settings.textAlign,
                                }}
                                className="leading-relaxed text-slate-900 preview-sheet-content"
                                dangerouslySetInnerHTML={{
                                  __html: getCleanHtmlContent(),
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-250 rounded-lg p-4 bg-slate-50/60 hover:bg-emerald-50/40 transition">
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <Scissors className="w-3.5 h-3.5 text-slate-400" />
                                {language === "bn"
                                  ? "৩য় অংশ (খালি রাখা হয়েছে) • এখানে প্রিন্ট করতে ক্লিক করুন"
                                  : "Part 3 (Blank) • Click to print here"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Standard Printable container simulating exact CSS @page layout */
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          paddingTop: `${(settings.position === "CUSTOM" ? settings.customTopOffset : settings.margins.top) * scaleRatio}px`,
                          paddingBottom: `${settings.margins.bottom * scaleRatio}px`,
                          paddingLeft: `${(settings.position === "CUSTOM" ? settings.customLeftOffset : settings.margins.left) * scaleRatio}px`,
                          paddingRight: `${settings.margins.right * scaleRatio}px`,
                          display: "flex",
                          flexDirection: "column",
                          boxSizing: "border-box",
                        }}
                        className="relative z-0"
                      >
                        {/* Top Spacer for Upper Middle / Center / Lower Middle / Bottom */}
                        {positionStyles.spacerTopFlex > 0 && (
                          <div
                            style={{
                              flex: positionStyles.spacerTopFlex,
                              minHeight: 0,
                            }}
                          />
                        )}

                        {/* Content Container */}
                        <div
                          style={{
                            fontSize: `${previewFontPx}px`,
                            lineHeight: settings.lineSpacing,
                            fontFamily: settings.fontFamily,
                            letterSpacing: `${(settings.letterSpacing || 0) * zoom}px`,
                            fontWeight: settings.isBold ? 700 : 400,
                            fontStyle: settings.isItalic ? "italic" : "normal",
                            textDecoration: settings.isUnderline
                              ? "underline"
                              : "none",
                            width: "100%",
                          }}
                        >
                          {/* Note Sheet Body Text & Tables */}
                          <div
                            style={{
                              textAlign: settings.textAlign,
                              textJustify:
                                settings.textAlign === "justify"
                                  ? "inter-word"
                                  : "auto",
                              textIndent: `${(settings.firstLineIndent || 0) * scaleRatio}px`,
                              marginTop: `${(settings.paragraphSpacing || 10) * 1.333333 * zoom}px`,
                              marginBottom: `${(settings.paragraphSpacing || 10) * 1.5 * 1.333333 * zoom}px`,
                            }}
                            className="leading-relaxed text-slate-900 preview-sheet-content"
                            dangerouslySetInnerHTML={{
                              __html: getCleanHtmlContent(),
                            }}
                          />

                          {/* Signature Block */}
                          {settings.includeSignatures &&
                            activeDocTab === "notesheet" &&
                            !isRegularExpenseUnder1500 &&
                            !hasInternalApproval && (
                              <div
                                style={{
                                  marginTop: `${Math.max(15, (settings.paragraphSpacing || 10) * 2.5) * 1.333333 * zoom}px`,
                                  paddingTop: `${10 * 1.333333 * zoom}px`,
                                }}
                                className="flex justify-end items-end border-t border-slate-200"
                              >
                                <div
                                  className="text-center"
                                  style={{ width: "35%" }}
                                >
                                  <div className="w-full border-b border-slate-500 mb-1.5"></div>
                                  <div
                                    className="font-bold text-slate-900"
                                    style={{ fontSize: "1em" }}
                                  >
                                    {language === "bn"
                                      ? "অনুমোদনকারী"
                                      : "Approver"}
                                  </div>
                                  <div
                                    className="text-slate-500"
                                    style={{ fontSize: "0.85em" }}
                                  >
                                    {language === "bn"
                                      ? "উপ-পরিচালক / যথাযথ কর্তৃপক্ষ"
                                      : "Authorized Signatory"}
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Bottom Spacer for Center / Upper Middle / Lower Middle */}
                        {positionStyles.spacerBottomFlex > 0 && (
                          <div
                            style={{
                              flex: positionStyles.spacerBottomFlex,
                              minHeight: 0,
                            }}
                          />
                        )}
                      </div>
                    )}

                    <style>{`
                  .preview-sheet-content,
                  .preview-sheet-content p,
                  .preview-sheet-content div {
                    font-family: inherit !important;
                    ${settings.isBold ? "font-weight: 700 !important;" : ""}
                    ${settings.isItalic ? "font-style: italic !important;" : ""}
                    ${settings.isUnderline ? "text-decoration: underline !important;" : ""}
                  }
                  .preview-sheet-content table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 6px 0 !important;
                    box-sizing: border-box !important;
                  }
                  .preview-sheet-content table.budget-provision-table,
                  .preview-sheet-content .budget-provision-table {
                    border: none !important;
                    font-size: 1em !important;
                    line-height: 1.5 !important;
                  }
                  .preview-sheet-content table.budget-provision-table td,
                  .preview-sheet-content .budget-provision-table td {
                    border: none !important;
                    font-size: 1em !important;
                    line-height: 1.5 !important;
                  }
                  .preview-sheet-content table:not(.budget-provision-table),
                  .preview-sheet-content table[border="1"],
                  .preview-sheet-content table[border="1.5"],
                  .preview-sheet-content table.quotation-bidders-table,
                  .preview-sheet-content table.forwarding-table {
                    border-collapse: collapse !important;
                    border: 1px solid #000 !important;
                  }
                  .preview-sheet-content table:not(.budget-provision-table) th,
                  .preview-sheet-content table:not(.budget-provision-table) td,
                  .preview-sheet-content table[border="1"] th,
                  .preview-sheet-content table[border="1"] td,
                  .preview-sheet-content table[border="1.5"] th,
                  .preview-sheet-content table[border="1.5"] td,
                  .preview-sheet-content table.quotation-bidders-table th,
                  .preview-sheet-content table.quotation-bidders-table td,
                  .preview-sheet-content table.forwarding-table th,
                  .preview-sheet-content table.forwarding-table td {
                    border: 1px solid #000 !important;
                  }
                  .preview-sheet-content table.quotation-bidders-table {
                    table-layout: fixed !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    font-size: 0.9em !important;
                  }
                  .preview-sheet-content table.quotation-bidders-table th {
                    padding: 3px 2px !important;
                    font-weight: 700 !important;
                    text-align: center !important;
                    vertical-align: middle !important;
                    font-size: 0.92em !important;
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                  }
                  .preview-sheet-content table.quotation-bidders-table td {
                    padding: 3px 2px !important;
                    vertical-align: middle !important;
                    font-size: 0.9em !important;
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                  }
                  .preview-sheet-content table.forwarding-table {
                    table-layout: auto !important;
                    width: 100% !important;
                    font-size: 0.95em !important;
                  }
                  .preview-sheet-content table.forwarding-table th,
                  .preview-sheet-content table.forwarding-table td {
                    padding: 3px 4px !important;
                  }
                  .preview-sheet-content .watermark-container {
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    pointer-events: none !important;
                    z-index: 0 !important;
                    user-select: none !important;
                  }
                `}</style>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
