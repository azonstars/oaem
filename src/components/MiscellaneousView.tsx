import React, { useState, useEffect, useRef } from "react";
import { User } from "../types";
import {
  Upload,
  Trash2,
  Printer,
  FileText,
  X,
  Maximize2,
  Move,
  PlusCircle,
  MinusCircle,
  Check,
  ChevronRight,
  Info,
  Wrench,
  Download,
  Edit3,
  Eye,
} from "lucide-react";
import { apiFetch } from "../api";
import { useTheme } from "../context/ThemeContext";

interface MiscellaneousViewProps {
  currentUser: User | null;
  language: "bn" | "en";
}

interface FormTemplate {
  id: string;
  title: string;
  imageUrl?: string;
  fileName: string;
  fileType: "image" | "word";
  textTemplate?: string;
  uploadedAt: string;
  fields?: OverlayField[];
}

interface OverlayField {
  id: string;
  text: string;
  x: number; // percentage left (0 to 100)
  y: number; // percentage top (0 to 100)
  fontSize: number; // in pixels
}

export function MiscellaneousView({
  currentUser,
  language,
}: MiscellaneousViewProps) {
  const { theme, isCustom } = useTheme();
  const isDark = theme === "dark";

  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"image" | "word">("image");
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [offices, setOffices] = useState<any[]>([]);

  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [overlayFields, setOverlayFields] = useState<OverlayField[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(100);

  const [wordTemplateValues, setWordTemplateValues] = useState<
    Record<string, string>
  >({});
  const [wordTextContent, setWordTextContent] = useState("");
  const [isEditingWordText, setIsEditingWordText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const fieldStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loadSettingsAndOffices = async () => {
      try {
        const settingsRes = await apiFetch("/api/settings");
        if (settingsRes.ok) {
          const settingsData = (await settingsRes.ok)
            ? await settingsRes.json()
            : null;
          if (settingsData) {
            if (Array.isArray(settingsData) && settingsData.length > 0) {
              setSystemSettings(settingsData[0]);
            } else if (!Array.isArray(settingsData)) {
              setSystemSettings(settingsData);
            }
          }
        }

        const officesRes = await apiFetch("/api/offices");
        if (officesRes.ok) {
          const officesData = await officesRes.json();
          setOffices(officesData);
        }
      } catch (err) {
        console.error(
          "Failed to load settings or offices in MiscellaneousView",
          err,
        );
      }
    };
    loadSettingsAndOffices();
  }, []);

  const getOfficeName = () => {
    const office = offices.find((o) => o.id === currentUser?.officeId);
    if (office) return office.name;

    if (currentUser?.officeId === "office-ho")
      return language === "bn" ? "প্রধান কার্যালয়" : "Head Office";
    if (currentUser?.officeId === "office-baghaichari")
      return language === "bn"
        ? "বাঘাইছড়ি শাখা কার্যালয়, রাঙ্গামাটি"
        : "Baghaichari Branch Office, Rangamati";
    return (
      currentUser?.officeId ||
      (language === "bn" ? "সংশ্লিষ্ট শাখা কার্যালয়" : "Respective Office")
    );
  };

  const getOfficeAddress = () => {
    const office = offices.find((o) => o.id === currentUser?.officeId);
    if (office) return office.address;
    if (currentUser?.officeId === "office-baghaichari")
      return language === "bn"
        ? "বাঘাইছড়ি, রাঙ্গামাটি"
        : "Baghaichari, Rangamati";
    return "";
  };

  const renderLetterhead = (isPrint: boolean = false) => {
    const officeName = getOfficeName();
    const officeAddress = getOfficeAddress();
    const institution =
      systemSettings?.institutionName ||
      (language === "bn"
        ? "ফ্লোবোর্ড এন্টারপ্রাইজ প্ল্যাটফর্ম"
        : "FlowBoard Enterprise Platform");
    const logo = systemSettings?.logoUrl;

    return (
      <div
        className={`text-center pb-5 mb-8 border-b-2 border-double border-slate-400 ${isPrint ? "text-black" : "text-slate-800"}`}
      >
        {logo ? (
          <img
            src={logo}
            alt="Office Logo"
            className="w-14 h-14 mx-auto mb-2.5 object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          /* High-Quality SVG Bangladesh Government Emblem Seal */
          <svg className="w-14 h-14 mx-auto mb-2.5" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="#006A4E"
              stroke="#F42A41"
              strokeWidth="3.5"
            />
            <circle
              cx="50"
              cy="50"
              r="37"
              fill="none"
              stroke="#F2A900"
              strokeWidth="2.5"
            />
            <circle cx="50" cy="50" r="28" fill="#F42A41" />
            <path
              d="M50,32 C52,42 58,45 62,48 C55,49 51,46 50,54 C49,46 45,49 38,48 C42,45 48,42 50,32 Z"
              fill="#F2A900"
            />
            <path
              d="M50,40 C53,44 64,48 66,54 C58,54 53,51 50,60 C47,51 42,54 34,54 C36,48 47,44 50,40 Z"
              fill="#F2A900"
              opacity="0.85"
            />
            <g fill="#F2A900">
              <circle cx="34" cy="38" r="2" />
              <circle cx="30" cy="44" r="2" />
              <circle cx="66" cy="38" r="2" />
              <circle cx="70" cy="44" r="2" />
            </g>
          </svg>
        )}

        <h3 className="font-bold text-base md:text-lg tracking-wide uppercase text-slate-900 leading-tight">
          {institution}
        </h3>
        <h4 className="font-bold text-sm md:text-base mt-1.5 text-slate-800 leading-snug">
          {officeName}
        </h4>
        {officeAddress && (
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {officeAddress}
          </p>
        )}

        {/* Smarak and Date pad line */}
        <div className="flex justify-between items-end mt-6 text-[11px] md:text-xs font-semibold px-2 text-slate-700">
          <div className="flex-1 text-left">
            {language === "bn" ? "স্মারক নং:" : "Smarak No:"}{" "}
            .................................................................
          </div>
          <div className="text-right">
            {language === "bn" ? "তারিখ:" : "Date:"}{" "}
            .............................................
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const saved = localStorage.getItem("misc_form_templates");
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    } else {

      const initial: FormTemplate[] = [
        {
          id: "seed-leave-app",
          title:
            language === "bn"
              ? "নৈমিত্তিক ছুটির আবেদন ফর্ম (ইমেজ)"
              : "Casual Leave Application (Image)",
          imageUrl:
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
          fileName: "casual_leave.png",
          fileType: "image",
          uploadedAt: new Date().toLocaleDateString("bn-BD"),
          fields: [
            {
              id: "f1",
              text:
                language === "bn"
                  ? "বরাবর, শাখা ব্যবস্থাপক"
                  : "To, Branch Manager",
              x: 15,
              y: 15,
              fontSize: 16,
            },
            {
              id: "f2",
              text:
                language === "bn"
                  ? "বাঘাইছড়ি শাখা, রাঙ্গামাটি"
                  : "Baghaichari Branch",
              x: 15,
              y: 18,
              fontSize: 16,
            },
            {
              id: "f3",
              text:
                language === "bn"
                  ? "৩ দিন (১৫/১০/২০২৬ থেকে ১৭/১০/২০২৬)"
                  : "3 Days",
              x: 30,
              y: 45,
              fontSize: 16,
            },
          ],
        },
        {
          id: "seed-vehicle-req",
          title:
            language === "bn"
              ? "যানবাহন রিকুইজিশন ফরম (ওয়ার্ড টেমপ্লেট)"
              : "Vehicle Requisition Form (Word Template)",
          fileName: "vehicle_requisition.docx",
          fileType: "word",
          uploadedAt: new Date().toLocaleDateString("bn-BD"),
          textTemplate: `ফ্লোবোর্ড এন্টারপ্রাইজ ওয়ার্কস্পেস
বাঘাইছড়ি শাখা কার্যালয়, রাঙ্গামাটি।

স্মারক নম্বর: [স্মারক নম্বর]
তারিখ: [তারিখ]

বিষয়: যানবাহন ব্যবহারের রিকুইজিশন আবেদন।

বরাবর,
শাখা ব্যবস্থাপক, বাঘাইছড়ি শাখা।

জনাব,
আমার আগামী [ভ্রমণের তারিখ] তারিখে দাপ্তরিক কাজে [ভ্রমণের স্থান] যাতায়াতের জন্য একটি হালকা যানবাহন প্রয়োজন। উক্ত কাজের বিবরণ নিচে দেওয়া হলো:

১. ব্যবহারকারীর নাম: [ব্যবহারকারীর নাম]
২. পদবী: [পদবী]
৩. যাতায়াতের উদ্দেশ্য: [যাতায়াতের উদ্দেশ্য]
৪. আনুমানিক দূরত্ব: [আনুমানিক দূরত্ব]

অতএব মহোদয়ের নিকট আবেদন, আমাকে উক্ত যানবাহনটি ব্যবহারের অনুমতি প্রদান করতে আপনার সদয় অনুমতি কামনা করছি।


আবেদনকারীর স্বাক্ষর: ____________________
পদবী: [পদবী]`,
        },
      ];
      setTemplates(initial);
      localStorage.setItem("misc_form_templates", JSON.stringify(initial));
    }
  }, [language]);

  const saveTemplates = (newTemplates: FormTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem("misc_form_templates", JSON.stringify(newTemplates));
  };

  const extractVariables = (text: string): string[] => {
    const matchesBracket = text.match(/\[([^\]]+)\]/g) || [];
    const matchesBrace = text.match(/\{([^}]+)\}/g) || [];
    const allMatches = [...matchesBracket, ...matchesBrace];
    if (allMatches.length === 0) return [];

    const cleaned = allMatches.map((m) => {
      let content = m;
      if (m.startsWith("[") && m.endsWith("]")) content = m.slice(1, -1);
      else if (m.startsWith("{") && m.endsWith("}")) content = m.slice(1, -1);

      return content.replace(/<[^>]+>/g, "").trim();
    });
    return Array.from(new Set(cleaned));
  };

  useEffect(() => {
    if (selectedTemplate && selectedTemplate.fileType === "word") {
      const templateText = selectedTemplate.textTemplate || "";
      setWordTextContent(templateText);

      const vars = extractVariables(templateText);
      const initialVals: Record<string, string> = {};
      vars.forEach((v) => {
        if (v === "ব্যবহারকারীর নাম" || v === "Name")
          initialVals[v] = currentUser?.name || "";
        else if (v === "পদবী" || v === "Designation")
          initialVals[v] = currentUser?.designation || "";
        else if (v === "তারিখ" || v === "Date")
          initialVals[v] = new Date().toLocaleDateString(
            language === "bn" ? "bn-BD" : "en-US",
          );
        else initialVals[v] = "";
      });
      setWordTemplateValues(initialVals);
    }
  }, [selectedTemplate, currentUser, language]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    const isDoc = /\.(docx|doc|txt)$/i.test(file.name);

    if (!isImage && !isDoc) {
      alert(
        language === "bn"
          ? "অনুমোদিত ফাইল ফরম্যাট: png, jpg, jpeg, webp, gif, docx, doc, txt"
          : "Supported formats: png, jpg, jpeg, webp, gif, docx, doc, txt",
      );
      return;
    }

    const detectedType = isImage ? "image" : "word";
    const titleToUse = uploadTitle.trim() || file.name.replace(/\.[^/.]+$/, "");

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;

        let fileUrl = "";
        let parsedText = "";

        if (detectedType === "image") {

          const res = await apiFetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data,
              originalName: file.name,
              expenseId: "form-template",
            }),
          });

          const data = await res.json();
          if (data.error) {
            throw new Error(data.error);
          }
          if (!res.ok) {
            throw new Error("Upload failed with status: " + res.status);
          }
          fileUrl = data.url;
        } else {

          if (
            file.name.toLowerCase().endsWith(".docx") ||
            file.name.toLowerCase().endsWith(".doc")
          ) {
            const base64 = base64Data.split(",")[1];
            const res = await apiFetch("/api/parse-word-doc", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ base64, filename: file.name }),
            });
            const data = await res.json();
            if (res.ok && data.success && data.html) {
              parsedText = data.html;
            } else {
              throw new Error(data.error || "Failed to parse Word document");
            }
          } else {

            parsedText = await new Promise<string>((resolve, reject) => {
              const textReader = new FileReader();
              textReader.onload = () => resolve(textReader.result as string);
              textReader.onerror = () =>
                reject(new Error("Failed to read text file"));
              textReader.readAsText(file);
            });
          }
        }

        const newTemplate: FormTemplate = {
          id: `template-${Date.now()}`,
          title: titleToUse,
          imageUrl: detectedType === "image" ? fileUrl : undefined,
          fileName: file.name,
          fileType: detectedType,
          uploadedAt: new Date().toLocaleDateString(
            language === "bn" ? "bn-BD" : "en-US",
          ),
          textTemplate: detectedType === "word" ? parsedText : undefined,
          fields: [],
        };

        const updated = [newTemplate, ...templates];
        saveTemplates(updated);
        setUploadTitle("");
        if (fileInputRef.current) fileInputRef.current.value = "";

        alert(
          language === "bn"
            ? "ফর্ম টেমপ্লেটটি সফলভাবে যুক্ত হয়েছে!"
            : "Form template added successfully!",
        );
      } catch (error: any) {
        console.error("Error uploading template", error);
        alert(
          language === "bn"
            ? `আপলোড করতে সমস্যা হয়েছে: ${error.message || error}`
            : `Upload failed: ${error.message || error}`,
        );
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        language === "bn"
          ? "আপনি কি নিশ্চিতভাবে এই ফর্ম টেমপ্লেটটি ডিলিট করতে চান?"
          : "Are you sure you want to delete this template?",
      )
    ) {
      const updated = templates.filter((t) => t.id !== id);
      saveTemplates(updated);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.closest(".overlay-field-control")
    ) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pctX = Math.round((clickX / rect.width) * 100);
    const pctY = Math.round((clickY / rect.height) * 100);

    const newField: OverlayField = {
      id: `field-${Date.now()}`,
      text: "",
      x: pctX,
      y: pctY,
      fontSize: 16,
    };

    const updatedFields = [...overlayFields, newField];
    setOverlayFields(updatedFields);
    setActiveFieldId(newField.id);

    setTimeout(() => {
      const inputEl = document.getElementById(
        `input-${newField.id}`,
      ) as HTMLInputElement;
      inputEl?.focus();
    }, 50);
  };

  const handleFieldChange = (id: string, text: string) => {
    setOverlayFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, text } : f)),
    );
  };

  const handleFieldDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOverlayFields((prev) => prev.filter((f) => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const handleFieldFontSizeChange = (
    id: string,
    change: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setOverlayFields((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, fontSize: Math.max(10, Math.min(48, f.fontSize + change)) }
          : f,
      ),
    );
  };

  const handleFieldDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedFieldId(id);
    setActiveFieldId(id);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const field = overlayFields.find((f) => f.id === id);
    if (field) {
      fieldStartPos.current = { x: field.x, y: field.y };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggedFieldId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    const deltaPctX = (deltaX / rect.width) * 100;
    const deltaPctY = (deltaY / rect.height) * 100;

    let newX = Math.round(fieldStartPos.current.x + deltaPctX);
    let newY = Math.round(fieldStartPos.current.y + deltaPctY);

    newX = Math.max(0, Math.min(95, newX));
    newY = Math.max(0, Math.min(98, newY));

    setOverlayFields((prev) =>
      prev.map((f) =>
        f.id === draggedFieldId ? { ...f, x: newX, y: newY } : f,
      ),
    );
  };

  const handleCanvasMouseUp = () => {
    setDraggedFieldId(null);
  };

  const handleInsertQuickField = (text: string) => {
    if (!canvasRef.current) return;
    const newField: OverlayField = {
      id: `field-${Date.now()}`,
      text: text,
      x: 30,
      y: 30,
      fontSize: 16,
    };
    setOverlayFields([...overlayFields, newField]);
    setActiveFieldId(newField.id);
  };

  const handleSaveWorkspace = () => {
    if (!selectedTemplate) return;
    const updated = templates.map((t) => {
      if (t.id === selectedTemplate.id) {
        return {
          ...t,
          fields: t.fileType === "image" ? overlayFields : undefined,
          textTemplate: t.fileType === "word" ? wordTextContent : undefined,
        };
      }
      return t;
    });
    saveTemplates(updated);
    alert(
      language === "bn"
        ? "টেমপ্লেটের ডাটা সফলভাবে সংরক্ষণ করা হয়েছে।"
        : "Fields saved successfully.",
    );
  };

  const renderWordPreview = () => {
    let result = wordTextContent;
    Object.keys(wordTemplateValues).forEach((variable) => {
      const val = wordTemplateValues[variable] || `______`;
      const escapedVar = variable.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

      const regexBracket = new RegExp(`\\[${escapedVar}\\]`, "g");
      const regexBrace = new RegExp(`\\{${escapedVar}\\}`, "g");

      const replacement = `<span class="bg-emerald-500/10 text-emerald-600 border-b border-dashed border-emerald-500 px-1 font-bold rounded">${val}</span>`;

      result = result
        .replace(regexBracket, replacement)
        .replace(regexBrace, replacement);
    });

    if (!/<[a-z][\s\S]*>/i.test(result)) {
      result = result.replace(/\r?\n/g, "<br />");
    }
    return result;
  };

  const renderWordPrintPreview = () => {
    let result = wordTextContent;
    Object.keys(wordTemplateValues).forEach((variable) => {
      const val = wordTemplateValues[variable] || `______`;
      const escapedVar = variable.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

      const regexBracket = new RegExp(`\\[${escapedVar}\\]`, "g");
      const regexBrace = new RegExp(`\\{${escapedVar}\\}`, "g");

      const replacement = `<span style="text-decoration: underline; font-weight: bold; color: #000; padding: 0 4px;">${val}</span>`;

      result = result
        .replace(regexBracket, replacement)
        .replace(regexBrace, replacement);
    });

    if (!/<[a-z][\s\S]*>/i.test(result)) {
      result = result.replace(/\r?\n/g, "<br />");
    }
    return result;
  };

  const handleDownloadWordFile = (tpl: FormTemplate) => {

    const element = document.createElement("a");
    const file = new Blob([tpl.textTemplate || ""], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = tpl.fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={`p-4 md:p-6 space-y-6 ${isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-800"}`}
    >
      {/* Dynamic styling block specifically to format prints flawlessly */}
      <style>{`
        @media print {
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          /* Hide all general UI elements during print */
          header, sidebar, nav, footer, button, .no-print, .modal-header, .sidebar-container, .modal-footer {
            display: none !important;
          }
          /* Show print wrapper in absolute crisp format */
          .print-workspace-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            z-index: 9999999 !important;
            background: white !important;
          }
          .print-form-wrapper {
            position: relative !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-bg-image {
            width: 100% !important;
            display: block !important;
          }
          .print-overlay-text {
            position: absolute !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: black !important;
            font-weight: bold !important;
            font-family: 'SutonnyMJ', 'Kalpurush', 'Nikosh', sans-serif !important;
            pointer-events: none !important;
            padding: 0 !important;
            margin: 0 !important;
            white-space: nowrap !important;
          }
          
          /* Word Print Style */
          .print-word-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 40px !important;
            background: white !important;
            color: black !important;
            font-family: 'Nikosh', 'Kalpurush', 'SutonnyMJ', serif !important;
            line-height: 1.8 !important;
            font-size: 16px !important;
            display: block !important;
          }
           .print-word-text {
             /* HTML structure spacing renders natively */
           }
        }
      `}</style>

      {/* Header Info Banner */}
      <div
        className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5 ${
          isCustom ? "border-purple-900/30" : "border-slate-100"
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {language === "bn"
              ? "বিবিধ ও ফর্ম আপলোড"
              : "Miscellaneous & Form Upload"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-500" />
            {language === "bn"
              ? "যেকোনো দাপ্তরিক ওয়ার্ড (.docx) ফাইল বা ছবির ফর্ম আপলোড করুন এবং ফ্লোটিং উইন্ডোর মাধ্যমে খুব সহজে পূরণ করে প্রিন্ট করুন।"
              : "Upload any official Word (.docx) files or image-based forms and fill them easily via floating workspace."}
          </p>
        </div>
      </div>

      {/* Upload Box (Supports Image/PDF and Word Docs) */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isCustom
            ? "bg-[#181233] border-[#342759]"
            : isDark
              ? "bg-slate-850 border-slate-800"
              : "bg-white border-slate-250/70 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-3 w-full md:max-w-xl">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {language === "bn"
                ? "নতুন ফর্ম বা ওয়ার্ড ডকুমেন্ট যুক্ত করুন"
                : "Add New Form or Word Document"}
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUploadType("image")}
                className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${
                  uploadType === "image"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                📸{" "}
                {language === "bn" ? "ছবি / ইমেজ ফর্ম" : "Image / Scanned Form"}
              </button>
              <button
                type="button"
                onClick={() => setUploadType("word")}
                className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${
                  uploadType === "word"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                📝{" "}
                {language === "bn"
                  ? "ওয়ার্ড ডকুমেন্ট (.docx)"
                  : "Word Document (.docx)"}
              </button>
            </div>

            <input
              type="text"
              placeholder={
                uploadType === "image"
                  ? language === "bn"
                    ? "যেমন: নৈমিত্তিক ছুটির আবেদন ফরম"
                    : "e.g., Casual Leave Application Form"
                  : language === "bn"
                    ? "যেমন: নতুন বাজেট বরাদ্দ চিঠি বা রিকুইজিশন"
                    : "e.g., Budget Allocation Letter or Requisition"
              }
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                isCustom
                  ? "bg-[#251d45] border-[#4b3b7a] text-purple-100 placeholder-purple-300/40"
                  : isDark
                    ? "bg-slate-880 border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400"
              }`}
            />
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={uploadType === "image" ? "image/*" : ".docx,.doc,.txt"}
              className="hidden"
            />

            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className={`px-5 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm border disabled:opacity-50 disabled:cursor-not-allowed ${
                isCustom
                  ? "bg-[#251d45] border-[#4b3b7a] text-purple-200 hover:bg-[#32285e]"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Upload
                className={`w-4.5 h-4.5 ${uploadType === "image" ? "text-emerald-500" : "text-blue-500"}`}
              />
              <span>
                {uploadType === "image"
                  ? language === "bn"
                    ? "ফর্ম আপলোড"
                    : "Form Upload"
                  : language === "bn"
                    ? "ওয়ার্ড ফাইল যুক্ত করুন"
                    : "Add Word File"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Practical Guide for Word Documents */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
          isCustom
            ? "bg-[#251d45]/20 border-[#342759]/40"
            : isDark
              ? "bg-slate-900/30 border-slate-800/40"
              : "bg-blue-50/50 border-blue-100 text-slate-700"
        }`}
      >
        <Wrench className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            💡{" "}
            {language === "bn"
              ? "ওয়ার্ড ডকুমেন্ট ব্যবহারের পরামর্শ:"
              : "Tips for using Word Documents:"}
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
            <li>
              {language === "bn"
                ? "যদি আপনি ওয়ার্ড ফাইলের ফরম্যাট হুবহু ব্যাকগ্রাউন্ডে রেখে উপরে লিখতে চান, তাহলে Word ফাইলটি ওপেন করে 'Save As PDF' দিয়ে PDF বা ছবির স্ক্রিনশট নিয়ে এখানে ইমেজ হিসেবে আপলোড করুন।"
                : "If you want the exact Word format as background, save your Word file as PDF or take a screenshot and upload as an Image."}
            </li>
            <li>
              {language === "bn"
                ? "অথবা, নিচের 'ওয়ার্ড টেমপ্লেট' ফিচারটি ব্যবহার করুন। এখানে আপনি ওয়ার্ড ফাইলের লেখা কপি-পেস্ট করে সহজেই থার্ড ব্র্যাকেট [ ] ব্যবহার করে ডাইনামিক ফিল্ড বানিয়ে হুবহু প্রিন্ট নিতে পারবেন।"
                : "Or use our 'Word Template Editor' below. Simply paste your Word content, use brackets [ ] for dynamic fields, fill and print beautifully."}
            </li>
          </ul>
        </div>
      </div>

      {/* Floating Windows section showing the uploaded cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            {language === "bn"
              ? "আপলোডকৃত ফর্মসমূহ ও ওয়ার্ড ডকুমেন্টস"
              : "Uploaded Forms & Word Documents"}
          </h2>
        </div>

        {templates.length === 0 ? (
          <div
            className={`p-8 rounded-2xl border text-center ${
              isCustom
                ? "bg-[#181233]/40 border-[#342759]/40"
                : isDark
                  ? "bg-slate-850/40 border-slate-800/40"
                  : "bg-slate-50/50 border-slate-200"
            }`}
          >
            <p className="text-sm text-slate-500">
              {language === "bn"
                ? "এখনো কোনো ফর্ম আপলোড করা হয়নি।"
                : "No forms uploaded yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => {
                  setSelectedTemplate(tpl);
                  if (tpl.fileType === "image") {
                    setOverlayFields(tpl.fields || []);
                  }
                }}
                className={`relative rounded-2xl border p-4 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg flex flex-col justify-between ${
                  isCustom
                    ? "bg-[#181233] border-[#342759] hover:border-[#4b3b7a]"
                    : isDark
                      ? "bg-slate-850 border-slate-800 hover:border-slate-700"
                      : "bg-white border-slate-200/90 hover:border-emerald-500/30 shadow-sm"
                }`}
              >
                {/* Visual card header */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div
                      className={`p-2 rounded-xl ${tpl.fileType === "image" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"}`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase ${
                        tpl.fileType === "image"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      }`}
                    >
                      {tpl.fileType === "image"
                        ? language === "bn"
                          ? "ইমেজ ফর্ম"
                          : "Image Form"
                        : language === "bn"
                          ? "ওয়ার্ড টেমপ্লেট"
                          : "Word Template"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm line-clamp-2 min-h-[40px]">
                      {tpl.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === "bn"
                        ? `আপলোড: ${tpl.uploadedAt}`
                        : `Uploaded: ${tpl.uploadedAt}`}
                    </p>
                  </div>
                </div>

                {/* Card footer / Action clickable link */}
                <div className="mt-5 pt-3 border-t border-slate-100/10 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold flex items-center gap-1 hover:underline ${
                      tpl.fileType === "image"
                        ? "text-emerald-500"
                        : "text-blue-500"
                    }`}
                  >
                    {tpl.fileType === "image"
                      ? language === "bn"
                        ? "👉 ফ্লোটিং উইন্ডো ও প্রিন্ট"
                        : "👉 Open & Print Form"
                      : language === "bn"
                        ? "👉 ফরম পূরণ ও প্রিন্ট"
                        : "👉 Fill & Print Letter"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>

                  <div className="flex gap-1">
                    {tpl.fileType === "word" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadWordFile(tpl);
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 transition-colors"
                        title={
                          language === "bn"
                            ? "ওয়ার্ড ফাইল ডাউনলোড"
                            : "Download Word File"
                        }
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                      title={language === "bn" ? "মুছে ফেলুন" : "Delete"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspace Modal (Adaptive depending on file type: Image Overlay OR Word Document Template Editor) */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div
            className={`w-full max-w-6xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
              isCustom
                ? "bg-[#181233] border-[#342759]"
                : isDark
                  ? "bg-slate-850 border-slate-800"
                  : "bg-white border-slate-250"
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-slate-950/20">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Maximize2 className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
                  {selectedTemplate.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTemplate.fileType === "image"
                    ? language === "bn"
                      ? "ছবিতে যেকোনো স্থানে ক্লিক করে লেখার ঘর যুক্ত করুন, টাইপ করুন এবং ড্র্যাগ করে পজিশন করুন।"
                      : "Click anywhere on the image to place inputs, type and drag to adjust position."
                    : language === "bn"
                      ? "বামে ফর্ম পূরণ করুন, ডানে ওয়ার্ড ফাইলের প্রিভিউ স্বয়ংক্রিয়ভাবে আপডেট হবে।"
                      : "Fill in the form on the left, the Word letter on the right updates instantly."}
                </p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-red-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render Workspace Content dynamically based on File Type */}
            {selectedTemplate.fileType === "image" ? (
              /* ================= IMAGE OVERLAY WORKSPACE ================= */
              <>
                {/* Quick Auto-Fill Controls & Utilities */}
                <div
                  className={`p-3 border-b flex flex-wrap gap-2 items-center bg-slate-950/10`}
                >
                  <span className="text-xs font-bold text-slate-400 mr-2">
                    {language === "bn" ? "দ্রুত সংযুক্তি:" : "Quick Insert:"}
                  </span>
                  <button
                    onClick={() =>
                      handleInsertQuickField(currentUser?.name || "")
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition"
                  >
                    👤 {currentUser?.name || "ব্যবহারকারী"}
                  </button>
                  <button
                    onClick={() =>
                      handleInsertQuickField(
                        new Date().toLocaleDateString(
                          language === "bn" ? "bn-BD" : "en-US",
                        ),
                      )
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition"
                  >
                    📅 {language === "bn" ? "আজকের তারিখ" : "Current Date"}
                  </button>
                  <button
                    onClick={() =>
                      handleInsertQuickField(currentUser?.designation || "")
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition"
                  >
                    💼 {currentUser?.designation || "পদবী"}
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {language === "bn" ? "জুম স্কেল:" : "Zoom:"} {zoomScale}%
                    </span>
                    <button
                      onClick={() => setZoomScale((p) => Math.max(50, p - 10))}
                      className="p-1 rounded-md hover:bg-slate-500/10 text-slate-400"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomScale((p) => Math.min(150, p + 10))}
                      className="p-1 rounded-md hover:bg-slate-500/10 text-slate-400"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Canvas Area with scrollbars */}
                <div className="flex-1 overflow-auto p-6 bg-slate-900/10 flex justify-center items-start min-h-[350px]">
                  <div
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className="relative shadow-xl border border-slate-300 rounded-lg overflow-hidden bg-white select-none transition-all duration-100 cursor-crosshair"
                    style={{
                      width: `${600 * (zoomScale / 100)}px`,
                      minHeight: `${400 * (zoomScale / 100)}px`,
                    }}
                  >
                    <img
                      src={selectedTemplate.imageUrl}
                      alt={selectedTemplate.title}
                      className="w-full h-auto pointer-events-none"
                      referrerPolicy="no-referrer"
                    />

                    {/* Overlaid Field Boxes */}
                    {overlayFields.map((field) => {
                      const isActive = activeFieldId === field.id;
                      return (
                        <div
                          key={field.id}
                          style={{
                            left: `${field.x}%`,
                            top: `${field.y}%`,
                            fontSize: `${field.fontSize * (zoomScale / 100)}px`,
                          }}
                          className={`absolute group transform -translate-y-1/2 flex items-center gap-1 cursor-move transition-all ${
                            isActive
                              ? "border-2 border-emerald-500 bg-white/95 text-slate-900 p-0.5 rounded shadow-lg z-20"
                              : "border border-dashed border-slate-400 bg-white/40 text-slate-900 p-0.5 rounded hover:bg-white/80 z-10"
                          }`}
                        >
                          <div
                            onMouseDown={(e) =>
                              handleFieldDragStart(field.id, e)
                            }
                            className="p-0.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                          >
                            <Move className="w-3.5 h-3.5 shrink-0" />
                          </div>

                          <input
                            id={`input-${field.id}`}
                            type="text"
                            value={field.text}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFieldId(field.id);
                            }}
                            onChange={(e) =>
                              handleFieldChange(field.id, e.target.value)
                            }
                            placeholder={
                              language === "bn"
                                ? "এখানে লিখুন..."
                                : "Type here..."
                            }
                            className="bg-transparent border-none outline-none focus:ring-0 p-0 font-medium text-slate-900 w-44"
                            style={{ fontSize: "inherit" }}
                          />

                          <div className="hidden group-hover:flex items-center gap-0.5 overlay-field-control bg-slate-100 p-0.5 rounded ml-1">
                            <button
                              onClick={(e) =>
                                handleFieldFontSizeChange(field.id, -1, e)
                              }
                              className="p-0.5 hover:bg-slate-250 text-slate-600 rounded"
                              title="Font size -"
                            >
                              A-
                            </button>
                            <button
                              onClick={(e) =>
                                handleFieldFontSizeChange(field.id, 1, e)
                              }
                              className="p-0.5 hover:bg-slate-250 text-slate-600 rounded"
                              title="Font size +"
                            >
                              A+
                            </button>
                            <button
                              onClick={(e) => handleFieldDelete(field.id, e)}
                              className="p-0.5 hover:bg-red-200 hover:text-red-600 text-slate-400 rounded transition-colors"
                              title="Delete"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              /* ================= WORD DOCUMENT TEMPLATE EDITOR ================= */
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[400px]">
                {/* Left Side: Auto-Generated Form Inputs / Template Editor Toggle */}
                <div
                  className={`w-full md:w-5/12 p-5 border-r overflow-y-auto flex flex-col gap-4 ${
                    isCustom
                      ? "bg-[#181233]"
                      : isDark
                        ? "bg-slate-900"
                        : "bg-slate-50"
                  }`}
                >
                  {/* Actions Header Toggle: Form Fill or Edit Template Text */}
                  <div className="flex justify-between items-center bg-slate-950/20 p-2 rounded-xl border">
                    <span className="text-xs font-bold text-slate-400">
                      {isEditingWordText
                        ? language === "bn"
                          ? "টেমপ্লেট এডিটর মোড"
                          : "Template Edit Mode"
                        : language === "bn"
                          ? "ফর্ম পূরণ মোড"
                          : "Form Fill Mode"}
                    </span>
                    <button
                      onClick={() => setIsEditingWordText(!isEditingWordText)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        isEditingWordText
                          ? "bg-amber-500 text-slate-950"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {isEditingWordText ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <Edit3 className="w-3.5 h-3.5" />
                      )}
                      {isEditingWordText
                        ? language === "bn"
                          ? "পূরণ ফর্মে ফিরুন"
                          : "Back to Fill Form"
                        : language === "bn"
                          ? "টেমপ্লেট টেক্সট সম্পাদনা"
                          : "Edit Template Text"}
                    </button>
                  </div>

                  {isEditingWordText ? (
                    /* Editor Input Area where they paste raw word content and define [variables] */
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 block">
                          📝{" "}
                          {language === "bn"
                            ? "ওয়ার্ড টেক্সট টেমপ্লেটটি পেস্ট করুন:"
                            : "Paste Word Text Content:"}
                        </label>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          {language === "bn"
                            ? "পরামর্শ: ওয়ার্ড ফাইলে যেখানে যেখানে পরিবর্তন করতে চান সেখানে থার্ড ব্র্যাকেটে ভ্যারিয়েবল লিখুন। যেমন: [স্মারক নম্বর], [তারিখ], [নাম], [শাখা] ইত্যাদি।"
                            : "Tip: Use third brackets for editable fields like [Subject], [Date], [Name] to generate form inputs automatically."}
                        </p>
                      </div>
                      <textarea
                        value={wordTextContent}
                        onChange={(e) => setWordTextContent(e.target.value)}
                        className={`w-full flex-1 min-h-[250px] p-3 text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isCustom
                            ? "bg-[#251d45] border-[#4b3b7a] text-purple-100"
                            : isDark
                              ? "bg-slate-800 border-slate-700 text-slate-200"
                              : "bg-white border-slate-200 text-slate-800"
                        }`}
                        placeholder="Paste document content..."
                      />
                    </div>
                  ) : (
                    /* Auto-Generated Form Fields derived from the bracket scanning */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Wrench className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {language === "bn"
                            ? "স্বয়ংক্রিয়ভাবে সনাক্তকৃত ফিল্ডসমূহ:"
                            : "Auto-Generated Fields:"}
                        </h4>
                      </div>

                      {extractVariables(wordTextContent).length === 0 ? (
                        <div className="p-4 bg-slate-500/5 rounded-xl border border-dashed text-center">
                          <p className="text-xs text-slate-400 leading-normal">
                            {language === "bn"
                              ? "টেক্সট ডকুমেন্টে কোনো ভ্যারিয়েবল [ ] ব্র্যাকেট সনাক্ত করা যায়নি। ডানে 'টেমপ্লেট টেক্সট সম্পাদনা' বাটনে ক্লিক করে টেক্সটে ব্র্যাকেট যুক্ত করতে পারেন।"
                              : "No brackets [ ] detected. Edit template text to insert fillable variables."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {extractVariables(wordTextContent).map((variable) => (
                            <div key={variable} className="space-y-1">
                              <label className="text-xs font-semibold text-slate-300 dark:text-slate-400 block">
                                {variable}
                              </label>
                              <input
                                type="text"
                                value={wordTemplateValues[variable] || ""}
                                onChange={(e) =>
                                  setWordTemplateValues((prev) => ({
                                    ...prev,
                                    [variable]: e.target.value,
                                  }))
                                }
                                placeholder={`${variable}...`}
                                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  isCustom
                                    ? "bg-[#251d45] border-[#4b3b7a] text-purple-100"
                                    : isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-200"
                                      : "bg-white border-slate-200 text-slate-800"
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side: A4 Page Styled Print Preview Sheet */}
                <div className="flex-1 p-6 bg-slate-900/10 overflow-y-auto flex justify-center items-start">
                  <div className="w-full max-w-[210mm] min-h-[297mm] p-12 bg-white shadow-xl rounded-lg text-slate-900 font-serif leading-relaxed text-sm select-none border border-slate-200">
                    {/* Dynamic Official Government Letterhead/Pad */}
                    {renderLetterhead(false)}

                    {/* Form content with dynamic highlighted variables */}
                    <div
                      className="text-slate-800 font-sans"
                      style={{ lineHeight: "1.8", fontSize: "15px" }}
                      dangerouslySetInnerHTML={{ __html: renderWordPreview() }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="p-4 border-t flex flex-wrap gap-3 justify-between items-center bg-slate-950/20">
              <span className="text-xs text-slate-400">
                💡{" "}
                {language === "bn"
                  ? "* প্রিন্ট আউটে লেখার চারপাশের হাইলাইট বা বর্ডার থাকবে না, হুবহু সাদা পেজে প্রিন্ট হবে"
                  : "* Print out will render standard crisp format with underlines instead of highlights"}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveWorkspace}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    isCustom
                      ? "bg-[#251d45] border-[#4b3b7a] text-purple-200 hover:bg-[#32285e]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-500" />
                  {language === "bn"
                    ? "টেমপ্লেট সংরক্ষণ করুন"
                    : "Save Template"}
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  {language === "bn"
                    ? "ডকুমেন্ট প্রিন্ট করুন"
                    : "Print Document"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT-ONLY Crisp Elements Workspace Container (renders only when printing Scanned Image) */}
      {selectedTemplate && selectedTemplate.fileType === "image" && (
        <div className="hidden print-workspace-container">
          <div className="print-form-wrapper">
            <img
              src={selectedTemplate.imageUrl}
              alt="Print Form"
              className="print-bg-image"
              referrerPolicy="no-referrer"
            />
            {overlayFields.map((field) => (
              <div
                key={`print-${field.id}`}
                style={{
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  fontSize: `${field.fontSize}px`,
                }}
                className="print-overlay-text"
              >
                {field.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIDDEN PRINT-ONLY Crisp Word Template Container (renders only when printing Word Letter) */}
      {selectedTemplate && selectedTemplate.fileType === "word" && (
        <div className="hidden print-word-container">
          {/* Include Official Dynamic Letterhead/Pad on Printed Sheet! */}
          {renderLetterhead(true)}

          <div
            className="print-word-text font-sans mt-6"
            dangerouslySetInnerHTML={{ __html: renderWordPrintPreview() }}
          />
        </div>
      )}
    </div>
  );
}
