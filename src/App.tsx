import { apiFetch } from "./api";
import React, { useEffect, useState } from "react";
import {
  SystemSettings,
  FinancialYear,
  Office,
  User,
  Category,
  Allocation,
  Expense,
  NoteSheet,
  NoteTemplate,
  AuditLog,
  OpeningBalance,
  isStaffOrAdmin,
} from "./types";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { SettingsView } from "./components/SettingsView";
import { AllocationsView } from "./components/AllocationsView";
import { ExpensesView } from "./components/ExpensesView";
import { PostFactoProposalsView } from "./components/PostFactoProposalsView";
import { ReportsView } from "./components/ReportsView";
import { NoteSheetsView } from "./components/NoteSheetsView";
import { NoteTemplatesView } from "./components/NoteTemplatesView";
import { AuditLogsView } from "./components/AuditLogsView";
import { MiscellaneousView } from "./components/MiscellaneousView";

import { AboutModal } from "./components/AboutModal";
import { LoginView } from "./components/LoginView";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { ProposeUserModal } from "./components/ProposeUserModal";
import { AppFooter } from "./components/AppFooter";
import { useTheme } from "./context/ThemeContext";
import { useLanguage } from "./i18n";

export default function App() {
  const { theme, isCustom } = useTheme();
  const isDark = theme === "dark";
  const { language } = useLanguage();

  const [currentTab, setCurrentTab] = useState<string>(() => {
    return localStorage.getItem("govt_app_tab") || "dashboard";
  });
  const [selectedFY, setSelectedFY] = useState<string>(() => {
    return localStorage.getItem("govt_app_fy") || "";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isProposeUserOpen, setIsProposeUserOpen] = useState(false);

  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(
    null,
  );
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [noteSheets, setNoteSheets] = useState<NoteSheet[]>([]);
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("govt_app_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("govt_app_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("govt_app_user");
      localStorage.removeItem("govt_app_tab");
      localStorage.removeItem("govt_app_token");
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentTab) {
      localStorage.setItem("govt_app_tab", currentTab);
    }
  }, [currentTab]);

  useEffect(() => {
    if (selectedFY) {
      localStorage.setItem("govt_app_fy", selectedFY);
    }
  }, [selectedFY]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setCurrentTab("dashboard");
    };
    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
  }, []);

  const fetchAllData = () => {
    const fetchJson = (url: string, defaultValue: any = []) =>
      apiFetch(url).then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw 401;
          return defaultValue;
        }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return defaultValue;
      });

    Promise.all([
      fetchJson("/api/settings", []),
      fetchJson("/api/financialyears", []),
      fetchJson("/api/offices", []),
      fetchJson("/api/users", []),
      fetchJson("/api/categories", []),
      fetchJson("/api/allocations", []),
      fetchJson("/api/expenses", []),
      fetchJson("/api/notesheets", []),
      fetchJson("/api/notetemplates", []),
      fetchJson("/api/openingbalances", []),
      fetchJson("/api/auditlogs", []),
    ])
      .then(([set, fy, off, usr, cat, alc, exp, ns, nt, ob, al]) => {
        if (set[0]) setSystemSettings(set[0]);
        setFinancialYears(fy);
        setOffices(off);
        setUsers(usr);
        setCategories(cat);
        setAllocations(alc);
        setExpenses(exp);
        setNoteSheets(ns);
        setNoteTemplates(nt);
        setOpeningBalances(ob);
        setAuditLogs(al);

        let resolvedFy = "";

        let expectedFyName = "";
        if (set[0] && set[0].financialYearStartMonth) {
          const currentMonth = new Date().getMonth() + 1; // 1-12
          const currentYear = new Date().getFullYear();
          const startMonth = set[0].financialYearStartMonth;

          if (currentMonth >= startMonth) {
            expectedFyName = `${currentYear}-${currentYear + 1}`;
          } else {
            expectedFyName = `${currentYear - 1}-${currentYear}`;
          }
        }

        const activeFy = fy.find((f: FinancialYear) => f.isActive);
        const dynamicFy = fy.find(
          (f: FinancialYear) => f.name === expectedFyName,
        );
        const savedFy = localStorage.getItem("govt_app_fy");

        if (savedFy && fy.some((f: FinancialYear) => f.id === savedFy)) {
          resolvedFy = savedFy;
        } else if (dynamicFy) {
          resolvedFy = dynamicFy.id;
        } else if (activeFy) {
          resolvedFy = activeFy.id;
        } else if (fy.length > 0) {
          resolvedFy = fy[fy.length - 1].id;
        }

        if (resolvedFy) {
          setSelectedFY(resolvedFy);
        }

        setLoading(false);
      })
      .catch((err) => {
        if (err !== 401 && err !== "Unauthorized")
          console.error("Failed to fetch initial data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const isHeadOffice = isStaffOrAdmin(currentUser?.role);

  const handleAddAllocation = async (allocation: Omit<Allocation, "id">) => {
    const res = await apiFetch("/api/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...allocation, userId: currentUser.id }),
    });
    const newAlc = await res.json();
    setAllocations((prev) => [...prev, newAlc]);
    refreshLogs();
    return newAlc;
  };

  const handleDeleteAllocation = async (id: string) => {
    const res = await apiFetch(`/api/allocations/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete allocation");
    }
    setAllocations((prev) => prev.filter((a) => a.id !== id));
    refreshLogs();
  };

  const handleUpdateAllocation = async (
    id: string,
    updatedAllocation: Partial<Allocation>,
  ) => {
    const res = await apiFetch(`/api/allocations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedAllocation),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update allocation");
    }
    setAllocations((prev) => prev.map((a) => (a.id === id ? data : a)));
    refreshLogs();
  };

  const handleAddExpense = async (expense: Omit<Expense, "id">) => {
    const res = await apiFetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expense, userId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to add expense");
    }
    setExpenses((prev) => [...prev, data]);
    refreshLogs();
    fetchAllData();
    return data;
  };

  const [expensesStatusFilter, setExpensesStatusFilter] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("All");

  const handleApproveExpense = async (id: string) => {
    const res = await apiFetch(`/api/expenses/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to approve expense");
    }
    setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
    refreshLogs();
    fetchAllData();
    return data;
  };

  const handleRejectExpense = async (id: string, reason: string) => {
    const res = await apiFetch(`/api/expenses/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, userId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to reject expense");
    }
    setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
    refreshLogs();
    fetchAllData();
    return data;
  };

  const handleUpdateExpense = async (
    id: string,
    updatedExpense: Partial<Expense>,
  ) => {
    const res = await apiFetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updatedExpense, userId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update expense");
    }
    setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
    refreshLogs();
    fetchAllData();
    return data;
  };

  const handleDeleteExpense = async (id: string) => {
    await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    refreshLogs();
    fetchAllData();
  };

  const handleAddNoteSheet = async (noteSheet: Omit<NoteSheet, "id">) => {
    const res = await apiFetch("/api/notesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...noteSheet, userId: currentUser.id }),
    });
    const newNs = await res.json();
    setNoteSheets((prev) => [...prev, newNs]);
    refreshLogs();
  };

  const handleDeleteNoteSheet = async (id: string) => {
    await apiFetch(`/api/notesheets/${id}`, { method: "DELETE" });
    setNoteSheets((prev) => prev.filter((n) => n.id !== id));
    refreshLogs();
  };

  const handleAddTemplate = async (template: Omit<NoteTemplate, "id">) => {
    const res = await apiFetch("/api/notetemplates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...template, userId: currentUser.id }),
    });
    const newTpl = await res.json();
    setNoteTemplates((prev) => [...prev, newTpl]);
    refreshLogs();
  };

  const handleUpdateTemplate = async (
    id: string,
    template: Partial<NoteTemplate>,
  ) => {
    const res = await apiFetch(`/api/notetemplates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...template, userId: currentUser.id }),
    });
    const updated = await res.json();
    setNoteTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    refreshLogs();
  };

  const handleDeleteTemplate = async (id: string) => {
    await apiFetch(`/api/notetemplates/${id}`, { method: "DELETE" });
    setNoteTemplates((prev) => prev.filter((t) => t.id !== id));
    refreshLogs();
  };

  const refreshLogs = () => {
    apiFetch("/api/auditlogs")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setAuditLogs(data));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">
            Loading Office Allocation & Expense System...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => setCurrentUser(user)}
        systemSettings={systemSettings}
      />
    );
  }

  return (
    <div
      className={`h-screen w-full overflow-hidden flex font-sans print:h-auto print:w-full print:overflow-visible print:block print:bg-white ${isCustom ? "bg-[#0d091a]" : isDark ? "bg-slate-950" : "bg-slate-50"}`}
    >
      {systemSettings?.customThemeColor && isCustom && (
        <style>{`
          .theme-custom .text-amber-400,
          .theme-custom .text-amber-300,
          .theme-custom .text-amber-500,
          .theme-custom .text-purple-400 {
            color: ${systemSettings.customThemeColor} !important;
          }
          .theme-custom .bg-amber-400,
          .theme-custom .from-amber-500,
          .theme-custom .to-amber-500,
          .theme-custom .bg-amber-500,
          .theme-custom .from-purple-700.to-amber-600 {
            background-color: ${systemSettings.customThemeColor} !important;
            background-image: none !important;
          }
          .theme-custom .border-amber-400,
          .theme-custom .border-amber-500 {
            border-color: ${systemSettings.customThemeColor} !important;
          }
          .theme-custom .ring-amber-400\\/40 {
            --tw-ring-color: ${systemSettings.customThemeColor}66 !important;
          }
        `}</style>
      )}
      <div className="print:hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          systemSettings={systemSettings}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden print:h-auto print:w-full print:overflow-visible print:block">
        <div className="print:hidden">
          <Header
            financialYears={financialYears}
            selectedFY={selectedFY}
            setSelectedFY={setSelectedFY}
            currentUser={currentUser}
            offices={offices}
            systemSettings={systemSettings}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            onOpenAbout={() => setIsAboutOpen(true)}
            onLogout={() => setCurrentUser(null)}
            onChangePassword={() => setIsChangePasswordOpen(true)}
            onOpenProposeUser={() => setIsProposeUserOpen(true)}
          />
        </div>

        <main
          className={`flex-1 w-full overflow-y-auto flex flex-col print:h-auto print:w-full print:overflow-visible print:block print:bg-white ${
            isCustom
              ? "bg-[#0d091a] text-purple-100"
              : isDark
                ? "bg-slate-950 text-slate-100"
                : "bg-slate-50 text-slate-900"
          }`}
        >
          <div className="flex-1 w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col print:p-0 print:m-0 print:max-w-none print:w-full print:block">
            {currentTab === "dashboard" && (
              <Dashboard
                allocations={allocations}
                expenses={expenses}
                categories={categories}
                offices={offices}
                financialYears={financialYears}
                selectedFY={selectedFY}
                currentUser={currentUser}
                noteSheets={noteSheets}
                setCurrentTab={setCurrentTab}
                onNavigateExpenses={(filter) => {
                  setExpensesStatusFilter(filter);
                  setCurrentTab("expenses");
                }}
              />
            )}
            {currentTab === "allocations" && (
              <AllocationsView
                allocations={allocations}
                expenses={expenses}
                offices={offices}
                categories={categories}
                financialYears={financialYears}
                selectedFY={selectedFY}
                currentUser={currentUser}
                onAddAllocation={handleAddAllocation}
                onUpdateAllocation={handleUpdateAllocation}
                onDeleteAllocation={handleDeleteAllocation}
                isHeadOffice={isHeadOffice}
                systemSettings={systemSettings}
                refreshData={fetchAllData}
              />
            )}
            {currentTab === "postfacto-propose" && (
              <PostFactoProposalsView
                currentUser={currentUser}
                mode="propose"
                offices={offices}
                categories={categories}
                financialYears={financialYears}
                selectedFY={selectedFY}
              />
            )}
            {currentTab === "postfacto-sanction" && (
              <PostFactoProposalsView
                currentUser={currentUser}
                mode="sanction"
                offices={offices}
                categories={categories}
                financialYears={financialYears}
                selectedFY={selectedFY}
              />
            )}
            {currentTab === "expenses" && (
              <ExpensesView
                expenses={expenses}
                allocations={allocations}
                offices={offices}
                categories={categories}
                financialYears={financialYears}
                selectedFY={selectedFY}
                currentUser={currentUser}
                noteSheets={noteSheets}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onApproveExpense={handleApproveExpense}
                onRejectExpense={handleRejectExpense}
                onDeleteExpense={handleDeleteExpense}
                isHeadOffice={isHeadOffice}
                statusFilter={expensesStatusFilter}
                setStatusFilter={setExpensesStatusFilter}
                refreshData={fetchAllData}
              />
            )}
            {currentTab === "reports" && (
              <ReportsView
                allocations={allocations}
                expenses={expenses}
                offices={offices}
                categories={categories}
                financialYears={financialYears}
                selectedFY={selectedFY}
                currentUser={currentUser}
                isHeadOffice={isHeadOffice}
                noteSheets={noteSheets}
                systemSettings={systemSettings}
                openingBalances={openingBalances}
              />
            )}
            {currentTab === "miscellaneous" && (
              <MiscellaneousView
                currentUser={currentUser}
                language={language as "bn" | "en"}
              />
            )}
            {currentTab === "notesheets" && (
              <NoteSheetsView
                noteSheets={noteSheets}
                noteTemplates={noteTemplates}
                financialYears={financialYears}
                offices={offices}
                categories={categories}
                selectedFY={selectedFY}
                currentUser={currentUser}
                onAddNoteSheet={handleAddNoteSheet}
                onDeleteNoteSheet={handleDeleteNoteSheet}
                onAddTemplate={handleAddTemplate}
                isHeadOffice={isHeadOffice}
                refreshData={fetchAllData}
              />
            )}
            {currentTab === "notetemplates" && (
              <NoteTemplatesView
                noteTemplates={noteTemplates}
                categories={categories}
                onAddTemplate={handleAddTemplate}
                onUpdateTemplate={handleUpdateTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}

            {(currentTab === "settings" ||
              currentTab === "database" ||
              currentTab === "offices" ||
              currentTab === "categories" ||
              currentTab === "users" ||
              currentTab === "apps-script" ||
              currentTab === "developer" ||
              currentTab === "welcome-msg" ||
              currentTab === "financial-years") &&
              systemSettings &&
              isStaffOrAdmin(currentUser?.role) && (
                <SettingsView
                  activeTab={
                    currentTab === "settings" ? "general" : (currentTab as any)
                  }
                  systemSettings={systemSettings}
                  financialYears={financialYears}
                  offices={offices}
                  categories={categories}
                  users={users}
                  setUsers={setUsers}
                  currentUser={currentUser}
                  allocations={allocations}
                  expenses={expenses}
                  refreshData={fetchAllData}
                />
              )}
            {currentTab === "auditlogs" &&
              isStaffOrAdmin(currentUser?.role) && (
                <AuditLogsView auditLogs={auditLogs} users={users} />
              )}
          </div>
          <AppFooter onOpenAbout={() => setIsAboutOpen(true)} />
        </main>
      </div>

      {isAboutOpen && (
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
          systemSettings={systemSettings}
        />
      )}

      {isProposeUserOpen && (
        <ProposeUserModal
          isOpen={isProposeUserOpen}
          onClose={() => setIsProposeUserOpen(false)}
          officeName={offices.find((o) => o.id === currentUser?.officeId)?.name}
          onSuccess={fetchAllData}
        />
      )}

      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen || currentUser.mustChangePassword}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={currentUser}
          onUpdateUser={setCurrentUser}
        />
      )}
    </div>
  );
}
