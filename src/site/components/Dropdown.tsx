'use client'

import { useEffect, useId, useRef, useState } from 'react'

type Option = { value: string; label: string }

// A styled single-choice list for the quick search: native <select> menus can't be styled, so
// this is a button plus a listbox with arrow/Enter/Escape keys and click-outside to close.
export function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const show = () => {
    setActive(Math.max(0, options.indexOf(current)))
    setOpen(true)
  }
  const pick = (i: number) => {
    onChange(options[i].value)
    setOpen(false)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'ArrowDown') setActive((i) => Math.min(options.length - 1, i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') pick(active)
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Tab') return setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <div className="qf dd" ref={root}>
      <span id={`${id}-l`}>{label}</span>
      <button
        type="button"
        className="dd-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-l ${id}-v`}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        <span id={`${id}-v`}>{current?.label}</span>
      </button>
      {open && (
        <ul
          className="dd-list"
          role="listbox"
          id={`${id}-list`}
          ref={list}
          aria-labelledby={`${id}-l`}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === current?.value}
              className={i === active ? 'on' : undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
