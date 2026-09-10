import { apiFetch } from "../api";
import React, { useState, useRef } from "react";
import { NoteTemplate, Category } from "../types";
import { 
  FileText, 
  Save, 
  Edit, 
  Trash2, 
  Upload, 
  Table as TableIcon, 
  Eye, 
  Code, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Plus,
  X
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";
import { sanitizeHtml } from "../utils/sanitize";
import JoditEditor from "jodit-react";

// Available Bengali and English font list for Jodit
const JODIT_FONT_LIST: Record<string, string> = {
  "'Hind Siliguri', 'Kalpurush', sans-serif": "হিন্দ শিলিগুড়ি (Hind Siliguri)",
  "'Kalpurush', 'Hind Siliguri', serif": "কালপুরুষ (Kalpurush)",
  "'SolaimanLipi', 'Hind Siliguri', sans-serif": "সোলায়মান লিপি (SolaimanLipi)",
  "'Times New Roman', 'Hind Siliguri', serif": "টাইমস নিউ রোমান (Times New Roman)",
  "'Arial', 'Hind Siliguri', sans-serif": "এরিয়াল (Arial)",
  "'Georgia', 'Kalpurush', serif": "জর্জিয়া (Georgia)",
  "'Courier New', monospace": "মনোস্পেস (Courier New)",
  "Hind Siliguri": "হিন্দ শিলিগুড়ি",
  "Kalpurush": "কালপুরুষ",
  "SolaimanLipi": "সোলায়মান লিপি",
  "Times New Roman": "Times New Roman",
  "Arial": "Arial",
  "Georgia": "Georgia",
  "Courier New": "Courier New",
};

const JODIT_FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72];

interface NoteTemplatesViewProps {
  noteTemplates: NoteTemplate[];
  categories: Category[];
  onAddTemplate: (template: Omit<NoteTemplate, "id">) => void;
  onUpdateTemplate: (id: string, template: Partial<NoteTemplate>) => void;
  onDeleteTemplate: (id: string) => void;
}

// Sample Table 1: প্রাপ্ত দরপত্র সমূহের বিবরণ (Comparative Quotation Table from image)
export const SAMPLE_QUOTATION_TABLE_HTML = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1.5px solid #000; font-size: inherit;">
  <thead>
    <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #000;">
      <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 8%;">ক্রম</th>
      <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 26%;">পণ্যের বিবরণ</th>
      <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 34%;">দরপত্র দাতা প্রতিষ্ঠানের নাম</th>
      <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 20%;">ভ্যাট এবং পরিবহন ও ফিটিং চার্জসহ মোট মূল্য</th>
      <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 12%;">মন্তব্য</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">০১</td>
      <td style="border: 1px solid #000; padding: 6px 8px; vertical-align: top;">
        টেবিল টপ গ্লাস<br/>
        (সাইজ-৫*৩ ফুট)<br/>
        সংখ্যা-০২<br/>
        পুরুত্ব : ১০ মিমি.<br/>
        ব্র্যান্ড : পিএইচপি
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">
        জননী গ্লাস এজেন্সী ,<br/>
        বনরুপা , রাঙ্গামাটি ।
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: bold;">
        = ৮,৯৬৩/-
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">
        সর্বনিম্ন দরদাতা
      </td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">০২</td>
      <td style="border: 1px solid #000; padding: 6px 8px; vertical-align: top;">
        টেবিল টপ গ্লাস<br/>
        (সাইজ-৫*৩ ফুট)<br/>
        সংখ্যা-০২<br/>
        পুরুত্ব : ১০ মিমি.<br/>
        ব্র্যান্ড : পিএইচপি
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">
        মায়ের দোয়া গ্লাস এন্ড থাই এ্যালুমিনিয়াম,<br/>
        ফিসারীঘাট , শান্তিনগর, রাঙ্গামাটি
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: bold;">
        = ৯,৩৮৫/-
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">
        ২য় সর্বোচ্চ দরদাতা
      </td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">০৩</td>
      <td style="border: 1px solid #000; padding: 6px 8px; vertical-align: top;">
        টেবিল টপ গ্লাস<br/>
        (সাইজ-৫*৩ ফুট)<br/>
        সংখ্যা-০২<br/>
        পুরুত্ব : ১০ মিমি.<br/>
        ব্র্যান্ড : পিএইচপি
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">
        আজমীর গ্লাস এন্ড থাই এ্যালুমিনিয়াম,<br/>
        রিজার্ভ বাজার , রাঙ্গামাটি
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: bold;">
        = ১০,০৩০/-
      </td>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">
        সর্বোচ্চ দরদাতা
      </td>
    </tr>
  </tbody>
</table>`;

// Sample Table 2: বাজেট ও প্রোভিশন হিসাব বিবরণী (Financial Provision & Calculation Summary Table from image)
export const SAMPLE_PROVISION_TABLE_HTML = `<table style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: inherit;">
  <tbody>
    <tr>
      <td style="padding: 4px 8px; text-align: right; padding-right: 12px; white-space: nowrap;">আসবাবপত্র ও সাজসরঞ্জাম (১৩৪/০১) খাতে ২০২৩-২০২৪ অর্থ বছরে সংরক্ষিত প্রোভিশন</td>
      <td style="padding: 4px 8px; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ২,২০,৫১৮/-</td>
    </tr>
    <tr>
      <td style="padding: 4px 8px; text-align: right; padding-right: 12px; white-space: nowrap;">অত্র খরচসহ সর্বমোট খরচের পরিমাণ</td>
      <td style="padding: 4px 8px; text-align: right; width: 1%; font-weight: 600; border-bottom: 1.5px solid #000; white-space: nowrap;">= ৮,৯৬৩/-</td>
    </tr>
    <tr>
      <td style="padding: 6px 8px; text-align: right; padding-right: 12px; font-weight: bold; white-space: nowrap;">এ খাতে সংরক্ষিত অবশিষ্ট প্রোভিশন</td>
      <td style="padding: 6px 8px; text-align: right; width: 1%; font-weight: bold; border-bottom: 3px double #000; white-space: nowrap;">= ২,১১,৫৫৫/-</td>
    </tr>
  </tbody>
