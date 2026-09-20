import { apiFetch } from "../api";
import React, { useState, useEffect } from "react";
import { User, SystemSettings } from "../types";
import {
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Workflow,
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

  const [publicSettings, setPublicSettings] = useState<Partial<SystemSettings>>({});

  useEffect(() => {
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

  const handleQuickFill = (u: string, p: string) => {
    setUserId(u);
    setPassword(p);
    setError("");
  };

  const effectiveLoginLogo = publicSettings?.loginLogoUrl || systemSettings?.loginLogoUrl;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10 border-b border-slate-800/60 backdrop-blur-md bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Workflow className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                FlowBoard
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Workspace Hub
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === "bn"
                ? "ফ্লোবোর্ড এন্টারপ্রাইজ ওয়ার্কস্পেস ও রিসোর্স প্ল্যাটফর্ম"
                : "FlowBoard Enterprise Workspace & Resource Platform"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="lang-toggle-btn"
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>🌐</span>
            <span>{language === "bn" ? "English" : "বাংলা"}</span>
          </button>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Top glowing bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl shadow-emerald-950/50 mb-3 ring-4 ring-emerald-500/10">
                {effectiveLoginLogo && effectiveLoginLogo.trim() !== "" ? (
                  <img
                    src={effectiveLoginLogo}
                    alt="Login Logo"
                    className="w-12 h-12 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-md">
                    <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                      <Workflow className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                FlowBoard
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {language === "bn"
                  ? "স্বতন্ত্র টুলস ও মডুলার প্রজেক্ট ম্যানেজমেন্ট ওয়ার্কস্পেস"
                  : "Independent Tools & Modular Project Workspace"}
              </p>

              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {language === "bn"
                    ? "নিরাপদ কেন্দ্রীয় প্রবেশদ্বার"
                    : "Single Sign-On Access Hub"}
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === "bn" ? "ইউজার আইডি / ইমেইল" : "User ID / Email"}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-username"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. admin or ctg_manager"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
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
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                    required
                  />
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {language === "bn"
                        ? "যাচাই করা হচ্ছে..."
                        : "Verifying credentials..."}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>
                      {language === "bn"
                        ? "FlowBoard-এ প্রবেশ করুন"
                        : "Enter FlowBoard"}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials for Convenience */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {language === "bn" ? "দ্রুত লগইন প্রিসেট:" : "Quick Sign-In Presets:"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin", "password123")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] text-slate-300 border border-slate-700 transition text-left flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Super Admin</div>
                    <div className="text-[10px] text-slate-400">admin</div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("manager", "password123")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] text-slate-300 border border-slate-700 transition text-left flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Sub-office User</div>
                    <div className="text-[10px] text-slate-400">manager</div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-3 border-t border-slate-800/60 text-center text-[11px] text-slate-500 backdrop-blur-md bg-slate-950/40 z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>FlowBoard Enterprise Workspace Architecture</span>
        </div>
        <div>
          © 2026 FlowBoard • {language === "bn" ? "সর্বস্বত্ব সংরক্ষিত (All Rights Reserved)" : "All Rights Reserved"}
        </div>
      </footer>
    </div>
  );
}
