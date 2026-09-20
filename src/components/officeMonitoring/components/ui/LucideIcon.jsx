import * as LucideIcons from 'lucide-react'

// icon string থেকে Lucide component render করো
// format: "lucide:Home", "lucide:LayoutDashboard" অথবা "LayoutDashboard"
export default function LucideIcon({ name, size = 18, className = '' }) {
  if (!name) return null
  const iconName = typeof name === 'string' && name.startsWith('lucide:')
    ? name.replace('lucide:', '')
    : name
  const Icon = LucideIcons[iconName]
  if (!Icon) return <span className={className}>📋</span>
  return <Icon size={size} className={className} />
}

// icon string টি Lucide কিনা check করো
export const isLucideIcon = (icon) => {
  if (typeof icon !== 'string' || !icon) return false
  if (icon.startsWith('lucide:')) return true
  return Boolean(LucideIcons[icon])
}

// Sidebar এবং Menu Settings-এ ব্যবহারের জন্য — theme ও icon type অনুযায়ী render
export const MenuIcon = ({ icon, size = 18, className = '' }) => {
  if (!icon) {
    return <span className={`text-base shrink-0 inline-flex items-center justify-center ${className}`}>📋</span>
  }
  if (isLucideIcon(icon)) {
    return <LucideIcon name={icon} size={size} className={className} />
  }
  return <span className={`text-base shrink-0 inline-flex items-center justify-center ${className}`}>{icon}</span>
}

