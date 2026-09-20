import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('office_sidebar_collapsed') === 'true'
  })

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen(prev => !prev)
    } else {
      setIsCollapsed(prev => {
        const next = !prev
        localStorage.setItem('office_sidebar_collapsed', String(next))
        return next
      })
    }
  }

  return (
    <div className="flex h-full flex-1 w-full overflow-hidden bg-theme-secondary" style={{backgroundColor: 'var(--bg-secondary, #f9f9f7)'}}>
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => {
          setIsCollapsed(prev => {
            const next = !prev
            localStorage.setItem('office_sidebar_collapsed', String(next))
            return next
          })
        }}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={handleToggleSidebar} />
        <main className="flex-1 overflow-hidden flex flex-col bg-theme-secondary">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 h-full [&:has(.chat-fullpage)]:p-0 [&:has(.chat-fullpage)]:overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

