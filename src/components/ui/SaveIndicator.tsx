import { useUIStore } from '../../store/uiStore'

export function SaveIndicator() {
  const saveStatus = useUIStore((s) => s.saveStatus)

  const dot =
    saveStatus === 'saving' ? 'bg-amber-400' :
    saveStatus === 'saved' ? 'bg-success' :
    'bg-muted'

  const label =
    saveStatus === 'saving' ? 'Saving…' :
    saveStatus === 'saved' ? 'Saved' :
    null

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface border border-border text-xs">
      <div className={`w-1.5 h-1.5 rounded-full ${dot} transition-colors`} />
      {label && <span className="text-muted">{label}</span>}
    </div>
  )
}
