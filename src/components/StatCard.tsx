import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  helper: string
  icon: LucideIcon
  tone?: 'cyan' | 'green' | 'purple' | 'amber' | 'pink'
}

export function StatCard({ label, value, helper, icon: Icon, tone = 'cyan' }: StatCardProps) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon"><Icon size={19} /></div>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  )
}
