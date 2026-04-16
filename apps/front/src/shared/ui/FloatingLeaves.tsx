import { useMemo } from 'react'

/**
 * Floating leaves background decoration — pure CSS animation.
 * Renders 6 SVG leaf elements that drift across the screen.
 * Respects prefers-reduced-motion via the .floating-leaf class in globals.css.
 */
export function FloatingLeaves() {
  const leaves = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${10 + i * 15}%`,
      size: 12 + (i % 3) * 4,
      duration: 18 + i * 4,
      delay: i * 3.5,
      opacity: 0.25 + (i % 3) * 0.1,
    })),
  [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="floating-leaf"
          style={{
            left: leaf.left,
            top: '-20px',
            animationDuration: `${leaf.duration}s`,
            animationDelay: `${leaf.delay}s`,
            opacity: leaf.opacity,
          }}
        >
          <svg
            width={leaf.size}
            height={leaf.size}
            viewBox="0 0 24 24"
            fill="none"
            style={{ animationDuration: `${2 + (leaf.id % 3)}s` }}
          >
            <path
              d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 8.5-3 10.36-7.86A8.81 8.81 0 0 0 19 8c0-1-.5-2-2-2s-2 1-2 2"
              fill="#059669"
              fillOpacity="0.6"
            />
            <path
              d="M17 8c-2 2-4 6-10 10"
              stroke="#047857"
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
