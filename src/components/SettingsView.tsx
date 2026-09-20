import { apiFetch } from "../api";
import React, { useState, useRef } from "react";
import {
  SystemSettings,
  FinancialYear,
  Office,
  Category,
  User,
  UserRole,
  FlowBoardTool,
  UserToolPermissions,
  getUserToolAccess,
  getToolRoleTitle,
} from "../types";
import { DEFAULT_FLOW_TOOLS } from "../config/flowTools";
import {
  Settings,
  Calendar,
  Folder,
  Plus,
  Check,
  X,
  Building2,
  Save,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Lock,
  AlertTriangle,
  Edit2,
  UserPlus,
  ShieldCheck,
  Layers,
  Coins,
  Package,
  FileSpreadsheet,
  Receipt,
  Printer,
  Database,
  PlayCircle,
  Code,
  MessageSquare,
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
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  allocations?: any[];
  expenses?: any[];
  refreshData: () => void;
  flowTools?: FlowBoardTool[];
  onOpenCentralManagement?: () => void;
}

export function SettingsView({
  activeTab = "general",
  systemSettings,
  financialYears,
  offices,
  categories,
  users,
  setUsers,
  currentUser,
  allocations = [],
  expenses = [],
  refreshData,
  flowTools = DEFAULT_FLOW_TOOLS,
  onOpenCentralManagement,
}: SettingsViewProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isOcean = theme === "ocean";
  const isDark = theme === "dark";

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState("");
  const [confirmModalMessage, setConfirmModalMessage] = useState("");
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(
    null,
  );

  const triggerConfirm = (
    title: string,
    message: string,
    action: () => void,
  ) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setOnConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const [currentTab, setCurrentTab] = React.useState(activeTab);

  React.useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const [_localUsers, setLocalUsers] = useState<User[]>(users);
  const [_togglingUserIds, setTogglingUserIds] = useState<Set<string>>(
    new Set(),
  );

  React.useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const [settingsForm, setSettingsForm] = useState(systemSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalName, setProposalName] = useState("");
  const [proposalUserId, setProposalUserId] = useState("");
  const [proposalEmail, setProposalEmail] = useState("");
  const [proposalDesignation, setProposalDesignation] = useState("");
  const [proposalLoading, setProposalLoading] = useState(false);

  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalName.trim() || !proposalUserId.trim()) {
      alert(
        language === "bn"
          ? "নাম এবং ইউজার আইডি আবশ্যক।"
          : "Name and User ID are required.",
      );
      return;
    }
    setProposalLoading(true);
    try {
      const res = await apiFetch("/api/users/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: proposalName,
          userId: proposalUserId,
          email: proposalEmail,
          designation: proposalDesignation,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          language === "bn"
            ? "আপনার সহকর্মীর আইডি প্রস্তাব সফলভাবে পাঠানো হয়েছে। এডমিন অনুমোদন দিলে লগইন করা যাবে।"
            : "Colleague user ID proposal submitted. Waiting for admin approval.",
        );
        setShowProposalModal(false);
        setProposalName("");
        setProposalUserId("");
        setProposalEmail("");
        setProposalDesignation("");
        refreshData();
      } else {
        alert(data.error || "Error");
      }
    } catch {
      alert("Network error");
    } finally {
      setProposalLoading(false);
    }
  };

  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [showAddFyModal, setShowAddFyModal] = useState(false);
  const [newFyName, setNewFyName] = useState("");
  const [newFyStartDate, setNewFyStartDate] = useState("");
  const [newFyEndDate, setNewFyEndDate] = useState("");
  const [newFyStatus, setNewFyStatus] = useState<"Active" | "Inactive">(
    "Active",
  );

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
          isActive: newFyStatus === "Active",
        }),
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
    } catch (_err) {
      alert("Error creating financial year");
    }
  };

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
    const otherFYs = financialYears.filter((f) => f.id !== fy.id);
    const defaultTarget =
      otherFYs.find((f) => f.status === "Active") || otherFYs[0];
    setTargetFyId(defaultTarget?.id || "");

    const initialMap: Record<string, number> = {};
    offices.forEach((off) => {
      categories.forEach((cat) => {
        const key = `${off.id}_${cat.id}`;
        const fyAllocations = allocations.filter(
          (a) =>
            a.financialYearId === fy.id &&
            a.officeId === off.id &&
            a.categoryId === cat.id,
        );
        const fyExpenses = expenses.filter(
          (e) =>
            e.financialYearId === fy.id &&
            e.officeId === off.id &&
            e.categoryId === cat.id &&
            e.status !== "Rejected",
        );
        const totalAlloc = fyAllocations.reduce(
          (sum, a) => sum + Number(a.allocatedAmount || 0),
          0,
        );
        const totalSpent = fyExpenses.reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0,
        );
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
          carryForwardMap: carryMap,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCloseErrorMsg(data.error || "অর্থবছর ক্লোজ করতে ব্যর্থ হয়েছে।");
      } else {
        setShowCloseModal(false);
        alert(
          language === "bn"
            ? `অর্থবছর ${closingFy?.name || ""} সফলভাবে ক্লোজ করা হয়েছে!`
            : `Financial Year ${closingFy?.name || ""} closed successfully!`,
        );
        refreshData();
      }
    } catch (err: any) {
      setCloseErrorMsg(err.message || "Failed to close financial year");
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const [catCode, setCatCode] = useState("");
  const [catName, setCatName] = useState("");
  const [catHead, setCatHead] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catAllowQuotation, setCatAllowQuotation] = useState(true);
  const [catSearch, setCatSearch] = useState("");

  const [offCode, setOffCode] = useState("");
  const [offName, setOffName] = useState("");
  const [offType, setOffType] = useState<"HeadOffice" | "SubOffice">(
    "SubOffice",
  );
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
  const [userToolPermissions, setUserToolPermissions] = useState<UserToolPermissions>({});
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const applyPresetToPermissions = (
    preset: "all_full" | "branch_std" | "stock_mgr" | "finance_mgr" | "auditor_view",
  ) => {
    const updated: UserToolPermissions = {};
    flowTools.forEach((tool) => {
      if (preset === "all_full") {
        updated[tool.id] = { access: "full", roleTitle: language === "bn" ? "পূর্ণ নিয়ন্ত্রণকারী" : "Full Admin" };
      } else if (preset === "branch_std") {
        updated[tool.id] = { access: "operate", roleTitle: language === "bn" ? "শাখা অপারেটর" : "Branch Operator" };
      } else if (preset === "stock_mgr") {
        if (tool.id === "stockpro" || tool.id === "stationery-bill") {
          updated[tool.id] = { access: "full", roleTitle: language === "bn" ? "স্টক ইনচার্জ" : "Stock Manager" };
        } else if (tool.id === "budget-expense" || tool.id === "multi-item-bill") {
          updated[tool.id] = { access: "view", roleTitle: language === "bn" ? "পরিদর্শক" : "Viewer" };
        } else {
          updated[tool.id] = { access: "none", roleTitle: "" };
        }
      } else if (preset === "finance_mgr") {
        if (
          tool.id === "budget-expense" ||
          tool.id === "multi-item-bill" ||
          tool.id === "conference-note"
        ) {
          updated[tool.id] = { access: "full", roleTitle: language === "bn" ? "বাজেট ও হিসাব কর্মকর্তা" : "Finance Officer" };
        } else if (tool.id === "stockpro") {
          updated[tool.id] = { access: "view", roleTitle: language === "bn" ? "স্টক পরিদর্শক" : "Stock Auditor" };
        } else {
          updated[tool.id] = { access: "operate", roleTitle: language === "bn" ? "বিল প্রস্তুতকারক" : "Operator" };
        }
      } else if (preset === "auditor_view") {
        updated[tool.id] = { access: "view", roleTitle: language === "bn" ? "নিরীক্ষা কর্মকর্তা" : "Auditor" };
      }
    });
    setUserToolPermissions(updated);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        language === "bn"
          ? "অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন।"
          : "Please select a valid image file.",
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(
        language === "bn"
          ? "ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে পারবে।"
          : "Image size must be less than 2MB.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettingsForm((prev) => ({ ...prev, logoUrl: base64 }));
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
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        setSaveSuccessMsg(
          language === "bn"
            ? "সেটিংস এবং লোগো সফলভাবে সংরক্ষণ করা হয়েছে!"
            : "Settings & logo updated successfully!",
        );
        refreshData();
        setTimeout(() => setSaveSuccessMsg(""), 3000);
      }
    } catch (_err) {
      alert("Error updating settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (
    type: "office" | "category" | "fy",
    item: any,
  ) => {
    let endpoint = "";
    let updatedPayload = {};
    if (type === "office") {
      endpoint = `/api/offices/${item.id}`;
      updatedPayload = {
        ...item,
        status: item.status === "Active" ? "Inactive" : "Active",
      };
    } else if (type === "category") {
      endpoint = `/api/categories/${item.id}`;
      updatedPayload = {
        ...item,
        status: item.status === "Active" ? "Inactive" : "Active",
      };
    } else if (type === "fy") {
      endpoint = `/api/financialyears/${item.id}`;
      updatedPayload = {
        ...item,
        status: item.status === "Active" ? "Inactive" : "Active",
        isActive: item.status !== "Active",
      };
    }

    try {
      const res = await apiFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload),
      });
      if (res.ok) refreshData();
    } catch (_err) {
      alert(`Error updating ${type} status`);
    }
  };

  const handleToggleQuotation = async (category: any) => {
    const updatedPayload = {
      ...category,
      allowInQuotation: category.allowInQuotation === false ? true : false,
    };
    try {
      const res = await apiFetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload),
      });
      if (res.ok) refreshData();
    } catch (_err) {
      alert("Error updating quotation status");
    }
  };

  const handleToggleAllowExcess = async (category: any) => {
    const updatedPayload = { ...category, allowExcess: !category.allowExcess };
    try {
      const res = await apiFetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload),
      });
      if (res.ok) refreshData();
    } catch (_err) {
      alert("Error updating excess budget status");
    }
  };

  const handleToggleRequireApproval = async (category: any) => {
    const updatedPayload = {
      ...category,
      requireApproval: category.requireApproval === false ? true : false,
    };
    try {
      const res = await apiFetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload),
      });
      if (res.ok) refreshData();
    } catch (_err) {
      alert("Error updating approval status");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingCategory;
      const endpoint = isEditing
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
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
          userId: currentUser.id,
        }),
      });
      if (res.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCatCode("");
        setCatName("");
        setCatHead("");
        setCatDesc("");
        setCatAllowQuotation(true);
        refreshData();
      }
    } catch (_err) {}
  };

  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingOffice;
      const endpoint = isEditing
        ? `/api/offices/${editingOffice.id}`
        : "/api/offices";
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
          userId: currentUser.id,
        }),
      });
      if (res.ok) {
        setShowOfficeModal(false);
        setEditingOffice(null);
        setOffCode("");
        setOffName("");
        setOffType("SubOffice");
        setOffAddress("");
        refreshData();
      }
    } catch (_err) {}
  };

  const handleRestoreDefaults = async (target: "categories" | "offices") => {
    const targetLabel =
      target === "categories"
        ? language === "bn"
          ? "বাংলাদেশ কৃষি ব্যাংকের সকল প্রমিত ব্যয়ের খাত ও কোড"
          : "BKB Standard Expense Categories & Codes"
        : language === "bn"
          ? "বাংলাদেশ কৃষি ব্যাংকের রাঙ্গামাটি অঞ্চলের সকল শাখা ও কার্যালয়"
          : "BKB Rangamati Region Offices & Branches";

    const confirmTitle =
      language === "bn" ? "রিস্টোর নিশ্চিত করুন" : "Confirm Restore";
    const confirmMsg =
      language === "bn"
        ? `আপনি কি নিশ্চিতভাবে ${targetLabel} রিকভার/রিসেট করতে চান?`
        : `Are you sure you want to restore/reset ${targetLabel}?`;

    triggerConfirm(confirmTitle, confirmMsg, async () => {
      setIsRestoring(true);
      try {
        const res = await apiFetch("/api/settings/restore-defaults", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(
            data.message ||
              (language === "bn"
                ? "সফলভাবে রিকভার করা হয়েছে!"
                : "Restored successfully!"),
          );
          refreshData();
        } else {
          alert(data.error || "Failed to restore defaults");
        }
      } catch (_err) {
        alert("Error restoring defaults");
      } finally {
        setIsRestoring(false);
      }
    });
  };

  const _openAddUser = () => {
    setEditingUser(null);
    setUserIdVal("");
    setUserName("");
    setUserEmail("");
    setUserDesignation("");
    setUserRole("Sub-office User");
    setUserOffice(offices[0]?.id || "");
    setUserPassword("password123");
    setUserStatus("Active");
    
    // Initialize default tool permissions
    const initialPermissions: UserToolPermissions = {};
    flowTools.forEach((tool) => {
      initialPermissions[tool.id] = {
        access: "operate",
        roleTitle: language === "bn" ? "শাখা অপারেটর" : "Branch Operator",
      };
    });
    setUserToolPermissions(initialPermissions);
    setShowUserModal(true);
  };

  const _openEditUser = (u: any) => {
    setEditingUser(u);
    setUserIdVal(u.userId || "");
    setUserName(u.name || "");
    setUserEmail(u.email || "");
    setUserDesignation(u.designation || "");
    setUserRole(u.role || "Sub-office User");
    setUserOffice(u.officeId || offices[0]?.id || "");
    setUserPassword("");
    setUserStatus(u.status || "Active");

    // Initialize or load tool permissions
    const existingPermissions: UserToolPermissions = {};
    flowTools.forEach((tool) => {
      if (u.toolPermissions && u.toolPermissions[tool.id]) {
        existingPermissions[tool.id] = { ...u.toolPermissions[tool.id] };
      } else {
        const deducedAccess = getUserToolAccess(u, tool.id);
        const deducedRole = getToolRoleTitle(u, tool.id);
        existingPermissions[tool.id] = {
          access: deducedAccess,
          roleTitle: deducedRole,
        };
      }
    });
    setUserToolPermissions(existingPermissions);
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingUser;
      const endpoint = isEditing
        ? `/api/users/${editingUser.id}`
        : "/api/users";
      const method = isEditing ? "PUT" : "POST";
      const payload: any = {
        userId: userIdVal,
        name: userName,
        email: userEmail,
        designation: userDesignation,
        role: userRole,
        officeId: userOffice || offices[0]?.id || "",
        status: userStatus,
        toolPermissions: userToolPermissions,
      };
      if (userPassword && userPassword.trim()) {
        payload.password = userPassword;
      }

      if (isEditing) {
        setLocalUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, ...payload } : u)),
        );
        if (setUsers) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === editingUser.id ? { ...u, ...payload } : u,
            ),
          );
        }
        setShowUserModal(false);
        setEditingUser(null);
      }

      const res = await apiFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (!isEditing) {
          const createdUser = await res.json().catch(() => null);
          if (createdUser && createdUser.id) {
            setLocalUsers((prev) => [...prev, createdUser]);
            if (setUsers) setUsers((prev) => [...prev, createdUser]);
          }
          setShowUserModal(false);
        }
        setEditingUser(null);
        setUserIdVal("");
        setUserName("");
        setUserEmail("");
        setUserDesignation("");
        setUserRole("Sub-office User");
        setUserOffice("");
        setUserPassword("password123");
        setUserToolPermissions({});
        refreshData();
      } else {
        const data = await res.json();
        alert(
          data.error ||
            (language === "bn"
              ? "ব্যবহারকারী সংরক্ষণ করতে সমস্যা হয়েছে।"
              : "Failed to save user."),
        );
        refreshData();
      }
    } catch (err: any) {
      alert(err.message || "Error saving user");
    }
  };

  const _handleAdminResetPassword = async (targetUserId: string) => {
    const newPass = prompt("Enter new password for this user:", "password123");
    if (!newPass) return;
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newPassword: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Password successfully reset by Admin!");
        refreshData();
      } else {
        alert(data.error || "Failed to reset password");
      }
    } catch (_err) {
      alert("Error resetting password");
    }
  };

  const _handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert(
        language === "bn"
          ? "আপনি নিজের আইডি ডিলিট করতে পারবেন না।"
          : "You cannot delete your own ID.",
      );
      return;
    }

    const title = language === "bn" ? "ব্যবহারকারী ডিলিট" : "Delete User";
    const msg =
      language === "bn"
        ? `আপনি কি সত্যিই "${user.name || user.userId}" ডিলিট করতে চান?`
        : `Are you sure you want to delete "${user.name || user.userId}"?`;

    triggerConfirm(title, msg, async () => {

      setLocalUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (setUsers) setUsers((prev) => prev.filter((u) => u.id !== user.id));

      try {
        const res = await apiFetch(`/api/users/${user.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          refreshData();
        } else {

          setLocalUsers(users);
          if (setUsers) setUsers(users);
          const errData = await res.json();
          alert(
            (language === "bn"
              ? "ডিলিট করতে সমস্যা হয়েছে: "
              : "Failed to delete user: ") + (errData.error || res.statusText),
          );
        }
      } catch (err: any) {
        setLocalUsers(users);
        if (setUsers) setUsers(users);
        alert("Error deleting user: " + (err.message || err));
      }
    });
  };

  const _handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";

    setLocalUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)),
    );
    if (setUsers) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)),
      );
    }
    setTogglingUserIds((prev) => new Set(prev).add(user.id));

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

        setLocalUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, status: user.status } : u,
          ),
        );
        if (setUsers) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === user.id ? { ...u, status: user.status } : u,
            ),
          );
        }
        const errData = await res.json().catch(() => ({}));
        alert(
          errData.error ||
            (language === "bn"
              ? "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।"
              : "Failed to toggle status."),
        );
      } else {

        refreshData();
      }
    } catch (err: any) {

      setLocalUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u)),
      );
      if (setUsers) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, status: user.status } : u,
          ),
        );
      }
      alert("Failed to toggle status: " + (err.message || err));
    } finally {
      setTogglingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  const roleStr = currentUser?.role as string | undefined;
  const isSuperAdmin = roleStr === "Super Admin";
  const isSuperAdminOrAdmin = roleStr === "Super Admin" || roleStr === "Admin";
  const isAdmin =
    roleStr === "Super Admin" ||
    roleStr === "Admin" ||
    roleStr === "Head Office Admin";

  const settingsTabs = [
    {
      id: "general",
      label: language === "bn" ? "সাধারণ কনফিগারেশন" : "General",
      icon: Settings,
    },
    ...(isSuperAdminOrAdmin
      ? [
          {
            id: "welcome-msg",
            label:
              language === "bn"
                ? "ওয়েলকাম নোট ও নোটিশ"
                : "Welcome Note & Notices",
            icon: MessageSquare,
          },
        ]
      : []),
    {
      id: "financial-years",
      label:
        language === "bn" ? "অর্থবছর ও ক্লোজিং" : "Financial Years & Closing",
      icon: Calendar,
    },
    { id: "offices", label: language === "bn" ? "অফিস তালিকা" : "Offices", icon: Building2 },
    {
      id: "categories",
      label: language === "bn" ? "ব্যয়ের খাতসমূহ" : "Categories",
      icon: Folder,
    },
    ...(isSuperAdminOrAdmin
      ? [
          {
            id: "database",
            label:
              language === "bn"
                ? "ডাটা ব্যাকআপ ও ডাটাবেজ"
                : "Data Backup & Database",
            icon: Database,
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            id: "apps-script",
            label:
              language === "bn"
                ? "গুগল স্ক্রিপ্ট ডেপ্লয়"
                : "Apps Script Deploy",
            icon: PlayCircle,
          },
        ]
      : []),
    {
      id: "developer",
      label: language === "bn" ? "ডেভেলপার তথ্য" : "Developer Info",
      icon: Code,
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Settings Subtabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
        {settingsTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              data-settings-tab={tab.id}
              id={`settings-tab-btn-${tab.id}`}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? isOcean
                    ? "bg-sky-600 text-white shadow-md font-bold"
                    : isDark
                      ? "bg-emerald-600 text-white shadow-md font-bold"
                      : "bg-emerald-600 text-white shadow-md font-bold"
                  : isOcean
                    ? "bg-sky-950/60 text-sky-200 hover:bg-sky-900/60 border border-sky-800/40"
                    : isDark
                      ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 border rounded-2xl shadow-sm flex flex-col overflow-hidden transition-colors ${
          isOcean
            ? "bg-[#0f172a]/95 border-sky-900/60 text-sky-50"
            : isDark
              ? "bg-slate-900 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* General Settings */}
        {currentTab === "general" && (
          <div className="p-6 overflow-y-auto flex-1 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings
                    className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}
                  />
                  {language === "bn"
                    ? "সাধারণ কনফিগারেশন ও ব্র্যান্ডিং"
                    : "General Configuration & Branding"}
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
              <div
                className={`p-5 rounded-2xl border ${
                  isOcean
                    ? "bg-sky-950/40 border-sky-800/60"
                    : isDark
                      ? "bg-slate-800/40 border-slate-700/60"
                      : "bg-slate-50/80 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <ImageIcon
                      className={`w-4 h-4 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}
                    />
                    {language === "bn"
                      ? "প্রাতিষ্ঠানিক লোগো (Institution Logo)"
                      : "Institution Logo"}
                  </label>
                  <span className="text-xs opacity-60 font-mono">
                    PNG, SVG, JPG (Max 2MB)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Logo Preview box */}
                  <div
                    className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center p-2 shrink-0 relative overflow-hidden transition ${
                      isOcean
                        ? "bg-sky-900/30 border-sky-700/50"
                        : isDark
                          ? "bg-slate-850 border-slate-700"
                          : "bg-white border-slate-300 shadow-sm"
                    }`}
                  >
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
                        {language === "bn"
                          ? "নতুন লোগো আপলোড করুন"
                          : "Upload New Logo"}
                      </button>

                      {settingsForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsForm((prev) => ({
                              ...prev,
                              logoUrl: "",
                            }))
                          }
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {language === "bn" ? "মুছে ফেলুন" : "Remove"}
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold opacity-70 mb-1">
                        {language === "bn"
                          ? "অথবা সরাসরি ইমেজ লিংক (URL) প্রদান করুন:"
                          : "Or provide direct image URL:"}
                      </label>
                      <input
                        type="url"
                        value={settingsForm.logoUrl}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            logoUrl: e.target.value,
                          })
                        }
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
                  {language === "bn"
                    ? "প্রতিষ্ঠানের নাম (Institution Name)"
                    : "Institution Name"}
                </label>
                <input
                  type="text"
                  value={settingsForm.institutionName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      institutionName: e.target.value,
                    })
                  }
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
                  {language === "bn"
                    ? "সফটওয়্যারের শিরোনাম (Web App Name)"
                    : "Web App Name"}
                </label>
                <input
                  type="text"
                  value={settingsForm.webAppName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      webAppName: e.target.value,
                    })
                  }
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
                  {language === "bn"
                    ? "বিবরণ / ট্যাগলাইন (Description)"
                    : "Description / Tagline"}
                </label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      description: e.target.value,
                    })
                  }
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
              <div
                className={`p-5 rounded-2xl border ${
                  isOcean
                    ? "bg-sky-950/40 border-sky-800/60"
                    : isDark
                      ? "bg-slate-800/40 border-slate-700/60"
                      : "bg-slate-50 border-slate-200"
                }`}
              >
                <h3 className="text-sm font-bold mb-3">
                  {language === "bn"
                    ? "অর্থবছরের মাস নির্ধারণ (Financial Year Months)"
                    : "Financial Year Months Configuration"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold opacity-75 mb-1.5">
                      {language === "bn"
                        ? "শুরুর মাস (Start Month)"
                        : "Start Month"}
                    </label>
                    <select
                      value={settingsForm.financialYearStartMonth || 7}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          financialYearStartMonth: Number(e.target.value),
                        })
                      }
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition ${
                        isOcean
                          ? "bg-sky-950/60 border-sky-800 text-sky-100"
                          : isDark
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(0, m - 1).toLocaleString("en", {
                            month: "long",
                          })}{" "}
                          /{" "}
                          {new Date(0, m - 1).toLocaleString("bn", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold opacity-75 mb-1.5">
                      {language === "bn"
                        ? "শেষের মাস (End Month)"
                        : "End Month"}
                    </label>
                    <select
                      value={settingsForm.financialYearEndMonth || 6}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          financialYearEndMonth: Number(e.target.value),
                        })
                      }
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition ${
                        isOcean
                          ? "bg-sky-950/60 border-sky-800 text-sky-100"
                          : isDark
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(0, m - 1).toLocaleString("en", {
                            month: "long",
                          })}{" "}
                          /{" "}
                          {new Date(0, m - 1).toLocaleString("bn", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Custom Theme Color */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75 mb-1.5">
                  {language === "bn"
                    ? "কাস্টম থিম কালার (Custom Theme Color)"
                    : "Custom Theme Color"}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settingsForm.customThemeColor || "#fbbf24"} // amber-400 default
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        customThemeColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 p-0 border-0 rounded overflow-hidden cursor-pointer bg-transparent"
                    title={
                      language === "bn" ? "রঙ নির্বাচন করুন" : "Select Color"
                    }
                  />
                  <div
                    className={`text-xs opacity-70 ${isOcean ? "text-sky-200" : isDark ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {language === "bn"
                      ? "কাস্টম থিমের প্রাইমারি কালার পরিবর্তন করতে এখানে ক্লিক করুন।"
                      : "Click to change the primary accent color of the custom theme."}
                  </div>
                  {settingsForm.customThemeColor && (
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsForm({
                          ...settingsForm,
                          customThemeColor: "",
                        })
                      }
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
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {language === "bn" ? "সেটিংস সংরক্ষণ করুন" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Welcome Message Settings */}
        {currentTab === "welcome-msg" && isSuperAdminOrAdmin && (
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
            <div
              className={`p-4 border-b flex justify-between items-center shrink-0 ${
                isOcean
                  ? "bg-sky-950/80 border-sky-900/60"
                  : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-slate-50 border-slate-200"
              }`}
            >
              <div>
                <h2 className="font-bold flex items-center gap-2">
                  <Calendar
                    className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}
                  />
                  {language === "bn" ? "অর্থবছর পরিচালনা" : "Financial Years"}
                </h2>
                <p className="text-xs opacity-70 mt-1">
                  {language === "bn"
                    ? "নতুন অর্থবছর যোগ করুন এবং পূর্ববর্তী বছর ক্লোজ করুন"
                    : "Manage and close financial years"}
                </p>
              </div>
              <button
                onClick={() => setShowAddFyModal(true)}
                className={`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition ${
                  isOcean
                    ? "bg-sky-600 hover:bg-sky-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                <Plus className="w-4 h-4" />{" "}
                {language === "bn" ? "নতুন অর্থবছর" : "Add FY"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`uppercase tracking-wider font-semibold border-b ${
                      isOcean
                        ? "bg-sky-950 text-sky-300 border-sky-800"
                        : isDark
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <th className="p-3">
                      {language === "bn" ? "অর্থবছর" : "Financial Year"}
                    </th>
                    <th className="p-3">
                      {language === "bn" ? "শুরুর তারিখ" : "Start Date"}
                    </th>
                    <th className="p-3">
                      {language === "bn" ? "শেষের তারিখ" : "End Date"}
                    </th>
                    <th className="p-3 text-center">
                      {language === "bn" ? "স্ট্যাটাস" : "Status"}
                    </th>
                    <th className="p-3 text-center">
                      {language === "bn" ? "ক্লোজিং অবস্থা" : "Closing Status"}
                    </th>
                    <th className="p-3 text-right">
                      {language === "bn" ? "অ্যাকশন" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/10">
                  {financialYears.map((fy) => (
                    <tr key={fy.id} className="hover:bg-slate-50/5 transition">
                      <td className="p-3 font-semibold">{fy.name}</td>
                      <td className="p-3 opacity-80">{fy.startDate}</td>
                      <td className="p-3 opacity-80">{fy.endDate}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            fy.status === "Active"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                          }`}
                        >
                          {fy.status === "Active"
                            ? language === "bn"
                              ? "সক্রিয়"
                              : "Active"
                            : language === "bn"
                              ? "নিষ্ক্রিয়"
                              : "Inactive"}
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
                              {language === "bn"
                                ? "বছর ক্লোজ করুন"
                                : "Close Year"}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              {language === "bn"
                                ? "শুধুমাত্র অ্যাডমিন"
                                : "Admin only"}
                            </span>
                          )
                        ) : (
                          <div className="text-xs opacity-60">
                            {fy.closedAt && (
                              <span>
                                {language === "bn"
                                  ? "ক্লোজ করা হয়েছে: "
                                  : "Closed on: "}
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
            <div
              className={`p-4 border-b flex flex-wrap gap-3 justify-between items-center shrink-0 ${
                isOcean
                  ? "bg-sky-950/80 border-sky-900/60"
                  : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <h2 className="font-bold flex items-center gap-2">
                  <Folder
                    className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}
                  />
                  {t.allCategories}
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    {categories.length}
                  </span>
                </h2>
                <input
                  type="text"
                  placeholder={
                    language === "bn"
                      ? "খাত বা কোড খুঁজুন..."
                      : "Search category or code..."
                  }
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  className={`px-3 py-1.5 text-xs border rounded-xl bg-transparent focus:outline-none w-48 sm:w-64 ${
                    isOcean
                      ? "border-sky-800 focus:border-sky-500 text-sky-100"
                      : isDark
                        ? "border-slate-700 focus:border-emerald-500 text-slate-100"
                        : "border-slate-300 focus:border-emerald-600 text-slate-900"
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
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRestoring ? "animate-spin" : ""}`}
                  />
                  {language === "bn"
                    ? "বিকেবি প্রমিত খাত রিকভার"
                    : "Restore BKB Heads"}
                </button>

                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCatCode("");
                    setCatName("");
                    setCatHead("");
                    setCatDesc("");
                    setCatAllowQuotation(true);
                    setShowCategoryModal(true);
                  }}
                  className={`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition ${
                    isOcean
                      ? "bg-sky-600 hover:bg-sky-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  <Plus className="w-4 h-4" />{" "}
                  {language === "bn" ? "নতুন খাত যোগ করুন" : "Add Category"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`uppercase tracking-wider font-semibold border-b ${
                      isOcean
                        ? "bg-sky-950 text-sky-300 border-sky-800"
                        : isDark
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Budget Head</th>
                    <th className="p-3">
                      {language === "bn"
                        ? "কোটেশন প্রযোজ্য"
                        : "Quotation Applicable"}
                    </th>
                    <th className="p-3">
                      {language === "bn"
                        ? "অতিরিক্ত ব্যয় অনুমতি"
                        : "Allow Excess Budget"}
                    </th>
                    <th className="p-3">
                      {language === "bn"
                        ? "অনুমোদন প্রয়োজন"
                        : "Require Approval"}
                    </th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${isOcean ? "divide-sky-900/40" : isDark ? "divide-slate-800" : "divide-slate-100"}`}
                >
                  {categories
                    .filter((c) => {
                      if (!catSearch.trim()) return true;
                      const q = catSearch.toLowerCase();
                      return (
                        c.name.toLowerCase().includes(q) ||
                        c.code.toLowerCase().includes(q) ||
                        (c.budgetHead && c.budgetHead.toLowerCase().includes(q))
                      );
                    })
                    .map((c) => (
                      <tr
                        key={c.id}
                        className={`transition ${isOcean ? "hover:bg-sky-900/20" : isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}
                      >
                        <td className="p-3 font-mono font-semibold">
                          {c.code}
                        </td>
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
                            {c.allowInQuotation !== false
                              ? language === "bn"
                                ? "✓ চালু"
                                : "Enabled"
                              : language === "bn"
                                ? "✕ বন্ধ"
                                : "Disabled"}
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
                            {c.allowExcess
                              ? language === "bn"
                                ? "✓ অনুমোদিত"
                                : "Allowed"
                              : language === "bn"
                                ? "✕ নিষিদ্ধ"
                                : "Restricted"}
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
                            {c.requireApproval !== false
                              ? language === "bn"
                                ? "✓ আবশ্যক"
                                : "Required"
                              : language === "bn"
                                ? "✕ প্রয়োজন নেই"
                                : "Optional"}
                          </button>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${c.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                          >
                            {c.status}
                          </span>
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
                                setCatAllowQuotation(
                                  c.allowInQuotation ?? true,
                                );
                                setShowCategoryModal(true);
                              }}
                              className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/40 text-blue-400"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus("category", c)}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/40"
                            >
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
            <div
              className={`p-4 border-b flex flex-wrap gap-3 justify-between items-center shrink-0 ${
                isOcean
                  ? "bg-sky-950/80 border-sky-900/60"
                  : isDark
                    ? "bg-slate-850 border-slate-800"
                    : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <h2 className="font-bold flex items-center gap-2">
                  <Building2
                    className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}
                  />
                  {t.allOffices}
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    {offices.length}
                  </span>
                </h2>
                <input
                  type="text"
                  placeholder={
                    language === "bn"
                      ? "কার্যালয়, শাখা বা কোড খুঁজুন..."
                      : "Search office, branch or code..."
                  }
                  value={offSearch}
                  onChange={(e) => setOffSearch(e.target.value)}
                  className={`px-3 py-1.5 text-xs border rounded-xl bg-transparent focus:outline-none w-48 sm:w-64 ${
                    isOcean
                      ? "border-sky-800 focus:border-sky-500 text-sky-100"
                      : isDark
                        ? "border-slate-700 focus:border-emerald-500 text-slate-100"
                        : "border-slate-300 focus:border-emerald-600 text-slate-900"
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
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRestoring ? "animate-spin" : ""}`}
                  />
                  {language === "bn"
                    ? "বিকেবি শাখা তালিকা রিকভার"
                    : "Restore BKB Branches"}
                </button>

                <button
                  onClick={() => {
                    setEditingOffice(null);
                    setOffCode("");
                    setOffName("");
                    setOffType("SubOffice");
                    setOffAddress("");
                    setShowOfficeModal(true);
                  }}
                  className={`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition ${
                    isOcean
                      ? "bg-sky-600 hover:bg-sky-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  <Plus className="w-4 h-4" />{" "}
                  {language === "bn" ? "নতুন অফিস যোগ করুন" : "Add Office"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`uppercase tracking-wider font-semibold border-b ${
                      isOcean
                        ? "bg-sky-950 text-sky-300 border-sky-800"
                        : isDark
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Address</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${isOcean ? "divide-sky-900/40" : isDark ? "divide-slate-800" : "divide-slate-100"}`}
                >
                  {offices
                    .filter((o) => {
                      if (!offSearch.trim()) return true;
                      const q = offSearch.toLowerCase();
                      return (
                        o.name.toLowerCase().includes(q) ||
                        o.code.toLowerCase().includes(q) ||
                        (o.address && o.address.toLowerCase().includes(q))
                      );
                    })
                    .map((o) => (
                      <tr
                        key={o.id}
                        className={`transition ${isOcean ? "hover:bg-sky-900/20" : isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}
                      >
                        <td className="p-3 font-mono font-semibold">
                          {o.code}
                        </td>
                        <td className="p-3 font-medium">{o.name}</td>
                        <td className="p-3 opacity-80">{o.type}</td>
                        <td className="p-3 opacity-70 text-xs">{o.address}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${o.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                          >
                            {o.status}
                          </span>
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
                            <button
                              onClick={() => handleToggleStatus("office", o)}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700/40"
                            >
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

        {/* Users (Redirect Notice to Central Management) */}
        {currentTab === "users" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <div
              className={`max-w-md p-8 rounded-3xl border shadow-xl space-y-4 ${
                isOcean
                  ? "bg-sky-950/80 border-sky-800 text-sky-100"
                  : isDark
                    ? "bg-slate-900 border-slate-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold">
                {language === "bn"
                  ? "ব্যবহারকারী ব্যবস্থাপনা সেন্ট্রাল ম্যানেজমেন্টে স্থানান্তর করা হয়েছে"
                  : "User Management Moved to Central Management"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "সকল টুল এবং সিস্টেমের সার্বজনীন ব্যবহারকারী তৈরি, তথ্য সম্পাদনা, পাসওয়ার্ড রিসেট ও RBAC পারমিশন নিয়ন্ত্রণ এখন ফ্লোবোর্ড সেন্ট্রাল ম্যানেজমেন্ট থেকে পরিচালিত হয়।"
                  : "All user creation, profile edits, password resets, and tool RBAC permissions are now centrally administered in FlowBoard Central Management."}
              </p>
              {onOpenCentralManagement && (
                <button
                  onClick={onOpenCentralManagement}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/30 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {language === "bn"
                      ? "সেন্ট্রাল ম্যানেজমেন্টে যান"
                      : "Go to Central Management"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {currentTab === "fy" && (
          <div className="p-6 text-center opacity-60 text-xs">
            {language === "bn"
              ? "অর্থবছর পরিচালনা করুন।"
              : "Manage financial year lists here."}
          </div>
        )}

        {currentTab === "database" && isSuperAdmin && (
          <DatabaseSettingsTab currentUser={currentUser} />
        )}

        {currentTab === "apps-script" && (
          <div className="flex-1 overflow-hidden relative">
            <AppsScriptDeployView />
          </div>
        )}

        {currentTab === "developer" && (
          <div className="p-6 overflow-y-auto flex-1 max-w-4xl">
            <DeveloperProfile />
          </div>
        )}
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-md w-full p-6 shadow-xl border ${
              isOcean
                ? "bg-[#0f172a] border-sky-800 text-sky-100"
                : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="text-lg font-bold mb-4">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    required
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    Budget Head
                  </label>
                  <input
                    type="text"
                    required
                    value={catHead}
                    onChange={(e) => setCatHead(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">
                  Description
                </label>
                <textarea
                  required
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catAllowQuotation"
                  checked={catAllowQuotation}
                  onChange={(e) => setCatAllowQuotation(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor="catAllowQuotation"
                  className="text-xs font-medium cursor-pointer"
                >
                  {language === "bn"
                    ? "কোটেশন প্রক্রিয়ায় এই খাত প্রযোজ্য"
                    : "Applicable in Quotation Process"}
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-emerald-600 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOfficeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-md w-full p-6 shadow-xl border ${
              isOcean
                ? "bg-[#0f172a] border-sky-800 text-sky-100"
                : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="text-lg font-bold mb-4">
              {editingOffice ? "Edit Office" : "Add New Office"}
            </h3>
            <form onSubmit={handleAddOffice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    Type
                  </label>
                  <select
                    value={offType}
                    onChange={(e) => setOffType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                  >
                    <option value="SubOffice" className="text-slate-900">
                      Sub-Office
                    </option>
                    <option value="HeadOffice" className="text-slate-900">
                      Head Office
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    required
                    value={offCode}
                    onChange={(e) => setOffCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={offName}
                  onChange={(e) => setOffName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold opacity-75 mb-1">
                  Address
                </label>
                <textarea
                  required
                  value={offAddress}
                  onChange={(e) => setOffAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOfficeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-emerald-600 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-2xl w-full p-6 shadow-xl border my-auto ${
              isOcean
                ? "bg-[#0f172a] border-sky-800 text-sky-100"
                : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck
                  className={`w-5 h-5 ${isOcean ? "text-sky-400" : "text-emerald-500"}`}
                />
                {editingUser
                  ? language === "bn"
                    ? "ব্যবহারকারী সম্পাদনা, রোল আপগ্রেড ও সেন্ট্রাল টুল পারমিশন"
                    : "Edit User, Role & Central Tool RBAC Matrix"
                  : language === "bn"
                    ? "নতুন ব্যবহারকারী যোগ ও টুল পারমিশন নির্ধারণ"
                    : "Add New System User & Tool RBAC"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {language === "bn"
                      ? "ইউজার আইডি (Login ID)"
                      : "User ID (Login)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={userIdVal}
                    onChange={(e) => setUserIdVal(e.target.value)}
                    placeholder="e.g. ctg_user2"
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {language === "bn" ? "পূর্ণ নাম (Full Name)" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="জনাব মোঃ আব্দুর রহিম"
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {language === "bn" ? "পদবী (Designation)" : "Designation"}
                  </label>
                  <input
                    type="text"
                    value={userDesignation}
                    onChange={(e) => setUserDesignation(e.target.value)}
                    placeholder="কর্মকর্তা / শাখা প্রধান"
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {language === "bn" ? "ইমেইল (Email)" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="user@office.gov"
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {language === "bn"
                      ? "সিস্টেম রোল (Global Role)"
                      : "Global System Role"}
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs bg-transparent font-medium ${
                      isDark
                        ? "bg-slate-900 text-slate-100"
                        : "bg-white text-slate-900"
                    }`}
                  >
                    <option value="Super Admin" className="text-slate-900">
                      Super Admin (সুপার এডমিন - পূর্ণ নিয়ন্ত্রণ)
                    </option>
                    <option value="Admin" className="text-slate-900">
                      Admin (এডমিন - সেন্ট্রাল ম্যানেজমেন্ট)
                    </option>
                    <option value="Moderator" className="text-slate-900">
                      Moderator (মডারেটর - নোটশীট ও রিপোর্ট যাচাইকারী)
                    </option>
                    <option value="Sub-office User" className="text-slate-900">
                      Sub-office User (শাখা/আঞ্চলিক কার্যালয় ব্যবহারকারী)
                    </option>
                    <option value="Head Office User" className="text-slate-900">
                      Head Office User (হেড অফিস ব্যবহারকারী)
                    </option>
                    <option value="Report Viewer" className="text-slate-900">
                      Report Viewer (রিপোর্ট পরিদর্শক)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {language === "bn"
                      ? "শাখা / কর্মস্থল (Branch / Office)"
                      : "Assigned Office / Branch"}
                  </label>
                  <select
                    value={userOffice}
                    onChange={(e) => setUserOffice(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs bg-transparent font-medium ${
                      isDark
                        ? "bg-slate-900 text-slate-100"
                        : "bg-white text-slate-900"
                    }`}
                  >
                    <option value="" className="text-slate-900">
                      {language === "bn"
                        ? "-- শাখা নির্বাচন করুন --"
                        : "-- Select Office --"}
                    </option>
                    {offices.map((o) => (
                      <option
                        key={o.id}
                        value={o.id}
                        className="text-slate-900"
                      >
                        {o.code ? `[${o.code}] ` : ""}
                        {o.name} (
                        {o.type === "HeadOffice"
                          ? language === "bn"
                            ? "আঞ্চলিক/প্রধান"
                            : "HO"
                          : language === "bn"
                            ? "শাখা"
                            : "Branch"}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {editingUser
                      ? language === "bn"
                        ? "নতুন পাসওয়ার্ড (ঐচ্ছিক)"
                        : "New Password (Optional)"
                      : language === "bn"
                        ? "প্রাথমিক পাসওয়ার্ড"
                        : "Initial Password"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={
                      editingUser
                        ? language === "bn"
                          ? "অপরিবর্তিত রাখতে ফাঁকা রাখুন"
                          : "Leave blank to keep current"
                        : "password123"
                    }
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold opacity-75 mb-1">
                    {language === "bn"
                      ? "আইডির অবস্থা (Status)"
                      : "Account Status"}
                  </label>
                  <select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs bg-transparent font-medium ${
                      isDark
                        ? "bg-slate-900 text-slate-100"
                        : "bg-white text-slate-900"
                    }`}
                  >
                    <option value="Active" className="text-slate-900">
                      Active (সক্রিয়)
                    </option>
                    <option value="Inactive" className="text-slate-900">
                      Inactive (নিষ্ক্রিয়)
                    </option>
                  </select>
                </div>
              </div>

              {/* GLOBAL TOOL RBAC MATRIX SECTION */}
              <div className="pt-3 border-t border-slate-700/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <span>
                        {language === "bn"
                          ? "টুল পারমিশন ম্যাট্রিক্স (Tool-Specific RBAC)"
                          : "Tool-Specific RBAC Matrix"}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === "bn"
                        ? "প্রতিটি টুলের জন্য স্বতন্ত্র অনুমতি (পূর্ণ নিয়ন্ত্রণ, অপারেটর, শুধুমাত্র পরিদর্শন বা বন্ধ) নির্ধারণ করুন।"
                        : "Configure granular permissions per FlowBoard tool for this specific user."}
                    </p>
                  </div>

                  {/* Presets Quick Fill */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 mr-0.5">
                      {language === "bn" ? "প্রিসেট:" : "Presets:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyPresetToPermissions("all_full")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition"
                      title="সকল টুলে পূর্ণ নিয়ন্ত্রণ"
                    >
                      {language === "bn" ? "সব পূর্ণ" : "All Full"}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetToPermissions("branch_std")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition"
                      title="সকল টুলে স্ট্যান্ডার্ড শাখা অপারেটর"
                    >
                      {language === "bn" ? "শাখা" : "Standard"}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetToPermissions("stock_mgr")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/30 transition"
                      title="স্টক ও স্টেশনারী স্পেশালিস্ট"
                    >
                      {language === "bn" ? "স্টক" : "Stock"}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetToPermissions("finance_mgr")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition"
                      title="বাজেট ও বিল প্রস্তুতকারক"
                    >
                      {language === "bn" ? "বাজেট" : "Finance"}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetToPermissions("auditor_view")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 border border-purple-500/30 transition"
                      title="সকল টুলে শুধুমাত্র পরিদর্শন"
                    >
                      {language === "bn" ? "অডিটর" : "Auditor"}
                    </button>
                  </div>
                </div>

                {/* Tool Cards List */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {flowTools.map((tool) => {
                    const config = userToolPermissions[tool.id] || {
                      access: getUserToolAccess(
                        editingUser || { role: userRole },
                        tool.id,
                      ),
                      roleTitle: "",
                    };
                    const currentAccess = config.access;

                    return (
                      <div
                        key={tool.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          currentAccess === "none"
                            ? "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 opacity-60"
                            : isOcean
                              ? "bg-sky-950/30 border-sky-900/50"
                              : isDark
                                ? "bg-slate-800/40 border-slate-700/60"
                                : "bg-slate-50/90 border-slate-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                              style={{ backgroundColor: tool.color || "#059669" }}
                            >
                              {tool.id === "budget-expense" ? (
                                <Coins className="w-4 h-4" />
                              ) : tool.id === "stockpro" ? (
                                <Package className="w-4 h-4" />
                              ) : tool.id === "conference-note" ? (
                                <FileSpreadsheet className="w-4 h-4" />
                              ) : tool.id === "multi-item-bill" ? (
                                <Receipt className="w-4 h-4" />
                              ) : tool.id === "stationery-bill" ? (
                                <Printer className="w-4 h-4" />
                              ) : (
                                <Layers className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <span>
                                  {language === "bn" && tool.nameBn
                                    ? tool.nameBn
                                    : tool.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  (v{tool.version})
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                                {tool.id} • {tool.category}
                              </div>
                            </div>
                          </div>

                          {/* Segmented 4-Option Access Level Switcher */}
                          <div className="flex items-center gap-1 bg-white/70 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                            <button
                              type="button"
                              onClick={() =>
                                setUserToolPermissions((prev) => ({
                                  ...prev,
                                  [tool.id]: {
                                    ...prev[tool.id],
                                    access: "full",
                                  },
                                }))
                              }
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                                currentAccess === "full"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title="পূর্ণ নিয়ন্ত্রণ (Create, Edit, Delete, Settings)"
                            >
                              🟢 {language === "bn" ? "পূর্ণ" : "Full"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setUserToolPermissions((prev) => ({
                                  ...prev,
                                  [tool.id]: {
                                    ...prev[tool.id],
                                    access: "operate",
                                  },
                                }))
                              }
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                                currentAccess === "operate"
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title="অপারেটর (Create, Daily Operations, Drafts)"
                            >
                              🔵 {language === "bn" ? "অপারেট" : "Operate"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setUserToolPermissions((prev) => ({
                                  ...prev,
                                  [tool.id]: {
                                    ...prev[tool.id],
                                    access: "view",
                                  },
                                }))
                              }
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                                currentAccess === "view"
                                  ? "bg-amber-600 text-white shadow-sm"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title="শুধুমাত্র পরিদর্শন (Read-Only / Reports)"
                            >
                              🟡 {language === "bn" ? "ভিউ" : "View"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setUserToolPermissions((prev) => ({
                                  ...prev,
                                  [tool.id]: {
                                    ...prev[tool.id],
                                    access: "none",
                                  },
                                }))
                              }
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                                currentAccess === "none"
                                  ? "bg-rose-600 text-white shadow-sm"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title="প্রবেশাধিকার নেই (No Access / Locked)"
                            >
                              🔴 {language === "bn" ? "লকড" : "Locked"}
                            </button>
                          </div>
                        </div>

                        {/* Custom Tool-Specific Role Title (Optional) */}
                        {currentAccess !== "none" && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium shrink-0">
                              {language === "bn" ? "টুল-রোল পদবী:" : "Tool Role Title:"}
                            </span>
                            <input
                              type="text"
                              value={config.roleTitle || ""}
                              onChange={(e) =>
                                setUserToolPermissions((prev) => ({
                                  ...prev,
                                  [tool.id]: {
                                    ...prev[tool.id],
                                    access: currentAccess,
                                    roleTitle: e.target.value,
                                  },
                                }))
                              }
                              placeholder={
                                tool.id === "stockpro"
                                  ? language === "bn"
                                    ? "উদাঃ স্টক ইনচার্জ / শাখা রিসিভার"
                                    : "e.g. Stock Manager"
                                  : tool.id === "budget-expense"
                                    ? language === "bn"
                                      ? "উদাঃ বাজেট অফিসার / ভাউচার প্রস্তুতকারক"
                                      : "e.g. Budget Officer"
                                    : language === "bn"
                                      ? "উদাঃ অনুমোদক / অপারেটর"
                                      : "e.g. Operator"
                              }
                              className="flex-1 px-2 py-0.5 rounded-lg text-[11px] border border-slate-200 dark:border-slate-700 bg-transparent"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 transition"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow transition ${
                    isOcean
                      ? "bg-sky-600 hover:bg-sky-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {editingUser
                    ? language === "bn"
                      ? "আপডেট সংরক্ষণ করুন"
                      : "Save Changes"
                    : language === "bn"
                      ? "ব্যবহারকারী তৈরি করুন"
                      : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  {language === "bn"
                    ? "সহকর্মীর ইউজার আইডির প্রস্তাবনা"
                    : "Propose Colleague User ID"}
                </h3>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitProposal} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === "bn"
                    ? "সহকর্মীর পূর্ণ নাম *"
                    : "Colleague's Full Name *"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={proposalName}
                    onChange={(e) => setProposalName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                    placeholder="e.g. Md. Rahim"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === "bn"
                    ? "প্রস্তাবিত ইউজার আইডি *"
                    : "Requested User ID *"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={proposalUserId}
                    onChange={(e) => setProposalUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                    placeholder="e.g. rahim_ctg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === "bn" ? "ইমেইল এড্রেস" : "Email Address"}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={proposalEmail}
                    onChange={(e) => setProposalEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                    placeholder="rahim@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === "bn" ? "পদবী" : "Designation"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={proposalDesignation}
                    onChange={(e) => setProposalDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                    placeholder="Manager"
                  />
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={proposalLoading}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
                >
                  {proposalLoading
                    ? "Submitting..."
                    : language === "bn"
                      ? "প্রস্তাব পাঠান"
                      : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Financial Year Modal */}
      {showAddFyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-md w-full p-6 shadow-xl border ${
              isOcean
                ? "bg-[#0f172a] border-sky-800 text-sky-100"
                : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                {language === "bn"
                  ? "নতুন অর্থবছর যোগ করুন"
                  : "Add New Financial Year"}
              </h3>
              <button
                onClick={() => setShowAddFyModal(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFY} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {language === "bn"
                    ? "অর্থবছরের নাম (যেমন: ২০২৫-২০২৬):"
                    : "Financial Year Name (e.g. 2025-2026):"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="২০২৫-২০২৬"
                  value={newFyName}
                  onChange={(e) => setNewFyName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                    isOcean
                      ? "border-sky-700 text-sky-100"
                      : isDark
                        ? "border-slate-700 text-slate-100"
                        : "border-slate-300 text-slate-900"
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
                    onChange={(e) => setNewFyStartDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                      isOcean
                        ? "border-sky-700 text-sky-100"
                        : isDark
                          ? "border-slate-700 text-slate-100"
                          : "border-slate-300 text-slate-900"
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
                    onChange={(e) => setNewFyEndDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                      isOcean
                        ? "border-sky-700 text-sky-100"
                        : isDark
                          ? "border-slate-700 text-slate-100"
                          : "border-slate-300 text-slate-900"
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
                  onChange={(e) => setNewFyStatus(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-xl bg-transparent font-medium ${
                    isOcean
                      ? "border-sky-700 text-sky-100 bg-sky-950"
                      : isDark
                        ? "border-slate-700 text-slate-100 bg-slate-800"
                        : "border-slate-300 text-slate-900 bg-white"
                  }`}
                >
                  <option value="Active" className="text-slate-900">
                    {language === "bn" ? "সক্রিয় (Active)" : "Active"}
                  </option>
                  <option value="Inactive" className="text-slate-900">
                    {language === "bn" ? "নিষ্ক্রিয় (Inactive)" : "Inactive"}
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddFyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow"
                >
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
          <div
            className={`rounded-2xl max-w-3xl w-full p-6 shadow-2xl border m-auto max-h-[90vh] flex flex-col ${
              isOcean
                ? "bg-[#0f172a] border-sky-800 text-sky-100"
                : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2 text-amber-500">
                <Lock className="w-5 h-5" />
                {language === "bn"
                  ? `অর্থবছর ক্লোজিং: ${closingFy.name}`
                  : `Close Financial Year: ${closingFy.name}`}
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-slate-800/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 py-4 text-xs">
              {/* Warning Notice */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {language === "bn"
                    ? "জরুরি নির্দেশনা ও নিয়মাবলী:"
                    : "Important Rules & Consequences:"}
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                  <li>
                    {language === "bn"
                      ? "অর্থবছরটি লক করা হবে (423 Locked)। এর পর এতে আর কোনো বরাদ্দ, ব্যয় বা নোটশিট যোগ/সম্পাদনা করা যাবে না।"
                      : "The financial year will be locked (423 Locked). No further entries or edits will be allowed."}
                  </li>
                  <li>
                    {language === "bn"
                      ? "কোনো পেন্ডিং (Pending) ব্যয় থাকলে এই বছর ক্লোজ করা যাবে না।"
                      : "If there are pending expenses for this year, closing will be rejected."}
                  </li>
                  <li>
                    {language === "bn"
                      ? "পরবর্তী অর্থবছরে নির্বাচিত মান অনুযায়ী স্বয়ংক্রিয়ভাবে ওপেনিং ব্যালেন্স (Opening Balance) তৈরি হবে।"
                      : "Opening Balances will be generated automatically for the target financial year based on your matrix below."}
                  </li>
                </ul>
              </div>

              {/* Target FY Selector */}
              <div>
                <label className="block font-bold mb-1 opacity-80">
                  {language === "bn"
                    ? "ওপেনিং ব্যালেন্স বহনের জন্য লক্ষ্য অর্থবছর (Target FY):"
                    : "Target FY for Opening Balance Transfer:"}
                </label>
                <select
                  value={targetFyId}
                  onChange={(e) => setTargetFyId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-transparent font-semibold focus:outline-none ${
                    isOcean
                      ? "border-sky-700 text-sky-100 bg-sky-950"
                      : isDark
                        ? "border-slate-700 text-slate-100 bg-slate-800"
                        : "border-slate-300 text-slate-900 bg-white"
                  }`}
                >
                  <option value="" disabled className="text-slate-900">
                    Select Target Financial Year
                  </option>
                  {financialYears
                    .filter((f) => f.id !== closingFy.id)
                    .map((f) => (
                      <option
                        key={f.id}
                        value={f.id}
                        className="text-slate-900"
                      >
                        {f.name} {f.status === "Active" ? "(Active)" : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Carry Forward Balance Matrix */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                  <label className="font-bold opacity-80">
                    {language === "bn"
                      ? "অফিস ও খাতভিত্তিক অবশিষ্টাংশ এবং ওপেনিং ব্যালেন্স নির্ধারণ:"
                      : "Office & Category Carry-Forward Matrix:"}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={closingOfficeId}
                      onChange={(e) => setClosingOfficeId(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none ${
                        isOcean
                          ? "border-sky-700 text-sky-100 bg-sky-950"
                          : isDark
                            ? "border-slate-700 text-slate-100 bg-slate-800"
                            : "border-slate-300 text-slate-900 bg-white"
                      }`}
                    >
                      {offices.map((off) => (
                        <option
                          key={off.id}
                          value={off.id}
                          className="text-slate-900"
                        >
                          {off.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!closingOfficeId) return;
                        const newMap = { ...carryMap };
                        categories.forEach((cat) => {
                          const key = `${closingOfficeId}_${cat.id}`;
                          const fyAllocations = allocations.filter(
                            (a) =>
                              a.financialYearId === closingFy.id &&
                              a.officeId === closingOfficeId &&
                              a.categoryId === cat.id,
                          );
                          const fyExpenses = expenses.filter(
                            (e) =>
                              e.financialYearId === closingFy.id &&
                              e.officeId === closingOfficeId &&
                              e.categoryId === cat.id &&
                              e.status !== "Rejected",
                          );
                          const totalAlloc = fyAllocations.reduce(
                            (sum, a) => sum + Number(a.allocatedAmount || 0),
                            0,
                          );
                          const totalSpent = fyExpenses.reduce(
                            (sum, e) => sum + Number(e.amount || 0),
                            0,
                          );
                          newMap[key] = Math.max(0, totalAlloc - totalSpent);
                        });
                        setCarryMap(newMap);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30 whitespace-nowrap"
                    >
                      {language === "bn"
                        ? "বর্তমান অফিসে ১০০% ট্রান্সফার"
                        : "Set 100% for this Office"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!closingOfficeId) return;
                        const newMap = { ...carryMap };
                        categories.forEach((cat) => {
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
                      <tr
                        className={`border-b font-semibold sticky top-0 z-10 ${
                          isOcean
                            ? "bg-sky-950 text-sky-200 border-sky-800"
                            : isDark
                              ? "bg-slate-800 text-slate-200 border-slate-700"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <th className="p-2.5">
                          {language === "bn" ? "খাত" : "Category"}
                        </th>
                        <th className="p-2.5 text-right">
                          {language === "bn"
                            ? "চলতি ব্যালেন্স"
                            : "Available Balance"}
                        </th>
                        <th className="p-2.5 text-right">
                          {language === "bn"
                            ? "ওপেনিং ব্যালেন্স ট্রান্সফার"
                            : "Opening Balance Amount"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/20 font-mono">
                      {closingOfficeId &&
                        categories.map((cat) => {
                          const key = `${closingOfficeId}_${cat.id}`;
                          const fyAllocations = allocations.filter(
                            (a) =>
                              a.financialYearId === closingFy.id &&
                              a.officeId === closingOfficeId &&
                              a.categoryId === cat.id,
                          );
                          const fyExpenses = expenses.filter(
                            (e) =>
                              e.financialYearId === closingFy.id &&
                              e.officeId === closingOfficeId &&
                              e.categoryId === cat.id &&
                              e.status !== "Rejected",
                          );
                          const totalAlloc = fyAllocations.reduce(
                            (sum, a) => sum + Number(a.allocatedAmount || 0),
                            0,
                          );
                          const totalSpent = fyExpenses.reduce(
                            (sum, e) => sum + Number(e.amount || 0),
                            0,
                          );
                          const currentAvail = Math.max(
                            0,
                            totalAlloc - totalSpent,
                          );
                          const currentCarry =
                            carryMap[key] !== undefined
                              ? carryMap[key]
                              : currentAvail;

                          return (
                            <tr key={key} className="hover:bg-slate-800/10">
                              <td className="p-2 font-sans font-medium">
                                {cat.name}
                              </td>
                              <td className="p-2 text-right text-emerald-400 font-semibold">
                                ৳{currentAvail.toLocaleString("bn-BD")}
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={currentCarry}
                                  onChange={(e) => {
                                    const val = Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    );
                                    setCarryMap({ ...carryMap, [key]: val });
                                  }}
                                  className={`w-28 px-2 py-1 text-right border rounded-lg bg-transparent font-bold text-xs focus:outline-none ${
                                    isOcean
                                      ? "border-sky-700 text-sky-100"
                                      : isDark
                                        ? "border-slate-700 text-slate-100"
                                        : "border-slate-300 text-slate-900"
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      {!closingOfficeId && (
                        <tr>
                          <td
                            colSpan={3}
                            className="p-4 text-center opacity-60"
                          >
                            {language === "bn"
                              ? "অনুগ্রহ করে একটি অফিস নির্বাচন করুন"
                              : "Please select an office"}
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
                {isSubmittingClose ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {language === "bn"
                  ? "🔒 বছর ক্লোজ ও ওপেনিং ব্যালেন্স ট্রান্সফার নিশ্চিত করুন"
                  : "🔒 Confirm Close Financial Year"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div
            className={`w-full max-w-md rounded-2xl border ${isOcean ? "bg-sky-950 border-sky-850 text-sky-100" : isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"} shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">{confirmModalTitle}</h3>
              </div>
              <p className="text-sm opacity-80 leading-relaxed mb-6">
                {confirmModalMessage}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${isOcean ? "border-sky-800 hover:bg-sky-900/30" : isDark ? "border-slate-850 hover:bg-slate-800/50" : "border-slate-200 hover:bg-slate-50"} transition`}
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onConfirmAction) {
                      onConfirmAction();
                    }
                    setShowConfirmModal(false);
                  }}
                  className="px-5 py-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow"
                >
                  {language === "bn" ? "নিশ্চিত করুন" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
