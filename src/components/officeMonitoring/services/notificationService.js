import { supabase } from './supabase'
import { toValidUuid } from '../utils/uuid'

// নতুন notification তৈরি করুন
export const createNotification = async ({ userId, title, message, type = 'info', link = null }) => {
  const safeUid = toValidUuid(userId)
  const { data, error } = await supabase.from('notifications').insert({
    user_id: safeUid, title, message, type, link
  }).select().single()
  if (error) throw error
  return data
}

// একাধিক user কে notify করুন
export const createNotificationForMany = async (userIds, { title, message, type = 'info', link = null }) => {
  const rows = userIds.map(uid => ({ user_id: toValidUuid(uid), title, message, type, link }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) throw error
}

// নিজের notifications লোড করুন
export const getMyNotifications = async (userId, limit = 30) => {
  const safeUid = toValidUuid(userId)
  const { data, error } = await supabase.from('notifications')
    .select('*').eq('user_id', safeUid)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data || []
}

// একটা notification পড়া হিসেবে mark করুন
export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase.from('notifications')
    .update({ is_read: true }).eq('id', notificationId)
  if (error) throw error
}

// সব notification পড়া হিসেবে mark করুন
export const markAllNotificationsRead = async (userId) => {
  const safeUid = toValidUuid(userId)
  const { error } = await supabase.from('notifications')
    .update({ is_read: true }).eq('user_id', safeUid).eq('is_read', false)
  if (error) throw error
}

// সব notification মুছুন
export const clearAllNotifications = async (userId) => {
  const safeUid = toValidUuid(userId)
  const { error } = await supabase.from('notifications')
    .delete().eq('user_id', safeUid)
  if (error) throw error
}

// Realtime subscribe
export const subscribeToNotifications = (userId, callback) => {
  const safeUid = toValidUuid(userId)
  return supabase.channel(`notifications:${safeUid}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${safeUid}`
    }, callback).subscribe()
}

// Form submit হলে checker দের notify করুন
export const notifyCheckersOnSubmit = async (branchName, formTitle, checkerIds) => {
  await createNotificationForMany(checkerIds, {
    title: '📬 নতুন Submission',
    message: `${branchName} থেকে "${formTitle}" submit হয়েছে`,
    type: 'form',
    link: '/submissions'
  })
}

// Approve/Reject হলে branch কে notify করুন
export const notifyBranchOnCheckerAction = async (userId, action, formTitle) => {
  const isApproved = action === 'approved'
  await createNotification({
    userId,
    title: isApproved ? '✅ Submission Approved' : '❌ Submission Rejected',
    message: `"${formTitle}" ${isApproved ? 'approve' : 'reject'} হয়েছে`,
    type: isApproved ? 'success' : 'warning',
    link: '/dashboard'
  })
}