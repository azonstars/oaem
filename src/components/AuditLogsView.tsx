import React from "react";
import { AuditLog, User } from "../types";
import { History, Shield, UserCheck } from "lucide-react";

interface AuditLogsViewProps {
  auditLogs: AuditLog[];
  users: User[];
}

export function AuditLogsView({ auditLogs, users }: AuditLogsViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Audit Logs & History Trail
        </h2>
        <p className="text-sm text-slate-500">
          Immutable history tracking for all financial transactions,
          allocations, and approvals.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 uppercase tracking-wider">
              <th className="p-4 font-semibold">Timestamp</th>
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Action</th>
              <th className="p-4 font-semibold">Table / Sheet</th>
              <th className="p-4 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => {
                const usr = users.find((u) => u.id === log.userId);
                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 text-xs font-mono text-slate-600">
                      {log.timestamp}
                    </td>
                    <td className="p-4 font-medium text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      {usr?.name || log.userId}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-emerald-700">
                      {log.tableName}
                    </td>
                    <td className="p-4 text-xs text-slate-600">
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
  );
}
