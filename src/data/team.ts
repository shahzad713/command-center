import type { TeamMember } from '../types'

// Operational staff roster used to populate editor / uploader / assignee dropdowns.
// This is app configuration, not tenant data — it is never written to Firestore and
// contains no accounts, videos or follower figures.
export const teamMembers: TeamMember[] = [
  { id: 'yasir', name: 'Yasir', role: 'Manager / Uploader' },
  { id: 'asad', name: 'Asad', role: 'Editor / Uploader' },
  { id: 'rehman', name: 'Rehman', role: 'Editor' },
  { id: 'shahzad', name: 'Shahzad', role: 'Uploader / QA' },
]
