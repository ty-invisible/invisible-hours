import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useUIStore, type Toast as ToastType } from '../../store/uiStore'

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  const bg =
    toast.type === 'error' ? 'bg-error' :
    toast.type === 'success' ? 'bg-success' :
    'bg-header'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={`${bg} text-white text-sm px-4 py-2 rounded-lg shadow-lg`}
    >
      {toast.message}
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toastQueue)

  return (
    <div className="fixed bottom-14 left-4 right-4 md:left-auto md:bottom-4 flex flex-col items-end gap-2 z-50">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
