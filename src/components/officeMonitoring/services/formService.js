import { supabase } from './supabase'
import { toValidUuid } from '../utils/uuid'

export const DEFAULT_SYSTEM_FORMS = [
  {
    id: 'new-loan-disburse',
    title: 'New Loan Disburse',
    description: 'নতুন ঋণ বিতরণ সংক্রান্ত দৈনিক তথ্য দাখিল ফরম',
    menu_icon: '📌',
    menu_order: 1,
    is_active: true,
    show_in_menu: true,
    report_mode: 'cumulative',
    fields: [
      { id: 'f_app', label: 'নতুন ঋণ আবেদন (New Loan Applications)', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_sanction', label: 'মঞ্জুরীকৃত ঋণ (Sanctioned Loans)', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_disburse', label: 'বিতরণকৃত ঋণ (Disbursed Loan)', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_target', label: 'দৈনিক বিতরণ লক্ষ্যমাত্রা (Target)', type: 'amount', required: false, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_remarks', label: 'মন্তব্য (Remarks)', type: 'text', required: false },
    ],
  },
  {
    id: 'renew-loan-disburse',
    title: 'Renew Loan Disburse',
    description: 'নবায়ন ঋণ বিতরণ সংক্রান্ত দৈনিক তথ্য দাখিল ফরম',
    menu_icon: '📌',
    menu_order: 2,
    is_active: true,
    show_in_menu: true,
    report_mode: 'cumulative',
    fields: [
      { id: 'f_app', label: 'নবায়ন আবেদন (Renewal Applications)', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_sanction', label: 'নবায়ন মঞ্জুরী (Renewal Approved)', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_disburse', label: 'বিতরণকৃত নবায়ন ঋণ (Disbursed Renewal)', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_remarks', label: 'মন্তব্য (Remarks)', type: 'text', required: false },
    ],
  },
  {
    id: 'ss-recovery',
    title: 'SS Recovery',
    description: 'এসএস (Standard & Special) ঋণ আদায় তথ্য ফরম',
    menu_icon: '📌',
    menu_order: 3,
    is_active: true,
    show_in_menu: true,
    report_mode: 'cumulative',
    fields: [
      { id: 'f_reg_rec', label: 'নিয়মিত আদায় (Regular Recovery)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_overdue_rec', label: 'বকেয়া আদায় (Overdue Recovery)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_adv_rec', label: 'অগ্রিম আদায় (Advance Recovery)', type: 'amount', required: false, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_total_ss', label: 'সর্বমোট এসএস আদায় (Total Recovery)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
    ],
  },
  {
    id: 'df-recovery',
    title: 'DF Recovery',
    description: 'ডিএফ (Default / Classified) খেলাপী ঋণ আদায় ফরম',
    menu_icon: '📌',
    menu_order: 4,
    is_active: true,
    show_in_menu: true,
    report_mode: 'cumulative',
    fields: [
      { id: 'f_sub_rec', label: 'নিম্নমান ঋণ আদায় (Sub-standard Recovery)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_doubtful_rec', label: 'সন্দেহজনক ঋণ আদায় (Doubtful Recovery)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_bad_loss_rec', label: 'মন্দ ঋণ আদায় (Bad / Loss Recovery)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_written_off', label: 'অবলোপনকৃত ঋণ আদায় (Written-Off Recovery)', type: 'amount', required: false, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
    ],
  },
  {
    id: 'test-form-1',
    title: 'টেস্ট ফর্ম',
    description: 'পরীক্ষামূলক সাধারণ তথ্য ফরম',
    menu_icon: '📌',
    menu_order: 5,
    is_active: true,
    show_in_menu: true,
    report_mode: 'latest',
    fields: [
      { id: 'f_clients', label: 'সেবাপ্রাপ্ত গ্রাহক সংখ্যা', type: 'count', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }] },
      { id: 'f_coll', label: 'মোট সংগৃহীত পরিমাণ', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_note', label: 'বিশেষ মন্তব্য', type: 'text', required: false },
    ],
  },
  {
    id: 'test-form-2',
    title: 'টেস্ট ফর্ম 2',
    description: 'পরীক্ষামূলক বিস্তারিত তথ্য ফরম',
    menu_icon: '📌',
    menu_order: 6,
    is_active: true,
    show_in_menu: true,
    report_mode: 'latest',
    fields: [
      { id: 'f_sec1', label: 'বিভাগ ১ ডাটা', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_sec2', label: 'বিভাগ ২ ডাটা', type: 'both', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }, { key: 'amount', label: 'পরিমাণ (টাকা)' }] },
    ],
  },
  {
    id: 'amanat-week',
    title: 'Amanat Week',
    description: 'আমানত সপ্তাহ বিশেষ ক্যাম্পেইন ডাটা এন্ট্রি ফরম',
    menu_icon: '📌',
    menu_order: 7,
    is_active: true,
    show_in_menu: true,
    report_mode: 'cumulative',
    fields: [
      { id: 'f_new_ac', label: 'নতুন সঞ্চয়ী হিসাব খোলা (New Savings A/C)', type: 'count', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }] },
      { id: 'f_savings_amt', label: 'সঞ্চয়ী আমানত সংগ্রহ (Savings Deposit)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_fdr_count', label: 'নতুন মেয়াদী হিসাব (New Term Deposits)', type: 'count', required: true, columns: [{ key: 'count', label: 'সংখ্যা' }] },
      { id: 'f_fdr_amt', label: 'মেয়াদী আমানত সংগ্রহ (Term Deposit Amount)', type: 'amount', required: true, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
      { id: 'f_special_amt', label: 'বিশেষ আমানত স্কিম সংগ্রহ (Special Schemes)', type: 'amount', required: false, columns: [{ key: 'amount', label: 'পরিমাণ (টাকা)' }] },
    ],
  },
]

export const getForms = async () => {
  let dbForms = []
  try {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('menu_order', { ascending: true })
    if (!error && data) dbForms = data
  } catch (e) {
    console.warn('Supabase forms fetch failed:', e?.message)
  }

  // LocalStorage custom forms
  let localForms = []
  try {
    const stored = localStorage.getItem('om_custom_forms')
    if (stored) localForms = JSON.parse(stored)
  } catch (_e) {}

  const allMap = {}
  DEFAULT_SYSTEM_FORMS.forEach(f => { allMap[f.id] = f })
  dbForms.forEach(f => { allMap[f.id] = f })
  localForms.forEach(f => { allMap[f.id] = f })

  return Object.values(allMap).sort((a, b) => (a.menu_order || 99) - (b.menu_order || 99))
}

export const getMenuForms = async () => {
  const forms = await getForms()
  return forms.filter(f => f.is_active && f.show_in_menu)
}

export const getFormById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .single()
    if (!error && data) return data
  } catch (_e) {}

  try {
    const stored = localStorage.getItem('om_custom_forms')
    if (stored) {
      const localForms = JSON.parse(stored)
      const found = localForms.find(f => f.id === id || String(f.id) === String(id))
      if (found) return found
    }
  } catch (_e) {}

  const fallback = DEFAULT_SYSTEM_FORMS.find(f => f.id === id || String(f.id) === String(id))
  if (fallback) return fallback
  throw new Error(`ফরম পাওয়া যায়নি (ID: ${id})`)
}

