import type { ReactNode } from 'react'

export function PageIntro({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-intro">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
