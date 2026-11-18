import React, { useMemo, useRef } from "react";
import JoditEditor from "jodit-react";
import { Table2 } from "lucide-react";

interface RichDocumentEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  fontFamily?: string;
  fontSizePt?: number;
  placeholder?: string;
  showTableHint?: boolean;
}

const JODIT_FONT_LIST: Record<string, string> = {
  "'Hind Siliguri', 'Kalpurush', sans-serif": "হিন্দ শিলিগুড়ি (Hind Siliguri)",
  "'Kalpurush', 'Hind Siliguri', serif": "কালপুরুষ (Kalpurush)",
  "'SolaimanLipi', 'Hind Siliguri', sans-serif": "সোলায়মান লিপি (SolaimanLipi)",
  "'Times New Roman', 'Hind Siliguri', serif": "টাইমস নিউ রোমান (Times New Roman)",
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
  8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48,
];

export function RichDocumentEditor({
  value,
  onChange,
  minHeight = 460,
  fontFamily = "'Hind Siliguri', 'Kalpurush', sans-serif",
  fontSizePt = 11,
  placeholder = "ডকুমেন্টের বিষয়বস্তু ও টেবিল এখানে সম্পাদনা করুন...",
  showTableHint = true,
}: RichDocumentEditorProps) {
  const editorRef = useRef<any>(null);

  const config = useMemo(
    () => ({
      readonly: false,
      minHeight,
      language: "en",
      toolbarAdaptive: false,
      toolbarSticky: false,
      spellcheck: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: "insert_as_html" as any,
      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
      placeholder,
      style: {
        fontFamily,
        fontSize: `${fontSizePt}pt`,
        lineHeight: 1.55,
        color: "#0f172a",
      },
      editorCssClass: "rich-doc-jodit-body",
      controls: {
        font: {
          list: JODIT_FONT_LIST,
        },
        fontsize: {
          list: JODIT_FONT_SIZES.map((s) => `${s}px`),
        },
      },
      table: {
        selectionCellStyle: "border: 2px solid #2563eb !important; background-color: #eff6ff !important;",
        useExtraClassesOptions: false,
      },
      popup: {
        cells: [
          "addcolumn",
          "addrow",
          "|",
          "merge",
          "splitv",
          "splith",
          "|",
          "delete",
          "|",
          "align",
          "valign",
          "brush",
        ],
      },
      buttons: [
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
        "hr",
        "link",
        "|",
        "undo",
        "redo",
        "|",
        "eraser",
        "source",
        "fullsize",
      ],
    }),
    [minHeight, fontFamily, fontSizePt, placeholder],
  );

  return (
    <div className="rich-document-editor-wrapper space-y-2">
      <style>{`
        .rich-doc-jodit-body table {
          border-collapse: collapse !important;
          width: 100%;
          margin: 8px 0;
        }
        .rich-doc-jodit-body table th,
        .rich-doc-jodit-body table td {
          border: 1px solid #334155 !important;
          padding: 4px 6px;
          vertical-align: top;
        }
        .rich-doc-jodit-body table thead th {
          background-color: #f1f5f9;
          font-weight: 700;
        }
      `}</style>
      {showTableHint && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
          <Table2 size={15} className="text-indigo-600 shrink-0" />
          <span>
            <strong>টেবিল ও টেক্সট এডিটর টিপস:</strong> নতুন টেবিল বসাতে টুলবারের <strong>Table</strong> আইকনে ক্লিক করুন। যেকোনো সেলে মাউস ড্র্যাগ করে সিলেক্ট করলে <strong>সেল মার্চ (Merge)</strong>, <strong>স্প্লিট</strong>, <strong>রো/কলাম ইনসার্ট</strong> ও <strong>ডিলিট</strong> অপশন চলে আসবে।
          </span>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs text-slate-900">
        <JoditEditor
          ref={editorRef}
          value={value}
          config={config}
          onBlur={(newContent) => onChange(newContent)}
          onChange={(newContent) => onChange(newContent)}
        />
      </div>
    </div>
  );
}
