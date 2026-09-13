import React, { useState } from "react";
import { UserPlus, X, Send, User, Mail, Briefcase, Hash } from "lucide-react";
import { apiFetch } from "../api";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface ProposeUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  officeName?: string;
}

export function ProposeUserModal({
  isOpen,
  onClose,
  onSuccess,
  officeName,
}: ProposeUserModalProps) {
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const isOcean = theme === "ocean";

  const [proposalName, setProposalName] = useState("");
  const [proposalUserId, setProposalUserId] = useState("");
  const [proposalEmail, setProposalEmail] = useState("");
  const [proposalDesignation, setProposalDesignation] = useState("");
  const [proposalLoading, setProposalLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalName.trim() || !proposalUserId.trim()) {
      setFeedback({
        type: "error",
        message:
          language === "bn"
            ? "নাম এবং ইউজার আইডি আবশ্যক।"
            : "Name and User ID are required.",
      });
      return;
    }

    setProposalLoading(true);
    setFeedback(null);

    try {
      const res = await apiFetch("/api/users/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: proposalName.trim(),
          userId: proposalUserId.trim(),
          email: proposalEmail.trim(),
          designation: proposalDesignation.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          message:
            language === "bn"
              ? "আপনার সহকর্মীর আইডি প্রস্তাব সফলভাবে পাঠানো হয়েছে। এডমিন অনুমোদন দিলে তিনি সিস্টেমে লগইন করতে পারবেন।"
              : "Colleague user ID proposal submitted successfully. It will be active once approved by Admin.",
        });
        setProposalName("");
        setProposalUserId("");
        setProposalEmail("");
        setProposalDesignation("");
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setFeedback({
          type: "error",
          message:
            data.error ||
            (language === "bn"
              ? "প্রস্তাব পাঠাতে ত্রুটি হয়েছে।"
              : "Failed to submit proposal."),
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message:
          language === "bn"
            ? "নেটওয়ার্ক ত্রুটি। পুনরায় চেষ্টা করুন।"
            : "Network error. Please try again.",
      });
    } finally {
      setProposalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border ${
          isOcean
            ? "bg-[#0f172a] border-sky-800 text-sky-100"
            : isDark
              ? "bg-slate-900 border-slate-700 text-slate-100"
              : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isOcean
              ? "bg-sky-950/60 border-sky-900/60"
              : isDark
                ? "bg-slate-800/50 border-slate-800"
                : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {language === "bn"
                  ? "সহকর্মীর ইউজার আইডির প্রস্তাবনা"
                  : "Propose Colleague User ID"}
              </h3>
              {officeName && (
                <p className="text-xs opacity-70">
                  {language === "bn"
                    ? `কার্যালয়: ${officeName}`
                    : `Office: ${officeName}`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          onSubmit={handleSubmit}
          className="p-5 flex flex-col gap-4 text-xs"
        >
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold ${
                feedback.type === "success"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-400"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1.5 opacity-90">
              {language === "bn"
                ? "সহকর্মীর পূর্ণ নাম *"
                : "Colleague's Full Name *"}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
              <input
                type="text"
                required
                value={proposalName}
                onChange={(e) => setProposalName(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                  isOcean
                    ? "bg-slate-950/60 border-sky-800 text-white"
                    : isDark
                      ? "bg-slate-950 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                }`}
                placeholder={
                  language === "bn"
                    ? "উদা: মোঃ রহিম হোসেন"
                    : "e.g. Md. Rahim Hossain"
                }
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1.5 opacity-90">
              {language === "bn"
                ? "প্রস্তাবিত ইউজার আইডি (লগইন আইডি) *"
                : "Requested User ID (Login ID) *"}
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
              <input
                type="text"
                required
                value={proposalUserId}
                onChange={(e) =>
                  setProposalUserId(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""),
                  )
                }
                className={`w-full pl-9 pr-3 py-2 border rounded-xl font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                  isOcean
                    ? "bg-slate-950/60 border-sky-800 text-white"
                    : isDark
                      ? "bg-slate-950 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                }`}
                placeholder="e.g. rahim_ctg"
              />
            </div>
            <p className="text-[10px] opacity-60 mt-1">
              {language === "bn"
                ? "ইংরেজি ছোট হাতের অক্ষর, সংখ্যা বা আন্ডারস্কোর ব্যবহার করুন।"
                : "Use lowercase letters, numbers, or underscore."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1.5 opacity-90">
                {language === "bn" ? "পদবী" : "Designation"}
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
                <input
                  type="text"
                  value={proposalDesignation}
                  onChange={(e) => setProposalDesignation(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    isOcean
                      ? "bg-slate-950/60 border-sky-800 text-white"
                      : isDark
                        ? "bg-slate-950 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                  placeholder={
                    language === "bn"
                      ? "উদা: হিসাব সহকারী"
                      : "e.g. Accounts Officer"
                  }
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5 opacity-90">
                {language === "bn" ? "ইমেইল এড্রেস" : "Email Address"}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
                <input
                  type="email"
                  value={proposalEmail}
                  onChange={(e) => setProposalEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    isOcean
                      ? "bg-slate-950/60 border-sky-800 text-white"
                      : isDark
                        ? "bg-slate-950 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                  placeholder="rahim@office.gov.bd"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] leading-relaxed">
            {language === "bn"
              ? "ℹ️ প্রস্তাবটি জমা দেওয়ার পর এডমিন বা সুপার এডমিন এটি পর্যালোচনা করে অনুমোদন করবেন।"
              : "ℹ️ After submission, Admin or Super Admin will review and activate this account."}
          </div>

          <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-700/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold opacity-70 hover:opacity-100 transition"
            >
              {language === "bn" ? "বাতিল" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={proposalLoading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-sky-600/30 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {proposalLoading
                ? language === "bn"
                  ? "পাঠানো হচ্ছে..."
                  : "Submitting..."
                : language === "bn"
                  ? "প্রস্তাব পাঠান"
                  : "Submit Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
