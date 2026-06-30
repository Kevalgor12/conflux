'use client'

import { useEffect, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import type { UserIdentity } from '@/lib/sync/identity'

interface PresenceUser extends UserIdentity {
  clientId: number
}

// Live collaborator avatars, driven by Yjs awareness.
export default function PresenceAvatars({ awareness }: { awareness: Awareness }) {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const readStates = () => {
      const next: PresenceUser[] = []
      awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: Partial<UserIdentity> }).user
        if (user) {
          next.push({
            clientId,
            name: user.name || 'Anonymous',
            color: user.color || '#888888'
          })
        }
      })
      setUsers(next)
    }
    readStates()
    awareness.on('change', readStates)
    return () => awareness.off('change', readStates)
  }, [awareness])

  if (users.length === 0) return null

  return (
    <ul
      className="flex items-center -space-x-2"
      aria-label={`${users.length} ${users.length === 1 ? 'person' : 'people'} editing`}
    >
      {users.map((user) => (
        <li
          key={user.clientId}
          title={user.name}
          role="img"
          aria-label={user.name}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-xs font-medium text-white"
          style={{ backgroundColor: user.color }}
        >
          <span aria-hidden="true">{user.name.charAt(0)}</span>
        </li>
      ))}
    </ul>
  )
}
