import React, { Suspense } from 'react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppRoutes from './routes/AppRoutes'
import { User, SystemSettings, Office, FinancialYear } from '../../types'

interface OfficeMonitoringIntegratedToolProps {
  currentUser: User
  systemSettings: SystemSettings | null
  offices: Office[]
  financialYears?: FinancialYear[]
  selectedFY?: string
  onBack: () => void
}

export default function OfficeMonitoringIntegratedTool({
  currentUser,
  systemSettings: _systemSettings,
  offices: _offices,
  onBack,
}: OfficeMonitoringIntegratedToolProps) {
  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Top Breadcrumb & Return Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-xs shrink-0 z-30">
        <div className="flex items-center gap-3 shrink min-w-0">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer border border-slate-300/70 dark:border-slate-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">হাবে ফিরুন</span>
            <span className="xs:hidden">ফিরুন</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block shrink-0" />
          <div className="flex items-center gap-2 text-xs shrink min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100 hidden md:inline truncate">
              Office Monitoring Management System
            </span>
            <span className="text-slate-500 dark:text-slate-400 hidden lg:inline truncate">
              (অফিস মনিটরিং ম্যানেজমেন্ট সিস্টেম)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 font-medium">
            রোল: {currentUser?.role}
          </span>
          <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ইউজার: {currentUser?.name}
          </span>
        </div>
      </div>

      {/* Office Monitoring App Subtree */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <ThemeProvider>
          <AuthProvider centralUser={currentUser}>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">অফিস মনিটরিং লোড হচ্ছে...</p>
                  </div>
                </div>
              }
            >
              <AppRoutes useMemoryRouter={true} initialRoute="/dashboard" />
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </div>
    </div>
  )
}