</table>`;

export function NoteTemplatesView({
  noteTemplates,
  categories,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate
}: NoteTemplatesViewProps) {
  const { language } = useLanguage();
  const { theme, isCustom } = useTheme();
  const isDark = theme === "dark";

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [activeEditorTab, setActiveEditorTab] = useState<"edit" | "preview">("edit");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  const openNew = () => {
    setEditingId(null);
    setCategoryId(categories[0]?.id || "");
    setTitle("");
    setBodyTemplate("");
    setActiveEditorTab("edit");
    setUploadStatus(null);
    setShowModal(true);
  };

  const openEdit = (t: NoteTemplate) => {
    setEditingId(t.id);
    setCategoryId(t.categoryId);
    setTitle(t.title);
    setBodyTemplate(t.bodyTemplate);
    setActiveEditorTab("edit");
    setUploadStatus(null);
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        // Read file as base64 and send to server parser with Mammoth
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const res = await apiFetch("/api/parse-word-doc", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ base64, filename: file.name })
            });
            const data = await res.json();
            if (data.success && data.html) {
              setBodyTemplate(prev => prev ? `${prev}\n\n${data.html}` : data.html);
              if (!title) {
                setTitle(file.name.replace(/\.[^/.]+$/, ""));
              }
              setUploadStatus(language === "bn" ? "ওয়ার্ড ডকুমেন্টের টেবিল ও টেক্সট সফলভাবে আপলোড হয়েছে!" : "Word document & tables uploaded successfully!");
            } else {
              throw new Error(data.error || "Failed to parse document");
            }
          } catch (err: any) {
            console.error("Docx parse error:", err);
            setUploadStatus(language === "bn" ? `ডকুমেন্ট পার্সিংয়ে সমস্যা: ${err.message}` : `Error parsing doc: ${err.message}`);
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } else if (fileName.endsWith(".html") || fileName.endsWith(".htm") || fileName.endsWith(".txt")) {
        const text = await file.text();
        setBodyTemplate(prev => prev ? `${prev}\n\n${text}` : text);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
        setUploadStatus(language === "bn" ? "ফাইল সফলভাবে লোড হয়েছে!" : "File loaded successfully!");
        setIsUploading(false);
      } else {
        alert(language === "bn" ? "অনুগ্রহ করে .docx, .doc, .html বা .txt ফাইল নির্বাচন করুন।" : "Please select a .docx, .doc, .html or .txt file.");
        setIsUploading(false);
      }
    } catch (err: any) {
      console.error(err);
      setUploadStatus(language === "bn" ? "ফাইল আপলোড ব্যর্থ হয়েছে।" : "File upload failed.");
      setIsUploading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const executeSave = () => {
    let finalBody = bodyTemplate;
    if (editorRef.current) {
      if (typeof editorRef.current.value === "string") {
        finalBody = editorRef.current.value;
      } else if (typeof editorRef.current.getEditorValue === "function") {
        finalBody = editorRef.current.getEditorValue();
      }
    }

    if (!categoryId) {
      alert(language === "bn" ? "অনুগ্রহ করে ব্যয়ের খাত / ক্যাটাগরি নির্বাচন করুন।" : "Please select an expense category.");
      return;
    }
    if (!title || !title.trim()) {
      alert(language === "bn" ? "অনুগ্রহ করে টেমপ্লেটের নাম / শিরোনাম লিখুন।" : "Please enter a template title.");
      return;
    }
    if (!finalBody || !finalBody.trim()) {
      alert(language === "bn" ? "অনুগ্রহ করে টেমপ্লেটের বিষয়বস্তু বা টেক্সট লিখুন।" : "Please enter template body content.");
      return;
    }

    if (editingId) {
      onUpdateTemplate(editingId, { categoryId, title: title.trim(), bodyTemplate: finalBody });
    } else {
      onAddTemplate({ categoryId, title: title.trim(), bodyTemplate: finalBody });
    }
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave();
  };

const FORM1_FULL_DRAFT_HTML = `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
  <div style="font-weight: bold; margin-bottom: 24px; text-align: center;">
    বিষয়ঃ- {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} ক্রয়ের বিল প্রদান প্রসঙ্গে।
  </div>
  
  <p>
    {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} সরবরাহের নিমিত্তে “অফ দ্যা সেল্ফ ক্রয়” পদ্ধতিতে স্থানীয় ভাবে {{TOTAL_BIDDERS_COUNT}} টি প্রতিষ্ঠানের দরপত্র সংগ্রহ করতঃ সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে {{TAX_VAT_TEXT}} = {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র মূল্যে উক্ত পণ্য সমূহ ক্রয় করা হয়।
  </p>
  
  <p style="margin-bottom: 8px;"><strong>প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</strong></p>
  
  {{QUOTATION_TABLE}}
  
  <p>
    উক্ত {{TOTAL_BIDDERS_COUNT}} টি দরপত্রের মধ্যে '{{LOWEST_BIDDER_NAME}}' কর্তৃক {{ITEMS_DESCRIPTION}} সরবরাহের জন্য {{TAX_VAT_TEXT}} সর্বনিম্ন দর = {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা প্রদান করায় উক্ত কাজের কার্যাদেশ দেয়া হয়।
  </p>
  
  <p>
    এমতাবস্থায়, {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} সরবরাহ বাবদ {{TAX_VAT_TEXT}} = {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র খরচের বিষয়টি {{APPLICANT_DESIGNATION}}, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} এর আর্থিক সম্মতি গ্রহণপূর্বক {{TAX_VAT_TEXT}} সর্বমোট = {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র বিলের অর্থ প্রদানের অনুমোদন দেয়া যেতে পারে।
  </p>
  
  {{BUDGET_TABLE}}
  
  <div style="margin-top: 15px; margin-bottom: 0px; display: flex; justify-content: flex-end;">
    <div style="text-align: center; min-width: 170px; display: inline-block;">
      <div style="height: 45px;"></div>
      <div style="border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">
        প্রস্তুতকারী কর্মকর্তা
      </div>
      <div style="font-size: 0.85em; color: #444; font-family: monospace;">
        {{ENTRY_OFFICER}}
      </div>
    </div>
  </div>
  
  <div class="audit-approval-section">
    <p style="margin-top: 15px;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহণের নিমিত্তে নথি আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} বরাবরে প্রেরণ করুন।</p>
    <p style="margin-top: 15px;"><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} সরবরাহ বাবদ {{TAX_VAT_TEXT}} সর্বমোট = {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</p>
    <p style="margin-top: 15px;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</p>
  </div>
</div>`;

  const REGULAR_EXPENSE_DRAFT_HTML = `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 12pt; line-height: 1.6; text-align: justify;">
  <div style="text-align: center; font-weight: bold; margin-bottom: 8pt;">
    (পাতা-{{PAGE_NO}})
  </div>
  <div style="font-weight: bold; margin-bottom: 16pt; text-align: center; text-decoration: underline;">
    বিষয়ঃ {{CATEGORY_NAME}} খাতের {{DESCRIPTION}} বিল পরিশোধ প্রসঙ্গে ।
  </div>
  
  <p style="text-indent: 40px; margin-bottom: 10pt;">
    অত্র কার্যালয়ের/অঞ্চলের জন্য {{DESCRIPTION}} আনায়ন/ক্রয় বাবদ {{VAT_LABEL}} ও {{TAX_LABEL}}সহ সর্বমোট ৳={{EXPENSE_AMOUNT}} ({{AMOUNT_IN_WORDS}}) টাকা মাত্র খরচের ভাউচারসহকারে খরচকৃত অর্থ প্রাপ্তির জন্য অত্র কার্যালয়ের {{APPLICANT_DESIGNATION}}, জনাব {{APPLICANT_NAME}} কর্তৃক একখানা আবেদন দাখিল করা হয়। তাঁর আবেদন সঠিক পরিলক্ষিত হওয়ায় ৳={{AMOUNT_WITH_WORDS}} টাকা মাত্র {{PAYMENT_TYPE}} প্রদানের অনুমোদন দেয়া যেতে পারে।
  </p>

  {{BUDGET_TABLE}}
  
  <div style="margin-top: 15pt; margin-bottom: 0pt; display: flex; justify-content: flex-end;">
    <div style="text-align: center; min-width: 170pt; display: inline-block;">
      <div style="height: 35pt;"></div>
      <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
        প্রস্তুতকারী কর্মকর্তা
      </div>
      <div style="font-size: 0.85em; color: #444; font-family: monospace;">
        {{ENTRY_OFFICER}}
      </div>
    </div>
  </div>
  
  <div class="audit-approval-section" style="margin-top: 20pt; display: flex; flex-direction: column; gap: 20pt;">
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা খরচের আর্থিক সম্মতির গ্রহনের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} বরাবরে নথি প্রেরণ করুন।</div>
    <div><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> {{OFFICE_NAME}} এর জন্য {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</div>
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>
</div>`;

  const insertPlaceholder = (ph: string) => {
    setBodyTemplate(prev => prev + ` {{${ph}}} `);
  };

  const insertForm1FullDraft = () => {
    setBodyTemplate(FORM1_FULL_DRAFT_HTML);
  };

  const insertRegularExpenseDraft = () => {
    setBodyTemplate(REGULAR_EXPENSE_DRAFT_HTML);
  };

  const insertDynamicQuotationTable = () => {
    setBodyTemplate(prev => prev + `\n\n<p style="margin-bottom: 5pt; font-weight: bold; text-decoration: underline;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>\n{{QUOTATION_TABLE}}\n\n`);
  };

  const insertDynamicBudgetTable = () => {
    setBodyTemplate(prev => prev + `\n\n{{BUDGET_TABLE}}\n\n`);
  };

  const insertQuotationTable = () => {
    setBodyTemplate(prev => prev + `\n\n<p><strong>প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</strong></p>\n` + SAMPLE_QUOTATION_TABLE_HTML + `\n\n`);
  };

  const insertProvisionTable = () => {
    setBodyTemplate(prev => prev + `\n\n` + SAMPLE_PROVISION_TABLE_HTML + `\n\n`);
  };

  const insertCustomTable = () => {
    const customTable = `<table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000; font-size: inherit;">
  <thead>
    <tr style="background-color: #f8fafc; border-bottom: 1px solid #000;">
      <th style="border: 1px solid #000; padding: 6px; text-align: center;">ক্রম</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: center;">বিবরণ</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: center;">পরিমাণ</th>
      <th style="border: 1px solid #000; padding: 6px; text-align: right;">টাকা</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">০১</td>
      <td style="border: 1px solid #000; padding: 6px;">{{DESCRIPTION}}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: center;">০১ টি</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">{{AMOUNT}}/-</td>
    </tr>
  </tbody>
</table>`;
    setBodyTemplate(prev => prev + `\n\n` + customTable + `\n\n`);
  };

  const placeholderGroups = [
    {
      groupNameBn: "⚡ স্মার্ট স্বয়ংক্রিয় ছক (যেকোনো ব্যয় নোটের জন্য প্রযোজ্য)",
      groupNameEn: "⚡ Smart Auto Tables (Universal for All Notes)",
      isPrimary: true,
      items: [
        { 
          key: "BUDGET_TABLE", 
          labelBn: "📊 স্বয়ংক্রিয় বাজেট ও প্রোভিশন ছক", 
          descBn: "খাত অনুযায়ী মূল বরাদ্দ, অতিরিক্ত বরাদ্দ, সর্বমোট বাজেট, পূর্বের খরচ, বর্তমান বিল ও অবশিষ্ট বাজেট স্থিতি স্বয়ংক্রিয়ভাবে ছকে রূপান্তর করে।" 
        },
        { 
          key: "QUOTATION_TABLE", 
          labelBn: "📑 স্বয়ংক্রিয় তুলনামূলক দরপত্র ছক", 
          descBn: "একক বা একাধিক পণ্য ও ৩টি দরদাতা প্রতিষ্ঠানের বিস্তারিত দর তালিকা স্বয়ংক্রিয়ভাবে ছকে রূপান্তর করে।" 
        },
        { 
          key: "AUDIT_APPROVAL_SECTION", 
          labelBn: "🏛️ আঞ্চলিক নিরীক্ষা ও ব্যবস্থাপক অনুমোদন প্যারা (শর্তাধীন)", 
          descBn: "ভ্যাট ও ট্যাক্সসহ মোট বিল ১৫০০ টাকার বেশি হলে আঞ্চলিক ব্যবস্থাপক ও নিরীক্ষা কর্মকর্তার ৩টি প্যারা স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে, এবং ১৫০০ টাকার মধ্যে হলে স্বয়ংক্রিয়ভাবে বাদ যাবে।" 
        },
      ]
    },
    {
      groupNameBn: "📝 নিয়মিত ব্যয়ের বিবরণ ও পরিশোধ (চিত্রের ট্যাগসমূহ)",
      groupNameEn: "📝 Regular Expense Details (From Screenshot)",
      isHighlighted: true,
      items: [
        { key: "DESCRIPTION", labelBn: "ব্যয়ের বিবরণ / বর্ণনা", descBn: "যেমন: প্রকা হতে সুন্দরবন কুরিয়ার সার্ভিসের মাধ্যমে ২০২৬ সনের ক্যালেন্ডার ও ডায়েরী" },
        { key: "EXPENSE_AMOUNT", labelBn: "টাকার অংক (/- সহ)", descBn: "যেমন চিত্রে: ১৩,৭৫০/-" },
        { key: "AMOUNT_IN_WORDS", labelBn: "কথায় টাকার পরিমাণ", descBn: "যেমন চিত্রে: তের হাজার সাতশত পঞ্চাশ" },
        { key: "AMOUNT_WITH_WORDS", labelBn: "টাকা ও কথায় একসাথে", descBn: "যেমন চিত্রে: ১৩,৭৫০/- (তের হাজার সাতশত পঞ্চাশ)" },
        { key: "VAT_LABEL", labelBn: "ভ্যাট শব্দ", descBn: "যেমন চিত্রে: ভ্যাট" },
        { key: "TAX_LABEL", labelBn: "ট্যাক্স শব্দ", descBn: "যেমন চিত্রে: ট্যাক্স" },
        { key: "VAT_TEXT", labelBn: "ভ্যাট হার টেক্সট", descBn: "যেমন চিত্রে: ১৫% ভ্যাট" },
        { key: "TAX_TEXT", labelBn: "ট্যাক্স হার টেক্সট", descBn: "যেমন চিত্রে: ১০% ট্যাক্স" },
        { key: "TAX_VAT_TEXT", labelBn: "একত্রিত ভ্যাট ও ট্যাক্স", descBn: "যেমন: ১৫% ভ্যাট ও ১০% ট্যাক্সসহ" },
        { key: "PAYMENT_TYPE", labelBn: "পরিশোধ পদ্ধতি", descBn: "যেমন চিত্রে: নগদে / চেকে" },
        { key: "PAGE_NO", labelBn: "পাতা নম্বর", descBn: "যেমন চিত্রে: (পাতা-৪১৯)" },
        { key: "APPLICANT_NAME", labelBn: "আবেদনকারীর নাম", descBn: "যেমন চিত্রে: স্বপ্নীল দেওয়ান" },
        { key: "APPLICANT_DESIGNATION", labelBn: "আবেদনকারীর পদবী", descBn: "যেমন চিত্রে: কর্মকর্তা" },
        { key: "ENTRY_OFFICER", labelBn: "প্রস্তুতকারী কর্মকর্তা", descBn: "প্রস্তুতকারীর নাম ও পদবী" },
      ]
    },
    {
      groupNameBn: "💰 বাজেট ও খরচ সম্পর্কিত ট্যাগ",
      groupNameEn: "💰 Budget & Expense Tags",
      items: [
        { key: "CURRENT_EXPENSE", labelBn: "বর্তমান বিলের পরিমাণ" },
        { key: "AMOUNT", labelBn: "বিল অংক (টাকা/-)" },
        { key: "BASE_AMOUNT", labelBn: "ভিত্তি মূল্য (ভ্যাট-ট্যাক্স পূর্ব)" },
        { key: "VAT_AMOUNT", labelBn: "ভ্যাটের পরিমাণ টাকা" },
        { key: "TAX_AMOUNT", labelBn: "ট্যাক্সের পরিমাণ টাকা" },
        { key: "NET_PAYABLE", labelBn: "নিট প্রদেয় টাকা" },
        { key: "BUDGET_ALLOCATION", labelBn: "মূল বাজেট বরাদ্দ" },
        { key: "ADDITIONAL_ALLOCATION", labelBn: "অতিরিক্ত বরাদ্দ (মোট)" },
        { key: "PROVISION_AMOUNT", labelBn: "প্রভিশন পরিমাণ" },
        { key: "TOTAL_ALLOCATION", labelBn: "সর্বমোট বরাদ্দ" },
        { key: "TOTAL_SPENT_SO_FAR", labelBn: "অদ্যবধি ব্যয়" },
        { key: "TOTAL_SPENT_INCLUDING_CURRENT", labelBn: "অত্র বিলসহ মোট" },
        { key: "REMAINING_BALANCE", labelBn: "অবশিষ্ট বাজেট স্থিতি" },
      ]
    },
    {
      groupNameBn: "🏢 অফিস, খাত ও অর্থবছর",
      groupNameEn: "🏢 Office & FY",
      items: [
        { key: "OFFICE_NAME", labelBn: "অফিসের নাম" },
        { key: "FINANCIAL_YEAR", labelBn: "আর্থিক বছর" },
        { key: "CATEGORY_NAME", labelBn: "খাতের নাম" },
        { key: "CATEGORY_CODE", labelBn: "খাত কোড" },
        { key: "BUDGET_HEAD", labelBn: "বাজেট হেড" },
        { key: "EXPENSE_DATE", labelBn: "খরচের তারিখ" },
        { key: "VOUCHER_NO", labelBn: "ভাউচার নম্বর" },
        { key: "VOUCHER_DATE", labelBn: "ভাউচার তারিখ" },
        { key: "ITEMS_DESCRIPTION", labelBn: "পণ্যের বিবরণ" },
      ]
    },
    {
      groupNameBn: "👥 কর্মকর্তা ও দরদাতা",
      groupNameEn: "👥 Officers & Bidders",
      items: [
        { key: "LOWEST_BIDDER_NAME", labelBn: "সর্বনিম্ন দরদাতার নাম" },
        { key: "TOTAL_BIDDERS_COUNT", labelBn: "মোট দরদাতার সংখ্যা" },
        { key: "ITEM_TEXT_PHRASE", labelBn: "পণ্যটি/পণ্য সমূহ" },
        { key: "DESC_TEXT_PHRASE", labelBn: "বর্ণিত পণ্যটি/পণ্য সমূহ" },
        { key: "SUPPLIER_ORG_1", labelBn: "১ম দরদাতা প্রতিষ্ঠান" },
        { key: "SUPPLIER_ORG_2", labelBn: "২য় দরদাতা প্রতিষ্ঠান" },
        { key: "SUPPLIER_ORG_3", labelBn: "৩য় দরদাতা প্রতিষ্ঠান" },
      ]
    }
  ];

  const getRenderedPreviewHtml = (htmlContent: string) => {
    let preview = htmlContent || "";
    
    // Sample dynamic budget table for realistic preview
    const sampleDynamicBudgetTable = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 14pt; margin-bottom: 14pt; font-size: inherit; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 6px 0;">
        <tbody>
          <tr>
            <td style="padding: 4px 8px; text-align: right; padding-right: 12px; white-space: nowrap;">বিবিধ (৩২৫৫১০৫) খাতে ২০২৫-২০২৬ অর্থ বছরে বাজেট বরাদ্দ</td>
            <td style="padding: 4px 8px; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ১,৫০,০০০/-</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; text-align: right; padding-right: 12px; white-space: nowrap;">অতিরিক্ত বরাদ্দ (একত্রিত)</td>
            <td style="padding: 4px 8px; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ৫০,০০০/-</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; text-align: right; padding-right: 12px; white-space: nowrap; font-weight: bold;">সর্বমোট বাজেট</td>
            <td style="padding: 4px 8px; text-align: right; width: 1%; font-weight: bold; white-space: nowrap;">= ২,০০,০০০/-</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; text-align: right; padding-right: 12px; white-space: nowrap;">অত্র খরচসহ সর্বমোট খরচের পরিমাণ (৬৫,০০০ + ১৩,৭৫০)/-</td>
            <td style="padding: 4px 8px; text-align: right; width: 1%; font-weight: 600; border-bottom: 1.5px solid #000; white-space: nowrap;">= ৭৮,৭৫০/-</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; text-align: right; padding-right: 12px; font-weight: bold; white-space: nowrap;">এ খাতে অবশিষ্ট বাজেটের পরিমাণ</td>
            <td style="padding: 6px 8px; text-align: right; width: 1%; font-weight: bold; border-bottom: 3px double #000; white-space: nowrap;">= ১,২১,২৫০/-</td>
          </tr>
        </tbody>
      </table>
    `;

    const sampleDynamicQuotationTable = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 10pt; font-size: inherit; border: 1px solid #000;">
        <thead>
          <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000; background: #fafafa;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #000;">ক্রম</th>
            <th style="padding: 6px 6px; text-align: left; border: 1px solid #000;">পণ্যের বিবরণ</th>
            <th style="padding: 6px 6px; text-align: left; border: 1px solid #000;">দরদাতা প্রতিষ্ঠান</th>
            <th style="padding: 6px 6px; text-align: right; border: 1px solid #000;">ভ্যাট ও ট্যাক্সসহ মোট মূল্য</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #000;">মন্তব্য</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 4px; text-align: center; border: 1px solid #000;">০১</td>
            <td style="padding: 6px 6px; border: 1px solid #000;">ক্যালেন্ডার ও ডায়েরী আনায়ন</td>
            <td style="padding: 6px 6px; border: 1px solid #000;">মেসার্স জননী এজেন্সী, রাঙ্গামাটি</td>
            <td style="padding: 6px 6px; text-align: right; border: 1px solid #000; font-weight: bold;">= ১৩,৭৫০/-</td>
            <td style="padding: 6px 6px; text-align: center; border: 1px solid #000;">সর্বনিম্ন দরদাতা</td>
          </tr>
          <tr>
            <td style="padding: 6px 4px; text-align: center; border: 1px solid #000;">০২</td>
            <td style="padding: 6px 6px; border: 1px solid #000;">ক্যালেন্ডার ও ডায়েরী আনায়ন</td>
            <td style="padding: 6px 6px; border: 1px solid #000;">মেসার্স মায়ের দোয়া ট্রেডার্স</td>
            <td style="padding: 6px 6px; text-align: right; border: 1px solid #000;">= ১৪,৪০০/-</td>
            <td style="padding: 6px 6px; text-align: center; border: 1px solid #000;">২য় সর্বোচ্চ দরদাতা</td>
          </tr>
          <tr>
            <td style="padding: 6px 4px; text-align: center; border: 1px solid #000;">০৩</td>
            <td style="padding: 6px 6px; border: 1px solid #000;">ক্যালেন্ডার ও ডায়েরী আনায়ন</td>
            <td style="padding: 6px 6px; border: 1px solid #000;">মেসার্স আজমীর কর্পোরেশন</td>
            <td style="padding: 6px 6px; text-align: right; border: 1px solid #000;">= ১৫,৩০০/-</td>
            <td style="padding: 6px 6px; text-align: center; border: 1px solid #000;">সর্বোচ্চ দরদাতা</td>
          </tr>
        </tbody>
      </table>
    `;

    preview = preview.replace(/{{BUDGET_TABLE}}/g, sampleDynamicBudgetTable);
    preview = preview.replace(/{{PROVISION_TABLE}}/g, sampleDynamicBudgetTable);
    preview = preview.replace(/{{BUDGET_PROVISION_TABLE}}/g, sampleDynamicBudgetTable);
    preview = preview.replace(/{{QUOTATION_TABLE}}/g, sampleDynamicQuotationTable);
    preview = preview.replace(/{{OFFICE_NAME}}/g, "আঞ্চলিক কার্যালয়, রাঙ্গামাটি");
    preview = preview.replace(/{{FINANCIAL_YEAR}}/g, "২০২৫-২০২৬");
    preview = preview.replace(/{{CATEGORY_NAME}}|{{CATEGORY}}/g, "বিবিধ");
    preview = preview.replace(/{{CATEGORY_CODE}}|{{BUDGET_HEAD}}/g, "৩২৫৫১০৫");
    preview = preview.replace(/{{PAGE_NO}}|{{NOTE_PAGE_NO}}/g, "৪১৯");
    preview = preview.replace(/{{DESCRIPTION}}|{{EXPENSE_DESCRIPTION}}|{{PURPOSE}}|{{EXPENSE_TITLE}}/g, "প্রকা হতে সুন্দরবন কুরিয়ার সার্ভিসের মাধ্যমে ২০২৬ সনের ক্যালেন্ডার ও ডায়েরী");
    preview = preview.replace(/{{EXPENSE_AMOUNT}}/g, "১৩,৭৫০/-");
    preview = preview.replace(/{{AMOUNT_IN_WORDS}}/g, "তের হাজার সাতশত পঞ্চাশ");
    preview = preview.replace(/{{AMOUNT_WITH_WORDS}}/g, "১৩,৭৫০/- (তের হাজার সাতশত পঞ্চাশ)");
    preview = preview.replace(/{{CURRENT_EXPENSE}}|{{AMOUNT}}/g, "১৩,৭৫০/-");
    preview = preview.replace(/{{VAT_LABEL}}|{{VAT_WORD}}/g, "ভ্যাট");
    preview = preview.replace(/{{TAX_LABEL}}|{{TAX_WORD}}/g, "ট্যাক্স");
    preview = preview.replace(/{{VAT_TEXT}}/g, "১৫% ভ্যাট");
    preview = preview.replace(/{{TAX_TEXT}}/g, "১০% ট্যাক্স");
    preview = preview.replace(/{{TAX_VAT_TEXT}}/g, "১৫% ভ্যাট ও ১০% ট্যাক্সসহ");
    preview = preview.replace(/{{PAYMENT_TYPE}}/g, "নগদে");
    preview = preview.replace(/{{APPLICANT_NAME}}/g, "স্বপ্নীল দেওয়ান");
    preview = preview.replace(/{{APPLICANT_DESIGNATION}}/g, "কর্মকর্তা");
    preview = preview.replace(/{{ENTRY_OFFICER}}/g, "মো: স্বপ্নীল দেওয়ান (কর্মকর্তা)");
    preview = preview.replace(/{{ITEMS_DESCRIPTION}}|{{ITEMS_LIST}}|{{QUANTITY_AND_ITEMS}}/g, "ক্যালেন্ডার ও ডায়েরী");
    preview = preview.replace(/{{TOTAL_BIDDERS_COUNT}}/g, "৩");
    preview = preview.replace(/{{LOWEST_BIDDER_NAME}}/g, "মেসার্স জননী এজেন্সী, রাঙ্গামাটি");
    preview = preview.replace(/{{ITEM_TEXT_PHRASE}}/g, "উক্ত পণ্যটি");
    preview = preview.replace(/{{DESC_TEXT_PHRASE}}/g, "বর্ণিত পণ্যটি");
    preview = preview.replace(/{{EXPENSE_DATE}}|{{VOUCHER_DATE}}/g, "১৫-০১-২০২৬");
    preview = preview.replace(/{{VOUCHER_NO}}/g, "VOUCH-2026-004");
    preview = preview.replace(/{{BUDGET_ALLOCATION}}/g, "১,৫০,০০০/-");
    preview = preview.replace(/{{ADDITIONAL_ALLOCATION}}/g, "৫০,০০০/-");
    preview = preview.replace(/{{TOTAL_ALLOCATION}}/g, "২,০০,০০০/-");
    preview = preview.replace(/{{TOTAL_SPENT_SO_FAR}}/g, "৬৫,০০০/-");
    preview = preview.replace(/{{TOTAL_SPENT_INCLUDING_CURRENT}}/g, "৭৮,৭৫০/-");
    preview = preview.replace(/{{REMAINING_BALANCE}}/g, "১,২১,২৫০/-");
    preview = preview.replace(/{{BASE_AMOUNT}}/g, "১১,০০০/-");
    preview = preview.replace(/{{VAT_AMOUNT}}/g, "১,৬৫০/-");
    preview = preview.replace(/{{TAX_AMOUNT}}/g, "১,১০০/-");
    preview = preview.replace(/{{NET_PAYABLE}}/g, "১৩,৭৫০/-");
    preview = preview.replace(/{{REMAINING_BALANCE}}/g, "১,১০,০০০");
    
    return preview;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-xl font-bold ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"}`}>
            {language === "bn" ? "নোট শিট টেমপ্লেট ব্যবস্থাপনা" : "Note Sheet Templates"}
          </h2>
          <p className={`text-xs mt-0.5 ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-500"}`}>
            {language === "bn" 
              ? "ওয়ার্ড ডকুমেন্ট (.docx) টেমপ্লেট ও টেবিল সরাসরি আপলোড বা এডিট করুন।" 
              : "Upload Word documents (.docx) or edit customizable note sheet templates with tables."}
          </p>
        </div>
        <button
          onClick={openNew}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow ${
            isCustom
              ? "bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 text-white"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          <Plus className="w-4 h-4" /> {language === "bn" ? "নতুন টেমপ্লেট তৈরি" : "New Template"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {noteTemplates.map(t => {
          const cat = categories.find(c => c.id === t.categoryId);
          const hasTable = t.bodyTemplate.includes("<table") || t.bodyTemplate.includes("<tr>");
          return (
            <div key={t.id} className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-between transition ${
              isCustom
                ? "bg-[#16112c] border-[#2e234e] hover:border-[#43356e] text-purple-100"
                : isDark
                ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100"
                : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
            }`}>
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className={`font-bold text-sm ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-800"}`}>{t.title}</h3>
                      {hasTable && (
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded border flex items-center gap-0.5 ${
                          isCustom
                            ? "bg-[#251d45] border-[#443575] text-amber-300"
                            : isDark
                            ? "bg-blue-950/60 border-blue-800 text-blue-400"
                            : "bg-blue-50 border-blue-200 text-blue-700"
                        }`}>
                          <TableIcon className="w-2.5 h-2.5" /> টেবিলযুক্ত
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {language === "bn" ? "ম্যাপিং ক্যাটাগরি: " : "Mapped Category: "}
                      <span className={`font-medium px-2 py-0.5 rounded border ${
                        isCustom
                          ? "bg-[#21183d] text-amber-300 border-[#473775]"
                          : isDark
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100"
                      }`}>
                        {t.categoryId === "all" ? (language === "bn" ? "সকল খাত (সার্বজনীন)" : "All Categories (Universal)") : (cat?.name || "Unknown")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(t)} className={`p-1.5 rounded-lg transition ${
                      isCustom ? "text-purple-300 hover:text-amber-300 hover:bg-[#281e4d]" : isDark ? "text-slate-400 hover:text-blue-400 hover:bg-slate-800" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    }`} title={language === "bn" ? "সম্পাদনা" : "Edit"}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDeleteTemplate(t.id)} className="p-1.5 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition" title={language === "bn" ? "মুছুন" : "Delete"}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div 
                  className={`text-xs font-serif p-3 rounded-xl border h-40 overflow-y-auto leading-relaxed prose prose-sm max-w-none ${
                    isCustom
                      ? "bg-[#1d1737] border-[#312554] text-purple-200"
                      : isDark
                      ? "bg-slate-950 border-slate-800 text-slate-300"
                      : "bg-slate-50/80 border-slate-100 text-slate-700"
                  }`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.bodyTemplate.replace(/\n/g, "<br/>")) }}
                />
              </div>
            </div>
          );
        })}
        {noteTemplates.length === 0 && (
          <div className={`col-span-full py-12 text-center rounded-2xl border text-xs ${
            isCustom
              ? "bg-[#140f29] border-[#2e234e] text-purple-300/60"
              : isDark
              ? "bg-slate-900 border-slate-800 text-slate-500"
              : "bg-white border-slate-200 text-slate-500"
          }`}>
            {language === "bn" ? "কোনো টেমপ্লেট সংরক্ষিত নেই। নতুন টেমপ্লেট তৈরি বা আপলোড করুন।" : "No templates configured. Create or upload a Word document template."}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          <div className={`rounded-2xl max-w-5xl w-full shadow-2xl border flex flex-col h-[94vh] max-h-[94vh] overflow-hidden my-auto ${
            isCustom
              ? "bg-[#18132e] text-purple-100 border-[#382b61]"
              : isDark
              ? "bg-slate-900 text-slate-100 border-slate-700"
              : "bg-white text-slate-900 border-slate-200"
          }`}>
            {/* STICKY TOP HEADER */}
            <div className={`flex justify-between items-center px-4 sm:px-6 py-3 border-b shrink-0 z-20 ${
              isCustom ? "bg-[#1f173b] border-[#302452]" : isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  isCustom ? "bg-[#271d47] text-amber-400" : isDark ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-emerald-100 text-emerald-700"
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    {editingId 
                      ? (language === "bn" ? "টেমপ্লেট সম্পাদনা করুন" : "Edit Template") 
                      : (language === "bn" ? "নতুন নোট শিট টেমপ্লেট তৈরি / আপলোড" : "New Note Sheet Template")}
                  </h3>
                  <p className={`text-xs ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {language === "bn" ? "টেমপ্লেট লিখে বা ওয়ার্ড ফাইল আপলোড করে সংরক্ষণ করুন।" : "Upload Word documents or insert structured tables directly."}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={executeSave}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition text-white ${
                    isCustom
                      ? "bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 ring-2 ring-amber-500/30"
                      : "bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-500/30"
                  }`}
                  title={language === "bn" ? "টেমপ্লেট সংরক্ষণ করুন" : "Save Template"}
                >
                  <Save className="w-4 h-4" />
                  <span>{language === "bn" ? "সংরক্ষণ করুন" : "Save"}</span>
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  className={`p-1.5 rounded-lg transition ${
                    isCustom ? "text-purple-300 hover:text-white hover:bg-[#281e4d]" : isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                  title={language === "bn" ? "বন্ধ করুন" : "Close"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
              {/* Category & Title Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {language === "bn" ? "ব্যয় ক্যাটাগরি *" : "Target Category *"}
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    required
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none shadow-sm ${
                      isCustom
                        ? "bg-[#181230] border-[#382b61] text-purple-100 focus:border-amber-400"
                        : isDark
                        ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500"
                        : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                    }`}
                  >
                    <option value="" disabled>{language === "bn" ? "ক্যাটাগরি নির্বাচন করুন" : "Select Category"}</option>
                    <option value="all" className="text-slate-900 bg-emerald-50 font-bold">
                      {language === "bn" ? "★ সকল খাত (সার্বজনীন / যে কোন খাত)" : "★ All Categories (Universal)"}
                    </option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="text-slate-900 bg-white">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {language === "bn" ? "টেমপ্লেটের নাম / শিরোনাম *" : "Template Title *"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder={language === "bn" ? "যেমন: আসবাবপত্র ক্রয় দরপত্র অনুমোদন নোটশীট" : "e.g. Furniture & Goods Procurement Sanction"}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none shadow-sm ${
                      isCustom
                        ? "bg-[#181230] border-[#382b61] text-purple-100 focus:border-amber-400"
                        : isDark
                        ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500"
                        : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                    }`}
                  />
                </div>
              </div>

              {/* Word Document Uploader Bar + Sample Tables Insertion Toolbar */}
              <div className={`shrink-0 p-3 rounded-xl border space-y-2.5 ${
                isCustom
                  ? "bg-[#20183b] border-[#382b61]"
                  : isDark
                  ? "bg-slate-950/60 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${
                    isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-800"
                  }`}>
                    <TableIcon className={`w-4 h-4 ${isCustom ? "text-amber-400" : "text-emerald-500"}`} />
                    <span>{language === "bn" ? "ওয়ার্ড ডকুমেন্ট আপলোড ও কুইক টেবিল টুলস" : "Word Upload & Table Tools"}</span>
                  </div>

                  {/* Word File Upload Input */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.doc,.html,.htm,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="word-template-upload"
                    />
                    <label
                      htmlFor="word-template-upload"
                      className={`cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition ${
                        isUploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? (language === "bn" ? "আপলোড হচ্ছে..." : "Uploading...") : (language === "bn" ? "Word (.docx) আপলোড করুন" : "Upload Word (.docx)")}</span>
                    </label>
                  </div>
                </div>

                {uploadStatus && (
                  <div className={`text-xs font-medium p-2 rounded-lg flex items-center gap-1.5 border ${
                    isCustom
                      ? "bg-[#291f4d] border-[#443575] text-amber-300"
                      : isDark
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadStatus}</span>
                  </div>
                )}

                {/* Pre-built Table & Form-1 Draft Insert Buttons */}
                <div className={`flex flex-wrap items-center gap-2 pt-1 border-t ${
                  isCustom ? "border-[#302452]" : isDark ? "border-slate-800" : "border-slate-200/80"
                }`}>
                  <span className={`text-xs font-semibold ${
                    isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    {language === "bn" ? "কুইক টেমপ্লেট ও ছক টুলস:" : "Quick Tools:"}
                  </span>

                  <button
                    type="button"
                    onClick={insertRegularExpenseDraft}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                      isCustom
                        ? "bg-purple-600/30 border-purple-500 text-purple-200 hover:bg-purple-600/40"
                        : isDark
                        ? "bg-blue-950/50 border-blue-700 text-blue-300 hover:bg-blue-900/60"
                        : "bg-blue-50 border-blue-400 text-blue-900 hover:bg-blue-100"
                    }`}
                    title={language === "bn" ? "নিয়মিত ব্যয় বিল পরিশোধ প্রমিত ড্রাফট লোড করুন (চিত্র অনুযায়ী)" : "Load Regular Expense Draft"}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>{language === "bn" ? "★ নিয়মিত ব্যয় ড্রাফট (চিত্র অনুযায়ী)" : "★ Regular Expense Draft"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertForm1FullDraft}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                      isCustom
                        ? "bg-amber-600/30 border-amber-500 text-amber-300 hover:bg-amber-600/40"
                        : isDark
                        ? "bg-amber-950/50 border-amber-700 text-amber-300 hover:bg-amber-900/60"
                        : "bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100"
                    }`}
                    title={language === "bn" ? "ফর্ম-১ সম্পূর্ণ ফরম্যাট ও ছক লোড করুন" : "Load Complete Form-1 Draft"}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === "bn" ? "★ ফর্ম-১ ড্রাফট লোড" : "★ Load Form-1 Draft"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertDynamicQuotationTable}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm ${
                      isCustom
                        ? "bg-[#291f4d] border-[#443575] text-amber-300 hover:bg-[#352863]"
                        : isDark
                        ? "bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-750"
                        : "bg-white border-emerald-300 hover:bg-emerald-50 text-emerald-800"
                    }`}
                    title={language === "bn" ? "১টি আইটেম বা একাধিক আইটেম অনুযায়ী স্বয়ংক্রিয় দরদাতা ছক" : "Dynamic Quotation Comparison Table"}
                  >
                    <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{language === "bn" ? "স্বয়ংক্রিয় দরদাতা ছক" : "Auto Quotation Table"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertDynamicBudgetTable}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm ${
                      isCustom
                        ? "bg-[#291f4d] border-[#443575] text-purple-200 hover:bg-[#352863]"
                        : isDark
                        ? "bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-750"
                        : "bg-white border-teal-300 hover:bg-teal-50 text-teal-800"
                    }`}
                    title={language === "bn" ? "স্বয়ংক্রিয় বাজেট ও প্রোভিশন হিসাব ছক" : "Auto Budget & Provision Table"}
                  >
                    <TableIcon className="w-3.5 h-3.5 text-teal-500" />
                    <span>{language === "bn" ? "স্বয়ংক্রিয় বাজেট ছক" : "Auto Budget Table"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertQuotationTable}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-medium flex items-center gap-1 transition shadow-sm ${
                      isCustom
                        ? "bg-[#20183b] border-[#382b61] text-purple-300 hover:bg-[#281e4d]"
                        : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                    title={language === "bn" ? "নমুনা ফিক্সড দরদাতা ছক" : "Sample Static Quotation Table"}
                  >
                    <span>{language === "bn" ? "নমুনা কোটেশন ছক" : "Sample Quotation"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertProvisionTable}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-medium flex items-center gap-1 transition shadow-sm ${
                      isCustom
                        ? "bg-[#20183b] border-[#382b61] text-purple-300 hover:bg-[#281e4d]"
                        : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                    title={language === "bn" ? "নমুনা ফিক্সড প্রোভিশন হিসাব ছক" : "Sample Static Provision Table"}
                  >
                    <span>{language === "bn" ? "নমুনা প্রোভিশন ছক" : "Sample Provision"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertCustomTable}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      isCustom
                        ? "bg-[#291f4d] border-[#443575] text-purple-300 hover:bg-[#352863]"
                        : isDark
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                        : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "কাস্টম ছক" : "Custom Table"}</span>
                  </button>
                </div>
              </div>

                {/* Smart Auto Tables Notice & Placeholders */}
                <div className={`shrink-0 p-3 rounded-xl border space-y-2.5 ${
                  isCustom
                    ? "bg-[#20183b] border-[#382b61]"
                    : isDark
                    ? "bg-slate-950/60 border-slate-800"
                    : "bg-slate-50/70 border-slate-200"
                }`}>
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 text-xs ${
                    isCustom
                      ? "bg-[#2a1d52]/60 border-[#503b87] text-purple-200"
                      : isDark
                      ? "bg-slate-900/80 border-slate-700 text-slate-200"
                      : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  }`}>
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-[11px] sm:text-xs">
                        {language === "bn" ? "💡 স্বয়ংক্রিয় ডায়নামিক বাজেট ছক ({{BUDGET_TABLE}}):" : "💡 Auto Dynamic Budget Table ({{BUDGET_TABLE}}):"}
                      </p>
                      <p className="opacity-90 text-[11px] mt-0.5 leading-relaxed">
                        {language === "bn"
                          ? "টেমপ্লেটে {{BUDGET_TABLE}} ট্যাগ রাখলে স্বয়ংক্রিয়ভাবে মূল বরাদ্দ, একাধিক অতিরিক্ত বরাদ্দের যোগফল, প্রভিশন, সর্বমোট বাজেট, পূর্বের খরচ, বর্তমান বিল ও অবশিষ্ট বাজেট স্থিতি সঠিকভাবে সমন্বিত ছকে তৈরি হবে। কোনো শর্ত বা ডাটা ম্যানুয়ালি আনার প্রয়োজন নেই।"
                          : "Placing {{BUDGET_TABLE}} will automatically render initial allocation, consolidated multiple additional allocations, provision, total budget, past spent, current bill, and remaining balance dynamically."}
                      </p>
                    </div>
                  </div>

                  {/* Categorized Placeholders */}
                  <div className="space-y-2">
                    {placeholderGroups.map((group, gIdx) => (
                      <div key={gIdx} className="space-y-1">
                        <span className={`block text-[11px] font-bold ${
                          group.isPrimary 
                            ? "text-emerald-500 dark:text-emerald-400" 
                            : (isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-600")
                        }`}>
                          {language === "bn" ? group.groupNameBn : group.groupNameEn}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map(item => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => insertPlaceholder(item.key)}
                              title={item.descBn || item.labelBn}
                              className={`px-2 py-0.5 border rounded text-[11px] font-mono transition flex items-center gap-1 ${
                                group.isPrimary
                                  ? "bg-emerald-600/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600/20 font-bold"
                                  : (isCustom
                                      ? "bg-[#181230] border-[#382b61] text-purple-200 hover:border-amber-400 hover:text-amber-300"
                                      : isDark
                                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700")
                              }`}
                            >
                              <span>{`{{${item.key}}}`}</span>
                              <span className="text-[10px] opacity-75 font-sans">({item.labelBn})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              {/* Editor / Live Preview Tabs */}
              <div className={`min-h-[460px] flex flex-col border rounded-xl overflow-hidden ${
                isCustom ? "border-[#382b61]" : isDark ? "border-slate-700" : "border-slate-300"
              }`}>
                <div className={`flex items-center justify-between px-3 py-1.5 border-b shrink-0 ${
                  isCustom ? "bg-[#20183b] border-[#382b61]" : isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
                }`}>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab("edit")}
                      className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                        activeEditorTab === "edit"
                          ? isCustom ? "bg-purple-700 text-white shadow-sm" : isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-emerald-800 shadow-sm"
                          : isCustom ? "text-purple-300 hover:text-white" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" /> {language === "bn" ? "রিচ টেক্সট এডিটর" : "Rich Text Editor"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab("preview")}
                      className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                        activeEditorTab === "preview"
                          ? isCustom ? "bg-purple-700 text-white shadow-sm" : isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-emerald-800 shadow-sm"
                          : isCustom ? "text-purple-300 hover:text-white" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> {language === "bn" ? "লাইভ ভিজ্যুয়াল প্রিভিউ (টেবিলসহ)" : "Live Visual Preview"}
                    </button>
                  </div>

                  <span className={`text-xs ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-500" : "text-slate-500"}`}>
                    {bodyTemplate.length} {language === "bn" ? "অক্ষর" : "chars"}
                  </span>
                </div>

                {activeEditorTab === "edit" ? (
                  <div className="bg-white text-black border-t border-slate-700">
                    <JoditEditor
                      ref={editorRef}
                      value={bodyTemplate}
                      config={{
                        readonly: false,
                        minHeight: 380,
                        height: 440,
                        placeholder: language === "bn" ? 'এখানে টেমপ্লেট লিখুন (এইচটিএমএল বা টেক্সট)...' : 'Start typing...',
                        defaultActionOnPaste: 'insert_as_html',
                        askBeforePasteHTML: false,
                        askBeforePasteFromWord: false,
                        showCharsCounter: false,
                        showWordsCounter: false,
                        showXPathInStatusbar: false,
                        buttons: [
                          'source', '|',
                          'bold', 'italic', 'underline', 'strikethrough', '|',
                          'font', 'fontsize', 'brush', 'paragraph', '|',
                          'align', '|',
                          'ul', 'ol', '|',
                          'table', 'link', 'hr', '|',
                          'undo', 'redo', '|',
                          'eraser', 'fullsize'
                        ],
                        buttonsMD: [
                          'bold', 'italic', 'underline', '|',
                          'font', 'fontsize', 'brush', '|',
                          'align', '|',
                          'ul', 'ol', 'table', '|',
                          'undo', 'redo'
                        ],
                        buttonsSM: [
                          'bold', 'italic', 'underline', '|',
                          'font', 'fontsize', '|',
                          'align', '|',
                          'table', 'undo', 'redo'
                        ],
                        buttonsXS: [
                          'bold', 'italic', '|',
                          'font', 'fontsize', '|',
                          'align', 'table'
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
                      onBlur={newContent => setBodyTemplate(newContent)}
                      onChange={newContent => setBodyTemplate(newContent)}
                    />
                  </div>
                ) : (
                  <div className={`flex-1 min-h-[420px] p-4 overflow-y-auto font-serif text-xs leading-relaxed prose max-w-none ${
                    isCustom ? "bg-[#181230] text-purple-100" : isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
                  }`}>
                    {bodyTemplate ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(getRenderedPreviewHtml(bodyTemplate).replace(/\n/g, "<br/>")) }}
                      />
                    ) : (
                      <div className={`text-center py-10 italic ${isCustom ? "text-purple-300/50" : isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {language === "bn" ? "প্রিভিউ দেখার জন্য টেক্সট লিখুন বা ওয়ার্ড ফাইল আপলোড করুন।" : "Write template text or upload a Word document to preview."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>

            {/* STICKY BOTTOM FOOTER BAR (Always visible at the bottom of the modal) */}
            <div className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t shrink-0 z-20 ${
              isCustom ? "bg-[#140f29] border-[#302452]" : isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 font-medium ${
                  isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {language === "bn" ? "ক্যাটাগরি ও শিরোনাম লিখে সংরক্ষণ বোতামে ক্লিক করুন।" : "Fill category & title, then click Save."}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                    isCustom ? "text-purple-300 hover:bg-[#281e4d]" : isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={executeSave}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition text-white ${
                    isCustom
                      ? "bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 ring-2 ring-amber-500/40"
                      : "bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-500/40"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{language === "bn" ? "টেমপ্লেট সংরক্ষণ করুন (Save Template)" : "Save Template"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
