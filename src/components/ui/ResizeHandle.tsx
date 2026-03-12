import { useResizable } from '../../hooks/useResizable'

interface ResizeHandleProps {
  min: number
  max: number
  current: number
  onResize: (w: number) => void
  direction: 'left' | 'right'
}

export function ResizeHandle({ min, max, current, onResize, direction }: ResizeHandleProps) {
  const { onMouseDown } = useResizable({ min, max, current, onResize, direction })

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 cursor-col-resize hover:bg-accent/30 active:bg-accent/50 transition-colors flex-shrink-0"
      style={{ touchAction: 'none' }}
    />
  )
}
