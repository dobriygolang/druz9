import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

type Handler = () => void

const GOTO: Record<string, string> = {
  h: '/hub',
  t: '/training',
  a: '/arena',
  p: '/profile',
  g: '/guild',
  s: '/social',
  e: '/events',
  l: '/leaderboards',
  m: '/map',
  i: '/inbox',
}

export function useKeyboardShortcuts(handlers?: {
  onSearch?: Handler
  onHelp?: Handler
}) {
  const navigate = useNavigate()
  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

      const key = e.key.toLowerCase()

      if (key === '/' && handlers?.onSearch) {
        e.preventDefault()
        handlers.onSearch()
        return
      }
      if (key === '?' && handlers?.onHelp) {
        e.preventDefault()
        handlers.onHelp()
        return
      }

      // g + letter chord: g h → /hub, g t → /training …
      if (pending.current === 'g') {
        if (timer.current) clearTimeout(timer.current)
        pending.current = null
        if (GOTO[key]) {
          navigate(GOTO[key])
        }
        return
      }

      if (key === 'g') {
        pending.current = 'g'
        timer.current = setTimeout(() => { pending.current = null }, 1200)
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [navigate, handlers])
}
