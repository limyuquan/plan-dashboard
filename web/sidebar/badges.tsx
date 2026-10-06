import { FALLBACK_KIND } from '../../shared/config'
import { useStore } from '../state/store'

// What a doc is ("plan", "md", ...), in the colour its doc type is given.
export function KindBadge({ kind }: { kind: string }) {
  const k = useStore((s) => s.kinds.get(kind)) ?? FALLBACK_KIND
  return (
    <span className="badge" data-color={k.color}>
      {k.label}
    </span>
  )
}

const TONES = 6

// The phase a tab came from, one colour per phase number so tabs from the
// same phase are easy to spot.
export function PhaseBadge({ num }: { num: string }) {
  const tone = (Math.max(1, parseInt(num, 10) || 1) - 1) % TONES
  return (
    <span className="phase-badge" data-tone={tone}>
      {num}
    </span>
  )
}
