'use client'

import { cn } from '@/lib/utils'
import type { SyncState } from '@/lib/sync/types'

// Presentational connection-status indicator, driven by the sync engine.
const statusMap: Record<SyncState, { label: string; dot: string }> = {
  offline: { label: 'Offline — saved on this device', dot: 'bg-warning' },
  connecting: { label: 'Connecting…', dot: 'bg-warning' },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-warning' },
  syncing: { label: 'Syncing…', dot: 'bg-warning' },
  synced: { label: 'All changes saved', dot: 'bg-success' },
  readonly: { label: 'View only', dot: 'bg-muted-foreground' },
  error: { label: 'Sync error', dot: 'bg-danger' }
}

export default function SyncStatus({ state }: { state: SyncState }) {
  const { label, dot } = statusMap[state]
  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden="true" />
      {label}
    </div>
  )
}
