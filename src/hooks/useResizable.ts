import { useCallback, useRef } from 'react'

interface UseResizableOptions {
  min: number
  max: number
  current: number
  onResize: (width: number) => void
  direction: 'left' | 'right'
}

export function useResizable({ min, max, current, onResize, direction }: UseResizableOptions) {
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startX.current = e.clientX
      startWidth.current = current

      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX.current
        const newWidth = direction === 'right'
          ? startWidth.current + delta
          : startWidth.current - delta
        onResize(Math.min(max, Math.max(min, newWidth)))
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [current, min, max, onResize, direction]
  )

  return { onMouseDown }
}
