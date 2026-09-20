import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { ROLES } from '../../constants/roles'
import { useTheme } from '../../context/ThemeContext'
import { MenuIcon } from '../ui/LucideIcon'
import { toValidUuid } from '../../utils/uuid'
import { MENU_ITEMS } from '../../constants/menuConfig'

const CONTROL_PANEL = {
  id: 'control_panel',
  label: 'Control Panel',
  icon: '⚙️',
  path: '#',
  roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DIVISIONAL_ADMIN, ROLES.REGIONAL_ADMIN, ROLES.REGIONAL_CHECKER],
  children: [
    { id: 'cp_users',        label: 'Users',          icon: '👥', path: '/users',          roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { id: 'cp_branches',     label: 'Branches',       icon: '🏢', path: '/branches',       roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DIVISIONAL_ADMIN, ROLES.REGIONAL_ADMIN] },
    { id: 'cp_permissions',  label: 'Permissions',    icon: '🔒', path: '/permissions',    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.REGIONAL_ADMIN, ROLES.REGIONAL_CHECKER] },
    { id: 'cp_settings',     label: 'Settings',       icon: '🔧', path: '/settings',      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  ],
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const { profile, allMenuItems } = useAuth()
  const { globalTheme } = useTheme()
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState({
    disburse_group: true,
    recovery_group: true,
    special_program_group: true,
    Disburse: true,
    Recovery: true,
    'Special Program': true,
  })
  const [chatUnread, setChatUnread] = useState(0)

  const [flyoutData, setFlyoutData] = useState(null)
  const closeTimeoutRef = useRef(null)

  const handleOpenFlyout = (e, item, children = []) => {
    if (!isCollapsed) return
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const flyoutHeight = Math.min(420, 60 + children.length * 42)
    let top = rect.top
    if (top + flyoutHeight > window.innerHeight - 16) {
      top = Math.max(12, window.innerHeight - flyoutHeight - 16)
    }
    setFlyoutData({
      item,
      children,
      top,
      left: rect.right + 8,
    })
  }

  const handleCloseFlyoutWithDelay = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setFlyoutData(null)
    }, 220)
  }

  const handleCancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const appName = globalTheme?.app_name || 'FlowBoard'
  const roleDisplay = profile?.role ? profile.role.replace(/_/g, ' ').toUpperCase() : 'ADMIN'

  const CONTROL_PANEL_PATHS = ['/users', '/branches', '/permissions', '/settings']
  const rawItems = allMenuItems && allMenuItems.length > 0 ? allMenuItems : MENU_ITEMS
  const filteredItems = rawItems.filter(item => {
    if (CONTROL_PANEL_PATHS.includes(item.path)) return false
    if (item.id === 'control_panel' || item.label === 'Control Panel') return false
    if (!item.roles || item.roles.length === 0) return true
    return item.roles.includes(profile?.role)
  })

  const showControlPanel = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.DIVISIONAL_ADMIN,
    ROLES.REGIONAL_ADMIN,
    ROLES.REGIONAL_CHECKER
  ].includes(profile?.role)
  const controlPanelChildren = CONTROL_PANEL.children.filter(c => c.roles.includes(profile?.role))

  const isActive = (path) => path && path !== '#' && location.pathname === path
  const isSectionActive = (path) => path && path !== '#' && location.pathname.startsWith(path)
  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))

  const filteredChildren = (children) => {
    if (!children || children.length === 0) return []
    return children.filter(child => {
      if (!child.roles || child.roles.length === 0) return true
      return child.roles.includes(profile?.role)
    })
  }

  const hasChildren = (item) => filteredChildren(item.children).length > 0

  useEffect(() => {
    if (!profile?.id) return
    const safeUserId = toValidUuid(profile.id)
    const load = async () => {
      try {
        const { data: parts } = await supabase
          .from('chat_participants')
          .select('conversation_id, last_read_at')
          .eq('user_id', safeUserId)
        if (!parts?.length) return
        let total = 0
        for (const p of parts) {
          let q = supabase.from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', p.conversation_id)
            .neq('sender_id', safeUserId)
            .eq('is_deleted', false)
          if (p.last_read_at) q = q.gt('created_at', p.last_read_at)
          const { count } = await q
          total += count || 0
        }
        setChatUnread(total)
      } catch (_e) {}
    }
    load()
    if (location.pathname === '/chat') setChatUnread(0)
    const sub = supabase.channel('sidebar_chat_unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => { if (location.pathname !== '/chat') load() }
      ).subscribe()
    return () => sub.unsubscribe()
  }, [profile?.id, location.pathname])

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={onClose} />
      )}
      <div className={`
        fixed top-0 left-0 h-full z-30 sidebar-dynamic
        transform transition-all duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto md:shrink-0
        ${isCollapsed ? 'w-20' : 'w-64'}
        flex flex-col justify-between select-none
      `}>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Logo / Header */}
          <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-black/10 dark:border-white/10">
            {isCollapsed ? (
              <div className="flex flex-col items-center justify-center w-full gap-2 py-1">
                <span className="text-xl font-bold" title={appName}>🏢</span>
                <button
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200"
                  title="সাইডবার বড় করুন"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1 pr-2">
                  {globalTheme?.app_logo_url ? (
                    <img src={globalTheme.app_logo_url} alt="logo" className="h-8 object-contain" />
                  ) : (
                    <h1 className="text-xl font-extrabold tracking-tight truncate" title={appName}>
                      {appName}
                    </h1>
                  )}
                  <p className="text-[11px] font-bold tracking-wider uppercase mt-0.5 opacity-80 truncate">
                    {roleDisplay}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {onToggleCollapse && (
                    <button
                      onClick={onToggleCollapse}
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200"
                      title="সাইডবার কলাপস করুন"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <button onClick={onClose} className="md:hidden p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
            {filteredItems.map((item) => {
              const children = filteredChildren(item.children)
              const isExpanded = expandedItems[item.id] !== false
              const isChildActive = children.some(c => isActive(c.path))
              const isCurrentActive = isActive(item.path) || (isChildActive && (!item.path || item.path === '#'))
              const isParentActive = isCurrentActive || isSectionActive(item.path)
              const isChatItem = item.path === '/chat'

              if (isCollapsed) {
                return (
                  <div
                    key={item.id || item.label}
                    className="relative flex flex-col items-center justify-center py-0.5"
                    onMouseEnter={(e) => handleOpenFlyout(e, item, children)}
                    onMouseLeave={handleCloseFlyoutWithDelay}
                  >
                    <Link
                      to={item.path && item.path !== '#' ? item.path : (children[0]?.path || '#')}
                      onClick={(e) => {
                        if (children.length > 0 && (!item.path || item.path === '#')) {
                          handleOpenFlyout(e, item, children)
                        } else if (onClose) {
                          onClose()
                        }
                      }}
                      title={item.label}
                      className={`w-14 py-2 px-1 rounded-xl transition flex flex-col items-center justify-center gap-1 relative ${
                        isParentActive
                          ? 'sidebar-active-item font-semibold shadow-xs ring-1 ring-emerald-400/40'
                          : 'sidebar-normal-item hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <MenuIcon icon={item.icon} size={20} />
                        {isChatItem && chatUnread > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 bg-red-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1 ring-2 ring-emerald-950">
                            {chatUnread > 99 ? '99+' : chatUnread}
                          </span>
                        )}
                        {children.length > 0 && (
                          <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-slate-900" />
                        )}
                      </div>
                      <span className="text-[10px] leading-tight font-medium text-center truncate max-w-[62px]">
                        {item.label}
                      </span>
                    </Link>
                  </div>
                )
              }

              return (
                <div key={item.id || item.label} className="pt-0.5">
                  <div className={`flex items-center rounded-xl transition-all duration-150 ${
                    isActive(item.path)
                      ? 'sidebar-active-item font-semibold shadow-xs'
                      : 'sidebar-normal-item hover:bg-black/10 dark:hover:bg-white/10 font-medium'
                  }`}>
                    {hasChildren(item) || item.path === '#' ? (
                      <button onClick={() => toggleExpand(item.id)}
                        className="flex items-center gap-3 px-3.5 py-2.5 flex-1 text-left w-full cursor-pointer">
                        <MenuIcon icon={item.icon} size={18} className="shrink-0" />
                        <span className="font-medium flex-1 text-sm tracking-wide">{item.label}</span>
                        {hasChildren(item) && (
                          <svg className={`w-4 h-4 transition-transform duration-200 shrink-0 opacity-70 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <Link to={item.path} onClick={onClose}
                        className="flex items-center gap-3 px-3.5 py-2.5 flex-1">
                        <MenuIcon icon={item.icon} size={18} className="shrink-0" />
                        <span className="font-medium text-sm flex-1 tracking-wide">{item.label}</span>
                        {isChatItem && chatUnread > 0 && (
                          <span className="ml-auto min-w-[20px] h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold px-1.5 shadow-xs">
                            {chatUnread > 99 ? '99+' : chatUnread}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                  {hasChildren(item) && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 pl-3.5 py-0.5" style={{borderColor: 'var(--sidebar-border-color, rgba(255,255,255,0.2))'}}>
                      {children.map(child => (
                        <Link
                          key={child.id || child.label}
                          to={child.path || '#'}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all text-sm ${
                            isActive(child.path)
                              ? 'sidebar-active-item font-semibold'
                              : 'sidebar-normal-item hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          <span className="text-sm shrink-0">{child.icon || '📌'}</span>
                          <span className="truncate">{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Control Panel */}
            {showControlPanel && (
              isCollapsed ? (
                <div
                  className="relative flex flex-col items-center justify-center py-1 mt-2 border-t border-black/10 dark:border-white/10 pt-2"
                  onMouseEnter={(e) => handleOpenFlyout(e, CONTROL_PANEL, controlPanelChildren)}
                  onMouseLeave={handleCloseFlyoutWithDelay}
                >
                  <button
                    onClick={(e) => handleOpenFlyout(e, CONTROL_PANEL, controlPanelChildren)}
                    title="Control Panel"
                    className={`w-14 py-2 px-1 rounded-xl transition flex flex-col items-center justify-center gap-1 relative cursor-pointer ${
                      controlPanelChildren.some(c => isActive(c.path))
                        ? 'sidebar-active-item font-semibold shadow-xs'
                        : 'sidebar-normal-item hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <MenuIcon icon={CONTROL_PANEL.icon} size={20} />
                      <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-slate-900" />
                    </div>
                    <span className="text-[10px] leading-tight font-medium text-center truncate max-w-[62px]">
                      Control
                    </span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 mt-2 border-t border-black/10 dark:border-white/10">
                  <div className={`flex items-center rounded-xl transition ${
                    controlPanelChildren.some(c => isActive(c.path))
                      ? 'sidebar-active-item font-semibold'
                      : 'sidebar-normal-item hover:bg-black/10 dark:hover:bg-white/10'
                  }`}>
                    <button onClick={() => toggleExpand(CONTROL_PANEL.id)}
                      className="flex items-center gap-3 px-3.5 py-2.5 flex-1 text-left w-full cursor-pointer">
                      <MenuIcon icon={CONTROL_PANEL.icon} size={18} className="shrink-0" />
                      <span className="font-medium flex-1 text-sm tracking-wide">Control Panel</span>
                      <svg className={`w-4 h-4 transition-transform duration-200 shrink-0 opacity-70 ${expandedItems[CONTROL_PANEL.id] ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {expandedItems[CONTROL_PANEL.id] && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 pl-3.5 py-0.5" style={{borderColor: 'var(--sidebar-border-color, rgba(255,255,255,0.2))'}}>
                      {controlPanelChildren.map(child => (
                        <Link
                          key={child.id}
                          to={child.path}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition text-sm ${
                            isActive(child.path)
                              ? 'sidebar-active-item font-semibold'
                              : 'sidebar-normal-item hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          <MenuIcon icon={child.icon} size={16} className="shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </nav>
        </div>

        {/* Bottom User Info */}
        <div className="p-3.5 shrink-0 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
          {isCollapsed ? (
            <div className="flex justify-center" title={`${profile?.full_name || ''} (${profile?.email || ''})`}>
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-emerald-500/30">
                {profile?.full_name?.substring(0, 2)?.toUpperCase() || profile?.email?.substring(0, 2)?.toUpperCase() || 'RM'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-emerald-500/30">
                {profile?.full_name?.substring(0, 2)?.toUpperCase() || profile?.email?.substring(0, 2)?.toUpperCase() || 'RM'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{color: "var(--sidebar-text, inherit)"}}>{profile?.full_name || 'Admin User'}</p>
                <p className="text-xs opacity-75 truncate" style={{color: "var(--sidebar-text, inherit)"}}>{profile?.email || 'azonstars@gmail.com'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Portal Flyout Menu when Collapsed */}
      {flyoutData && isCollapsed && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${flyoutData.top}px`,
            left: `${flyoutData.left}px`,
            zIndex: 99999,
          }}
          onMouseEnter={handleCancelClose}
          onMouseLeave={handleCloseFlyoutWithDelay}
          className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <MenuIcon icon={flyoutData.item.icon} size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-xs truncate">
                {flyoutData.item.label}
              </span>
            </div>
            {flyoutData.children && flyoutData.children.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-semibold shrink-0">
                {flyoutData.children.length}
              </span>
            )}
          </div>

          {flyoutData.children && flyoutData.children.length > 0 ? (
            <div className="space-y-1">
              {flyoutData.children.map(child => (
                <Link
                  key={child.id || child.label}
                  to={child.path || '#'}
                  onClick={() => {
                    setFlyoutData(null)
                    if (onClose) onClose()
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive(child.path)
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm shrink-0">{child.icon || '📌'}</span>
                  <span className="truncate">{child.label}</span>
                </Link>
              ))}
            </div>
          ) : (
            <Link
              to={flyoutData.item.path || '#'}
              onClick={() => {
                setFlyoutData(null)
                if (onClose) onClose()
              }}
              className="block px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Open {flyoutData.item.label}
            </Link>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
