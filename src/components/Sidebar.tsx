import React, { useState, useEffect } from "react";
import { User, SystemSettings, isStaffOrAdmin } from "../types";
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  FileText,
  FileCode,
  BarChart3,
  Folder,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  MessageSquare,
  Calendar,
  Building2,
  Users,
  Database,
  PlayCircle,
  Code,
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
  setIsMobileMenuOpen,
}: SidebarProps) {
  const { t, language } = useLanguage();
  const { theme, isCustom } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Only Super Admin, Admin, and Moderator can see categories, system settings, and audit logs
  const canAccessAdminMenus = isStaffOrAdmin(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const isDark = theme === "dark";
  const isLight = theme === "light";

  const isSettingsActive = [
    "settings",
    "general",
    "welcome-msg",
    "financial-years",
    "offices",
    "users",
    "database",
    "apps-script",
    "developer",
    "categories",
  ].includes(currentTab);
  const [isSettingsOpen, setIsSettingsOpen] = useState(isSettingsActive);

  useEffect(() => {
    if (isSettingsActive && !isCollapsed) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsActive, isCollapsed]);

  const menuItems = [
    {
      id: "dashboard",
      label: t.menuDashboard,
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      id: "allocations",
      label: t.menuAllocations,
      icon: DollarSign,
      adminOnly: false,
    },
    { id: "expenses", label: t.menuExpenses, icon: Receipt, adminOnly: false },
    {
      id: "notesheets",
      label: t.menuNoteSheets,
      icon: FileText,
      adminOnly: false,
    },
    {
      id: "notetemplates",
      label: t.menuNoteTemplates,
      icon: FileCode,
      adminOnly: false,
    },
    { id: "reports", label: t.menuReports, icon: BarChart3, adminOnly: false },
    { id: "auditlogs", label: t.menuAuditLogs, icon: History, adminOnly: true },
  ];

  const settingsSubMenu = [
    {
      id: "settings",
      label: language === "bn" ? "সাধারণ কনফিগারেশন" : "General",
      icon: Sliders,
    },
    ...(isSuperAdmin
      ? [
          {
            id: "welcome-msg",
            label: language === "bn" ? "ওয়েলকাম ও নোটিশ" : "Notices",
            icon: MessageSquare,
          },
        ]
      : []),
    {
      id: "financial-years",
      label: language === "bn" ? "অর্থবছর ও ক্লোজিং" : "Financial Years",
      icon: Calendar,
    },
    {
      id: "offices",
      label: language === "bn" ? "অফিস তালিকা" : "Offices",
      icon: Building2,
    },
    {
      id: "categories",
      label: language === "bn" ? "ব্যয়ের খাতসমূহ" : "Categories",
      icon: Folder,
    },
    {
      id: "users",
      label: language === "bn" ? "ব্যবহারকারী তালিকা" : "Users",
      icon: Users,
    },
    ...(isSuperAdmin
      ? [
          {
            id: "database",
            label: language === "bn" ? "ডাটাবেজ ও ব্যাকআপ" : "Database",
            icon: Database,
          },
          {
            id: "apps-script",
            label: language === "bn" ? "গুগল স্ক্রিপ্ট" : "Apps Script",
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

  const visibleMenu = menuItems.filter((item) =>
    canAccessAdminMenus ? true : !item.adminOnly,
  );

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        data-no-print="true"
        className={`flex flex-col transition-all duration-300 print:hidden ${
          isCollapsed ? "w-20" : "w-64"
        } shrink-0 h-screen sticky top-0 z-50 md:z-20 border-r ${
          isMobileMenuOpen
            ? "fixed inset-y-0 left-0 translate-x-0"
            : "-translate-x-full md:translate-x-0 fixed md:sticky inset-y-0 left-0 md:top-0"
        } ${
          isCustom
            ? "bg-[#120e24] border-[#291f4d] text-purple-100"
            : isDark
              ? "bg-slate-950 border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        {/* Logo & Header */}
        <div
          className={`h-16 flex items-center justify-between px-4 border-b ${
            isCustom
              ? "border-[#291f4d] bg-[#1a1433]"
              : isDark
                ? "border-slate-800 bg-slate-950/20"
                : "border-slate-200 bg-slate-50"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 truncate">
              {systemSettings?.logoUrl ? (
                <img
                  src={systemSettings.logoUrl}
                  alt="Logo"
                  className="w-9 h-9 rounded-xl object-contain bg-white p-1 shadow border border-slate-700/50 shrink-0"
                />
              ) : (
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-md ${
                    isCustom
                      ? "bg-gradient-to-tr from-purple-600 to-amber-500"
                      : isDark
                        ? "bg-emerald-600"
                        : "bg-emerald-600"
                  }`}
                >
                  {language === "bn" ? "বা" : "FN"}
                </div>
              )}
              <div className="truncate">
                <span
                  className={`font-bold text-sm block truncate ${isDark || isCustom ? "text-slate-100" : "text-slate-900"}`}
                >
                  {systemSettings?.webAppName || t.appName}
                </span>
                <span
                  className={`text-xs block truncate font-medium ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-emerald-600"}`}
                >
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
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm ${
                    isCustom
                      ? "bg-purple-600"
                      : isDark
                        ? "bg-emerald-600"
                        : "bg-emerald-600"
                  }`}
                >
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
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {visibleMenu.map((item) => {
            if (item.id === "auditlogs" && canAccessAdminMenus) {
              return (
                <React.Fragment key={item.id}>
                  <div className="pt-2 pb-1">
                    <button
                      onClick={() => {
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          setIsSettingsOpen(true);
                        } else {
                          setIsSettingsOpen(!isSettingsOpen);
                        }
                      }}
                      title={
                        isCollapsed
                          ? language === "bn"
                            ? "সেটিংস"
                            : "Settings"
                          : undefined
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSettingsActive
                          ? isCustom
                            ? "bg-purple-900/30 text-purple-200"
                            : isDark
                              ? "bg-slate-800/50 text-slate-200"
                              : "bg-slate-100 text-slate-800"
                          : isCustom
                            ? "text-purple-200/80 hover:bg-[#251d45] hover:text-white"
                            : isDark
                              ? "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      } ${isCollapsed ? "justify-center" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings
                          className={`w-4 h-4 shrink-0 ${isSettingsActive ? (isCustom ? "text-amber-300" : isDark ? "text-slate-300" : "text-emerald-700") : ""}`}
                        />
                        {!isCollapsed && (
                          <span>
                            {language === "bn"
                              ? "সিস্টেম সেটিংস"
                              : "System Settings"}
                          </span>
                        )}
                      </div>
                      {!isCollapsed &&
                        (isSettingsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 opacity-60" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                        ))}
                    </button>

                    {!isCollapsed && isSettingsOpen && (
                      <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5">
                        {settingsSubMenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = currentTab === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => {
                                setCurrentTab(subItem.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                isSubActive
                                  ? isCustom
                                    ? "bg-gradient-to-r from-purple-700 to-amber-600 text-white shadow shadow-purple-950/60"
                                    : isDark
                                      ? "bg-emerald-600 text-white shadow shadow-emerald-950/40"
                                      : "bg-emerald-100 text-emerald-800 font-bold"
                                  : isCustom
                                    ? "text-purple-300/70 hover:text-white hover:bg-purple-900/40"
                                    : isDark
                                      ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      currentTab === item.id
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
                    <History
                      className={`w-4 h-4 shrink-0 ${
                        currentTab === item.id
                          ? isLight
                            ? "text-emerald-700"
                            : "text-white"
                          : isCustom
                            ? "text-amber-300"
                            : isDark
                              ? "text-slate-400"
                              : "text-slate-500"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                </React.Fragment>
              );
            }

            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
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
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? isLight
                        ? "text-emerald-700"
                        : "text-white"
                      : isCustom
                        ? "text-amber-300"
                        : isDark
                          ? "text-slate-400"
                          : "text-slate-500"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* User Profile */}
        <div
          className={`h-12 px-3 border-t shrink-0 flex items-center ${
            isCustom
              ? "border-[#2e234e] bg-[#140f29]"
              : isDark
                ? "border-slate-800 bg-slate-950"
                : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`flex items-center gap-2.5 w-full ${isCollapsed ? "justify-center" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                isCustom
                  ? "bg-purple-800 border-purple-600 text-white"
                  : isDark
                    ? "bg-slate-700 border-slate-600 text-slate-200"
                    : "bg-emerald-100 border-emerald-200 text-emerald-800"
              }`}
            >
              {currentUser.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="truncate min-w-0 flex-1">
                <div
                  className={`text-xs font-semibold truncate leading-tight ${isLight ? "text-slate-800" : "text-slate-200"}`}
                >
                  {currentUser.name}
                </div>
                <div
                  className={`text-[11px] truncate leading-tight mt-0.5 ${isCustom ? "text-amber-300" : isDark ? "text-emerald-400" : "text-emerald-600"}`}
                >
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
