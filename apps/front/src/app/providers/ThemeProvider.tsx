import { createContext, useContext, useEffect, useState, useMemo } from 'react'

type Theme = 'light' | 'dark'
type Season = 'spring' | 'summer' | 'autumn' | 'winter'

function getCurrentSeason(): Season {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

interface ThemeContextValue {
  theme: Theme
  season: Season
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', season: 'spring', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem('theme')
    return stored === 'dark' ? 'dark' : 'light'
  })

  const season = useMemo(() => getCurrentSeason(), [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // Apply season class for seasonal CSS overrides
    root.dataset.season = season
    localStorage.setItem('theme', theme)
  }, [theme, season])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, season, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
