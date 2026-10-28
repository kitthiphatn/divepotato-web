'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Icon } from '../icons'

type ToastFn = (message: string, ok?: boolean) => void
const ToastContext = createContext<ToastFn>(() => {})

export const useToast = () => useContext(ToastContext)

// The black pill at the bottom of the screen after a save
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [on, setOn] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback<ToastFn>((text, ok = true) => {
    setMsg({ text, ok })
    setOn(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOn(false), 2800)
  }, [])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${on ? ' on' : ''}`} role="status" aria-live="polite">
        {msg && (
          <>
            <span
              className="tk"
              style={msg.ok ? undefined : { background: 'var(--red)', color: '#fff' }}
            >
              <Icon name={msg.ok ? 'check' : 'x'} />
            </span>
            <span>{msg.text}</span>
          </>
        )}
      </div>
    </ToastContext.Provider>
  )
}
