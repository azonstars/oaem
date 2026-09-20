import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { getMenuItemsWithChildren } from '../services/menuService'
import { getMenuForms } from '../services/formService'
import { getAppSettings } from '../services/appSettingsService'
import { toValidUuid } from '../utils/uuid'

const AuthContext = createContext({})

export const AuthProvider = ({ children, centralUser = null }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [menuForms, setMenuForms] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [allMenuItems, setAllMenuItems] = useState([])
  const [appSettings, setAppSettings] = useState({})
  const [loading, setLoading] = useState(true)

  // Map FlowBoard Central User role to Office Monitoring role
  const mapCentralRoleToOfficeRole = (role) => {
    switch (role) {
      case 'Super Admin':
        return 'super_admin'
      case 'Admin':
      case 'Head Office Admin':
      case 'HeadOfficeAdmin':
        return 'admin'
      case 'Moderator':
        return 'central_checker'
      case 'Divisional Admin':
        return 'divisional_admin'
      case 'Divisional Moderator':
        return 'divisional_checker'
      case 'Regional Admin':
        return 'regional_admin'
      case 'Regional Moderator':
        return 'regional_checker'
      case 'Branch Admin':
        return 'branch_admin'
      case 'Branch User':
      case 'Sub-office User':
      case 'User':
      case 'Head Office User':
        return 'branch_employee'
      case 'Report Viewer':
        return 'branch_employee'
      default:
        return 'branch_employee'
    }
  }

  useEffect(() => {
    if (centralUser) {
      const officeRole = mapCentralRoleToOfficeRole(centralUser.role)
      const mappedProfile = {
        id: toValidUuid(centralUser.id || 'central-user-id'),
        rawId: centralUser.id,
        email: centralUser.email || `${centralUser.userId}@flowboard.app`,
        full_name: centralUser.name || centralUser.userId,
        role: officeRole,
        branch_code: centralUser.officeId || '0001',
        division_id: centralUser.division_id || '',
        region_id: centralUser.region_id || '',
        is_active: centralUser.status === 'Active',
      }
      setUser({ id: mappedProfile.id, email: mappedProfile.email })
      setProfile(mappedProfile)
      fetchAllMenuData(mappedProfile).finally(() => setLoading(false))
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else {
          setProfile(null)
          setMenuForms([])
          setMenuItems([])
          setAllMenuItems([])
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [centralUser])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) { setLoading(false); return }
      setProfile(data)
      // profile data সরাসরি pass করো — state update এর জন্য অপেক্ষা করতে হবে না
      await fetchAllMenuData(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllMenuData = async (currentProfile = null) => {
    try {
      const [itemsWithChildren, forms, settings] = await Promise.all([
        getMenuItemsWithChildren(),
        getMenuForms(),
        getAppSettings(),
      ])

      setMenuForms(forms)
      setMenuItems(itemsWithChildren)
      setAppSettings(settings)

      // currentProfile parameter অথবা state থেকে নাও
      const _activeProfile = currentProfile || profile

      // Parent items — children সহ রাখো, Sidebar নিজে filter করবে
      const parentItems = itemsWithChildren
        .filter(i => !i.parent_id)
        .map(i => ({ ...i, _type: 'menu' }))

      const childFormIds = new Set()
      parentItems.forEach(p => {
        if (p.children && p.children.length > 0) {
          p.children.forEach(c => {
            if (c.form_id) childFormIds.add(c.form_id)
            if (c.path && c.path.startsWith('/forms/submit/')) {
              const idFromPath = c.path.replace('/forms/submit/', '')
              childFormIds.add(idFromPath)
            }
          })
        }
      })

      const formsMapped = forms
        .filter(f => !childFormIds.has(f.id))
        .map(f => ({
          ...f,
          _type: 'form',
          label: f.title,
          icon: f.menu_icon || '📋',
          path: `/forms/submit/${f.id}`,
          roles: ['super_admin', 'admin', 'branch_admin', 'branch_manager', 'branch_employee', 'divisional_admin', 'regional_admin'],
          children: [],
        }))

      const combined = [...parentItems, ...formsMapped]
        .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))

      setAllMenuItems(combined)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchMenuForms = async () => { await fetchAllMenuData() }
  const fetchMenuItems = async () => { await fetchAllMenuData() }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMenuForms([])
    setMenuItems([])
    setAllMenuItems([])
  }

  return (
    <AuthContext.Provider value={{
      user, profile, menuForms, menuItems, allMenuItems, appSettings, loading,
      signOut, fetchProfile, fetchMenuForms, fetchMenuItems, fetchAllMenuData,
      isIntegrated: Boolean(centralUser)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)