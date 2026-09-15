import { apiFetch } from "../api";
import React, { useState, useRef } from "react";
import {
  NoteSheet,
  NoteTemplate,
  FinancialYear,
  Office,
  User,
  Category,
} from "../types";
import {
  FileText,
  Plus,
  Sparkles,
  Printer,
  Building2,
  Trash2,
  FileDown,
  Upload,
  Table as TableIcon,
  Eye,
  Save,
} from "lucide-react";
import { NoteSheetPreviewModal } from "./NoteSheetPreviewModal";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";
import { sanitizeHtml } from "../utils/sanitize";

interface NoteSheetsViewProps {
  noteSheets: NoteSheet[];
  noteTemplates: NoteTemplate[];
  financialYears: FinancialYear[];
  offices: Office[];
  categories: Category[];
  selectedFY: string;
  currentUser: User;
  onAddNoteSheet: (noteSheet: Omit<NoteSheet, "id">) => void;
  onDeleteNoteSheet: (id: string) => void;
  onAddTemplate?: (template: Omit<NoteTemplate, "id">) => void;
  isHeadOffice: boolean;
  refreshData?: () => void;
}

export function NoteSheetsView({
  noteSheets,
  noteTemplates,
  financialYears,
  offices,
  categories,
  selectedFY,
  currentUser,
  onAddNoteSheet,
  onDeleteNoteSheet,
  onAddTemplate,
  isHeadOffice,
  refreshData,
}: NoteSheetsViewProps) {
  const { t, language } = useLanguage();
  const { theme, isCustom } = useTheme();
  const isDark = theme === "dark";
  const _isLight = theme === "light";

  const [showModal, setShowModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    noteTemplates[0]?.id || "",
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [alsoSaveAsTemplate, setAlsoSaveAsTemplate] = useState(false);
  const [selectedNoteSheet, setSelectedNoteSheet] = useState<NoteSheet | null>(
    null,
  );
  const [_combinedCategoryFilter, _setCombinedCategoryFilter] =
    useState<string>("all");

  const [aiPromptCategory, setAiPromptCategory] = useState(
    categories[0]?.id || "",
  );
  const [aiPromptAmount, setAiPromptAmount] = useState("");
  const [aiPromptDesc, setAiPromptDesc] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const currentFYObj = financialYears.find((fy) => fy.id === selectedFY);
  const isFYClosed = !!currentFYObj?.isClosed;
  const currentOffice = offices.find((o) => o.id === currentUser.officeId);

  const filteredNoteSheets = noteSheets.filter((n) => {
    const matchFY = n.financialYearId === selectedFY;
    const matchOffice = isHeadOffice
      ? true
      : n.officeId === currentUser.officeId;
    return matchFY && matchOffice;
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = noteTemplates.find((t) => t.id === templateId);
    if (tmpl) {
      setTitle(tmpl.title);
      setContent(tmpl.bodyTemplate);
    }
  };

  const handleDirectDownloadWord = (ns: NoteSheet) => {
    const off = offices.find((o) => o.id === ns.officeId);
    const formattedContent =
      ns.content.includes("<p>") ||
      ns.content.includes("<table") ||
      ns.content.includes("<div>")
        ? ns.content
        : ns.content.replace(/\n/g, "<br/>");

    const wordHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${ns.title || "Note_Sheet"}</title>
        <style>
          body { font-family: 'Hind Siliguri', 'Kalpurush', 'Times New Roman', sans-serif; font-size: 12pt; line-height: 1.6; color: #000; }
          table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
          table, th, td { border: 1.5pt solid #000; }
          table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 9pt; }
          th, td { border: 1pt solid #000; padding: 4pt 3pt; vertical-align: middle; }
          th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div>${formattedContent}</div>
      </body>
      </html>
    `;
    const blob = new Blob(["\ufeff" + wordHtml], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (ns.title || "Note_Sheet").replace(
      /[^a-zA-Z0-9_\u0980-\u09FF-]/g,
      "_",
    );
    a.download = `${safeTitle}_${ns.id}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showModalPreview, setShowModalPreview] = useState(false);

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    setIsUploadingDoc(true);

    try {
      if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const res = await apiFetch("/api/parse-word-doc", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ base64, filename: file.name }),
            });

            const data = await res.json();
            if (res.ok && data.success && data.html) {
              setContent(data.html);
              if (!title) {
                setTitle(file.name.replace(/\.[^/.]+$/, ""));
              }
            } else {
              throw new Error(data.error || "Failed to parse document");
            }
          } catch (err: any) {
            console.error("Word doc parse error:", err);
            alert(
              language === "bn"
                ? `ওয়ার্ড ফাইলটি লোড করতে সমস্যা হয়েছে: ${err.message || ""}`
                : `Failed to load Word document: ${err.message || ""}`,
            );
          } finally {
            setIsUploadingDoc(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        };

        reader.onerror = () => {
          setIsUploadingDoc(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          alert(
            language === "bn"
              ? "ফাইল পড়তে সমস্যা হয়েছে।"
              : "Failed to read file.",
          );
        };

        reader.readAsDataURL(file);
      } else if (
        fileName.endsWith(".html") ||
        fileName.endsWith(".htm") ||
        fileName.endsWith(".txt")
      ) {
        const text = await file.text();
        setContent(text);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
        setIsUploadingDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert(
          language === "bn"
            ? "অনুগ্রহ করে .docx, .doc, .html বা .txt ফাইল নির্বাচন করুন।"
            : "Please select a .docx, .doc, .html or .txt file.",
        );
        setIsUploadingDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error(err);
      alert(
        language === "bn"
          ? "ওয়ার্ড ফাইলটি লোড করতে সমস্যা হয়েছে।"
          : "Failed to load Word document.",
      );
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const insertQuotationTable = () => {
    const sampleTable = `
<table border="1" cellpadding="6" style="width:100%; border-collapse: collapse; margin: 10px 0; border: 1.5px solid #000;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 8%;">ক্র/নং</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: left; width: 42%;">সরবরাহকারী / প্রতিষ্ঠানের নাম</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 25%;">উদ্ধৃত দর (টাকা)</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 25%;">মন্তব্য</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">১</td>
      <td style="border: 1px solid #000; padding: 6px;">মেসার্স করিম এন্টারপ্রাইজ</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">৪৫,০০০.০০</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #16a34a; font-weight: bold;">সর্বনিম্ন দরদাতা (L-1)</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">২</td>
      <td style="border: 1px solid #000; padding: 6px;">মেসার্স রহমান ট্রেডার্স</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">৪৮,৫০০.০০</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">২য় সর্বনিম্ন</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">৩</td>
      <td style="border: 1px solid #000; padding: 6px;">মেসার্স আল-আমিন সাপ্লাইয়ার্স</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">৫২,০০০.০০</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">৩য় সর্বনিম্ন</td>
    </tr>
  </tbody>
</table>`;
    setContent((prev) => prev + "\n" + sampleTable);
  };

  const insertDynamicBudgetTable = () => {
    setContent((prev) => prev + "\n\n{{BUDGET_TABLE}}\n\n");
  };

  const insertDynamicQuotationTable = () => {
    setContent(
      (prev) =>
        prev +
        '\n\n<p style="font-weight: bold;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>\n{{QUOTATION_TABLE}}\n\n',
    );
  };

  const insertProvisionTable = () => {
    const sampleTable = `
<table border="1" cellpadding="6" style="width:100%; border-collapse: collapse; margin: 10px 0; border: 1.5px solid #000;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 10%;">ক্র/নং</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: left; width: 45%;">বিবরণ / খাতের নাম</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 25%;">বরাদ্দ / প্রাক্কলিত ব্যয় (টাকা)</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 20%;">প্রভিশন শতকরা (%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">১</td>
      <td style="border: 1px solid #000; padding: 6px;">মূল চুক্তি মূল্য / সরবরাহ ব্যয়</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">১,০০,০০০.০০</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">১০০%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">২</td>
      <td style="border: 1px solid #000; padding: 6px;">ভ্যাট (VAT) কর্তন</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">৭,৫০০.০০</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">৭.৫%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">৩</td>
      <td style="border: 1px solid #000; padding: 6px;">আয়কর (IT) কর্তন</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">৩,০০০.০০</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">৩.০%</td>
    </tr>
    <tr style="background-color: #f8fafc; font-weight: bold;">
      <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right;">সর্বমোট প্রদেয় বিল:</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">৮৯,৫০০.০০</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
    </tr>
  </tbody>
</table>`;
    setContent((prev) => prev + "\n" + sampleTable);
  };

  const handleGenerateAI = async () => {
    if (!aiPromptAmount || !aiPromptDesc) return;
    setIsGenerating(true);
    try {
      const catObj = categories.find((c) => c.id === aiPromptCategory);
      const res = await apiFetch("/api/ai/generate-notesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryName: catObj?.name || "General Expense",
          amount: aiPromptAmount,
          description: aiPromptDesc,
          officeName: currentOffice?.name,
          financialYear: currentFYObj?.name,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setContent(data.result);
        setTitle(`Sanction Note for ${catObj?.name} - ৳ ${aiPromptAmount}`);
      }
    } catch (e) {
      console.error(e);
      alert("AI Generation failed. Please check Gemini API Key configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert(
        language === "bn"
          ? "অনুগ্রহ করে নোটশীটের একটি শিরোনাম লিখুন।"
          : "Please enter a note sheet title.",
      );
      return;
    }
    if (!content.trim()) {
      alert(
        language === "bn"
          ? "অনুগ্রহ করে নোটশীটের বিবরণ বা টেক্সট লিখুন।"
          : "Please enter note sheet content.",
      );
      return;
    }

    onAddNoteSheet({
      financialYearId: selectedFY,
      officeId: currentUser.officeId,
      title,
      content,
      status: "Generated",
      createdBy: currentUser.id,
      createdAt: new Date().toISOString().split("T")[0],
      pdfPath: `/docs/notesheet-${Date.now()}.pdf`,
    });

    if (alsoSaveAsTemplate && onAddTemplate) {
      const cat = categories[0]?.id || "all";
      onAddTemplate({
        categoryId: cat,
        title: title.includes("টেমপ্লেট") ? title : `${title} (টেমপ্লেট)`,
        bodyTemplate: content,
      });
    }

    setTitle("");
    setContent("");
    setAlsoSaveAsTemplate(false);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2
            className={`text-xl font-bold ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}
          >
            {t.noteSheetsTitle}
          </h2>
          <p
            className={`text-xs mt-0.5 ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {t.noteSheetsSubtitle} ({t.financialYear}: {currentFYObj?.name})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={isFYClosed}
            onClick={() => {
              if (noteTemplates[0]) handleTemplateChange(noteTemplates[0].id);
              setShowModal(true);
            }}
            title={isFYClosed ? "🔒 এই অর্থবছরটি ক্লোজড।" : ""}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed ${
              isCustom
                ? "bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            <Plus className="w-4 h-4" /> {t.newNoteSheet}
          </button>
        </div>
      </div>

      {isFYClosed && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            🔒 নির্বাচিত অর্থবছর ({currentFYObj?.name}) বন্ধ (Closed) করা হয়েছে।
            নতুন নোটশীট তৈরি বন্ধ রয়েছে।
          </span>
        </div>
      )}

      {/* Info Notice about Direct Digitization */}
      <div
        className={`rounded-2xl p-4 text-xs flex items-center gap-3 border ${
          isCustom
            ? "bg-[#18132e] border-[#36275d] text-purple-200"
            : isDark
              ? "bg-slate-900 border-slate-800 text-slate-200"
              : "bg-emerald-50/70 border-emerald-200/80 text-emerald-800"
        }`}
      >
        <FileText
          className={`w-5 h-5 shrink-0 ${isCustom ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600"}`}
        />
        <div>
          <strong
            className={`font-semibold block ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-emerald-900"}`}
          >
            {t.noApprovalNeeded}
          </strong>
          <span
            className={`text-xs ${isCustom ? "text-purple-300/80" : isDark ? "text-slate-400" : "text-emerald-700"}`}
          >
            {language === "bn"
              ? "ব্যয় এন্ট্রির সাথে সাথে অনুমোদিত টেমপ্লেটের ভিত্তিতে স্বয়ংক্রিয়ভাবে ডিজিটাল নোট শিট প্রস্তুত হয়। এটি সরাসরি প্রিন্ট বা পিডিএফ সংরক্ষণ করা যাবে।"
              : "Digital Note Sheets are generated automatically from budget templates upon expense entry, ready for direct print or PDF storage."}
          </span>
        </div>
      </div>

      {/* Note Sheets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNoteSheets.length === 0 ? (
          <div
            className={`col-span-full p-8 rounded-2xl border text-center text-xs ${
              isCustom
                ? "bg-[#140f29] border-[#2e234e] text-purple-300/60"
                : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-500"
                  : "bg-white border-slate-200 text-slate-400"
            }`}
          >
            {language === "bn"
              ? "এই অর্থবছরের জন্য কোনো নোট শিট তৈরি হয়নি।"
              : "No Note Sheets found for this Financial Year."}
          </div>
        ) : (
          filteredNoteSheets.map((ns) => {
            const off = offices.find((o) => o.id === ns.officeId);
            return (
              <div
                key={ns.id}
                className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-between transition ${
                  isCustom
                    ? "bg-[#16112c] border-[#2e234e] hover:border-[#43356e] text-purple-100"
                    : isDark
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border font-mono ${
                        isCustom
                          ? "bg-[#251d45] border-[#473775] text-amber-300"
                          : isDark
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                            : "bg-emerald-100 border-emerald-200 text-emerald-800"
                      }`}
                    >
                      {t.generatedDirectly}
                    </span>
                    <span
                      className={`text-xs font-mono ${isCustom ? "text-purple-300/60" : isDark ? "text-slate-500" : "text-slate-400"}`}
                    >
                      {ns.createdAt}
                    </span>
                  </div>

                  <h3
                    className={`font-bold text-sm mb-1 line-clamp-1 ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-800"}`}
                  >
                    {ns.title}
                  </h3>
                  <p
                    className={`text-xs line-clamp-3 mb-4 font-serif leading-relaxed p-2.5 rounded-xl border ${
                      isCustom
                        ? "bg-[#1c1636] border-[#312554] text-purple-200/80"
                        : isDark
                          ? "bg-slate-950 border-slate-800 text-slate-300"
                          : "bg-slate-50 border-slate-100 text-slate-600"
                    }`}
                  >
                    {ns.content}
                  </p>
                </div>

                <div>
                  <div
                    className={`flex items-center gap-1.5 text-xs mb-3 ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{off?.name || "Global Office"}</span>
                  </div>

                  <div
                    className={`flex items-center justify-between border-t pt-3 gap-2 ${
                      isCustom
                        ? "border-[#2b1f4d]"
                        : isDark
                          ? "border-slate-800"
                          : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedNoteSheet(ns)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition border ${
                          isCustom
                            ? "bg-[#251c45] hover:bg-[#32255e] text-amber-300 border-[#473775]"
                            : isDark
                              ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                        }`}
                        title={
                          language === "bn"
                            ? "প্রিন্ট প্রিভিউ ও লেআউট সেটআপ"
                            : "Print Preview & Layout"
                        }
                      >
                        <Printer className="w-3.5 h-3.5" /> {t.printPdf}
                      </button>

                      <button
                        onClick={() => handleDirectDownloadWord(ns)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition border ${
                          isCustom
                            ? "bg-[#1e173d] hover:bg-[#281e4f] text-blue-300 border-[#3b2c69]"
                            : isDark
                              ? "bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        }`}
                        title={
                          language === "bn"
                            ? "মাইক্রোসফট ওয়ার্ড (.doc) ফাইল ডাউনলোড"
                            : "Download Word (.doc)"
                        }
                      >
                        <FileDown className="w-3.5 h-3.5 text-blue-500" />
                        <span className="hidden sm:inline">Word (.doc)</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onDeleteNoteSheet(ns.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Note Sheet Preview Modal */}
      {selectedNoteSheet && (
        <NoteSheetPreviewModal
          noteSheet={selectedNoteSheet}
          categories={categories}
          officeName={
            offices.find((o) => o.id === selectedNoteSheet.officeId)?.name
          }
          onClose={() => setSelectedNoteSheet(null)}
          currentUser={currentUser}
          onUpdateNoteSheet={refreshData}
        />
      )}

      {/* Create Note Sheet Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-3xl w-full p-6 shadow-2xl border animate-in fade-in zoom-in-95 duration-150 flex-shrink-0 ${
              isCustom
                ? "bg-[#18132e] text-purple-100 border-[#382b61]"
                : isDark
                  ? "bg-slate-900 text-slate-100 border-slate-700"
                  : "bg-white text-slate-900 border-slate-200"
            }`}
          >
            <div
              className={`flex justify-between items-center pb-3 border-b mb-4 shrink-0 ${
                isCustom
                  ? "border-[#302452]"
                  : isDark
                    ? "border-slate-800"
                    : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isCustom
                      ? "bg-purple-900/50 text-amber-400"
                      : isDark
                        ? "bg-emerald-950 text-emerald-400"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold">{t.newNoteSheet}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition text-white ${
                    isCustom
                      ? "bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 ring-2 ring-amber-500/30"
                      : "bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-500/30"
                  }`}
                  title={t.save}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Template Selector & Word Upload */}
            <div
              className={`mb-4 p-3 rounded-xl border space-y-3 ${
                isCustom
                  ? "bg-[#20183b] border-[#382b61]"
                  : isDark
                    ? "bg-slate-950/60 border-slate-800"
                    : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="w-full sm:flex-1">
                  <label
                    className={`block text-xs font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    {t.templateSelect}
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className={`w-full text-xs rounded-lg p-2 focus:outline-none border ${
                      isCustom
                        ? "bg-[#16102b] border-[#382b61] text-purple-100"
                        : isDark
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900"
                    }`}
                  >
                    {noteTemplates.map((tmpl) => (
                      <option
                        key={tmpl.id}
                        value={tmpl.id}
                        className="text-slate-900 bg-white"
                      >
                        {tmpl.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-0 sm:pt-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleDocxUpload}
                    accept=".docx,.doc,.html,.htm,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingDoc
                      ? language === "bn"
                        ? "আপলোড হচ্ছে..."
                        : "Uploading..."
                      : language === "bn"
                        ? "Word (.docx) আপলোড"
                        : "Upload Word (.docx)"}
                  </button>
                </div>
              </div>

              {/* Sample Table Insert Tools */}
              <div
                className={`pt-2 border-t flex items-center gap-2 flex-wrap text-xs ${
                  isCustom
                    ? "border-[#302452]"
                    : isDark
                      ? "border-slate-800"
                      : "border-slate-200/80"
                }`}
              >
                <span
                  className={`text-xs font-semibold ${isCustom ? "text-purple-300/80" : isDark ? "text-slate-400" : "text-slate-600"}`}
                >
                  {language === "bn" ? "স্বয়ংক্রিয় ও নমুনা ছক:" : "Tables:"}
                </span>
                <button
                  type="button"
                  onClick={insertDynamicBudgetTable}
                  className={`px-2.5 py-1 border rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                    isCustom
                      ? "bg-[#291f4d] border-[#55408a] text-purple-200 hover:bg-[#352863]"
                      : isDark
                        ? "bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-750"
                        : "bg-teal-50 hover:bg-teal-100 border-teal-300 text-teal-800"
                  }`}
                  title={
                    language === "bn"
                      ? "স্বয়ংক্রিয় বাজেট, অতিরিক্ত বরাদ্দ ও প্রোভিশন হিসাব ছক ({{BUDGET_TABLE}})"
                      : "Dynamic Auto Budget Table"
                  }
                >
                  <TableIcon className="w-3.5 h-3.5 text-teal-600" />
                  {language === "bn"
                    ? "★ স্বয়ংক্রিয় বাজেট ছক"
                    : "★ Auto Budget Table"}
                </button>
                <button
                  type="button"
                  onClick={insertDynamicQuotationTable}
                  className={`px-2.5 py-1 border rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                    isCustom
                      ? "bg-[#291f4d] border-[#55408a] text-amber-300 hover:bg-[#352863]"
                      : isDark
                        ? "bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-750"
                        : "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800"
                  }`}
                  title={
                    language === "bn"
                      ? "স্বয়ংক্রিয় দরদাতা তুলনা ছক ({{QUOTATION_TABLE}})"
                      : "Dynamic Quotation Comparison Table"
                  }
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
                  {language === "bn"
                    ? "★ স্বয়ংক্রিয় দরদাতা ছক"
                    : "★ Auto Quotation Table"}
                </button>
                <button
                  type="button"
                  onClick={insertQuotationTable}
                  className={`px-2 py-1 border rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                    isCustom
                      ? "bg-[#20183b] border-[#382b61] text-purple-300 hover:bg-[#281e4d]"
                      : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                        : "bg-white hover:bg-slate-100 border-slate-300 text-slate-600"
                  }`}
                >
                  {language === "bn" ? "নমুনা উদ্ধৃতি" : "Sample Quotation"}
                </button>
                <button
                  type="button"
                  onClick={insertProvisionTable}
                  className={`px-2 py-1 border rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                    isCustom
                      ? "bg-[#20183b] border-[#382b61] text-purple-300 hover:bg-[#281e4d]"
                      : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                        : "bg-white hover:bg-slate-100 border-slate-300 text-slate-600"
                  }`}
                >
                  {language === "bn" ? "নমুনা প্রভিশন" : "Sample Provision"}
                </button>
              </div>
            </div>

            {/* AI Assistant Generator */}
            <div
              className={`mb-4 p-4 rounded-xl border space-y-3 ${
                isCustom
                  ? "bg-[#241a45] border-[#47347a]"
                  : isDark
                    ? "bg-slate-850 border-slate-750 text-slate-200"
                    : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 text-emerald-900"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Sparkles
                  className={`w-4 h-4 ${isCustom ? "text-amber-400" : "text-emerald-500"}`}
                />
                <span>AI Note Sheet Draft Assistant</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={aiPromptCategory}
                  onChange={(e) => setAiPromptCategory(e.target.value)}
                  className={`text-xs rounded-lg p-2 focus:outline-none border ${
                    isCustom
                      ? "bg-[#181230] border-[#3b2d63] text-purple-100"
                      : isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-emerald-200 text-slate-900"
                  }`}
                >
                  {categories.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="text-slate-900 bg-white"
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount (e.g. 50000)"
                  value={aiPromptAmount}
                  onChange={(e) => setAiPromptAmount(e.target.value)}
                  className={`text-xs rounded-lg p-2 focus:outline-none border ${
                    isCustom
                      ? "bg-[#181230] border-[#3b2d63] text-purple-100 placeholder-purple-300/40"
                      : isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-white border-emerald-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Purpose / Description"
                  value={aiPromptDesc}
                  onChange={(e) => setAiPromptDesc(e.target.value)}
                  className={`text-xs rounded-lg p-2 focus:outline-none border ${
                    isCustom
                      ? "bg-[#181230] border-[#3b2d63] text-purple-100 placeholder-purple-300/40"
                      : isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-white border-emerald-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating || !aiPromptAmount || !aiPromptDesc}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold shadow disabled:opacity-50 transition flex items-center justify-center gap-1 text-white ${
                  isCustom
                    ? "bg-purple-700 hover:bg-purple-600"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating ? "Generating..." : "Generate AI Note Sheet"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  {t.subjectTitle} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full text-xs rounded-xl p-2.5 focus:outline-none border ${
                    isCustom
                      ? "bg-[#181230] border-[#382b61] text-purple-100 focus:border-amber-400"
                      : isDark
                        ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500"
                        : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                  }`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    className={`block text-xs font-semibold ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    {t.bodyContent} *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowModalPreview(false)}
                      className={`px-2 py-0.5 text-xs rounded font-medium transition ${
                        !showModalPreview
                          ? isCustom
                            ? "bg-purple-700 text-white font-bold"
                            : isDark
                              ? "bg-emerald-600 text-white font-bold"
                              : "bg-emerald-100 text-emerald-800 font-bold"
                          : isCustom
                            ? "text-purple-300 hover:text-white"
                            : isDark
                              ? "text-slate-400 hover:text-slate-200"
                              : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {language === "bn" ? "এডিটর" : "Editor"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModalPreview(true)}
                      className={`px-2 py-0.5 text-xs rounded font-medium flex items-center gap-1 transition ${
                        showModalPreview
                          ? isCustom
                            ? "bg-purple-700 text-white font-bold"
                            : isDark
                              ? "bg-emerald-600 text-white font-bold"
                              : "bg-emerald-100 text-emerald-800 font-bold"
                          : isCustom
                            ? "text-purple-300 hover:text-white"
                            : isDark
                              ? "text-slate-400 hover:text-slate-200"
                              : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      {language === "bn" ? "প্রিভিউ" : "Preview"}
                    </button>
                  </div>
                </div>

                {!showModalPreview ? (
                  <textarea
                    required
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      language === "bn"
                        ? "নোটশীটের বিবরণ অথবা HTML কোড লিখুন বা Word ফাইল আপলোড করুন..."
                        : "Enter note sheet body or HTML..."
                    }
                    className={`w-full text-xs font-mono leading-relaxed rounded-xl p-3 focus:outline-none border ${
                      isCustom
                        ? "bg-[#181230] border-[#382b61] text-purple-100 focus:border-amber-400"
                        : isDark
                          ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500"
                          : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-full min-h-[160px] max-h-[300px] overflow-y-auto border rounded-xl p-4 text-xs ${
                      isCustom
                        ? "bg-[#181230] border-[#382b61] text-purple-100"
                        : isDark
                          ? "bg-slate-950 border-slate-700 text-slate-100"
                          : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  >
                    <div
                      className="preview-content-box"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(
                          content.includes("<p>") ||
                            content.includes("<table") ||
                            content.includes("<div>")
                            ? content
                            : content.replace(/\n/g, "<br/>"),
                        ),
                      }}
                    />
                    <style>{`
                      .preview-content-box table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0;
                        border: 1.5px solid #000;
                      }
                      .preview-content-box th, .preview-content-box td {
                        border: 1px solid #000;
                        padding: 4px 6px;
                      }
                      .preview-content-box th {
                        background-color: #f1f5f9;
                        font-weight: bold;
                        text-align: center;
                      }
                    `}</style>
                  </div>
                )}
              </div>

              <div
                className={`flex flex-wrap justify-between items-center gap-3 pt-3 border-t ${
                  isCustom
                    ? "border-[#302452]"
                    : isDark
                      ? "border-slate-800"
                      : "border-slate-200"
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={alsoSaveAsTemplate}
                    onChange={(e) => setAlsoSaveAsTemplate(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span
                    className={
                      isCustom
                        ? "text-purple-200"
                        : isDark
                          ? "text-slate-300"
                          : "text-slate-700"
                    }
                  >
                    {language === "bn"
                      ? "ভবিষ্যতে ব্যবহারের জন্য এটি 'নোট টেমপ্লেট' হিসেবেও সংরক্ষণ করুন"
                      : "Also save as reusable 'Note Template'"}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 text-xs rounded-xl font-medium ${
                      isCustom
                        ? "text-purple-300 hover:bg-[#281e4d]"
                        : isDark
                          ? "text-slate-400 hover:bg-slate-800"
                          : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-xs text-white rounded-xl font-semibold shadow transition flex items-center gap-1.5 ${
                      isCustom
                        ? "bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500"
                        : "bg-emerald-600 hover:bg-emerald-500"
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {t.save}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
