'use client'

import { useEffect, useRef } from 'react'

// Phone-only booking bar that slides up once the visitor scrolls past the first screen
export function MobileBar({ children }: { children: React.ReactNode }) {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    document.body.classList.add('has-mbar')
    const onScroll = () => bar.current?.classList.toggle('on', window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.body.classList.remove('has-mbar')
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return (
    <div className="mbar" ref={bar}>
      {children}
    </div>
  )
}
