'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './Timer.module.css'

export type TimerProps = {
  /** ISO timestamp the clock runs down to. The server owns it; this only displays it. */
  deadline: string
  /** Fired once, when the remaining time first reaches zero. */
  onExpire?: () => void
  label?: string
  /** Seconds remaining below which the timer turns accent-coloured. */
  warnAtS?: number
  className?: string
}

/**
 * `mm:ss` under an hour, `h:mm:ss` at or over it. A 120-minute paper starts at 2:00:00
 * and only drops the hour once it can no longer be read as minutes.
 */
export function clockFormat(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function Timer({ deadline, onExpire, label = 'Time left', warnAtS = 300, className }: TimerProps) {
  const target = new Date(deadline).getTime()
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()))
  const fired = useRef(false)

  useEffect(() => {
    fired.current = false
    const tick = () => {
      const left = Math.max(0, target - Date.now())
      setRemaining(left)
      if (left === 0 && !fired.current) {
        fired.current = true
        onExpire?.()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // onExpire is intentionally not a dependency: the interval must not restart when a
    // parent re-creates the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  const expired = remaining === 0
  const warn = !expired && remaining <= warnAtS * 1000

  return (
    <div
      className={[styles.timer, warn ? styles.warn : '', expired ? styles.expired : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="timer"
      aria-live="off"
    >
      <span className={styles.label}>{label}</span>
      {/* The first value is computed from Date.now() on both sides of the render, so the
          server's second and the client's rarely match. The next tick corrects it. */}
      <span className={styles.value} suppressHydrationWarning>
        {clockFormat(remaining)}
      </span>
    </div>
  )
}
