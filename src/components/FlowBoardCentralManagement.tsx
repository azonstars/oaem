import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Shield,
  Users,
  Layers,
  Settings,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Download,
  ExternalLink,
  Sliders,
  Check,
  X,
  KeyRound,
  UserPlus,
  Building2,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  FileText,
  Boxes,
  Calculator,
  Receipt,
  FileCheck2,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  User,
  Office,
  FlowBoardTool,
  SystemSettings,
  AuditLog,
  UserRole,
  ToolAccessLevel,
  DEFAULT_ROLE_TOOL_ACCESS,
  getRoleToolAccess,
  getUserToolAccess,
  setGlobalRoleToolAccess,
} from "../types";
import { DEFAULT_FLOW_TOOLS } from "../config/flowTools";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../api";
import { ProposeUserModal } from "./ProposeUserModal";

interface FlowBoardCentralManagementProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  offices: Office[];
  tools: FlowBoardTool[];
  setTools?: React.Dispatch<React.SetStateAction<FlowBoardTool[]>>;
  auditLogs?: AuditLog[];
  onBackToHub: () => void;
  onRefreshData?: () => void;
  onAddTool?: (newTool: Partial<FlowBoardTool>) => Promise<boolean>;
  onDeleteTool?: (toolId: string) => Promise<boolean>;
  onSelectTool?: (toolId: string, initialTab?: string) => void;
}

