import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

let mql: MediaQueryList | null = null

function getMql() {
  if (!mql) mql = window.matchMedia(MOBILE_QUERY)
  return mql
}

function subscribe(cb: () => void) {
  const m = getMql()
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

function getSnapshot() {
  return getMql().matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
