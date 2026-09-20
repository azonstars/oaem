export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CENTRAL_CHECKER: 'central_checker',
  DIVISIONAL_ADMIN: 'divisional_admin',
  DIVISIONAL_CHECKER: 'divisional_checker',
  REGIONAL_ADMIN: 'regional_admin',
  REGIONAL_CHECKER: 'regional_checker',
  BRANCH_ADMIN: 'branch_admin',
  BRANCH_MANAGER: 'branch_manager',
  BRANCH_EMPLOYEE: 'branch_employee',
}

export const ROLE_LABELS = {
  super_admin: 'Super Admin (সুপার এডমিন)',
  admin: 'Admin (এডমিন)',
  central_checker: 'Moderator / Central Checker (সেন্ট্রাল মডারেটর)',
  divisional_admin: 'Divisional Admin (বিভাগীয় এডমিন)',
  divisional_checker: 'Divisional Moderator / Checker (বিভাগীয় মডারেটর)',
  regional_admin: 'Regional Admin (আঞ্চলিক এডমিন)',
  regional_checker: 'Regional Moderator / Checker (আঞ্চলিক মডারেটর)',
  branch_admin: 'Branch Admin (শাখার এডমিন)',
  branch_manager: 'Branch Manager (শাখা ব্যবস্থাপক)',
  branch_employee: 'Branch User / Employee (শাখা ইউজার)',
}

export const CHECKER_ROLES = [
  'central_checker',
  'divisional_admin',
  'divisional_checker',
  'regional_admin',
  'regional_checker',
]

export const BRANCH_ROLES = [
  'branch_admin',
  'branch_manager',
  'branch_employee',
]