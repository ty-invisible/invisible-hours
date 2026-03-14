import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

function resolveIsDark(theme: 'light' | 'dark' | 'system'): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useThemeSync() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle('dark', resolveIsDark(theme))
    }

    apply()

    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])
}

export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useUIStore((s) => s.theme)
  return resolveIsDark(theme) ? 'dark' : 'light'
}
