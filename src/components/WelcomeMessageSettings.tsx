import React, { useState } from "react";
import { SystemSettings, User, Office, FinancialYear, WelcomeMessageSlot } from "../types";
import { 
  Sunrise, SunMedium, Sunset, Moon, Sparkles, RotateCcw, 
  Eye, HelpCircle, Save, AlertTriangle, Clock, CheckCircle2,
  Megaphone, Plus, Trash2, LayoutDashboard, ArrowRightLeft, DollarSign, Receipt
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface WelcomeMessageSettingsProps {
  settingsForm: SystemSettings;
  setSettingsForm: React.Dispatch<React.SetStateAction<SystemSettings>>;
  onSave: (e: React.FormEvent) => Promise<void>;
  currentUser: User;
  offices: Office[];
  financialYears: FinancialYear[];
  isSaving: boolean;
  saveSuccessMsg: string;
}

const DEFAULT_WELCOME_MESSAGES: Record<"morning" | "afternoon" | "evening" | "night", WelcomeMessageSlot> = {
  morning: {
    line1: "হ্যালো {name}, শুভ সকাল! 👋",
    line2: "আজকের কাজের জন্য {system}-এ আপনাকে স্বাগতম।"
  },
  afternoon: {
    line1: "হ্যালো {name}, শুভ অপরাহ্ন! 👋",
    line2: "{system}-এ ফিরে আসায় আপনাকে স্বাগতম।"
  },
  evening: {
    line1: "হ্যালো {name}, শুভ সন্ধ্যা! 👋",
    line2: "{system}-এ ফিরে আসায় আপনাকে স্বাগতম।"
  },
  night: {
    line1: "হ্যালো {name}, শুভ রাত্রি! 👋",
    line2: "{system}-এ ফিরে আসায় আপনাকে স্বাগতম।"
  }
};

const DEFAULT_NOTICES = [
  "অর্থবছর {fiscal_year}-এর সকল বাজেট বরাদ্দ ও ব্যয় বিবরণী যথাসময়ে নোট শিটের মাধ্যমে দাখিল ও সমন্বয় সম্পন্ন করুন।",
  "সরকারি আর্থিক বিধিমালা ও বাজেট নির্দেশিকা অনুযায়ী প্রতিটি ভাউচারের বিপরীতে অনুমোদিত বিল ভাউচার নিশ্চিত করুন।",
  "উপ-আঞ্চলিক ও শাখা কার্যালয়ের অতিরিক্ত বরাদ্দ বা পুনঃউপযোজনের আবেদন প্রধান কার্যালয়ের বাজেট শাখায় প্রেরণ করুন।",
  "অফিসিয়াল ব্যয় এন্ট্রি ও নোট শিট অনুমোদনের পর চূড়ান্ত প্রিন্ট কপি অডিট ফাইলের জন্য সংরক্ষণ করুন।"
];

const VALID_PLACEHOLDERS = ["{name}", "{system}", "{office}", "{fiscal_year}", "{greeting}", "{institution}"];

export function WelcomeMessageSettings({
  settingsForm,
  setSettingsForm,
  onSave,
  currentUser,
  offices,
  financialYears,
  isSaving,
  saveSuccessMsg
}: WelcomeMessageSettingsProps) {
  const { language, t } = useLanguage();
  const { theme, isCustom, isDark } = useTheme();
  const isOcean = theme === "ocean";

  // Active preview tab for testing all 4 periods
  const [previewSlot, setPreviewSlot] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [previewOfficeId, setPreviewOfficeId] = useState<string>(currentUser.officeId || offices[0]?.id || "");
  const [newNoticeText, setNewNoticeText] = useState("");

  // Track focused field for 1-click placeholder insertion
  const [focusedField, setFocusedField] = useState<{ type: "welcome"; slot: "morning" | "afternoon" | "evening" | "night"; line: "line1" | "line2" } | { type: "newNotice" } | { type: "notice"; index: number } | null>({
    type: "welcome",
    slot: "morning",
    line: "line1"
  });

  const currentOffice = offices.find(o => o.id === (previewOfficeId || currentUser.officeId)) || offices[0];
  const activeFY = financialYears.find(f => f.isActive) || financialYears[0];

  const currentNotices = (settingsForm.notices && settingsForm.notices.length > 0) ? settingsForm.notices : DEFAULT_NOTICES;

  // Helper to extract messages or fallback
  const getSlotMessage = (slotKey: "morning" | "afternoon" | "evening" | "night"): WelcomeMessageSlot => {
    const custom = settingsForm.welcomeMessages?.[slotKey];
    return {
      line1: custom?.line1 !== undefined ? custom.line1 : DEFAULT_WELCOME_MESSAGES[slotKey].line1,
      line2: custom?.line2 !== undefined ? custom.line2 : DEFAULT_WELCOME_MESSAGES[slotKey].line2
    };
  };

  const handleFieldChange = (
    slotKey: "morning" | "afternoon" | "evening" | "night",
    lineKey: "line1" | "line2",
    value: string
  ) => {
    setSettingsForm(prev => {
      const currentMessages = prev.welcomeMessages || {};
      const currentSlot = currentMessages[slotKey] || { ...DEFAULT_WELCOME_MESSAGES[slotKey] };
      return {
        ...prev,
        welcomeMessages: {
          ...currentMessages,
          [slotKey]: {
            ...currentSlot,
            [lineKey]: value
          }
        }
      };
    });
  };

  // Insert placeholder token into currently focused input
  const insertPlaceholder = (tag: string) => {
    if (!focusedField) return;
    if (focusedField.type === "welcome") {
      const { slot, line } = focusedField;
      const currentVal = getSlotMessage(slot)[line];
      handleFieldChange(slot, line, `${currentVal} ${tag}`);
    } else if (focusedField.type === "newNotice") {
      setNewNoticeText(prev => `${prev} ${tag}`);
    } else if (focusedField.type === "notice") {
      const index = focusedField.index;
      const updated = [...currentNotices];
      updated[index] = `${updated[index]} ${tag}`;
      setSettingsForm(prev => ({ ...prev, notices: updated }));
    }
  };

  // Reset single slot to default
  const handleResetSlot = (slotKey: "morning" | "afternoon" | "evening" | "night") => {
    setSettingsForm(prev => {
      const currentMessages = { ...(prev.welcomeMessages || {}) };
      currentMessages[slotKey] = { ...DEFAULT_WELCOME_MESSAGES[slotKey] };
      return {
        ...prev,
        welcomeMessages: currentMessages
      };
    });
  };

  const [resetWelcomeConfirm, setResetWelcomeConfirm] = useState(false);
  const [resetNoticesConfirm, setResetNoticesConfirm] = useState(false);

  // Reset all 4 slots to standard defaults
  const handleResetAllWelcome = () => {
    setResetWelcomeConfirm(true);
  };

  const confirmResetWelcome = () => {
    setSettingsForm(prev => ({
      ...prev,
      welcomeMessages: {
        morning: { ...DEFAULT_WELCOME_MESSAGES.morning },
        afternoon: { ...DEFAULT_WELCOME_MESSAGES.afternoon },
        evening: { ...DEFAULT_WELCOME_MESSAGES.evening },
        night: { ...DEFAULT_WELCOME_MESSAGES.night }
      }
    }));
    setResetWelcomeConfirm(false);
  };

  // Notice Handlers
  const handleAddNotice = () => {
    if (!newNoticeText.trim()) return;
    const updated = [...currentNotices, newNoticeText.trim()];
    setSettingsForm(prev => ({ ...prev, notices: updated }));
    setNewNoticeText("");
  };

  const handleUpdateNotice = (index: number, text: string) => {
    const updated = [...currentNotices];
    updated[index] = text;
    setSettingsForm(prev => ({ ...prev, notices: updated }));
  };

  const handleDeleteNotice = (index: number) => {
    const updated = currentNotices.filter((_, i) => i !== index);
    setSettingsForm(prev => ({ ...prev, notices: updated }));
  };

  const handleResetNotices = () => {
    setResetNoticesConfirm(true);
  };

  const confirmResetNotices = () => {
    setSettingsForm(prev => ({
      ...prev,
      notices: [...DEFAULT_NOTICES]
    }));
    setResetNoticesConfirm(false);
  };

  // Replace placeholders for live preview
  const renderPreview = (template: string, slot?: "morning" | "afternoon" | "evening" | "night") => {
    if (!template) return "";
    const greetingMap = {
      morning: language === "bn" ? "শুভ সকাল" : "Good Morning",
      afternoon: language === "bn" ? "শুভ অপরাহ্ন" : "Good Afternoon",
      evening: language === "bn" ? "শুভ সন্ধ্যা" : "Good Evening",
      night: language === "bn" ? "শুভ রাত্রি" : "Good Night"
    };

    return template
      .replace(/{name}/g, currentUser.name || "Mr. Admin")
      .replace(/{system}/g, settingsForm.webAppName || "Office Allocation & Expense Management System")
      .replace(/{office}/g, currentOffice?.name || "প্রধান কার্যালয়, ঢাকা")
      .replace(/{fiscal_year}/g, activeFY?.name || "2026-2027")
      .replace(/{greeting}/g, slot ? greetingMap[slot] : (language === "bn" ? "শুভেচ্ছা" : "Greetings"))
      .replace(/{institution}/g, settingsForm.institutionName || "Government of the People's Republic of Bangladesh");
  };

  // Validate placeholders in any given text
  const checkInvalidPlaceholders = (text: string): string[] => {
    const matches = text.match(/{[a-zA-Z0-9_]+}/g) || [];
    return matches.filter(m => !VALID_PLACEHOLDERS.includes(m));
  };

  const slotsConfig: Array<{
    id: "morning" | "afternoon" | "evening" | "night";
    titleBn: string;
    titleEn: string;
    timeRange: string;
    icon: any;
    colorClasses: string;
  }> = [
    {
      id: "morning",
      titleBn: "সকাল (Morning)",
      titleEn: "Morning Greeting",
      timeRange: "05:00 AM – 11:59 AM",
      icon: Sunrise,
      colorClasses: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
    },
    {
      id: "afternoon",
      titleBn: "অপরাহ্ন (Afternoon)",
      titleEn: "Afternoon Greeting",
      timeRange: "12:00 PM – 04:59 PM",
      icon: SunMedium,
      colorClasses: "from-amber-500/20 to-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
    },
    {
      id: "evening",
      titleBn: "সন্ধ্যা (Evening)",
      titleEn: "Evening Greeting",
      timeRange: "05:00 PM – 07:59 PM",
      icon: Sunset,
      colorClasses: "from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
    },
    {
      id: "night",
      titleBn: "রাত (Night)",
      titleEn: "Night Greeting",
      timeRange: "08:00 PM – 04:59 AM",
      icon: Moon,
      colorClasses: "from-blue-500/20 to-slate-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
    }
  ];

  return (
    <div className="p-6 overflow-y-auto flex-1 max-w-5xl space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === "bn" ? "ওয়েলকাম মেসেজ ও নোটিশ/বিজ্ঞপ্তি কনফিগারেশন" : "Welcome Message & Notice Configuration"}
              </h2>
              <p className="text-xs opacity-70 mt-0.5">
                {language === "bn"
                  ? "ড্যাশবোর্ডের মূল হিরো ব্যানার এবং হেডারের ঘূর্ণায়মান নোটিশ/বিজ্ঞপ্তি বার্তা কাস্টমাইজ করুন।"
                  : "Customize Dashboard Hero welcome messages and the rotating Notice ticker displayed in the Header."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetAllWelcome}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              isDark || isCustom
                ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "ডিফল্ট রিসেট" : "Reset Defaults"}</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition ${
              isOcean
                ? "bg-sky-600 hover:bg-sky-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{language === "bn" ? "সংরক্ষণ করুন" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Interactive Placeholder insertion toolbar */}
      <div className={`p-4 rounded-2xl border ${
        isCustom
          ? "bg-[#18122d] border-[#382b61]"
          : isDark
          ? "bg-slate-850 border-slate-800"
          : "bg-emerald-50/60 border-emerald-100"
      }`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {language === "bn" ? "উপলব্ধ ডায়নামিক প্লেসহোল্ডার (Click to Insert)" : "Available Dynamic Placeholders"}
            </span>
          </div>
          <span className="text-xs opacity-60">
            {language === "bn" ? "ক্লিক করলেই সক্রিয় ইনপুটে যুক্ত হবে" : "Click any token to append to active field"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { tag: "{name}", labelBn: "ব্যবহারকারীর নাম", labelEn: "Officer's Name" },
            { tag: "{system}", labelBn: "সিস্টেম নাম", labelEn: "System Title" },
            { tag: "{office}", labelBn: "অফিস পরিচিতি", labelEn: "Assigned Office" },
            { tag: "{fiscal_year}", labelBn: "চলতি অর্থবছর", labelEn: "Fiscal Year" },
            { tag: "{greeting}", labelBn: "সময়ভিত্তিক অভিবাদন", labelEn: "Greeting Phrase" },
            { tag: "{institution}", labelBn: "প্রতিষ্ঠানের নাম", labelEn: "Institution" }
          ].map(p => (
            <button
              key={p.tag}
              type="button"
              onClick={() => insertPlaceholder(p.tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition active:scale-95 ${
                isCustom
                  ? "bg-[#251d45] border-[#4b3b7a] text-amber-300 hover:bg-[#32285e]"
                  : isDark
                  ? "bg-slate-800 border-slate-700 text-emerald-300 hover:bg-slate-700"
                  : "bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50 shadow-2xs"
              }`}
              title={`Click to insert ${p.tag}`}
            >
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.tag}</span>
              <span className="text-xs opacity-60 font-sans">({language === "bn" ? p.labelBn : p.labelEn})</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: Welcome Message Slots (Displays in Dashboard Hero Card) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === "bn" ? "১. ড্যাশবোর্ড ওয়েলকাম মেসেজ সেটিংস (৪টি সময়ভিত্তিক স্লট)" : "1. Dashboard Welcome Message Slots"}
            </h3>
            <p className="text-xs opacity-70">
              {language === "bn"
                ? "এই বার্তাগুলো ড্যাশবোর্ডের মূল ব্যানারে (নীচের বারে) লগইনকৃত কর্মকর্তার সময় অনুযায়ী প্রদর্শিত হয়।"
                : "These greeting messages appear directly inside the Dashboard Hero Banner based on local time."}
            </p>
          </div>
        </div>

        {/* 4 Time Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {slotsConfig.map(slot => {
            const Icon = slot.icon;
            const msg = getSlotMessage(slot.id);
            const invalidLine1 = checkInvalidPlaceholders(msg.line1);
            const invalidLine2 = checkInvalidPlaceholders(msg.line2);

            return (
              <div
                key={slot.id}
                className={`rounded-2xl border p-5 transition relative flex flex-col justify-between ${
                  isCustom
                    ? "bg-[#18122d] border-[#382b61]"
                    : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-white border-slate-200 shadow-2xs"
                }`}
              >
                <div>
                  {/* Slot Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border bg-gradient-to-br ${slot.colorClasses}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {language === "bn" ? slot.titleBn : slot.titleEn}
                        </h4>
                        <span className="text-xs font-mono opacity-60 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {slot.timeRange}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResetSlot(slot.id)}
                      className="text-xs font-medium text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition"
                      title="Reset to default template"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{language === "bn" ? "রিসেট" : "Reset"}</span>
                    </button>
                  </div>

                  {/* Field 1: Headline */}
                  <div className="space-y-1.5 mb-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold opacity-80">
                        {language === "bn" ? "প্রধান অভিবাদন (Headline):" : "Primary Headline:"}
                      </label>
                      <span className="text-xs font-mono opacity-50">
                        {msg.line1.length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={msg.line1}
                      onFocus={() => setFocusedField({ type: "welcome", slot: slot.id, line: "line1" })}
                      onChange={e => handleFieldChange(slot.id, "line1", e.target.value)}
                      placeholder={DEFAULT_WELCOME_MESSAGES[slot.id].line1}
                      className={`w-full px-3.5 py-2 border rounded-xl text-xs focus:outline-none transition ${
                        isCustom
                          ? "bg-[#231a40] border-[#43356e] text-purple-100 focus:border-amber-400"
                          : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 focus:bg-white"
                      }`}
                    />
                    {invalidLine1.length > 0 && (
                      <p className="text-xs text-amber-500 flex items-center gap-1 font-mono mt-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        অপরিচিত প্লেসহোল্ডার: {invalidLine1.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Field 2: Subtitle */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold opacity-80">
                        {language === "bn" ? "সাবটাইটেল বার্তা (Subtitle):" : "Subtitle Description:"}
                      </label>
                      <span className="text-xs font-mono opacity-50">
                        {msg.line2.length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={msg.line2}
                      onFocus={() => setFocusedField({ type: "welcome", slot: slot.id, line: "line2" })}
                      onChange={e => handleFieldChange(slot.id, "line2", e.target.value)}
                      placeholder={DEFAULT_WELCOME_MESSAGES[slot.id].line2}
                      className={`w-full px-3.5 py-2 border rounded-xl text-xs focus:outline-none transition ${
                        isCustom
                          ? "bg-[#231a40] border-[#43356e] text-purple-100 focus:border-amber-400"
                          : isDark
                          ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 focus:bg-white"
                      }`}
                    />
                    {invalidLine2.length > 0 && (
                      <p className="text-xs text-amber-500 flex items-center gap-1 font-mono mt-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        অপরিচিত প্লেসহোল্ডার: {invalidLine2.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Slot mini preview */}
                <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/80">
                  <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {language === "bn" ? "তাৎক্ষণিক নমুনা (Preview):" : "Slot Preview:"}
                  </div>
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isDark ? "bg-slate-900/80 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {renderPreview(msg.line1, slot.id)}
                    </p>
                    <p className="text-xs opacity-75 truncate mt-0.5">
                      {renderPreview(msg.line2, slot.id)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Rotating Notice / Announcement Configuration (Displays in Top Header Bar) */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "bn" ? "২. ঘূর্ণায়মান নোটিশ ও বিজ্ঞপ্তি ব্যবস্থাপনা (Header Notice Bar)" : "2. Rotating Notice & Announcements Management"}
              </h3>
              <p className="text-xs opacity-70">
                {language === "bn"
                  ? "এই বিজ্ঞপ্তিগুলো হেডারের শীর্ষে একটার পর একটা স্বয়ংক্রিয়ভাবে প্রদর্শিত হয়।"
                  : "These announcements cycle continuously one-by-one in the Top Header Notice Bar."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetNotices}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "বিজ্ঞপ্তি ডিফল্ট রিসেট" : "Reset Notices"}</span>
          </button>
        </div>

        {/* Add New Notice Input */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-2.5 items-center ${
          isDark ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <input
            type="text"
            value={newNoticeText}
            onFocus={() => setFocusedField({ type: "newNotice" })}
            onChange={e => setNewNoticeText(e.target.value)}
            placeholder={language === "bn" ? "নতুন নোটিশ বা বিজ্ঞপ্তি লিখুন (প্লেসহোল্ডার সমর্থিত)..." : "Write a new announcement (supports placeholders)..."}
            className={`flex-1 w-full px-3.5 py-2 border rounded-xl text-xs focus:outline-none transition ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-500"
            }`}
          />
          <button
            type="button"
            onClick={handleAddNotice}
            disabled={!newNoticeText.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "bn" ? "বিজ্ঞপ্তি যুক্ত করুন" : "Add Notice"}</span>
          </button>
        </div>

        {/* Existing Notices List */}
        <div className="space-y-2.5">
          {currentNotices.map((notice, idx) => {
            const invalid = checkInvalidPlaceholders(notice);
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
                  isDark ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200 shadow-2xs"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    type="text"
                    value={notice}
                    onFocus={() => setFocusedField({ type: "notice", index: idx })}
                    onChange={e => handleUpdateNotice(idx, e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none transition ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white"
                    }`}
                  />
                  {invalid.length > 0 && (
                    <p className="text-xs text-amber-500 flex items-center gap-1 font-mono">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      অপরিচিত প্লেসহোল্ডার: {invalid.join(", ")}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteNotice(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-rose-500/10"
                  title="Delete Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Interactive Live Preview Sandbox */}
      <div className={`p-5 rounded-2xl border ${
        isCustom
          ? "bg-[#18122d] border-[#382b61]"
          : isDark
          ? "bg-slate-850 border-slate-800"
          : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === "bn" ? "লাইভ সিমুলেশন ও পূর্বরূপ (Live Preview Sandbox)" : "Interactive Live Preview Sandbox"}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time Slot Switcher */}
            <div className={`flex rounded-xl p-0.5 border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}>
              {(["morning", "afternoon", "evening", "night"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPreviewSlot(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    previewSlot === s
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {s === "morning" && (language === "bn" ? "🌅 সকাল" : "Morning")}
                  {s === "afternoon" && (language === "bn" ? "☀️ অপরাহ্ন" : "Afternoon")}
                  {s === "evening" && (language === "bn" ? "🌇 সন্ধ্যা" : "Evening")}
                  {s === "night" && (language === "bn" ? "🌙 রাত" : "Night")}
                </button>
              ))}
            </div>

            {/* Office Switcher for simulation */}
            <select
              value={previewOfficeId}
              onChange={e => setPreviewOfficeId(e.target.value)}
              className={`text-xs font-semibold px-2 py-1 rounded-xl border focus:outline-none ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-slate-100 border-slate-200 text-slate-800"
              }`}
            >
              {offices.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Mockup of Dashboard Hero Banner */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "ড্যাশবোর্ড হিরো ব্যানার (Dashboard Hero Banner):" : "Dashboard Hero Banner Preview:"}</span>
          </div>

          <div className={`p-5 rounded-2xl border shadow-inner transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
            isCustom
              ? "bg-gradient-to-r from-[#18132d] via-[#281c4a] to-[#3b276b] text-purple-50 border-[#4a357b]"
              : isDark
              ? "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white border-slate-700"
              : "bg-gradient-to-r from-[#2c2825] via-[#38332e] to-[#2c2825] text-amber-50 border-[#443e38]"
          }`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#c05621]/20 text-emerald-400 border border-[#c05621]/30 font-medium">
                  {currentOffice?.name || "প্রধান কার্যালয় (Head Office)"}
                </span>
                <span className="text-slate-300 text-xs font-mono">
                  অর্থবছর: <strong className="text-white">{activeFY?.name || "2026-2027"}</strong>
                </span>
              </div>
              <h4 className="text-lg font-bold text-white flex items-center gap-1.5">
                {renderPreview(getSlotMessage(previewSlot).line1, previewSlot)}
              </h4>
              <p className="text-xs opacity-75 mt-0.5 text-amber-200">
                {renderPreview(getSlotMessage(previewSlot).line2, previewSlot)}
              </p>
              <p className="text-xs font-mono mt-1 opacity-70 text-amber-300 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                হিসাব সূত্র: প্রারম্ভিক স্থিতি + বরাদ্দ + অতিরিক্ত বরাদ্দ ± সমন্বয় - ব্যয় = অবশিষ্ট স্থিতি
              </p>
            </div>

            {/* Date + Buttons Preview */}
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <div className="text-xs font-medium px-2.5 py-1 rounded-lg bg-black/30 border border-white/15 text-amber-100">
                <span>📅 {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="opacity-40 mx-1">|</span>
                <span className="text-emerald-400 font-mono">{activeFY?.name || "2026-2027"}</span>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-[#c05621] text-white text-xs font-semibold flex items-center gap-1 shadow">
                  <Receipt className="w-3.5 h-3.5" /> নতুন ব্যয় এন্ট্রি
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 border border-slate-600">
                  <DollarSign className="w-3.5 h-3.5" /> নতুন বরাদ্দ প্রদান
                </span>
              </div>
            </div>
          </div>

          {/* Header Notice Ticker Preview */}
          <div className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 pt-2">
            <Megaphone className="w-3.5 h-3.5 text-rose-500" />
            <span>{language === "bn" ? "হেডার নোটিশ বার (Header Notice Ticker Preview):" : "Header Notice Ticker Preview:"}</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
            isDark ? "bg-slate-950 border-slate-800" : "bg-emerald-50 border-emerald-200"
          }`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 font-bold text-xs flex items-center gap-1 shrink-0 border border-rose-500/30">
                <Megaphone className="w-3 h-3 animate-pulse" />
                বিজ্ঞপ্তি
              </span>
              <p className="text-xs font-medium truncate text-slate-800 dark:text-slate-200">
                {renderPreview(currentNotices[0] || DEFAULT_NOTICES[0])}
              </p>
            </div>
            <span className="text-xs font-mono opacity-60 shrink-0">(১/{currentNotices.length})</span>
          </div>
        </div>
      </div>

      {resetWelcomeConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div className="m-auto bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">{language === "bn" ? "নিশ্চিত করুন" : "Confirm Reset"}</h3>
            <p className="text-sm text-slate-600 mb-6">
              {language === "bn" ? "আপনি কি সমস্ত ওয়েলকাম মেসেজ পূর্বনির্ধারিত ডিফল্ট মানে রিসেট করতে চান?" : "Reset all welcome messages to defaults?"}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetWelcomeConfirm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm">{t.cancel}</button>
              <button onClick={confirmResetWelcome} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow text-sm">{language === "bn" ? "হ্যাঁ, রিসেট করুন" : "Yes, Reset"}</button>
            </div>
          </div>
        </div>
      )}

      {resetNoticesConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div className="m-auto bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">{language === "bn" ? "নিশ্চিত করুন" : "Confirm Reset"}</h3>
            <p className="text-sm text-slate-600 mb-6">
              {language === "bn" ? "আপনি কি সমস্ত বিজ্ঞপ্তি পূর্বনির্ধারিত ডিফল্ট মানে রিসেট করতে চান?" : "Reset all notices to defaults?"}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetNoticesConfirm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm">{t.cancel}</button>
              <button onClick={confirmResetNotices} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow text-sm">{language === "bn" ? "হ্যাঁ, রিসেট করুন" : "Yes, Reset"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
