import { CheckCircle2, CircleDollarSign } from 'lucide-react'
import type { TikTokAccount } from '../types'
import { formatFullNumber, getAccountProgress } from '../utils/analytics'

export function AccountProgress({ account }: { account: TikTokAccount }) {
  const progress = getAccountProgress(account)
  return (
    <article className="account-progress-card">
      <div className="account-card-head">
        <div>
          <strong>{account.name}</strong>
          <span>{account.niche}</span>
        </div>
        <div className={`monetization-dot ${account.monetizationStatus === 'Monetized' ? 'live' : ''}`} title={account.monetizationStatus}>
          {account.monetizationStatus === 'Monetized' ? <CircleDollarSign size={17} /> : <CheckCircle2 size={17} />}
        </div>
      </div>
      <div className="progress-numbers">
        <b>{formatFullNumber(account.currentFollowers)}</b>
        <span>/ {formatFullNumber(account.followerGoal)}</span>
      </div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="account-card-foot">
        <span>{progress}% of first goal</span>
        <span>{account.assignedTo}</span>
      </div>
    </article>
  )
}
