import React, { Suspense } from 'react'
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
  financialYears: _financialYears,
  selectedFY: _selectedFY,
  onBack: _onBack,
}: OfficeMonitoringIntegratedToolProps) {
  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
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
