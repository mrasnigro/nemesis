/** Initials avatar for Training IA agents (no stock photos). */

const PALETTE = [
  ['#f59e0b', '#92400e'],
  ['#3b82f6', '#1e3a8a'],
  ['#10b981', '#065f46'],
  ['#f43f5e', '#9f1239'],
  ['#a855f7', '#581c87'],
  ['#06b6d4', '#155e75'],
]

function hashId(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function getAgentInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function AgentAvatar({ id = '', name = '', size = 'md', className = '', photo = '' }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={`training-ai__avatar training-ai__avatar--${size} ${className}`.trim()}
      />
    )
  }
  const [from, to] = PALETTE[hashId(id || name) % PALETTE.length]
  const initials = getAgentInitials(name)
  return (
    <span
      className={`training-ai__avatar training-ai__avatar--${size} ${className}`.trim()}
      style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
