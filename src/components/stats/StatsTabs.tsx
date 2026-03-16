export type StatsMode = 'total' | '9-5' | 'overtime'

interface StatsTabsProps {
  active: StatsMode
  onChange: (mode: StatsMode) => void
}

const TABS: { label: string; value: StatsMode }[] = [
  { label: 'Total', value: 'total' },
  { label: 'Work Day', value: '9-5' },
  { label: 'OT', value: 'overtime' },
]

export function StatsTabs({ active, onChange }: StatsTabsProps) {
  return (
    <div className="flex bg-bg rounded-lg p-0.5">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === tab.value
              ? 'bg-surface text-text shadow-sm ring-1 ring-border'
              : 'text-muted hover:text-text'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
