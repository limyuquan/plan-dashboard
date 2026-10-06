const TURN = { left: 0, up: 90, right: 180, down: 270 }

// One chevron shape, turned to face the way it points.
export function Chevron({ dir, className = 'chev-icon' }: { dir: keyof typeof TURN; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" aria-hidden style={{ transform: `rotate(${TURN[dir]}deg)` }}>
      <path
        d="M7.5 2.5 4 6l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
