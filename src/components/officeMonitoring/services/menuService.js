import { supabase } from './supabase'
import { MENU_ITEMS } from '../constants/menuConfig'

const MENU_STORAGE_KEY = 'om_menu_structure'
const MENU_ITEMS_STORAGE_KEY = 'om_menu_items'

// Helper: Flatten tree to items list
export const flattenMenuTree = (tree) => {
  const result = []
  tree.forEach((parent, pIdx) => {
    const parentId = parent.id || `menu_${Date.now()}_${pIdx}`
    result.push({
      ...parent,
      id: parentId,
      parent_id: null,
      menu_order: pIdx + 1,
    })
    if (parent.children && parent.children.length > 0) {
      parent.children.forEach((child, cIdx) => {
        result.push({
          ...child,
          id: child.id || `child_${parentId}_${cIdx}`,
          parent_id: parentId,
          menu_order: cIdx + 1,
        })
      })
    }
  })
  return result
}

export const getMenuItems = async () => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('menu_order', { ascending: true })
    if (!error && data && data.length > 0) return data
  } catch (e) {
    console.warn('Supabase menu_items fetch error:', e?.message)
  }

  // Check LocalStorage
  try {
    const stored = localStorage.getItem(MENU_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return flattenMenuTree(parsed)
      }
    }
  } catch (_e) {}

  return flattenMenuTree(MENU_ITEMS)
}

export const getMenuItemsWithChildren = async () => {
  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('menu_order', { ascending: true })

    if (!error && data && data.length > 0) {
      const parents = data.filter(item => !item.parent_id)
      const children = data.filter(item => item.parent_id)

      return parents.map(parent => ({
        ...parent,
        children: children
          .filter(child => child.parent_id === parent.id)
          .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
      }))
    }
  } catch (e) {
    console.warn('Supabase getMenuItemsWithChildren error:', e?.message)
  }

  // 2. Try LocalStorage
  try {
    const stored = localStorage.getItem(MENU_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(i => i.is_active !== false)
      }
    }
  } catch (_e) {}

  // 3. Fallback to default MENU_ITEMS
  return MENU_ITEMS
}

export const saveFullMenuStructure = async (menuStructure, _forms = []) => {
  // Always save to localStorage first for instant, guaranteed persistence
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuStructure))
    const flat = flattenMenuTree(menuStructure)
    localStorage.setItem(MENU_ITEMS_STORAGE_KEY, JSON.stringify(flat))
  } catch (err) {
    console.warn('LocalStorage menu save warning:', err)
  }

  // Try saving to Supabase
  try {
    for (let i = 0; i < menuStructure.length; i++) {
      const item = menuStructure[i]
      const isNewParent = String(item.id).startsWith('new_') || !item.id
      const parentData = {
        label: item.label || item.title,
        path: item.path || '#',
        icon: item.icon || item.menu_icon || '📋',
        menu_order: i + 1,
        is_active: item.is_active !== false,
        roles: item.roles || ['admin'],
        parent_id: null,
        link_type: item.link_type || 'path',
        report_id: item.report_id || null,
        form_id: item.form_id || null,
      }

      let savedParentId = item.id
      if (isNewParent) {
        const { data: inserted, error: insErr } = await supabase
          .from('menu_items')
          .insert(parentData)
          .select()
          .single()
        if (!insErr && inserted) savedParentId = inserted.id
      } else {
        await supabase
          .from('menu_items')
          .upsert({ id: item.id, ...parentData })
      }

      // Process children
      const children = item.children || []
      for (let j = 0; j < children.length; j++) {
        const child = children[j]
        const isNewChild = String(child.id).startsWith('new_') || !child.id
        const childData = {
          label: child.label,
          path: child.path || '#',
          icon: child.icon || '📌',
          menu_order: j + 1,
          is_active: child.is_active !== false,
          roles: child.roles && child.roles.length > 0 ? child.roles : item.roles,
          parent_id: savedParentId,
          link_type: child.link_type || 'path',
          report_id: child.report_id || null,
          form_id: child.form_id || null,
        }

        if (isNewChild) {
          await supabase.from('menu_items').insert(childData)
        } else {
          await supabase.from('menu_items').upsert({ id: child.id, ...childData })
        }
      }
    }
  } catch (err) {
    console.warn('Supabase menu save warning (falling back to LocalStorage):', err?.message)
  }

  return true
}

export const updateMenuOrder = async (items) => {
  const updates = items.map((item, index) => ({
    id: item.id,
    menu_order: index + 1,
  }))
  try {
    await supabase.from('menu_items').upsert(updates)
  } catch (_e) {}
}

export const updateMenuItem = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) return data
  } catch (_e) {}
  return { id, ...updates }
}

export const createMenuItem = async (item) => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(item)
      .select()
      .single()
    if (!error && data) return data
  } catch (_e) {}
  return { id: `item_${Date.now()}`, ...item }
}

export const deleteMenuItem = async (id) => {
  try {
    await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
  } catch (_e) {}
}

export const resetMenuToDefault = async () => {
  try {
    localStorage.removeItem(MENU_STORAGE_KEY)
    localStorage.removeItem(MENU_ITEMS_STORAGE_KEY)
  } catch (_e) {}
  return MENU_ITEMS
}