export function FlowBoardCentralManagement({
  currentUser,
  systemSettings,
  users,
  setUsers,
  offices,
  tools,
  setTools: _setTools,
  auditLogs = [],
  onBackToHub,
  onRefreshData,
  onAddTool,
  onDeleteTool,
  onSelectTool,
}: FlowBoardCentralManagementProps) {
  const { language } = useLanguage();
  const { theme, isCustom } = useTheme();
  const isDark = theme === "dark";

  const buildRoleToolAccessMap = (
    savedSettings?: Record<string, Record<string, ToolAccessLevel>> | null,
    toolsList: FlowBoardTool[] = []
  ): Record<string, Record<string, ToolAccessLevel>> => {
    const result: Record<string, Record<string, ToolAccessLevel>> = {};
    const roles = [
      "Admin",
      "Head Office Admin",
      "Moderator",
      "Divisional Admin",
      "Divisional Moderator",
      "Regional Admin",
      "Regional Moderator",
      "Branch Admin",
      "Branch User",
      "Head Office User",
      "Sub-office User",
      "User",
      "Report Viewer",
    ];
    const allTools = toolsList.length > 0 ? toolsList : DEFAULT_FLOW_TOOLS;

    roles.forEach((r) => {
      result[r] = {};
      allTools.forEach((t) => {
        if (savedSettings && savedSettings[r] && savedSettings[r][t.id] !== undefined) {
          result[r][t.id] = savedSettings[r][t.id];
        } else if (DEFAULT_ROLE_TOOL_ACCESS[r] && DEFAULT_ROLE_TOOL_ACCESS[r][t.id] !== undefined) {
          result[r][t.id] = DEFAULT_ROLE_TOOL_ACCESS[r][t.id];
        } else {
          result[r][t.id] = "none";
        }
      });
    });
    return result;
  };

  const [activeTab, setActiveTab] = useState<"rbac" | "role-permissions" | "tools" | "audit" | "policy">("rbac");
  const [roleToolAccessDraft, setRoleToolAccessDraft] = useState<Record<string, Record<string, ToolAccessLevel>>>(
    () => buildRoleToolAccessMap(systemSettings?.roleToolAccess, tools)
  );
  const [isSavingRolePermissions, setIsSavingRolePermissions] = useState(false);
  const [rolePermissionsSuccessMsg, setRolePermissionsSuccessMsg] = useState("");

  useEffect(() => {
    setRoleToolAccessDraft(buildRoleToolAccessMap(systemSettings?.roleToolAccess, tools));
  }, [systemSettings, tools]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRolePermTab, setSelectedRolePermTab] = useState<string>("Admin");
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [togglingUserIds, setTogglingUserIds] = useState<Set<string>>(new Set());

  const roleStr = currentUser?.role as string | undefined;
  const isSuperAdminUser = roleStr === "Super Admin";
  const isAdmin =
    roleStr === "Super Admin" ||
    roleStr === "Admin" ||
    roleStr === "Head Office Admin" ||
    roleStr === "HeadOfficeAdmin";

  // Visible Users: Admin users must NOT see Super Admin in the list!
  const visibleUsers = useMemo(() => {
    return users.filter((u) => {
      if (!isSuperAdminUser && u.role === "Super Admin") {
        return false;
      }
      return true;
    });
  }, [users, isSuperAdminUser]);

  // Selected User for Granular Tool Permission Modal/Drawer
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [userPermissionsDraft, setUserPermissionsDraft] = useState<Record<string, { access?: ToolAccessLevel; roleTitle?: string; notes?: string }>>({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionSuccessMsg, setPermissionSuccessMsg] = useState("");

  // Create/Edit User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    userId: "",
    name: "",
    email: "",
    role: "User" as UserRole,
    officeId: offices[0]?.id || "",
    designation: "",
    status: "Active" as "Active" | "Inactive",
    password: "",
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userFormError, setUserFormError] = useState("");

  // Add Tool Modal
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [newToolForm, setNewToolForm] = useState({
    name: "",
    nameBn: "",
    description: "",
    descriptionBn: "",
    category: "custom" as any,
    icon: "Boxes",
    version: "1.0.0",
    routeOrTab: "custom",
  });

  // Global Settings Draft
  const [policyDraft, setPolicyDraft] = useState({
    institutionName: systemSettings?.institutionName || "FlowBoard Workspace Platform",
    webAppName: systemSettings?.webAppName || "FlowBoard Enterprise",
    loginLogoUrl: systemSettings?.loginLogoUrl || "",
    requireExpenseApproval: systemSettings?.requireExpenseApproval ?? true,
    showNoticeBar: systemSettings?.showNoticeBar ?? true,
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policySuccessMsg, setPolicySuccessMsg] = useState("");

  useEffect(() => {
    if (systemSettings) {
      setPolicyDraft((prev) => ({
        ...prev,
        institutionName: systemSettings.institutionName || prev.institutionName,
        webAppName: systemSettings.webAppName || prev.webAppName,
        loginLogoUrl: systemSettings.loginLogoUrl ?? prev.loginLogoUrl,
        requireExpenseApproval: systemSettings.requireExpenseApproval ?? prev.requireExpenseApproval,
        showNoticeBar: systemSettings.showNoticeBar ?? prev.showNoticeBar,
      }));
    }
  }, [systemSettings]);

  const handleLoginLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(language === "bn" ? "অনুগ্রহ করে একটি ছবি (Image) ফাইল নির্বাচন করুন।" : "Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(language === "bn" ? "ফাইলের আকার সর্বোচ্চ ২ মেগাবাইট হতে পারবে।" : "Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPolicyDraft((prev) => ({ ...prev, loginLogoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Filtered Users (based on visibleUsers so Admins cannot see Super Admin)
  const filteredUsers = useMemo(() => {
    return visibleUsers.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q);

      const matchesOffice =
        selectedOfficeFilter === "all" || u.officeId === selectedOfficeFilter;
      const matchesRole =
        selectedRoleFilter === "all" || u.role === selectedRoleFilter;
      const matchesStatus =
        selectedStatusFilter === "all" || u.status === selectedStatusFilter;

      return matchesSearch && matchesOffice && matchesRole && matchesStatus;
    });
  }, [visibleUsers, searchQuery, selectedOfficeFilter, selectedRoleFilter, selectedStatusFilter]);

  // Visible Audit Logs: Hide Super Admin activity logs from Admin users
  const visibleAuditLogs = useMemo(() => {
    if (isSuperAdminUser) return auditLogs;
    const superAdminUserIds = new Set(
      users
        .filter((u) => u.role === "Super Admin")
        .map((u) => (u.userId || "").toLowerCase())
    );
    return auditLogs.filter(
      (log) => !superAdminUserIds.has((log.userId || "").toLowerCase())
    );
  }, [auditLogs, users, isSuperAdminUser]);

  // Open Permission Modal
  const handleOpenPermissionsModal = (user: User) => {
    setSelectedUserForPermissions(user);
    const draft: Record<string, { access?: ToolAccessLevel; roleTitle?: string; notes?: string }> = {};

    tools.forEach((tool) => {
      const explicitAccess = user.toolPermissions?.[tool.id]?.access;
      const customTitle = user.toolPermissions?.[tool.id]?.roleTitle || "";
      const notes = user.toolPermissions?.[tool.id]?.notes || "";
      draft[tool.id] = {
        access: explicitAccess,
        roleTitle: customTitle,
        notes: notes,
      };
    });

    setUserPermissionsDraft(draft);
    setPermissionSuccessMsg("");
  };

  // Save Permissions for Selected User
  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;
    setIsSavingPermissions(true);
    setPermissionSuccessMsg("");

    try {
      const updatedUser: User = {
        ...selectedUserForPermissions,
        toolPermissions: userPermissionsDraft,
      };

      const res = await apiFetch(`/api/users/${selectedUserForPermissions.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      });

      if (!res.ok) {
        throw new Error(language === "bn" ? "পারমিশন সংরক্ষণ ব্যর্থ হয়েছে" : "Failed to save permissions");
      }

      const savedUser = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserForPermissions.id ? { ...u, ...savedUser } : u))
      );

      setPermissionSuccessMsg(
        language === "bn"
          ? "টুলভিত্তিক RBAC পারমিশন সফলভাবে সংরক্ষিত হয়েছে!"
          : "Tool-wise RBAC permissions updated successfully!"
      );

      setTimeout(() => {
        setSelectedUserForPermissions(null);
        setPermissionSuccessMsg("");
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Failed to update tool permissions");
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Create or Update User
  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError("");
    setIsSubmittingUser(true);

    try {
      if (editingUser) {
        const payload: any = {
          ...editingUser,
          ...userFormData,
        };
        if (!payload.password) delete payload.password;

        const res = await apiFetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update user");
        }

        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)));
      } else {
        const payload = {
          ...userFormData,
          id: `usr-${Date.now()}`,
          toolPermissions: {},
        };

        const res = await apiFetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to create user");
        }

        const created = await res.json();
        setUsers((prev) => [...prev, created]);
      }

      setShowUserModal(false);
      setEditingUser(null);
    } catch (err: any) {
      setUserFormError(err.message || "Operation failed");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      alert(language === "bn" ? "নিজের আইডি মুছে ফেলা সম্ভব নয়" : "Cannot delete your own user ID");
      return;
    }
    const conf = window.confirm(
      language === "bn"
        ? `আপনি কি নিশ্চিতভাবে "${user.name}" ব্যবহারকারীকে মুছে ফেলতে চান?`
        : `Are you sure you want to delete user "${user.name}"?`
    );
    if (!conf) return;

    try {
      const res = await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    }
  };

  // Reset Password
  const handleAdminResetPassword = async (targetUser: User) => {
    const newPass = prompt(
      language === "bn"
        ? `"${targetUser.name}" (${targetUser.userId})-এর জন্য নতুন পাসওয়ার্ড লিখুন:`
        : `Enter new password for "${targetUser.name}" (${targetUser.userId}):`,
      "password123"
    );
    if (!newPass || !newPass.trim()) return;

    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser.id, newPassword: newPass.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(
          language === "bn"
            ? `"${targetUser.name}"-এর পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!`
            : "Password successfully reset by Admin!"
        );
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || "Failed to reset password");
      }
    } catch {
      alert("Error resetting password");
    }
  };

  // Toggle User Active/Inactive Status
  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    setTogglingUserIds((prev) => new Set(prev).add(user.id));

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );

    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          status: nextStatus,
        }),
      });
      if (!res.ok) {
        // Rollback
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u))
        );
        const errData = await res.json().catch(() => ({}));
        alert(
          errData.error ||
            (language === "bn"
              ? "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।"
              : "Failed to toggle status.")
        );
      } else {
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      // Rollback
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u))
      );
      alert("Failed to toggle status: " + (err.message || err));
    } finally {
      setTogglingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  // Add Tool Submit
  const handleAddToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTool) return;
    const ok = await onAddTool({
      ...newToolForm,
      color: "#2563eb",
      gradient: "from-blue-600 via-indigo-600 to-sky-700",
      status: "active",
    });
    if (ok) {
      setShowAddToolModal(false);
      setNewToolForm({
        name: "",
        nameBn: "",
        description: "",
        descriptionBn: "",
        category: "custom",
        icon: "Boxes",
        version: "1.0.0",
        routeOrTab: "custom",
      });
    }
  };

  // Save Policy Settings
  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    setPolicySuccessMsg("");
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyDraft),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setPolicySuccessMsg(
        language === "bn" ? "পলিসি ও গ্লোবাল সেটিংস সংরক্ষিত হয়েছে!" : "Policy settings updated successfully!"
      );
      setTimeout(() => setPolicySuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleSaveRolePermissions = async () => {
    setIsSavingRolePermissions(true);
    setRolePermissionsSuccessMsg("");
    try {
      const updatedSettings = {
        ...systemSettings,
        roleToolAccess: roleToolAccessDraft,
      };
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error("Failed to save role permissions");
      setGlobalRoleToolAccess(roleToolAccessDraft);
      setRolePermissionsSuccessMsg(
        language === "bn"
          ? "রোল ভিত্তিক টুল পারমিশন সফলভাবে সংরক্ষিত হয়েছে!"
          : "Role-based tool permissions updated successfully!"
      );
      if (onRefreshData) {
        onRefreshData();
      }
      setTimeout(() => setRolePermissionsSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      alert(language === "bn" ? "সংরক্ষণ করতে ব্যর্থ হয়েছে" : "Failed to save settings");
    } finally {
      setIsSavingRolePermissions(false);
    }
  };

  const handleUpdateRolePerm = (role: string, toolId: string, level: ToolAccessLevel) => {
    setRoleToolAccessDraft((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [toolId]: level,
      },
    }));
  };

  const getOfficeName = (id: string) => {
    return offices.find((o) => o.id === id)?.name || id;
  };

  const renderToolIcon = (iconName: string, className: string = "w-4 h-4") => {
    switch (iconName) {
      case "Coins":
        return <Coins className={className} />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className={className} />;
      case "FileText":
        return <FileText className={className} />;
      case "Receipt":
        return <Receipt className={className} />;
      case "Calculator":
        return <Calculator className={className} />;
      case "FileCheck2":
        return <FileCheck2 className={className} />;
      case "ShieldCheck":
        return <ShieldCheck className={className} />;
      default:
        return <Boxes className={className} />;
    }
  };

  return (
    <div
      id="flowboard-central-management-root"
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? "bg-slate-950 text-slate-100" : isCustom ? "bg-slate-900 text-purple-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Central Management Top Bar */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            id="central-back-to-hub-btn"
            onClick={onBackToHub}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title={language === "bn" ? "ফ্লোবোর্ড হাবে ফিরুন" : "Back to FlowBoard Hub"}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "bn" ? "ফ্লোবোর্ড হাব" : "Hub"}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-900/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  {language === "bn" ? "ফ্লোবোর্ড সেন্ট্রাল ম্যানেজমেন্ট" : "FlowBoard Central Management"}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  RBAC & Multi-Tool
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "bn"
                  ? "সকল টুলস, সেন্ট্রাল ইউজার ডিরেক্টরি ও রোল-বেসড পারমিশন নিয়ন্ত্রণ"
                  : "Central directory, multi-tool permissions, and enterprise hub security"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{users.length}</span>
              <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "ইউজার" : "Users"}</span>
            </div>
            <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{tools.length}</span>
              <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "টুলস" : "Tools"}</span>
            </div>
            <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{offices.length}</span>
              <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "অফিস" : "Offices"}</span>
            </div>
          </div>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-xs"
              title={language === "bn" ? "ডাটা রিফ্রেশ" : "Refresh Data"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            id="central-create-user-btn"
            onClick={() => {
              setEditingUser(null);
              setUserFormData({
                userId: "",
                name: "",
                email: "",
                role: "User",
                officeId: offices[0]?.id || "",
                designation: "",
                status: "Active",
                password: "",
              });
              setUserFormError("");
              setShowUserModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "bn" ? "নতুন ব্যবহারকারী" : "New User"}</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 px-4 sm:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          <button
            id="central-tab-rbac"
            onClick={() => setActiveTab("rbac")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "rbac"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{language === "bn" ? "ব্যবহারকারী ও RBAC ম্যাট্রিক্স" : "Users & Tool RBAC Matrix"}</span>
          </button>

          <button
            id="central-tab-role-permissions"
            onClick={() => setActiveTab("role-permissions")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "role-permissions"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{language === "bn" ? "রোল ভিত্তিক পারমিশন" : "Role-Based Permissions"}</span>
          </button>

          <button
            id="central-tab-tools"
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "tools"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{language === "bn" ? "টুলস ও মডিউল রেজিস্ট্রি" : "Tools & Modules Registry"}</span>
          </button>

          <button
            id="central-tab-audit"
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{language === "bn" ? "সেন্ট্রাল অডিট ও নিরাপত্তা লগ" : "Central Audit & Logs"}</span>
          </button>

          <button
            id="central-tab-policy"
            onClick={() => setActiveTab("policy")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "policy"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{language === "bn" ? "হাব পলিসি ও কনফিগারেশন" : "Hub Policies & Config"}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: USERS & RBAC MATRIX                               */}
        {/* ======================================================== */}
        {activeTab === "rbac" && (
          <div className="space-y-4">
            {/* Top Bar with Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === "bn" ? "ব্যবহারকারী তালিকা ও RBAC ব্যবস্থাপনা" : "User Directory & RBAC Matrix"}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    {filteredUsers.length} / {users.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === "bn"
                    ? "সকল স্বতন্ত্র টুলের জন্য কেন্দ্রীয়ভাবে ব্যবহারকারীর রোল, অফিস পদবি ও এক্সেস পারমিশন পরিচালনা করুন"
                    : "Centrally manage user credentials, office assignment, global roles, and granular tool access levels"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isAdmin ? (
                  <button
                    id="central-table-add-user-btn"
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormData({
                        userId: "",
                        name: "",
                        email: "",
                        role: "Sub-office User",
                        officeId: offices[0]?.id || "",
                        designation: "",
                        status: "Active",
                        password: "password123",
                      });
                      setUserFormError("");
                      setShowUserModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === "bn" ? "+ নতুন ব্যবহারকারী" : "+ Add User"}</span>
                  </button>
                ) : (
                  <button
                    id="central-table-propose-user-btn"
                    onClick={() => setShowProposalModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{language === "bn" ? "সহকর্মীর আইডি প্রস্তাব দিন" : "Propose Colleague"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === "bn"
                      ? "নাম, ইউজার আইডি, ইমেইল বা পদবি দিয়ে খুঁজুন..."
                      : "Search by name, user ID, email, or designation..."
                  }
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "ফিল্টার:" : "Filter:"}</span>
                </div>

                <select
                  value={selectedOfficeFilter}
                  onChange={(e) => setSelectedOfficeFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">{language === "bn" ? "সকল অফিস" : "All Offices"}</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">{language === "bn" ? "সকল রোল" : "All Roles"}</option>
                  {isSuperAdminUser && <option value="Super Admin">Super Admin</option>}
                  <option value="Admin">Admin</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Divisional Admin">Divisional Admin (বিভাগীয় এডমিন)</option>
                  <option value="Divisional Moderator">Divisional Moderator (বিভাগীয় মডারেটর)</option>
                  <option value="Regional Admin">Regional Admin (আঞ্চলিক এডমিন)</option>
                  <option value="Regional Moderator">Regional Moderator (আঞ্চলিক মডারেটর)</option>
                  <option value="Branch Admin">Branch Admin (শাখার এডমিন)</option>
                  <option value="Branch User">Branch User (শাখা ইউজার)</option>
                  <option value="Head Office Admin">Head Office Admin</option>
                  <option value="Sub-office User">Sub-office User</option>
                  <option value="User">User</option>
                  <option value="Report Viewer">Report Viewer</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">{language === "bn" ? "সকল স্ট্যাটাস" : "All Status"}</option>
                  <option value="Active">{language === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
                  <option value="Inactive">{language === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{language === "bn" ? "ইউজার আইডি ও নাম" : "User ID & Name"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "পদবি" : "Designation"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "সিস্টেম রোল" : "System Role"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "অফিস" : "Office"}</th>
                      <th className="py-3 px-4">{language === "bn" ? "টুল এক্সেস ম্যাট্রিক্স (RBAC)" : "Tool Access Matrix (RBAC)"}</th>
                      <th className="py-3 px-4 text-center">{language === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                      <th className="py-3 px-4 text-right">{language === "bn" ? "অ্যাকশন" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          {language === "bn"
                            ? "কোন ব্যবহারকারী পাওয়া যায়নি।"
                            : "No users found matching your filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* USER ID & NAME */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                    {user.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    ID: {user.userId}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* DESIGNATION */}
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              {user.designation || "-"}
                            </td>

                            {/* SYSTEM ROLE */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  user.role === "Super Admin"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                                    : user.role === "Admin" || user.role === "Head Office Admin"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                      : user.role === "Moderator"
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                                        : user.role === "Report Viewer"
                                          ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>

                            {/* OFFICE */}
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 dark:text-slate-200 font-medium">
                                {getOfficeName(user.officeId)}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                {user.email}
                              </div>
                            </td>

                            {/* TOOL ACCESS MATRIX */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap max-w-sm">
                                {tools.slice(0, 8).map((tool) => {
                                  const access = getUserToolAccess(user, tool.id, roleToolAccessDraft);
                                  const shortName =
                                    tool.id === "budget-expense"
                                      ? "বরাদ্দ"
                                      : tool.id === "stockpro"
                                        ? "স্টকপ্রো"
                                        : tool.id === "conference-note"
                                          ? "সভার নোট"
                                          : tool.id === "multi-item-bill"
                                            ? "বহু-আইটেম"
                                            : tool.id === "stationery-bill"
                                              ? "মুদ্রিত"
                                              : tool.id === "miscellaneous"
                                                ? "বিবিধ"
                                                : tool.nameBn ? tool.nameBn.slice(0, 6) : tool.name.slice(0, 6);

                                  return (
                                    <span
                                      key={tool.id}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                                        access === "full"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                          : access === "operate"
                                            ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                                            : access === "view"
                                              ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                              : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/80 dark:text-slate-500 dark:border-slate-700 line-through opacity-70"
                                      }`}
                                      title={`${tool.name}: ${access.toUpperCase()}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          access === "full"
                                            ? "bg-emerald-500"
                                            : access === "operate"
                                              ? "bg-blue-500"
                                              : access === "view"
                                                ? "bg-amber-500"
                                                : "bg-slate-400"
                                        }`}
                                      />
                                      <span>
                                        {shortName}:
                                        {access === "full"
                                          ? (language === "bn" ? "পূর্ণ" : "Full")
                                          : access === "operate"
                                            ? (language === "bn" ? "অপারেট" : "Operate")
                                            : access === "view"
                                              ? (language === "bn" ? "ভিউ" : "View")
                                              : (language === "bn" ? "বন্ধ" : "None")}
                                      </span>
                                    </span>
                                  );
                                })}
                                {tools.length > 5 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    +{tools.length - 5}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* STATUS */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  user.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                }`}
                              >
                                {user.status === "Active"
                                  ? (language === "bn" ? "সক্রিয়" : "Active")
                                  : (language === "bn" ? "নিষ্ক্রিয়" : "Inactive")}
                              </span>
                            </td>

                            {/* ACTIONS */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Edit Profile */}
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setUserFormData({
                                      userId: user.userId,
                                      name: user.name,
                                      email: user.email,
                                      role: user.role,
                                      officeId: user.officeId,
                                      designation: user.designation || "",
                                      status: user.status,
                                      password: "",
                                    });
                                    setUserFormError("");
                                    setShowUserModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                                  title={language === "bn" ? "তথ্য সম্পাদনা করুন" : "Edit Profile"}
                                >
                                  <Edit2 className="w-3 h-3 text-slate-500" />
                                  <span>{language === "bn" ? "সম্পাদনা" : "Edit"}</span>
                                </button>

                                {/* Reset Password */}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleAdminResetPassword(user)}
                                    className="px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                                    title={language === "bn" ? "পাসওয়ার্ড রিসেট করুন" : "Reset Password"}
                                  >
                                    <KeyRound className="w-3 h-3 text-sky-500" />
                                    <span>Reset</span>
                                  </button>
                                )}

                                {/* Toggle Active/Inactive */}
                                {isAdmin && user.id !== currentUser.id && (
                                  <button
                                    disabled={togglingUserIds.has(user.id)}
                                    onClick={() => handleToggleUserStatus(user)}
                                    className={`px-2 py-1 rounded-lg border transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                                      user.status === "Active"
                                        ? "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        : "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    }`}
                                    title={
                                      user.status === "Active"
                                        ? (language === "bn" ? "অ্যাকাউন্ট নিষ্ক্রিয় করুন" : "Deactivate Account")
                                        : (language === "bn" ? "অ্যাকাউন্ট সক্রিয় করুন" : "Activate Account")
                                    }
                                  >
                                    {user.status === "Active" ? (
                                      <>
                                        <X className="w-3 h-3 text-slate-400" />
                                        <span>{language === "bn" ? "নিষ্ক্রিয় করুন" : "Deactivate"}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-500" />
                                        <span>{language === "bn" ? "সক্রিয় করুন" : "Activate"}</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Tool RBAC Config */}
                                <button
                                  onClick={() => handleOpenPermissionsModal(user)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-300 dark:border-indigo-800/80 transition flex items-center gap-1 cursor-pointer"
                                  title={language === "bn" ? "টুলভিত্তিক RBAC পারমিশন কনফিগার করুন" : "Configure Tool-wise RBAC"}
                                >
                                  <Sliders className="w-3 h-3 text-indigo-500" />
                                  <span>{language === "bn" ? "টুল পারমিশন" : "Tool RBAC"}</span>
                                </button>

                                {/* Delete User */}
                                {isAdmin && user.id !== currentUser.id && (
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                    title={language === "bn" ? "মুছে ফেলুন" : "Delete User"}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: ROLE-BASED GLOBAL PERMISSION SETTINGS                */}
        {/* ======================================================== */}
        {activeTab === "role-permissions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "রোল ভিত্তিক গ্লোবাল টুল পারমিশন সেটিংস" : "Role-Based Global Tool Permission Settings"}
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "bn"
                    ? "ইউজারদের আলাদা করে পারমিশন দেওয়ার পরিবর্তে নির্দিষ্ট রোলের জন্য ডিফল্ট এক্সেস লেভেল সেট করুন"
                    : "Assign default access levels for specific roles globally instead of assigning permissions manually per user"}
                </p>
              </div>

              <div>
                <button
                  id="save-role-permissions-btn"
                  onClick={handleSaveRolePermissions}
                  disabled={isSavingRolePermissions}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSavingRolePermissions
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : language === "bn"
                        ? "পারমিশন সংরক্ষণ করুন"
                        : "Save Role Permissions"}
                  </span>
                </button>
              </div>
            </div>

            {rolePermissionsSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{rolePermissionsSuccessMsg}</span>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left sidebar: Roles */}
              <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 lg:pr-4">
                {[
                  { name: "Admin", labelBn: "অ্যাডমিন (Admin)", labelEn: "Admin" },
                  { name: "Head Office Admin", labelBn: "প্রধান কার্যালয় অ্যাডমিন", labelEn: "Head Office Admin" },
                  { name: "Moderator", labelBn: "মডারেটর (Moderator)", labelEn: "Moderator" },
                  { name: "Divisional Admin", labelBn: "বিভাগীয় এডমিন (Divisional Admin)", labelEn: "Divisional Admin" },
                  { name: "Divisional Moderator", labelBn: "বিভাগীয় মডারেটর", labelEn: "Divisional Moderator" },
                  { name: "Regional Admin", labelBn: "আঞ্চলিক এডমিন (Regional Admin)", labelEn: "Regional Admin" },
                  { name: "Regional Moderator", labelBn: "আঞ্চলিক মডারেটর", labelEn: "Regional Moderator" },
                  { name: "Branch Admin", labelBn: "শাখার এডমিন (Branch Admin)", labelEn: "Branch Admin" },
                  { name: "Branch User", labelBn: "শাখা ইউজার (Branch User)", labelEn: "Branch User" },
                  { name: "Head Office User", labelBn: "প্রধান কার্যালয় ব্যবহারকারী", labelEn: "Head Office User" },
                  { name: "Sub-office User", labelBn: "উপ-শাখা ব্যবহারকারী", labelEn: "Sub-office User" },
                  { name: "User", labelBn: "সাধারণ ব্যবহারকারী (User)", labelEn: "General User" },
                  { name: "Report Viewer", labelBn: "রিপোর্ট পরিদর্শক", labelEn: "Report Viewer" },
                ].map((role) => {
                  const isActive = selectedRolePermTab === role.name;
                  return (
                    <button
                      key={role.name}
                      onClick={() => setSelectedRolePermTab(role.name)}
                      className={`px-4 py-2.5 rounded-xl text-left text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-between w-full ${
                        isActive
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span>{language === "bn" ? role.labelBn : role.labelEn}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Right panel: Tool list for selected role */}
              <div className="flex-1 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === "bn" ? `${selectedRolePermTab} রোলের জন্য অনুমোদিত টুল পারমিশন:` : `Configuring permissions for ${selectedRolePermTab}:`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-full">
                      {selectedRolePermTab}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tools.map((tool) => {
                    const currentLevel =
                      roleToolAccessDraft[selectedRolePermTab]?.[tool.id] ||
                      getRoleToolAccess(selectedRolePermTab, tool.id, roleToolAccessDraft);
                    return (
                      <div
                        key={tool.id}
                        className={`p-4 rounded-2xl border transition-colors ${
                          isCustom
                            ? "bg-[#18132e]/90 border-[#322754]"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-start gap-3 justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {renderToolIcon(tool.icon, "w-4 h-4")}
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {language === "bn" ? tool.nameBn || tool.name : tool.name}
                              </h3>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 max-w-[200px]">
                                {language === "bn" ? tool.descriptionBn || tool.description : tool.description}
                              </p>
                            </div>
                          </div>

                          <div>
                            <select
                              value={currentLevel}
                              onChange={(e) =>
                                handleUpdateRolePerm(
                                  selectedRolePermTab,
                                  tool.id,
                                  e.target.value as ToolAccessLevel
                                )
                              }
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
                              <option value="none">{language === "bn" ? "কোনো প্রবেশাধিকার নেই (বন্ধ)" : "No Access (Disabled)"}</option>
                              <option value="view">{language === "bn" ? "শুধু পরিদর্শন (View)" : "View Only"}</option>
                              <option value="operate">{language === "bn" ? "অপারেশনাল কাজ (Operate)" : "Operate Only"}</option>
                              <option value="full">{language === "bn" ? "পূর্ণ ক্ষমতা (Full)" : "Full Access"}</option>
                            </select>
                          </div>
                        </div>

                        {/* Visual Badge Indicator */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">{language === "bn" ? "বর্তমান অবস্থা:" : "Current Level:"}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              currentLevel === "full"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : currentLevel === "operate"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                  : currentLevel === "view"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20"
                            }`}
                          >
                            {currentLevel === "full"
                              ? language === "bn" ? "পূর্ণ ক্ষমতা" : "Full"
                              : currentLevel === "operate"
                                ? language === "bn" ? "অপারেশনাল" : "Operate"
                                : currentLevel === "view"
                                  ? language === "bn" ? "শুধু ভিউ" : "View"
                                  : language === "bn" ? "বন্ধ" : "None"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TOOLS & MODULES REGISTRY                          */}
        {/* ======================================================== */}
        {activeTab === "tools" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "নিবন্ধিত সকল টুলস ও মডিউল রেজিস্ট্রি" : "Registered Tools & Modules Registry"}
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "bn"
                    ? "ফ্লোবোর্ড হাবে সংযুক্ত যেকোনো টুলের সক্রিয়তা ও রোল এক্সেস নীতি নির্ধারণ করুন"
                    : "Manage active status and allowed roles for tools registered in the FlowBoard Hub"}
                </p>
              </div>

              {onAddTool && (
                <button
                  onClick={() => setShowAddToolModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === "bn" ? "নতুন টুল রেজিস্টার করুন" : "Register New Tool"}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool) => {
                const isFlagship = tool.id === "budget-expense";
                return (
                  <div
                    key={tool.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {renderToolIcon(tool.icon, "w-5 h-5")}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{language === "bn" ? tool.nameBn : tool.name}</span>
                              {tool.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                  {language === "bn" ? tool.badgeBn || tool.badge : tool.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">v{tool.version} • ID: {tool.id}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tool.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {tool.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {language === "bn" ? tool.descriptionBn : tool.description}
                      </p>

                      {tool.subModules && tool.subModules.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tool.subModules.map((sm) => (
                            <span
                              key={sm.id}
                              className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {language === "bn" ? sm.nameBn : sm.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {onSelectTool && (
                        <button
                          onClick={() => onSelectTool(tool.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "লঞ্চ করুন" : "Launch"}</span>
                        </button>
                      )}

                      {!isFlagship && onDeleteTool && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete tool ${tool.name}?`)) {
                              await onDeleteTool(tool.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          title="Delete Tool"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CENTRAL AUDIT & LOGS                              */}
        {/* ======================================================== */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "সেন্ট্রাল অডিট ও নিরাপত্তা লগ" : "Central Audit Trail"}
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "bn"
                    ? "সেন্ট্রাল হাব ও সকল টুলসের ব্যবহারকারী কার্যক্রমের পূর্ণাঙ্গ রেকর্ড"
                    : "Comprehensive log of user activity, logins, and system operations"}
                </p>
              </div>

              <button
                onClick={() => {
                  const csvContent =
                    "data:text/csv;charset=utf-8," +
                    ["Timestamp,User,Action,Details"]
                      .concat(
                        visibleAuditLogs.map(
                          (l) =>
                            `"${l.timestamp}","${l.userId}","${l.action}","${(l.details || "").replace(/"/g, '""')}"`
                        )
                      )
                      .join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `flowboard_audit_logs_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "CSV ডাউনলোড" : "Export CSV"}</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold backdrop-blur">
                    <tr>
                      <th className="py-2.5 px-4">{language === "bn" ? "সময় ও তারিখ" : "Timestamp"}</th>
                      <th className="py-2.5 px-4">{language === "bn" ? "ব্যবহারকারী" : "User"}</th>
                      <th className="py-2.5 px-4">{language === "bn" ? "অ্যাকশন" : "Action"}</th>
                      <th className="py-2.5 px-4">{language === "bn" ? "বিবরণ" : "Details"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          {language === "bn" ? "কোন অডিট লগ পাওয়া যায়নি" : "No audit logs recorded yet"}
                        </td>
                      </tr>
                    ) : (
                      visibleAuditLogs.slice(0, 100).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {log.timestamp}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {log.userId}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-md truncate">
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HUB POLICIES & SETTINGS                           */}
        {/* ======================================================== */}
        {activeTab === "policy" && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language === "bn" ? "সেন্ট্রাল হাব পলিসি ও সিস্টেম কনফিগারেশন" : "Central Hub Policies & Configuration"}
              </h2>
              <p className="text-xs text-slate-500">
                {language === "bn"
                  ? "সকল টুলস ও ব্যবহারকারীদের জন্য প্রযোজ্য সার্বজনীন নিরাপত্তা ও প্রতিষ্ঠান পলিসি"
                  : "Global branding, organizational rules, and security enforcement"}
              </p>
            </div>

            {policySuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{policySuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === "bn" ? "প্রতিষ্ঠানের নাম (Organization / Bank Name)" : "Institution Name"}
                </label>
                <input
                  type="text"
                  value={policyDraft.institutionName}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, institutionName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === "bn" ? "সেন্ট্রাল হাবের নাম (Hub Web App Name)" : "Web App Name"}
                </label>
                <input
                  type="text"
                  value={policyDraft.webAppName}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, webAppName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Login Page Logo Customization */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <span>{language === "bn" ? "লগইন কার্ডের লোগো (Login Card Logo)" : "Login Card Central Logo"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {language === "bn"
                        ? "শুধুমাত্র লগইন কার্ডের মাঝখানে প্রদর্শিত লোগোটি এখান থেকে আপলোড বা পরিবর্তন করতে পারেন।"
                        : "Upload or configure the specific logo displayed inside the Login Card."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shrink-0 shadow-inner">
                    {policyDraft.loginLogoUrl ? (
                      <img
                        src={policyDraft.loginLogoUrl}
                        alt="Login Logo Preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-6 h-6 text-slate-500 mx-auto" />
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">Default</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "লোগো আপলোড করুন" : "Upload Logo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLoginLogoFileUpload}
                          className="hidden"
                        />
                      </label>

                      {policyDraft.loginLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setPolicyDraft({ ...policyDraft, loginLogoUrl: "" })}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-medium border border-rose-500/30 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "লোগো সরান" : "Remove"}</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder={language === "bn" ? "অথবা সরাসরি ছবির URL পেস্ট করুন (যেমন: https://...)" : "Or enter direct Image URL (e.g. https://...)"}
                        value={policyDraft.loginLogoUrl}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, loginLogoUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyDraft.requireExpenseApproval}
                    onChange={(e) =>
                      setPolicyDraft({ ...policyDraft, requireExpenseApproval: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "ব্যয় অনুমোদনের বাধ্যবাধকতা" : "Enforce Expense Verification"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "bn"
                        ? "মডারেটর বা অ্যাডমিনের সম্মতি ছাড়া কোনো বিল মঞ্জুর হবে না"
                        : "Requires admin/moderator approval before expense is final"}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyDraft.showNoticeBar}
                    onChange={(e) =>
                      setPolicyDraft({ ...policyDraft, showNoticeBar: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "সেন্ট্রাল নোটিশ বার প্রদর্শন" : "Show Central Notice Bar"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "bn" ? "শীর্ষবারে চলমান নোটিশ স্ক্রোল করবে" : "Displays marquee notices across the hub"}
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSavePolicy}
                  disabled={isSavingPolicy}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSavingPolicy
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : language === "bn"
                        ? "পলিসি আপডেট করুন"
                        : "Save Policy"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: GRANULAR TOOL RBAC PERMISSIONS PER USER           */}
      {/* ======================================================== */}
      {selectedUserForPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center shadow-md">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === "bn" ? "টুলভিত্তিক RBAC পারমিশন নিয়ন্ত্রণ" : "Tool-wise RBAC Permissions"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUserForPermissions.name} ({selectedUserForPermissions.userId}) •{" "}
                    {getOfficeName(selectedUserForPermissions.officeId)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForPermissions(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Tools List with Interactive Role Selector */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {permissionSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{permissionSuccessMsg}</span>
                </div>
              )}

              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="font-semibold">{language === "bn" ? "নির্দেশনা:" : "Note:"} </span>
                {language === "bn"
                  ? "প্রতিটি টুলের জন্য ব্যবহারকারীর সুনির্দিষ্ট এক্সেস লেভেল এবং প্রয়োজনে কাস্টম পদবি (যেমন: 'স্টক ইনচার্জ', 'নোট অনুমোদনকারী') নির্ধারণ করুন।"
                  : "Assign access levels and custom roles for each tool. Access changes apply immediately."}
              </div>

              <div className="space-y-3">
                {tools.map((tool) => {
                  const currentConfig = userPermissionsDraft[tool.id] || {
                    access: "operate",
                    roleTitle: "",
                  };

                  return (
                    <div
                      key={tool.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                          {renderToolIcon(tool.icon, "w-4 h-4")}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {language === "bn" ? tool.nameBn : tool.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tool.id} • {tool.category}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Access Level Selector */}
                        <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setUserPermissionsDraft((prev) => {
                                const next = { ...prev };
                                if (next[tool.id]) {
                                  next[tool.id] = { ...next[tool.id], access: undefined };
                                }
                                return next;
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                              currentConfig.access === undefined
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            {language === "bn" ? "রোল থেকে ইনহেরিট" : "Inherit from Role"}
                          </button>
                          
                          {(
                            [
                              { key: "full", label: language === "bn" ? "অ্যাডমিন" : "Admin", color: "text-emerald-700 dark:text-emerald-300" },
                              { key: "operate", label: language === "bn" ? "অপারেটর" : "Operator", color: "text-blue-700 dark:text-blue-300" },
                              { key: "view", label: language === "bn" ? "ভিউয়ার" : "Viewer", color: "text-amber-700 dark:text-amber-300" },
                              { key: "none", label: language === "bn" ? "বন্ধ" : "None", color: "text-slate-400" },
                            ] as const
                          ).map((lvl) => {
                            const isSelected = currentConfig.access === lvl.key;
                            return (
                              <button
                                key={lvl.key}
                                type="button"
                                onClick={() => {
                                  setUserPermissionsDraft((prev) => ({
                                    ...prev,
                                    [tool.id]: {
                                      ...prev[tool.id],
                                      access: lvl.key,
                                    },
                                  }));
                                }}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                  isSelected
                                    ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs font-bold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                              >
                                {lvl.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Role Title in Tool */}
                        <input
                          type="text"
                          value={currentConfig.roleTitle || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUserPermissionsDraft((prev) => ({
                              ...prev,
                              [tool.id]: {
                                ...prev[tool.id],
                                roleTitle: val,
                              },
                            }));
                          }}
                          placeholder={language === "bn" ? "কাস্টম পদবি (ঐচ্ছিক)" : "Tool Role Title"}
                          className="w-32 sm:w-36 px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedUserForPermissions(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSavingPermissions}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSavingPermissions
                    ? language === "bn"
                      ? "সংরক্ষণ হচ্ছে..."
                      : "Saving..."
                    : language === "bn"
                      ? "পারমিশন সংরক্ষণ করুন"
                      : "Save Permissions"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT USER                                */}
      {/* ======================================================== */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingUser
                    ? language === "bn"
                      ? "ব্যবহারকারী প্রোফাইল সম্পাদনা"
                      : "Edit User Profile"
                    : language === "bn"
                      ? "নতুন ব্যবহারকারী তৈরি"
                      : "Create New User"}
                </h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserForm} className="p-5 space-y-4">
              {userFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "ইউজার আইডি *" : "User ID *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.userId}
                    onChange={(e) => setUserFormData({ ...userFormData, userId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "পুরো নাম *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "ইমেইল *" : "Email *"}
                  </label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "পদবি" : "Designation"}
                  </label>
                  <input
                    type="text"
                    value={userFormData.designation}
                    onChange={(e) => setUserFormData({ ...userFormData, designation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "গ্লোবাল রোল *" : "Global Role *"}
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {isSuperAdminUser && <option value="Super Admin">Super Admin</option>}
                    <option value="Admin">Admin</option>
                    <option value="Moderator">Moderator</option>
                    <option value="Divisional Admin">Divisional Admin (বিভাগীয় এডমিন)</option>
                    <option value="Divisional Moderator">Divisional Moderator (বিভাগীয় মডারেটর)</option>
                    <option value="Regional Admin">Regional Admin (আঞ্চলিক এডমিন)</option>
                    <option value="Regional Moderator">Regional Moderator (আঞ্চলিক মডারেটর)</option>
                    <option value="Branch Admin">Branch Admin (শাখার এডমিন)</option>
                    <option value="Branch User">Branch User (শাখা ইউজার)</option>
                    <option value="User">User</option>
                    <option value="Sub-office User">Sub-office User</option>
                    <option value="Report Viewer">Report Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "নির্ধারিত অফিস *" : "Assigned Office *"}
                  </label>
                  <select
                    value={userFormData.officeId}
                    onChange={(e) => setUserFormData({ ...userFormData, officeId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUser
                      ? language === "bn"
                        ? "পাসওয়ার্ড (পরিবর্তন করতে চাইলে)"
                        : "Password (leave blank to keep)"
                      : language === "bn"
                        ? "পাসওয়ার্ড *"
                        : "Password *"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "স্ট্যাটাস" : "Status"}
                  </label>
                  <select
                    value={userFormData.status}
                    onChange={(e) =>
                      setUserFormData({
                        ...userFormData,
                        status: e.target.value as "Active" | "Inactive",
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmittingUser
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : language === "bn"
                        ? "ব্যবহারকারী সংরক্ষণ করুন"
                        : "Save User"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER NEW TOOL                                 */}
      {/* ======================================================== */}
      {showAddToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-sky-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === "bn" ? "নতুন টুল / মডিউল রেজিস্টার" : "Register New Tool"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddToolModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddToolSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "bn" ? "টুলের নাম (ইংরেজি) *" : "Tool Name (English) *"}
                </label>
                <input
                  type="text"
                  required
                  value={newToolForm.name}
                  onChange={(e) => setNewToolForm({ ...newToolForm, name: e.target.value })}
                  placeholder="e.g. Asset Registry"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "bn" ? "টুলের নাম (বাংলা) *" : "Tool Name (Bengali) *"}
                </label>
                <input
                  type="text"
                  required
                  value={newToolForm.nameBn}
                  onChange={(e) => setNewToolForm({ ...newToolForm, nameBn: e.target.value })}
                  placeholder="যেমন: সম্পদ রেজিস্ট্রি"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === "bn" ? "বিবরণ (বাংলা)" : "Description"}
                </label>
                <textarea
                  rows={2}
                  value={newToolForm.descriptionBn}
                  onChange={(e) => setNewToolForm({ ...newToolForm, descriptionBn: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "ক্যাটাগরি" : "Category"}
                  </label>
                  <select
                    value={newToolForm.category}
                    onChange={(e) => setNewToolForm({ ...newToolForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="finance">finance</option>
                    <option value="documents">documents</option>
                    <option value="compliance">compliance</option>
                    <option value="analytics">analytics</option>
                    <option value="custom">custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "আইকন" : "Icon"}
                  </label>
                  <select
                    value={newToolForm.icon}
                    onChange={(e) => setNewToolForm({ ...newToolForm, icon: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Boxes">Boxes</option>
                    <option value="Coins">Coins</option>
                    <option value="FileSpreadsheet">FileSpreadsheet</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Calculator">Calculator</option>
                    <option value="FileText">FileText</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddToolModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-900/20"
                >
                  {language === "bn" ? "সংযুক্ত করুন" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Propose User Modal */}
      {showProposalModal && (
        <ProposeUserModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          officeName={currentUser?.officeId ? getOfficeName(currentUser.officeId) : undefined}
          onSuccess={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
}
