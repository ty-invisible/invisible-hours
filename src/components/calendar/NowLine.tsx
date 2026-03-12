import { useState, useEffect } from 'react'

export function NowLine() {
  const [pct, setPct] = useState(getTimePct)

  useEffect(() => {
    setPct(getTimePct())
    const interval = setInterval(() => setPct(getTimePct()), 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${pct}%` }}
    >
      <div className="h-[2px] bg-accent relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent" />
      </div>
    </div>
  )
}

function getTimePct(): number {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  return (mins / 1440) * 100
}
