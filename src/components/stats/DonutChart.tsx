import { motion } from 'motion/react'

interface DonutSegment {
  catId: string
  color: string
  value: number
  fraction: number
}

interface DonutChartProps {
  segments: DonutSegment[]
  totalMinutes: number
}

const SIZE = 160
const STROKE = 20
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTER = SIZE / 2

function formatHours(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function DonutChart({ segments, totalMinutes }: DonutChartProps) {
  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
        <div className="text-center">
          <div className="text-2xl font-semibold text-muted">0m</div>
          <div className="text-[10px] text-muted uppercase tracking-wider">Tracked</div>
        </div>
      </div>
    )
  }

  // Key Behaviour 3: single-segment = full circle, not arc
  const isSingle = segments.length === 1

  let offset = 0

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="block">
        {/* Background track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
        />

        {isSingle ? (
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={segments[0].color}
            strokeWidth={STROKE}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ) : (
          segments.map((seg) => {
            const dash = seg.fraction * CIRCUMFERENCE
            const gap = CIRCUMFERENCE - dash
            const rotation = -90 + offset * 360

            offset += seg.fraction

            return (
              <motion.circle
                key={seg.catId}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap="butt"
                transform={`rotate(${rotation} ${CENTER} ${CENTER})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )
          })
        )}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div>
          <div className="text-lg font-semibold">{formatHours(totalMinutes)}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider">Tracked</div>
        </div>
      </div>
    </div>
  )
}
