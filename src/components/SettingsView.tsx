import { apiFetch } from "../api";
import React, { useState, useRef } from "react";
import { SystemSettings, FinancialYear, Office, Category, User, UserRole } from "../types";
import { 
  Settings, Calendar, Folder, Users, Plus, Check, X, 
  Building2, Save, Upload, Image as ImageIcon, Trash2, RefreshCw, KeyRound,
  Lock, AlertTriangle, Edit2
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../i18n";
import { AppsScriptDeployView } from "./AppsScriptDeployView";
import { WelcomeMessageSettings } from "./WelcomeMessageSettings";
import { DeveloperProfile } from "./DeveloperProfile";
import { DatabaseSettingsTab } from "./DatabaseSettingsTab";

interface SettingsViewProps {
  activeTab?: string;
  systemSettings: SystemSettings;
  financialYears: FinancialYear[];
  offices: Office[];
  categories: Category[];
  users: User[];
  currentUser: User;
  allocations?: any[];
  expenses?: any[];
  refreshData: () => void;
}

export function SettingsView({ 
  activeTab = "general", 
  systemSettings, 
  financialYears, 
  offices, 
  categories, 
  users, 
  currentUser, 
  allocations = [],
  expenses = [],
  refreshData 
}: SettingsViewProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isOcean = theme === "ocean";
  const isDark = theme === "dark";

  const [currentTab, setCurrentTab] = React.useState(activeTab);

  React.useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  // General Settings State
  const [settingsForm, setSettingsForm] = useState(systemSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Add Financial Year State
  const [showAddFyModal, setShowAddFyModal] = useState(false);
  const [newFyName, setNewFyName] = useState("");
  const [newFyStartDate, setNewFyStartDate] = useState("");
  const [newFyEndDate, setNewFyEndDate] = useState("");
  const [newFyStatus, setNewFyStatus] = useState<"Active" | "Inactive">("Active");

  const handleAddFY = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFyName.trim()) return;
    try {
      const res = await apiFetch("/api/financialyears", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFyName.trim(),
          startDate: newFyStartDate || `${new Date().getFullYear()}-07-01`,
          endDate: newFyEndDate || `${new Date().getFullYear() + 1}-06-30`,
          status: newFyStatus,
          isActive: newFyStatus === "Active"
        })
      });
      if (res.ok) {
        setShowAddFyModal(false);
        setNewFyName("");
        setNewFyStartDate("");
        setNewFyEndDate("");
        refreshData();
      } else {
        const err = await res.json();
        alert(err.error || "অর্থবছর তৈরি করতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      alert("Error creating financial year");
    }
  };

  // Close Financial Year State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingFy, setClosingFy] = useState<FinancialYear | null>(null);
  const [targetFyId, setTargetFyId] = useState<string>("");
  const [carryMap, setCarryMap] = useState<Record<string, number>>({});
  const [closingOfficeId, setClosingOfficeId] = useState<string>("");
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [closeErrorMsg, setCloseErrorMsg] = useState("");

  const handleOpenCloseModal = (fy: FinancialYear) => {
    setClosingFy(fy);
    setCloseErrorMsg("");
    const otherFYs = financialYears.filter(f => f.id !== fy.id);
    const defaultTarget = otherFYs.find(f => f.status === "Active") || otherFYs[0];
    setTargetFyId(defaultTarget?.id || "");

    const initialMap: Record<string, number> = {};
    offices.forEach(off => {
      categories.forEach(cat => {
        const key = `${off.id}_${cat.id}`;
        const fyAllocations = allocations.filter(a => a.financialYearId === fy.id && a.officeId === off.id && a.categoryId === cat.id);
        const fyExpenses = expenses.filter(e => e.financialYearId === fy.id && e.officeId === off.id && e.categoryId === cat.id && e.status !== "Rejected");
        const totalAlloc = fyAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
        const totalSpent = fyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const avail = Math.max(0, totalAlloc - totalSpent);
        initialMap[key] = avail;
      });
    });
    setCarryMap(initialMap);
    setClosingOfficeId(offices.length > 0 ? offices[0].id : "");
    setShowCloseModal(true);
  };

  const handleConfirmCloseFY = async () => {
    if (!closingFy) return;
    setIsSubmittingClose(true);
    setCloseErrorMsg("");
    try {
      const res = await apiFetch(`/api/financialyears/${closingFy.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetFinancialYearId: targetFyId,
          carryForwardMap: carryMap
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setCloseErrorMsg(data.error || "অর্থবছর ক্লোজ করতে ব্যর্থ হয়েছে।");
      } else {
        setShowCloseModal(false);
        alert(language === "bn" ? `অর্থবছর ${closingFy?.name || ""} সফলভাবে ক্লোজ করা হয়েছে!` : `Financial Year ${closingFy?.name || ""} closed successfully!`);
        refreshData();
      }
    } catch (err: any) {
      setCloseErrorMsg(err.message || "Failed to close financial year");
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Form States
  const [catCode, setCatCode] = useState("");
  const [catName, setCatName] = useState("");
  const [catHead, setCatHead] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catAllowQuotation, setCatAllowQuotation] = useState(true);
  const [catSearch, setCatSearch] = useState("");

  const [offCode, setOffCode] = useState("");
  const [offName, setOffName] = useState("");
  const [offType, setOffType] = useState<"HeadOffice" | "SubOffice">("SubOffice");
  const [offAddress, setOffAddress] = useState("");
  const [offSearch, setOffSearch] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const [userIdVal, setUserIdVal] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userDesignation, setUserDesignation] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("Sub-office User");
  const [userOffice, setUserOffice] = useState("");
  const [userPassword, setUserPassword] = useState("password123");
  const [userStatus, setUserStatus] = useState<"Active" | "Inactive">("Active");

  // Handle Logo Upload via File
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(language === "bn" ? "অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন।" : "Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(language === "bn" ? "ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে পারবে।" : "Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettingsForm(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/settings/${settingsForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        setSaveSuccessMsg(language === "bn" ? "সেটিংস এবং লোগো সফলভাবে সংরক্ষণ করা হয়েছে!" : "Settings & logo updated successfully!");
        refreshData();
        setTimeout(() => setSaveSuccessMsg(""), 3000);
      }
    } catch (err) {
      alert("Error updating settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (type: "office" | "category" | "fy", item: any) => {
    let endpoint = "";
    let updatedPayload = {};
    if (type === "office") {
      endpoint = `/api/offices/${item.id}`;
      updatedPayload = { ...item, status: item.status === "Active" ? "Inactive" : "Active" };
    } else if (type === "category") {
      endpoint = `/api/categories/${item.id}`;
      updatedPayload = { ...item, status: item.status === "Active" ? "Inactive" : "Active" };
    } else if (type === "fy") {
      endpoint = `/api/financialyears/${item.id}`;
      updatedPayload = { ...item, status: item.status === "Active" ? "Inactive" : "Active", isActive: item.status !== "Active" };
    }

    try {
      const res = await apiFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) refreshData();
    } catch (err) {
      alert(`Error updating ${type} status`);
    }
  };

  const handleToggleQuotation = async (category: any) => {
    const updatedPayload = { ...category, allowInQuotation: category.allowInQuotation === false ? true : false };
    try {
      const res = await apiFetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) refreshData();
    } catch (err) {
      alert("Error updating quotation status");
    }
  };

  const handleToggleAllowExcess = async (category: any) => {
    const updatedPayload = { ...category, allowExcess: !category.allowExcess };
    try {
      const res = await apiFetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) refreshData();
    } catch (err) {
      alert("Error updating excess budget status");
    }
  };

  const handleToggleRequireApproval = async (category: any) => {
    const updatedPayload = { ...category, requireApproval: category.requireApproval === false ? true : false };
    try {
      const res = await apiFetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) refreshData();
    } catch (err) {
      alert("Error updating approval status");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingCategory;
      const endpoint = isEditing ? `/api/categories/${editingCategory.id}` : "/api/categories";
      const method = isEditing ? "PUT" : "POST";
      const res = await apiFetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: catCode,
          name: catName,
          budgetHead: catHead,
          description: catDesc,
          status: editingCategory ? editingCategory.status : "Active",
          allowInQuotation: catAllowQuotation,
          userId: currentUser.id
        })
      });
      if (res.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCatCode(""); setCatName(""); setCatHead(""); setCatDesc(""); setCatAllowQuotation(true);
        refreshData();
      }
    } catch (err) {}
  };

  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingOffice;
      const endpoint = isEditing ? `/api/offices/${editingOffice.id}` : "/api/offices";
      const method = isEditing ? "PUT" : "POST";
      const res = await apiFetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: offCode,
          name: offName,
          type: offType,
          address: offAddress,
          status: editingOffice ? editingOffice.status : "Active",
          userId: currentUser.id
        })
      });
      if (res.ok) {
        setShowOfficeModal(false);
        setEditingOffice(null);
        setOffCode(""); setOffName(""); setOffType("SubOffice"); setOffAddress("");
        refreshData();
      }
    } catch (err) {}
  };

  const handleRestoreDefaults = async (target: "categories" | "offices") => {
    const targetLabel = target === "categories" 
      ? (language === "bn" ? "বাংলাদেশ কৃষি ব্যাংকের সকল প্রমিত ব্যয়ের খাত ও কোড" : "BKB Standard Expense Categories & Codes")
      : (language === "bn" ? "বাংলাদেশ কৃষি ব্যাংকের রাঙ্গামাটি অঞ্চলের সকল শাখা ও কার্যালয়" : "BKB Rangamati Region Offices & Branches");

    const confirmMsg = language === "bn" 
      ? `আপনি কি নিশ্চিতভাবে ${targetLabel} রিকভার/রিসেট করতে চান?` 
      : `Are you sure you want to restore/reset ${targetLabel}?`;

    if (!window.confirm(confirmMsg)) return;

    setIsRestoring(true);
    try {
      const res = await apiFetch("/api/settings/restore-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || (language === "bn" ? "সফলভাবে রিকভার করা হয়েছে!" : "Restored successfully!"));
        refreshData();
      } else {
        alert(data.error || "Failed to restore defaults");
      }
    } catch (err) {
      alert("Error restoring defaults");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userIdVal,
          name: userName,
          email: userEmail,
          designation: userDesignation,
          role: userRole,
          officeId: userOffice || offices[0]?.id || "",
          password: userPassword,
          status: userStatus
        })
      });
      if (res.ok) {
        setShowUserModal(false);
        setUserIdVal(""); setUserName(""); setUserEmail(""); setUserDesignation(""); setUserRole("Sub-office User"); setUserOffice(""); setUserPassword("password123");
        refreshData();
      }
    } catch (err) {}
  };

  const handleAdminResetPassword = async (targetUserId: string) => {
    const newPass = prompt("Enter new password for this user:", "password123");
    if (!newPass) return;
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newPassword: newPass })
      });
      const data = await res.json();
      if (data.success) {
        alert("Password successfully reset by Admin!");
        refreshData();
      } else {
        alert(data.error || "Failed to reset password");
      }
    } catch (err) {
      alert("Error resetting password");
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          status: user.status === "Active" ? "Inactive" : "Active"
        })
      });
      if (res.ok) refreshData();
    } catch (err) {
      alert("Failed to toggle status");
    }
  };

  const roleStr = currentUser?.role as string | undefined;
  const isAdmin = roleStr === "Super Admin" || roleStr === "Head Office Admin" || roleStr === "HeadOfficeAdmin";

  const settingsTabs = [
    { id: "general", label: language === "bn" ? "সাধারণ কনফিগারেশন" : "General" },
    ...(isAdmin ? [{ id: "welcome-msg", label: language === "bn" ? "ওয়েলকাম ও নোটিশ কনফিগারেশন" : "Welcome & Notices" }] : []),
    { id: "financial-years", label: language === "bn" ? "অর্থবছর ও ক্লোজিং" : "Financial Years & Closing" },
    { id: "offices", label: language === "bn" ? "অফিস তালিকা" : "Offices" },
    { id: "categories", label: language === "bn" ? "খাতসমূহ" : "Categories" },
    { id: "users", label: language === "bn" ? "ব্যবহারকারী" : "Users" },
    ...(isAdmin ? [{ id: "database", label: language === "bn" ? "ডাটাবেজ ও ব্যাকআপ" : "Database & Backup" }] : []),
    { id: "apps-script", label: language === "bn" ? "গুগল স্ক্রিপ্ট ডেপ্লয়" : "Apps Script Deploy" },
    { id: "developer", label: language === "bn" ? "ডেভেলপার তথ্য" : "Developer Info" }
  ];

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
      {/* Settings Navigation */}
      <div className={`flex border-b overflow-x-auto shrink-0 ${isOcean ? "border-sky-900/60" : isDark ? "border-slate-800" : "border-slate-200"}`}>
        {settingsTabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
              currentTab === tab.id 
                ? (isOcean ? "border-sky-400 text-sky-400" : "border-emerald-600 text-emerald-600") 
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 border rounded-2xl shadow-sm flex flex-col overflow-hidden transition-colors ${
        isOcean
          ? "bg-[#0f172a]/95 border-sky-900/60 text-sky-50"
          : isDark
          ? "bg-slate-900 border-slate-800 text-slate-100"
          : "bg-white border-slate-200 text-slate-900"
      }`}>
        
        {/* General Settings */}
        {currentTab === "general" && (
          <div className="p-6 overflow-y-auto flex-1 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`} />
                  {language === "bn" ? "সাধারণ কনফিগারেশন ও ব্র্যান্ডিং" : "General Configuration & Branding"}
                </h2>
                <p className="text-xs opacity-70 mt-1">
                  {language === "bn" 
                    ? "প্রতিষ্ঠান সংক্রান্ত তথ্য ও প্রাতিষ্ঠানিক লোগো পরিচালনা করুন।"
                    : "Manage institution details and institutional logo across the web app."}
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                  <Check className="w-4 h-4" />
                  {saveSuccessMsg}
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-6">
              
              {/* Institution Logo Card */}
              <div className={`p-5 rounded-2xl border ${
                isOcean
                  ? "bg-sky-950/40 border-sky-800/60"
                  : isDark
                  ? "bg-slate-800/40 border-slate-700/60"
                  : "bg-slate-50/80 border-slate-200"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <ImageIcon className={`w-4 h-4 ${isOcean ? "text-sky-400" : "text-emerald-500"}`} />
                    {language === "bn" ? "প্রাতিষ্ঠানিক লোগো (Institution Logo)" : "Institution Logo"}
                  </label>
                  <span className="text-xs opacity-60 font-mono">
                    PNG, SVG, JPG (Max 2MB)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Logo Preview box */}
                  <div className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center p-2 shrink-0 relative overflow-hidden transition ${
                    isOcean
                      ? "bg-sky-900/30 border-sky-700/50"
                      : isDark
                      ? "bg-slate-850 border-slate-700"
                      : "bg-white border-slate-300 shadow-sm"
                  }`}>
                    {settingsForm.logoUrl ? (
                      <img
                        src={settingsForm.logoUrl}
                        alt="Institution Logo Preview"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center opacity-40">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                        <span className="text-xs font-mono block">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & URL Input */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoFileUpload}
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition ${
                          isOcean
                            ? "bg-sky-600 hover:bg-sky-500 text-white"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {language === "bn" ? "নতুন লোগো আপলোড করুন" : "Upload New Logo"}
                      </button>

                      {settingsForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm(prev => ({ ...prev, logoUrl: "" }))}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {language === "bn" ? "মুছে ফেলুন" : "Remove"}
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold opacity-70 mb-1">
                        {language === "bn" ? "অথবা সরাসরি ইমেজ লিংক (URL) প্রদান করুন:" : "Or provide direct image URL:"}
                      </label>
                      <input
                        type="url"
                        value={settingsForm.logoUrl}
                        onChange={e => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        className={`w-full px-3.5 py-2 border rounded-xl text-xs font-mono focus:outline-none transition ${
                          isOcean
                            ? "bg-sky-950/70 border-sky-800 text-sky-100 focus:border-sky-400"
                            : isDark
                            ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                            : "bg-white border-slate-300 text-slate-900 focus:border-emerald-500"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700/20 text-xs opacity-75">
                  <p>
                    {language === "bn"
                      ? "💡 লোগো পরিবর্তন করলে Header, Sidebar, Dashboard, Reports এবং Print Preview-তে স্বয়ংক্রিয়ভাবে আপডেট হবে। (Note Sheet-এ সরকারি নিয়ম অনুযায়ী কোনো সিস্টেম লোগো থাকবে না।)"
                      : "💡 Uploaded logo will automatically display on Header, Sidebar, Dashboard, Reports and Print Previews. (Note Sheets strictly omit branding as per govt rules)."}
                  </p>
                </div>
              </div>

              {/* Institution Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
                  {language === "bn" ? "প্রতিষ্ঠানের নাম (Institution Name)" : "Institution Name"}
                </label>
                <input
                  type="text"
                  value={settingsForm.institutionName}
                  onChange={e => setSettingsForm({ ...settingsForm, institutionName: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition ${
                    isOcean
                      ? "bg-sky-950/60 border-sky-800 text-sky-100 focus:border-sky-400"
                      : isDark
                      ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                      : "bg-white border-slate-300 text-slate-900 focus:border-emerald-500"
                  }`}
                  required
                />
              </div>

              {/* Web App Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
                  {language === "bn" ? "সফটওয়্যারের শিরোনাম (Web App Name)" : "Web App Name"}
                </label>
                <input
                  type="text"
                  value={settingsForm.webAppName}
                  onChange={e => setSettingsForm({ ...settingsForm, webAppName: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition ${
                    isOcean
                      ? "bg-sky-950/60 border-sky-800 text-sky-100 focus:border-sky-400"
                      : isDark
                      ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                      : "bg-white border-slate-300 text-slate-900 focus:border-emerald-500"
                  }`}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
                  {language === "bn" ? "বিবরণ / ট্যাগলাইন (Description)" : "Description / Tagline"}
                </label>
                <textarea
                  value={settingsForm.description}
                  onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none h-20 transition ${
                    isOcean
                      ? "bg-sky-950/60 border-sky-800 text-sky-100 focus:border-sky-400"
                      : isDark
                      ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500"
                      : "bg-white border-slate-300 text-slate-900 focus:border-emerald-500"
                  }`}
                />
              </div>

              {/* Financial Year Default Months */}
              <div className={`p-5 rounded-2xl border ${
                isOcean ? "bg-sky-950/40 border-sky-800/60" : isDark ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50 border-slate-200"
              }`}>
                <h3 className="text-sm font-bold mb-3">{language === "bn" ? "অর্থবছরের মাস নির্ধারণ (Financial Year Months)" : "Financial Year Months Configuration"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold opacity-75 mb-1.5">
                      {language === "bn" ? "শুরুর মাস (Start Month)" : "Start Month"}
                    </label>
                    <select
                      value={settingsForm.financialYearStartMonth || 7}
                      onChange={e => setSettingsForm({ ...settingsForm, financialYearStartMonth: Number(e.target.value) })}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition ${
                        isOcean ? "bg-sky-950/60 border-sky-800 text-sky-100" : isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('en', { month: 'long' })} / {new Date(0, m - 1).toLocaleString('bn', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold opacity-75 mb-1.5">
                      {language === "bn" ? "শেষের মাস (End Month)" : "End Month"}
                    </label>
                    <select
                      value={settingsForm.financialYearEndMonth || 6}
                      onChange={e => setSettingsForm({ ...settingsForm, financialYearEndMonth: Number(e.target.value) })}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition ${
                        isOcean ? "bg-sky-950/60 border-sky-800 text-sky-100" : isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('en', { month: 'long' })} / {new Date(0, m - 1).toLocaleString('bn', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Custom Theme Color */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
                  {language === "bn" ? "কাস্টম থিম কালার (Custom Theme Color)" : "Custom Theme Color"}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settingsForm.customThemeColor || "#fbbf24"} // amber-400 default
                    onChange={e => setSettingsForm({ ...settingsForm, customThemeColor: e.target.value })}
                    className="w-12 h-10 p-0 border-0 rounded overflow-hidden cursor-pointer bg-transparent"
                    title={language === "bn" ? "রঙ নির্বাচন করুন" : "Select Color"}
                  />
                  <div className={`text-xs opacity-70 ${isOcean ? "text-sky-200" : isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {language === "bn" 
                      ? "কাস্টম থিমের প্রাইমারি কালার পরিবর্তন করতে এখানে ক্লিক করুন।" 
                      : "Click to change the primary accent color of the custom theme."}
                  </div>
                  {settingsForm.customThemeColor && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, customThemeColor: "" })}
                      className="text-xs font-medium text-rose-500 hover:text-rose-600 underline ml-auto"
                    >
                      {language === "bn" ? "ডিফল্ট কালার" : "Reset Default"}
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2.5 rounded-xl font-semibold shadow flex items-center gap-2 text-white transition ${
                    isOcean
                      ? "bg-sky-600 hover:bg-sky-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {language === "bn" ? "সেটিংস সংরক্ষণ করুন" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Welcome Message Settings */}
        {currentTab === "welcome-msg" && (
          <WelcomeMessageSettings
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            onSave={handleUpdateSettings}
            currentUser={currentUser}
            offices={offices}
            financialYears={financialYears}
            isSaving={isSaving}
            saveSuccessMsg={saveSuccessMsg}
          />
        )}

        {/* Financial Years & Closing */}
        {currentTab === "financial-years" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`p-4 border-b flex justify-between items-center shrink-0 ${
              isOcean ? "bg-sky-950/80 border-sky-900/60" : isDark ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div>
                <h2 className="font-bold flex items-center gap-2">
                  <Calendar className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}/> 
                  {language === "bn" ? "অর্থবছর তালিকা ও অবশিষ্টাংশ ক্যারি-ফরওয়ার্ড" : "Financial Years & Closing Management"}
                </h2>
                <p className="text-xs opacity-75 mt-0.5">
                  {language === "bn" 
                    ? "অর্থবছর ক্লোজ করুন এবং অব্যবহৃত জের পরবর্তী অর্থবছরে ওপেনিং ব্যালেন্স হিসাবে স্থানান্তরিত করুন।" 
                    : "Close financial year and carry forward unspent balance to next financial year as opening balance."}
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddFyModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  {language === "bn" ? "নতুন অর্থবছর যোগ করুন" : "Add Financial Year"}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`uppercase tracking-wider font-semibold border-b ${
                    isOcean ? "bg-sky-950 text-sky-300 border-sky-800" : isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    <th className="p-3">{language === "bn" ? "অর্থবছর" : "Financial Year"}</th>
                    <th className="p-3">{language === "bn" ? "শুরুর তারিখ" : "Start Date"}</th>
                    <th className="p-3">{language === "bn" ? "শেষের তারিখ" : "End Date"}</th>
                    <th className="p-3 text-center">{language === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                    <th className="p-3 text-center">{language === "bn" ? "ক্লোজিং অবস্থা" : "Closing Status"}</th>
                    <th className="p-3 text-right">{language === "bn" ? "অ্যাকশন" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/10">
                  {financialYears.map(fy => (
                    <tr key={fy.id} className="hover:bg-slate-50/5 transition">
                      <td className="p-3 font-semibold">{fy.name}</td>
                      <td className="p-3 opacity-80">{fy.startDate}</td>
                      <td className="p-3 opacity-80">{fy.endDate}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          fy.status === "Active" 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}>
                          {fy.status === "Active" ? (language === "bn" ? "সক্রিয়" : "Active") : (language === "bn" ? "নিষ্ক্রিয়" : "Inactive")}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {fy.isClosed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <Lock className="w-3 h-3" />
                            {language === "bn" ? "🔒 ক্লোজড" : "🔒 Closed"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {language === "bn" ? "খোলা" : "Open"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!fy.isClosed ? (
                          isAdmin ? (
                            <button
                              onClick={() => handleOpenCloseModal(fy)}
                              className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow transition"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              {language === "bn" ? "বছর ক্লোজ করুন" : "Close Year"}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              {language === "bn" ? "শুধুমাত্র অ্যাডমিন" : "Admin only"}
                            </span>
                          )
                        ) : (
                          <div className="text-xs opacity-60">
                            {fy.closedAt && (
                              <span>
                                {language === "bn" ? "ক্লোজ করা হয়েছে: " : "Closed on: "} 
                                {fy.closedAt.split("T")[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories */}
        {currentTab === "categories" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`p-4 border-b flex flex-wrap gap-3 justify-between items-center shrink-0 ${
              isOcean ? "bg-sky-950/80 border-sky-900/60" : isDark ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-3">
                <h2 className="font-bold flex items-center gap-2">
                  <Folder className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}/> 
                  {t.allCategories}
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    {categories.length}
                  </span>
                </h2>
                <input
                  type="text"
                  placeholder={language === "bn" ? "খাত বা কোড খুঁজুন..." : "Search category or code..."}
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  className={`px-3 py-1.5 text-xs border rounded-xl bg-transparent focus:outline-none w-48 sm:w-64 ${
                    isOcean ? "border-sky-800 focus:border-sky-500 text-sky-100" : isDark ? "border-slate-700 focus:border-emerald-500 text-slate-100" : "border-slate-300 focus:border-emerald-600 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRestoreDefaults("categories")}
                  disabled={isRestoring}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                    isOcean 
                      ? "bg-sky-900/50 hover:bg-sky-900 text-sky-200 border-sky-700" 
                      : isDark 
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  }`}
                  title="বিকেবি প্রমিত ব্যয়ের খাত ও বাজেট হেড রিকভার করুন"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                  {language === "bn" ? "বিকেবি প্রমিত খাত রিকভার" : "Restore BKB Heads"}
                </button>

                <button 
                  onClick={() => {
                    setEditingCategory(null);
                    setCatCode(""); setCatName(""); setCatHead(""); setCatDesc(""); setCatAllowQuotation(true);
                    setShowCategoryModal(true);
                  }} 
                  className={`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition ${
                    isOcean ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  <Plus className="w-4 h-4"/> {language === "bn" ? "নতুন খাত যোগ করুন" : "Add Category"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`uppercase tracking-wider font-semibold border-b ${
                    isOcean ? "bg-sky-950 text-sky-300 border-sky-800" : isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Budget Head</th>
                    <th className="p-3">{language === "bn" ? "কোটেশন প্রযোজ্য" : "Quotation Applicable"}</th>
                    <th className="p-3">{language === "bn" ? "অতিরিক্ত ব্যয় অনুমতি" : "Allow Excess Budget"}</th>
                    <th className="p-3">{language === "bn" ? "অনুমোদন প্রয়োজন" : "Require Approval"}</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isOcean ? "divide-sky-900/40" : isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                  {categories
                    .filter(c => {
                      if (!catSearch.trim()) return true;
                      const q = catSearch.toLowerCase();
                      return (
                        c.name.toLowerCase().includes(q) ||
                        c.code.toLowerCase().includes(q) ||
                        (c.budgetHead && c.budgetHead.toLowerCase().includes(q))
                      );
                    })
                    .map(c => (
                    <tr key={c.id} className={`transition ${isOcean ? "hover:bg-sky-900/20" : isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                      <td className="p-3 font-mono font-semibold">{c.code}</td>
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 opacity-80">{c.budgetHead}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleQuotation(c)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            c.allowInQuotation !== false
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 hover:bg-slate-300"
                          }`}
                        >
                          {c.allowInQuotation !== false ? (language === "bn" ? "✓ চালু" : "Enabled") : (language === "bn" ? "✕ বন্ধ" : "Disabled")}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleAllowExcess(c)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            c.allowExcess
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 hover:bg-slate-300"
                          }`}
                        >
                          {c.allowExcess ? (language === "bn" ? "✓ অনুমোদিত" : "Allowed") : (language === "bn" ? "✕ নিষিদ্ধ" : "Restricted")}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleRequireApproval(c)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            c.requireApproval !== false
                              ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 hover:bg-slate-300"
                          }`}
                        >
                          {c.requireApproval !== false ? (language === "bn" ? "✓ আবশ্যক" : "Required") : (language === "bn" ? "✕ প্রয়োজন নেই" : "Optional")}
                        </button>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{c.status}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingCategory(c);
                              setCatCode(c.code);
                              setCatName(c.name);
                              setCatHead(c.budgetHead);
                              setCatDesc(c.description);
                              setCatAllowQuotation(c.allowInQuotation ?? true);
                              setShowCategoryModal(true);
                            }}
                            className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/40 text-blue-400"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleToggleStatus('category', c)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/40">
                            Toggle Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Offices */}
        {currentTab === "offices" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`p-4 border-b flex flex-wrap gap-3 justify-between items-center shrink-0 ${
              isOcean ? "bg-sky-950/80 border-sky-900/60" : isDark ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-3">
                <h2 className="font-bold flex items-center gap-2">
                  <Building2 className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}/> 
                  {t.allOffices}
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    {offices.length}
                  </span>
                </h2>
                <input
                  type="text"
                  placeholder={language === "bn" ? "কার্যালয়, শাখা বা কোড খুঁজুন..." : "Search office, branch or code..."}
                  value={offSearch}
                  onChange={e => setOffSearch(e.target.value)}
                  className={`px-3 py-1.5 text-xs border rounded-xl bg-transparent focus:outline-none w-48 sm:w-64 ${
                    isOcean ? "border-sky-800 focus:border-sky-500 text-sky-100" : isDark ? "border-slate-700 focus:border-emerald-500 text-slate-100" : "border-slate-300 focus:border-emerald-600 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRestoreDefaults("offices")}
                  disabled={isRestoring}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                    isOcean 
                      ? "bg-sky-900/50 hover:bg-sky-900 text-sky-200 border-sky-700" 
                      : isDark 
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  }`}
                  title="বিকেবি রাঙ্গামাটি অঞ্চলের সকল শাখা ও আঞ্চলিক কার্যালয় রিকভার করুন"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                  {language === "bn" ? "বিকেবি শাখা তালিকা রিকভার" : "Restore BKB Branches"}
                </button>

                <button 
                  onClick={() => {
                    setEditingOffice(null);
                    setOffCode(""); setOffName(""); setOffType("SubOffice"); setOffAddress("");
                    setShowOfficeModal(true);
                  }} 
                  className={`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition ${
                    isOcean ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  <Plus className="w-4 h-4"/> {language === "bn" ? "নতুন অফিস যোগ করুন" : "Add Office"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`uppercase tracking-wider font-semibold border-b ${
                    isOcean ? "bg-sky-950 text-sky-300 border-sky-800" : isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Address</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isOcean ? "divide-sky-900/40" : isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                  {offices
                    .filter(o => {
                      if (!offSearch.trim()) return true;
                      const q = offSearch.toLowerCase();
                      return (
                        o.name.toLowerCase().includes(q) ||
                        o.code.toLowerCase().includes(q) ||
                        (o.address && o.address.toLowerCase().includes(q))
                      );
                    })
                    .map(o => (
                    <tr key={o.id} className={`transition ${isOcean ? "hover:bg-sky-900/20" : isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                      <td className="p-3 font-mono font-semibold">{o.code}</td>
                      <td className="p-3 font-medium">{o.name}</td>
                      <td className="p-3 opacity-80">{o.type}</td>
                      <td className="p-3 opacity-70 text-xs">{o.address}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${o.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{o.status}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingOffice(o);
                              setOffCode(o.code);
                              setOffName(o.name);
                              setOffType(o.type);
                              setOffAddress(o.address || "");
                              setShowOfficeModal(true);
                            }}
                            className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/40 text-blue-400"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleToggleStatus('office', o)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/40">
                            Toggle Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users */}
        {currentTab === "users" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`p-4 border-b flex justify-between items-center shrink-0 ${
              isOcean ? "bg-sky-950/80 border-sky-900/60" : isDark ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <h2 className="font-bold flex items-center gap-2">
                <Users className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}/> 
                {language === "bn" ? "ব্যবহারকারী তালিকা" : "System Users"}
              </h2>
              <button 
                onClick={() => setShowUserModal(true)} 
                className={`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition ${
                  isOcean ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                <Plus className="w-4 h-4"/> {language === "bn" ? "নতুন ব্যবহারকারী" : "Add User"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`uppercase tracking-wider font-semibold border-b ${
                    isOcean ? "bg-sky-950 text-sky-300 border-sky-800" : isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    <th className="p-3">User ID & Name</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Office</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isOcean ? "divide-sky-900/40" : isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                  {users.map(u => {
                    const off = offices.find(o => o.id === u.officeId);
                    return (
                      <tr key={u.id} className={`transition ${isOcean ? "hover:bg-sky-900/20" : isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              isOcean ? "bg-sky-500/20 text-sky-300" : "bg-emerald-500/20 text-emerald-400"
                            }`}>
                              {u.name ? u.name.charAt(0) : (u.userId ? u.userId.charAt(0).toUpperCase() : "U")}
                            </div>
                            <div>
                              <div className="font-semibold">{u.name || u.userId || "User"}</div>
                              <div className="font-mono text-xs text-slate-400">ID: {u.userId || u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 opacity-80 text-xs">{u.designation || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            isOcean ? "bg-sky-500/20 text-sky-300" : "bg-blue-500/20 text-blue-300"
                          }`}>{u.role}</span>
                        </td>
                        <td className="p-3 opacity-70 text-xs">{off?.name || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleAdminResetPassword(u.id)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition flex items-center gap-1"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3 h-3" /> Reset
                          </button>
                          <button 
                            onClick={() => handleToggleUserStatus(u)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                            title="Toggle Active/Inactive"
                          >
                            {u.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(currentTab === "fy") && (
           <div className="p-6 text-center opacity-60 text-xs">
             {language === "bn" ? "অর্থবছর পরিচালনা করুন।" : "Manage financial year lists here."}
           </div>
        )}

        {(currentTab === "database") && (
          <DatabaseSettingsTab currentUser={currentUser} />
        )}

        {(currentTab === "apps-script") && (
          <div className="flex-1 overflow-hidden relative">
             <AppsScriptDeployView />
          </div>
        )}

        {(currentTab === "developer") && (
          <div className="p-6 overflow-y-auto flex-1 max-w-4xl">
            <DeveloperProfile />
          </div>
        )}

      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div className={`m-auto rounded-2xl max-w-md w-full p-6 shadow-xl border ${
            isOcean ? "bg-[#0f172a] border-sky-800 text-sky-100" : isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <h3 className="text-lg font-bold mb-4">{editingCategory ? "Edit Category" : "Add New Category"}</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Code</label>
                  <input type="text" required value={catCode} onChange={e => setCatCode(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Budget Head</label>
                  <input type="text" required value={catHead} onChange={e => setCatHead(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">Name</label>
                <input type="text" required value={catName} onChange={e => setCatName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">Description</label>
                <textarea required value={catDesc} onChange={e => setCatDesc(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catAllowQuotation"
                  checked={catAllowQuotation}
                  onChange={e => setCatAllowQuotation(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="catAllowQuotation" className="text-xs font-medium cursor-pointer">
                  {language === "bn" ? "কোটেশন প্রক্রিয়ায় এই খাত প্রযোজ্য" : "Applicable in Quotation Process"}
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-emerald-600 text-white font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOfficeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div className={`m-auto rounded-2xl max-w-md w-full p-6 shadow-xl border ${
            isOcean ? "bg-[#0f172a] border-sky-800 text-sky-100" : isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <h3 className="text-lg font-bold mb-4">{editingOffice ? "Edit Office" : "Add New Office"}</h3>
            <form onSubmit={handleAddOffice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Type</label>
                  <select value={offType} onChange={e => setOffType(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent">
                    <option value="SubOffice" className="text-slate-900">Sub-Office</option>
                    <option value="HeadOffice" className="text-slate-900">Head Office</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Code</label>
                  <input type="text" required value={offCode} onChange={e => setOffCode(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">Name</label>
                <input type="text" required value={offName} onChange={e => setOffName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">Address</label>
                <textarea required value={offAddress} onChange={e => setOffAddress(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowOfficeModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-emerald-600 text-white font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div className={`m-auto rounded-2xl max-w-lg w-full p-6 shadow-xl border ${
            isOcean ? "bg-[#0f172a] border-sky-800 text-sky-100" : isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <h3 className="text-lg font-bold mb-4">Add New System User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">User ID (Login)</label>
                  <input type="text" required value={userIdVal} onChange={e => setUserIdVal(e.target.value)} placeholder="e.g. ctg_user2" className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Full Name</label>
                  <input type="text" required value={userName} onChange={e => setUserName(e.target.value)} placeholder="Mr. Rahim" className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Designation</label>
                  <input type="text" required value={userDesignation} onChange={e => setUserDesignation(e.target.value)} placeholder="Accounts Officer" className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Email</label>
                  <input type="email" required value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="user@office.gov" className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Role</label>
                  <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent">
                    <option value="Super Admin" className="text-slate-900">Super Admin</option>
                    <option value="Head Office Admin" className="text-slate-900">Head Office Admin</option>
                    <option value="Head Office User" className="text-slate-900">Head Office User</option>
                    <option value="Sub-office User" className="text-slate-900">Sub-office User</option>
                    <option value="Report Viewer" className="text-slate-900">Report Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Assigned Office</label>
                  <select value={userOffice} onChange={e => setUserOffice(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent">
                    <option value="" className="text-slate-900">Select Office</option>
                    {offices.map(o => (
                      <option key={o.id} value={o.id} className="text-slate-900">{o.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Initial Password</label>
                  <input type="password" required value={userPassword} onChange={e => setUserPassword(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">Status</label>
                  <select value={userStatus} onChange={e => setUserStatus(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent">
                    <option value="Active" className="text-slate-900">Active</option>
                    <option value="Inactive" className="text-slate-900">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Financial Year Modal */}
      {showAddFyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div className={`m-auto rounded-2xl max-w-md w-full p-6 shadow-xl border ${
            isOcean ? "bg-[#0f172a] border-sky-800 text-sky-100" : isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                {language === "bn" ? "নতুন অর্থবছর যোগ করুন" : "Add New Financial Year"}
              </h3>
              <button onClick={() => setShowAddFyModal(false)} className="p-1 rounded-lg opacity-60 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFY} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {language === "bn" ? "অর্থবছরের নাম (যেমন: ২০২৫-২০২৬):" : "Financial Year Name (e.g. 2025-2026):"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="২০২৫-২০২৬"
                  value={newFyName}
                  onChange={e => setNewFyName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                    isOcean ? "border-sky-700 text-sky-100" : isDark ? "border-slate-700 text-slate-100" : "border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 opacity-80">
                    {language === "bn" ? "শুরুর তারিখ:" : "Start Date:"}
                  </label>
                  <input
                    type="date"
                    required
                    value={newFyStartDate}
                    onChange={e => setNewFyStartDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                      isOcean ? "border-sky-700 text-sky-100" : isDark ? "border-slate-700 text-slate-100" : "border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 opacity-80">
                    {language === "bn" ? "শেষের তারিখ:" : "End Date:"}
                  </label>
                  <input
                    type="date"
                    required
                    value={newFyEndDate}
                    onChange={e => setNewFyEndDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                      isOcean ? "border-sky-700 text-sky-100" : isDark ? "border-slate-700 text-slate-100" : "border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {language === "bn" ? "স্ট্যাটাস:" : "Status:"}
                </label>
                <select
                  value={newFyStatus}
                  onChange={e => setNewFyStatus(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                    isOcean ? "border-sky-700 text-sky-100 bg-sky-950" : isDark ? "border-slate-700 text-slate-100 bg-slate-800" : "border-slate-300 text-slate-900 bg-white"
                  }`}
                >
                  <option value="Active" className="text-slate-900">{language === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
                  <option value="Inactive" className="text-slate-900">{language === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button type="button" onClick={() => setShowAddFyModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100">
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow">
                  {language === "bn" ? "সংরক্ষণ করুন" : "Save Financial Year"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Financial Year Modal */}
      {showCloseModal && closingFy && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6 sm:p-6">
          <div className={`rounded-2xl max-w-3xl w-full p-6 shadow-2xl border m-auto max-h-[90vh] flex flex-col ${
            isOcean ? "bg-[#0f172a] border-sky-800 text-sky-100" : isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2 text-amber-500">
                <Lock className="w-5 h-5" />
                {language === "bn" ? `অর্থবছর ক্লোজিং: ${closingFy.name}` : `Close Financial Year: ${closingFy.name}`}
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-slate-800/50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 py-4 text-xs">
              {/* Warning Notice */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {language === "bn" ? "জরুরি নির্দেশনা ও নিয়মাবলী:" : "Important Rules & Consequences:"}
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                  <li>{language === "bn" ? "অর্থবছরটি লক করা হবে (423 Locked)। এর পর এতে আর কোনো বরাদ্দ, ব্যয় বা নোটশিট যোগ/সম্পাদনা করা যাবে না।" : "The financial year will be locked (423 Locked). No further entries or edits will be allowed."}</li>
                  <li>{language === "bn" ? "কোনো পেন্ডিং (Pending) ব্যয় থাকলে এই বছর ক্লোজ করা যাবে না।" : "If there are pending expenses for this year, closing will be rejected."}</li>
                  <li>{language === "bn" ? "পরবর্তী অর্থবছরে নির্বাচিত মান অনুযায়ী স্বয়ংক্রিয়ভাবে ওপেনিং ব্যালেন্স (Opening Balance) তৈরি হবে।" : "Opening Balances will be generated automatically for the target financial year based on your matrix below."}</li>
                </ul>
              </div>

              {/* Target FY Selector */}
              <div>
                <label className="block font-bold mb-1 opacity-80">
                  {language === "bn" ? "ওপেনিং ব্যালেন্স বহনের জন্য লক্ষ্য অর্থবছর (Target FY):" : "Target FY for Opening Balance Transfer:"}
                </label>
                <select
                  value={targetFyId}
                  onChange={e => setTargetFyId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-transparent font-semibold focus:outline-none ${
                    isOcean ? "border-sky-700 text-sky-100 bg-sky-950" : isDark ? "border-slate-700 text-slate-100 bg-slate-800" : "border-slate-300 text-slate-900 bg-white"
                  }`}
                >
                  <option value="" disabled className="text-slate-900">Select Target Financial Year</option>
                  {financialYears.filter(f => f.id !== closingFy.id).map(f => (
                    <option key={f.id} value={f.id} className="text-slate-900">{f.name} {f.status === "Active" ? "(Active)" : ""}</option>
                  ))}
                </select>
              </div>

              {/* Carry Forward Balance Matrix */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                  <label className="font-bold opacity-80">
                    {language === "bn" ? "অফিস ও খাতভিত্তিক অবশিষ্টাংশ এবং ওপেনিং ব্যালেন্স নির্ধারণ:" : "Office & Category Carry-Forward Matrix:"}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={closingOfficeId}
                      onChange={(e) => setClosingOfficeId(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none ${
                        isOcean ? "border-sky-700 text-sky-100 bg-sky-950" : isDark ? "border-slate-700 text-slate-100 bg-slate-800" : "border-slate-300 text-slate-900 bg-white"
                      }`}
                    >
                      {offices.map(off => (
                        <option key={off.id} value={off.id} className="text-slate-900">{off.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!closingOfficeId) return;
                        const newMap = { ...carryMap };
                        categories.forEach(cat => {
                          const key = `${closingOfficeId}_${cat.id}`;
                          const fyAllocations = allocations.filter(a => a.financialYearId === closingFy.id && a.officeId === closingOfficeId && a.categoryId === cat.id);
                          const fyExpenses = expenses.filter(e => e.financialYearId === closingFy.id && e.officeId === closingOfficeId && e.categoryId === cat.id && e.status !== "Rejected");
                          const totalAlloc = fyAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
                          const totalSpent = fyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                          newMap[key] = Math.max(0, totalAlloc - totalSpent);
                        });
                        setCarryMap(newMap);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30 whitespace-nowrap"
                    >
                      {language === "bn" ? "বর্তমান অফিসে ১০০% ট্রান্সফার" : "Set 100% for this Office"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!closingOfficeId) return;
                        const newMap = { ...carryMap };
                        categories.forEach(cat => {
                          newMap[`${closingOfficeId}_${cat.id}`] = 0;
                        });
                        setCarryMap(newMap);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-600/20 text-slate-300 border border-slate-500/30 text-xs font-semibold hover:bg-slate-600/30 whitespace-nowrap"
                    >
                      {language === "bn" ? "০ সেট করুন" : "Set Zero"}
                    </button>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden max-h-[30vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b font-semibold sticky top-0 z-10 ${
                        isOcean ? "bg-sky-950 text-sky-200 border-sky-800" : isDark ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        <th className="p-2.5">{language === "bn" ? "খাত" : "Category"}</th>
                        <th className="p-2.5 text-right">{language === "bn" ? "চলতি ব্যালেন্স" : "Available Balance"}</th>
                        <th className="p-2.5 text-right">{language === "bn" ? "ওপেনিং ব্যালেন্স ট্রান্সফার" : "Opening Balance Amount"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/20 font-mono">
                      {closingOfficeId && categories.map(cat => {
                        const key = `${closingOfficeId}_${cat.id}`;
                        const fyAllocations = allocations.filter(a => a.financialYearId === closingFy.id && a.officeId === closingOfficeId && a.categoryId === cat.id);
                        const fyExpenses = expenses.filter(e => e.financialYearId === closingFy.id && e.officeId === closingOfficeId && e.categoryId === cat.id && e.status !== "Rejected");
                        const totalAlloc = fyAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
                        const totalSpent = fyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                        const currentAvail = Math.max(0, totalAlloc - totalSpent);
                        const currentCarry = carryMap[key] !== undefined ? carryMap[key] : currentAvail;

                        return (
                          <tr key={key} className="hover:bg-slate-800/10">
                            <td className="p-2 font-sans font-medium">{cat.name}</td>
                            <td className="p-2 text-right text-emerald-400 font-semibold">৳{currentAvail.toLocaleString("bn-BD")}</td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                min="0"
                                value={currentCarry}
                                onChange={e => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  setCarryMap({ ...carryMap, [key]: val });
                                }}
                                className={`w-28 px-2 py-1 text-right border rounded-lg bg-transparent font-bold text-xs focus:outline-none ${
                                  isOcean ? "border-sky-700 text-sky-100" : isDark ? "border-slate-700 text-slate-100" : "border-slate-300 text-slate-900"
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {!closingOfficeId && (
                        <tr>
                          <td colSpan={3} className="p-4 text-center opacity-60">
                            {language === "bn" ? "অনুগ্রহ করে একটি অফিস নির্বাচন করুন" : "Please select an office"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Message Display */}
              {closeErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold flex items-start gap-2">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{closeErrorMsg}</div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50 shrink-0">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isSubmittingClose || !targetFyId}
                onClick={handleConfirmCloseFY}
                className="px-5 py-2 rounded-xl text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold inline-flex items-center gap-2 shadow disabled:opacity-50"
              >
                {isSubmittingClose ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {language === "bn" ? "🔒 বছর ক্লোজ ও ওপেনিং ব্যালেন্স ট্রান্সফার নিশ্চিত করুন" : "🔒 Confirm Close Financial Year"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
