import React from "react";
import { AuditLog, User } from "../types";
import { UserCheck } from "lucide-react";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface AuditLogsViewProps {
  auditLogs: AuditLog[];
  users: User[];
}

export function AuditLogsView({ auditLogs, users }: AuditLogsViewProps) {
  const { language } = useLanguage();
  const { theme, isCustom } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="space-y-6">
      <div>
        <h2
          className={`text-xl font-bold ${
            isCustom ? "text-purple-100" : isDark ? "text-slate-100" : "text-slate-900"
          }`}
        >
          {language === "bn" ? "অডিট লগ ও নিরীক্ষা ইতিহাস" : "Audit Logs & History Trail"}
        </h2>
        <p
          className={`text-sm ${
            isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {language === "bn"
            ? "সকল লেনদেন, অনুমোদন ও সিস্টেম পরিবর্তনের অপরিবর্তনীয় ট্র্যাক রেকর্ড।"
            : "Immutable history tracking for all financial transactions, allocations, and approvals."}
        </p>
      </div>

      <div
        className={`rounded-2xl shadow-sm border overflow-hidden transition-colors ${
          isCustom
            ? "bg-[#18132e] border-[#3b2d61]"
            : isDark
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-xs uppercase tracking-wider font-semibold ${
                  isCustom
                    ? "bg-[#20173e] text-purple-200 border-[#382b61]"
                    : isDark
                      ? "bg-slate-800/60 text-slate-400 border-slate-800"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <th className="p-4">{language === "bn" ? "সময়কাল" : "Timestamp"}</th>
                <th className="p-4">{language === "bn" ? "ব্যবহারকারী" : "User"}</th>
                <th className="p-4">{language === "bn" ? "অ্যাকশন" : "Action"}</th>
                <th className="p-4">{language === "bn" ? "টেবিল / শিট" : "Table / Sheet"}</th>
                <th className="p-4">{language === "bn" ? "বিবরণ" : "Details"}</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y text-sm ${
                isCustom
                  ? "divide-[#2b1f52]"
                  : isDark
                    ? "divide-slate-800"
                    : "divide-slate-100"
              }`}
            >
              {auditLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className={`p-8 text-center ${
                      isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {language === "bn" ? "কোন অডিট লগ পাওয়া যায়নি।" : "No audit logs recorded yet."}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const usr = users.find((u) => u.id === log.userId);
                  return (
                    <tr
                      key={log.id}
                      className={`transition ${
                        isCustom
                          ? "hover:bg-[#20173e]/50 text-purple-100"
                          : isDark
                            ? "hover:bg-slate-800/40 text-slate-200"
                            : "hover:bg-slate-50/60 text-slate-800"
                      }`}
                    >
                      <td className="p-4 text-xs font-mono opacity-80">
                        {log.timestamp}
                      </td>
                      <td className="p-4 font-medium flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{usr?.name || log.userId}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            isCustom
                              ? "bg-purple-900/60 text-purple-200 border border-purple-700/50"
                              : isDark
                                ? "bg-slate-800 text-slate-200"
                                : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {log.tableName}
                      </td>
                      <td
                        className={`p-4 text-xs ${
                          isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {log.details}
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
  );
}