export const createForm = async (form) => {
  const newForm = {
    ...form,
    id: form.id || 'form_' + Date.now(),
    created_at: new Date().toISOString()
  }

  try {
    const { data, error } = await supabase
      .from('forms')
      .insert(newForm)
      .select()
      .single()
    if (!error && data) return data
  } catch (e) {
    console.warn('Supabase createForm error, saving locally:', e?.message)
  }

  // Save to localStorage
  try {
    const stored = localStorage.getItem('om_custom_forms')
    const localForms = stored ? JSON.parse(stored) : []
    localForms.push(newForm)
    localStorage.setItem('om_custom_forms', JSON.stringify(localForms))
  } catch (_e) {}

  return newForm
}

export const updateForm = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) return data
  } catch (e) {
    console.warn('Supabase updateForm error, updating locally:', e?.message)
  }

  // Update in localStorage
  try {
    const stored = localStorage.getItem('om_custom_forms')
    if (stored) {
      let localForms = JSON.parse(stored)
      localForms = localForms.map(f => f.id === id ? { ...f, ...updates } : f)
      localStorage.setItem('om_custom_forms', JSON.stringify(localForms))
      const found = localForms.find(f => f.id === id)
      if (found) return found
    }
  } catch (_e) {}

  return { id, ...updates }
}

export const duplicateForm = async (id, createdBy) => {
  const original = await getFormById(id)
  const duplicated = {
    ...original,
    id: 'form_' + Date.now(),
    title: `${original.title} (Copy)`,
    is_active: false,
    created_by: createdBy,
    created_at: new Date().toISOString()
  }
  return await createForm(duplicated)
}

export const deleteForm = async (id) => {
  try {
    await supabase
      .from('forms')
      .delete()
      .eq('id', id)
  } catch (e) {
    console.warn('Supabase deleteForm error:', e?.message)
  }

  try {
    const stored = localStorage.getItem('om_custom_forms')
    if (stored) {
      let localForms = JSON.parse(stored)
      localForms = localForms.filter(f => f.id !== id)
      localStorage.setItem('om_custom_forms', JSON.stringify(localForms))
    }
  } catch (_e) {}
}

export const getFormSubmissions = async (formId, branchCode = null, date = null) => {
  try {
    let query = supabase
      .from('form_submissions')
      .select('*, profiles(full_name)')
      .eq('form_id', formId)
    if (branchCode) query = query.eq('branch_code', branchCode)
    if (date) query = query.eq('submission_date', date)
    const { data, error } = await query
    if (!error && data) return data
  } catch (_e) {}

  try {
    const stored = localStorage.getItem('om_form_submissions')
    if (stored) {
      const subs = JSON.parse(stored)
      return subs.filter(s => {
        if (s.form_id !== formId) return false
        if (branchCode && s.branch_code !== branchCode) return false
        if (date && s.submission_date !== date) return false
        return true
      })
    }
  } catch (_e) {}

  return []
}

