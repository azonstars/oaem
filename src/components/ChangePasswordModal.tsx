import { apiFetch } from "../api";
import React, { useState } from "react";
import { X, KeyRound, Check, AlertCircle } from "lucide-react";
import { User } from "../types";
import { useLanguage } from "../i18n";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser?: (user: User) => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}: ChangePasswordModalProps) {
  const { language } = useLanguage();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;
  const forceChange = currentUser.mustChangePassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError(
        language === "bn"
          ? "নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।"
          : "New password and confirm password do not match.",
      );
      return;
    }

    if (newPassword.length < 4) {
      setError(
        language === "bn"
          ? "পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে।"
          : "Password must be at least 4 characters long.",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(
          language === "bn"
            ? "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!"
            : "Password successfully updated!",
        );
        if (onUpdateUser && data.user) {
          onUpdateUser(data.user);
        }
        setTimeout(() => {
          onClose();
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setSuccess("");
        }, 1500);
      } else {
        setError(
          data.error ||
            (language === "bn"
              ? "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।"
              : "Failed to change password."),
        );
      }
    } catch (err) {
      setError(
        language === "bn"
          ? "সার্ভার সংযোগে ত্রুটি হয়েছে।"
          : "Server connection error.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex overflow-y-auto p-4 sm:p-6">
      <div className="m-auto bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        {!forceChange && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {forceChange
                ? language === "bn"
                  ? "বাধ্যতামূলক পাসওয়ার্ড পরিবর্তন"
                  : "Mandatory Password Change"
                : language === "bn"
                  ? "পাসওয়ার্ড পরিবর্তন করুন"
                  : "Change Password"}
            </h3>
            <p className="text-xs text-slate-400">
              {currentUser.name} ({currentUser.userId || currentUser.email})
            </p>
          </div>
        </div>

        {forceChange && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {language === "bn"
                ? "আপনার অ্যাকাউন্টের নিরাপত্তার জন্য প্রথম লগইনে পাসওয়ার্ড পরিবর্তন করা বাধ্যতামূলক।"
                : "For your account security, it is mandatory to change your password on first login."}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === "bn" ? "পুরাতন পাসওয়ার্ড" : "Current Password"}
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === "bn" ? "নতুন পাসওয়ার্ড" : "New Password"}
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {language === "bn"
                ? "নতুন পাসওয়ার্ড নিশ্চিত করুন"
                : "Confirm New Password"}
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            {!forceChange && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
            >
              {loading
                ? language === "bn"
                  ? "সংরক্ষণ হচ্ছে..."
                  : "Saving..."
                : language === "bn"
                  ? "পাসওয়ার্ড পরিবর্তন করুন"
                  : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
