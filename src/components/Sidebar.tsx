import React, { useState } from "react";
import { User, SystemSettings } from "../types";
import { 
  LayoutDashboard, DollarSign, Receipt, FileText, FileCode,
  BarChart3, Folder, Settings, History,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  systemSettings: SystemSettings | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (o: boolean) => void;
}

export function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  systemSettings,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: SidebarProps) {
  const { t, language } = useLanguage();
  const { theme, isCustom } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const roleStr = currentUser.role as string;
  const isHeadOffice = roleStr === "Head Office Admin" || roleStr === "Super Admin" || roleStr === "Head Office User" || roleStr === "HeadOfficeAdmin" || roleStr === "Auditor";

  const isDark = theme === "dark";
  const isLight = theme === "light";

  const menuItems = [
    { id: "dashboard", label: t.menuDashboard, icon: LayoutDashboard, headOfficeOnly: false },
    { id: "allocations", label: t.menuAllocations, icon: DollarSign, headOfficeOnly: false },
    { id: "expenses", label: t.menuExpenses, icon: Receipt, headOfficeOnly: false },
    { id: "notesheets", label: t.menuNoteSheets, icon: FileText, headOfficeOnly: false },
    { id: "notetemplates", label: t.menuNoteTemplates, icon: FileCode, headOfficeOnly: false },
    { id: "reports", label: t.menuReports, icon: BarChart3, headOfficeOnly: false },
    { id: "categories", label: t.menuCategories, icon: Folder, headOfficeOnly: true },
    { id: "settings", label: t.menuSettings, icon: Settings, headOfficeOnly: true },
    { id: "auditlogs", label: t.menuAuditLogs, icon: History, headOfficeOnly: true }
  ];

  const visibleMenu = menuItems.filter(item => isHeadOffice ? true : !item.headOfficeOnly);

  return (
    <>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}
      <aside
        className={`flex flex-col transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } shrink-0 h-screen sticky top-0 z-50 md:z-20 border-r ${
          isMobileMenuOpen ? "fixed inset-y-0 left-0 translate-x-0" : "-translate-x-full md:translate-x-0 fixed md:sticky inset-y-0 left-0 md:top-0"
        } ${
          isCustom
            ? "bg-[#120e24] border-[#291f4d] text-purple-100"
            : isDark
            ? "bg-slate-950 border-slate-800 text-white"
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
      
      {/* Logo & Header */}
      <div className={`h-16 flex items-center justify-between px-4 border-b ${
        isCustom ? "border-[#291f4d] bg-[#1a1433]" : isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-slate-50"
      }`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 truncate">
            {systemSettings?.logoUrl ? (
              <img
                src={systemSettings.logoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-contain bg-white p-1 shadow border border-slate-700/50 shrink-0"
              />
            ) : (
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-md ${
                isCustom
                  ? "bg-gradient-to-tr from-purple-600 to-amber-500"
                  : isDark
                  ? "bg-emerald-600"
                  : "bg-emerald-600"
              }`}>
                {language === "bn" ? "বা" : "FN"}
              </div>
            )}
            <div className="truncate">
              <span className={`font-bold text-sm block truncate ${isDark || isCustom ? "text-slate-100" : "text-slate-900"}`}>
                {systemSettings?.webAppName || t.appName}
              </span>
              <span className={`text-xs block truncate font-medium ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                {systemSettings?.institutionName || "GoB Office Finance"}
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            {systemSettings?.logoUrl ? (
              <img
                src={systemSettings.logoUrl}
                alt="Logo"
                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow"
              />
            ) : (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm ${
                isCustom ? "bg-purple-600" : isDark ? "bg-emerald-600" : "bg-emerald-600"
              }`}>
                {language === "bn" ? "বা" : "FN"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-16 -right-3 rounded-full p-1 border z-30 shadow-md transition ${
          isCustom
            ? "bg-[#241d3d] text-amber-300 border-[#4a3b78] hover:bg-[#322854]"
            : isDark
            ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
        }`}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
        {visibleMenu.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setCurrentTab(item.id); setIsMobileMenuOpen(false); }}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive 
                  ? isCustom
                    ? "bg-gradient-to-r from-purple-700 to-amber-600 text-white shadow-md shadow-purple-950/60 font-semibold ring-1 ring-amber-400/40"
                    : isDark
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40 font-semibold" 
                    : "bg-emerald-100 text-emerald-800 font-bold"
                  : isCustom
                  ? "text-purple-200/80 hover:bg-[#251d45] hover:text-white"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${
                isActive 
                  ? isLight ? "text-emerald-700" : "text-white"
                  : isCustom ? "text-amber-300" : isDark ? "text-slate-400" : "text-slate-500"
              }`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* User Profile */}
      <div className={`h-12 px-3 border-t shrink-0 flex items-center ${
        isCustom ? "border-[#2e234e] bg-[#140f29]" : isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
      }`}>
        <div className={`flex items-center gap-2.5 w-full ${isCollapsed ? "justify-center" : ""}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
            isCustom ? "bg-purple-800 border-purple-600 text-white" : isDark ? "bg-slate-700 border-slate-600 text-slate-200" : "bg-emerald-100 border-emerald-200 text-emerald-800"
          }`}>
            {currentUser.name.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="truncate min-w-0 flex-1">
              <div className={`text-xs font-semibold truncate leading-tight ${isLight ? "text-slate-800" : "text-slate-200"}`}>{currentUser.name}</div>
              <div className={`text-[11px] truncate leading-tight mt-0.5 ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                {currentUser.role}
              </div>
            </div>
          )}
        </div>
      </div>

    </aside>
    </>
  );
}

