import { apiFetch } from "../api";
import React, { useState, useEffect } from "react";
import { User, SystemSettings } from "../types";
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "../i18n";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  systemSettings: SystemSettings | null;
}

export function LoginView({ onLoginSuccess, systemSettings }: LoginViewProps) {
  const { language, setLanguage } = useLanguage();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [publicSettings, setPublicSettings] = useState<Partial<SystemSettings>>(
    {},
  );

  useEffect(() => {
    // Fetch public settings on mount
    apiFetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setPublicSettings(data);
        }
      })
      .catch((err) => console.error("Failed to load public settings", err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError(
        language === "bn"
          ? "অনুগ্রহ করে ইউজার আইডি এবং পাসওয়ার্ড প্রদান করুন।"
          : "Please enter User ID and Password.",
      );
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) localStorage.setItem("govt_app_token", data.token);
        onLoginSuccess(data.user);
      } else {
        setError(
          data.error ||
            (language === "bn"
              ? "লগইন ব্যর্থ হয়েছে। ইউজার আইডি বা পাসওয়ার্ড সঠিক নয়।"
              : "Login failed. Invalid User ID or Password."),
        );
      }
    } catch {
      setError(
        language === "bn"
          ? "সার্ভার সংযোগে ত্রুটি হয়েছে।"
          : "Server connection error.",
      );
    } finally {
      setLoading(false);
    }
  };

  const effectiveLogo = publicSettings?.logoUrl || systemSettings?.logoUrl;
  const effectiveInstitution =
    publicSettings?.institutionName ||
    systemSettings?.institutionName ||
    (language === "bn"
      ? "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"
      : "Government of Bangladesh");
  const effectiveAppName =
    publicSettings?.webAppName ||
    systemSettings?.webAppName ||
    (language === "bn"
      ? "অফিস বরাদ্দ ও ব্যয় ব্যবস্থাপনা সিস্টেম"
      : "Office Allocation & Expense Management System");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex flex-col items-center justify-center p-4 text-slate-100">
      {/* Language Switcher top right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 shadow"
        >
          🌐 {language === "bn" ? "English" : "বাংলা"}
        </button>
      </div>

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl p-8 backdrop-blur-xl relative overflow-hidden">
        {/* Decorative accent top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-500 rounded-full" />

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg border border-emerald-400/30">
            {effectiveLogo ? (
              <img
                src={effectiveLogo}
                alt="Logo"
                className="w-12 h-12 object-contain rounded-xl"
              />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {effectiveInstitution}
          </h1>
          <p className="text-xs text-sky-400 font-medium mt-1">
            {effectiveAppName}
          </p>
          <div className="mt-3 inline-block bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-700 font-mono">
            🔐{" "}
            {language === "bn"
              ? "নিরাপদ অভ্যন্তরীণ লগইন পোর্টাল"
              : "Secure Internal Login Portal"}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {language === "bn" ? "ইউজার আইডি / ইমেল" : "User ID / Email"}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. admin or ctg_manager"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {language === "bn" ? "পাসওয়ার্ড" : "Password"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold py-3 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2 mt-2"
          >
            <LogIn className="w-4 h-4" />
            {loading
              ? language === "bn"
                ? "যাচাই করা হচ্ছে..."
                : "Authenticating..."
              : language === "bn"
                ? "লগইন করুন"
                : "Secure Login"}
          </button>
        </form>
      </div>
      <div className="mt-6 text-center text-xs text-slate-500">
        © 2026 Government Allocation & Expense System • Secure Access Control
      </div>
    </div>
  );
}