export const submitForm = async (submission) => {
  const finalSubmission = {
    ...submission,
    id: submission.id || 'sub_' + Date.now(),
    status: submission.status === 'submitted' ? 'approved' : (submission.status || 'approved'),
    approved_at: new Date().toISOString()
  }

  if (finalSubmission.submitted_by) {
    finalSubmission.submitted_by = toValidUuid(finalSubmission.submitted_by)
  }

  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .upsert(finalSubmission, {
        onConflict: 'form_id,branch_code,submission_date'
      })
      .select()
      .single()
    if (!error && data) return data
  } catch (e) {
    console.warn('Supabase submitForm error, saving locally:', e?.message)
  }

  try {
    const stored = localStorage.getItem('om_form_submissions')
    const subs = stored ? JSON.parse(stored) : []
    const idx = subs.findIndex(s => s.form_id === finalSubmission.form_id && s.branch_code === finalSubmission.branch_code && s.submission_date === finalSubmission.submission_date)
    if (idx >= 0) {
      subs[idx] = { ...subs[idx], ...finalSubmission }
    } else {
      subs.push(finalSubmission)
    }
    localStorage.setItem('om_form_submissions', JSON.stringify(subs))
  } catch (_e) {}

  return finalSubmission
}

export const getTodaySubmission = async (formId, branchCode) => {
  if (!branchCode) return null
  const today = new Date().toISOString().split('T')[0]
  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', formId)
      .eq('branch_code', branchCode)
      .eq('submission_date', today)
      .maybeSingle()
    if (!error && data) return data
  } catch (_e) {}

  try {
    const stored = localStorage.getItem('om_form_submissions')
    if (stored) {
      const subs = JSON.parse(stored)
      const found = subs.find(s => s.form_id === formId && s.branch_code === branchCode && s.submission_date === today)
      if (found) return found
    }
  } catch (_e) {}

  return null
}

export const getSubmissionById = async (submissionId) => {
  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*, forms(title, fields, description)')
      .eq('id', submissionId)
      .single()
    if (!error && data) return data
  } catch (_e) {}

  try {
    const stored = localStorage.getItem('om_form_submissions')
    if (stored) {
      const subs = JSON.parse(stored)
      const found = subs.find(s => s.id === submissionId || String(s.id) === String(submissionId))
      if (found) {
        const form = await getFormById(found.form_id).catch(() => null)
        return { ...found, forms: form }
      }
    }
  } catch (_e) {}

  throw new Error(`Submission পাওয়া যায়নি`)
}

export const getSubmissionsForApproval = async (filters = {}) => {
  try {
    let query = supabase
      .from('form_submissions')
      .select('*, forms(title), profiles(full_name)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.branch_code) query = query.eq('branch_code', filters.branch_code)
    if (filters.startDate) query = query.gte('submission_date', filters.startDate)
    if (filters.endDate) query = query.lte('submission_date', filters.endDate)
    if (filters.branchCodes) query = query.in('branch_code', filters.branchCodes)

    const { data, error } = await query
    if (!error && data) return data
  } catch (_e) {}

  try {
    const stored = localStorage.getItem('om_form_submissions')
    if (stored) {
      const subs = JSON.parse(stored)
      return subs.filter(s => {
        if (filters.status && s.status !== filters.status) return false
        if (filters.branch_code && s.branch_code !== filters.branch_code) return false
        if (filters.startDate && s.submission_date < filters.startDate) return false
        if (filters.endDate && s.submission_date > filters.endDate) return false
        if (filters.branchCodes && !filters.branchCodes.includes(s.branch_code)) return false
        return true
      })
    }
  } catch (_e) {}

  return []
}

export const approveSubmission = async (id, approvedBy) => {
  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .update({ status: 'approved', approved_by: toValidUuid(approvedBy), approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) return data
  } catch (_e) {}

  try {
    const stored = localStorage.getItem('om_form_submissions')
    if (stored) {
      let subs = JSON.parse(stored)
      subs = subs.map(s => s.id === id ? { ...s, status: 'approved', approved_at: new Date().toISOString() } : s)
      localStorage.setItem('om_form_submissions', JSON.stringify(subs))
      return subs.find(s => s.id === id)
    }
  } catch (_e) {}

  return { id, status: 'approved' }
}

export const rejectSubmission = async (id, rejectedBy, reason) => {
  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .update({ status: 'rejected', rejected_by: toValidUuid(rejectedBy), rejection_reason: reason, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) return data
  } catch (_e) {}

  try {
    const stored = localStorage.getItem('om_form_submissions')
    if (stored) {
      let subs = JSON.parse(stored)
      subs = subs.map(s => s.id === id ? { ...s, status: 'rejected', rejection_reason: reason, approved_at: new Date().toISOString() } : s)
      localStorage.setItem('om_form_submissions', JSON.stringify(subs))
      return subs.find(s => s.id === id)
    }
  } catch (_e) {}

  return { id, status: 'rejected', rejection_reason: reason }
}