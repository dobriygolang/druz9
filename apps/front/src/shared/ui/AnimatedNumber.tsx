import { useEffect, useRef, useState } from 'react'

export function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const start = prevRef.current
    const diff = value - start
    if (diff === 0) return
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) requestAnimationFrame(animate)
      else prevRef.current = value
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <>{display}</>
}
