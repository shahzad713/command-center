import type { VideoStatus } from '../types'

export function StatusBadge({ status }: { status: VideoStatus }) {
  const className = status.toLowerCase().replace(/\s+/g, '-')
  return <span className={`status-badge status-${className}`}>{status}</span>
}
