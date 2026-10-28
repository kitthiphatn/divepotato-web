'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { deleteFaqAction, reorderFaqsAction, saveFaqAction, type FaqInput } from '../actions/faqs'
import { pair, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { FAQ_CAT_LABEL, FAQ_CATS, type FaqCat } from '../website'
import { LocTabs, WebsiteHead, type Loc } from './fields'
import { Modal } from './Modal'
import { useToast } from './Toast'

export type FaqRow = FaqInput & { id: number }

// FAQ list: category filter, up/down to reorder, tap a row to edit (modal with TH/EN tabs and a
// preview of how the answer opens on the website), add and delete
export function FaqManager({ lang, faqs }: { lang: Lang; faqs: FaqRow[] }) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [rows, setRows] = useState(faqs)
  const [cat, setCat] = useState<FaqCat | 'all'>('all')
  const [edit, setEdit] = useState<FaqInput | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [tl, setTl] = useState<Loc>(lang)

  const shown = cat === 'all' ? rows : rows.filter((r) => r.category === cat)
  const nextOrder = (rows.at(-1)?.order ?? 0) + 10
  const open = (v: FaqInput) => {
    setConfirmDel(false)
    setTl(lang)
    setEdit(v)
  }
  const add = () =>
    open({
      id: null,
      question: { th: '', en: '' },
      answer: { th: '', en: '' },
      category: cat === 'all' ? 'general' : cat,
      showOnHome: false,
      order: nextOrder,
    })

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    setRows(next.map((r, k) => ({ ...r, order: (k + 1) * 10 })))
    start(async () => {
      const r = await reorderFaqsAction(next.map((x) => ({ id: x.id, order: x.order })))
      toast(r.message, r.ok)
      if (!r.ok) setRows(rows)
    })
  }

  const save = () =>
    edit &&
    start(async () => {
      const r = await saveFaqAction(edit)
      toast(r.message, r.ok)
      if (!r.ok) return
      setEdit(null)
      router.refresh()
    })
  const remove = () =>
    edit?.id &&
    start(async () => {
      const r = await deleteFaqAction(edit.id!)
      toast(r.message, r.ok)
      if (!r.ok) return
      setEdit(null)
      router.refresh()
    })

  const q = (r: FaqInput) => (lang === 'en' ? r.question.en || r.question.th : r.question.th)
  const patch = (p: Partial<FaqInput>) => setEdit((e) => e && { ...e, ...p })

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab="faq"
        lede={L(
          'คำถามที่ลูกค้าถามบ่อย เรียงตามลำดับที่แสดงบนเว็บไซต์',
          'Frequently asked questions, in the order the website shows them',
        )}
        acts={
          <button className="btn y" type="button" onClick={add}>
            <Icon name="plus" />
            {L('เพิ่มคำถาม', 'Add FAQ')}
          </button>
        }
      />
      <div className="chips" role="group">
        <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
          {L('ทั้งหมด', 'All')} <sup className="num">{rows.length}</sup>
        </button>
        {FAQ_CATS.map((k) => (
          <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}>
            {pair(lang, FAQ_CAT_LABEL[k])}{' '}
            <sup className="num">{rows.filter((r) => r.category === k).length}</sup>
          </button>
        ))}
      </div>
      <div className="card p0">
        <div className="rows">
          <div className="row frow head">
            <span>{L('ลำดับ', 'Order')}</span>
            <span>{L('คำถาม', 'Question')}</span>
            <span>{L('หมวด', 'Category')}</span>
            <span>{L('หน้าแรก', 'Home')}</span>
            <span />
          </div>
          {shown.length === 0 && (
            <div className="empty">{L('ยังไม่มีคำถามในหมวดนี้', 'No FAQs in this category')}</div>
          )}
          {shown.map((r) => {
            const i = rows.indexOf(r)
            return (
              <div
                key={r.id}
                className="row frow"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return
                  open(r)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) open(r)
                }}
              >
                <span className="blact">
                  <button
                    className="ibtn"
                    type="button"
                    disabled={pending || cat !== 'all' || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={L('เลื่อนขึ้น', 'Move up')}
                  >
                    <Icon name="back" className="up" />
                  </button>
                  <button
                    className="ibtn"
                    type="button"
                    disabled={pending || cat !== 'all' || i === rows.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={L('เลื่อนลง', 'Move down')}
                  >
                    <Icon name="back" className="down" />
                  </button>
                </span>
                <span className="c2">
                  <b>{q(r)}</b>
                  <small>{lang === 'en' ? r.answer.en || r.answer.th : r.answer.th}</small>
                </span>
                <span className="hide-m muted">{pair(lang, FAQ_CAT_LABEL[r.category])}</span>
                <span className="st">
                  {r.showOnHome ? (
                    <span className="pill st-paid">{L('แสดง', 'Shown')}</span>
                  ) : (
                    <span className="pill st-hold">{L('ไม่แสดง', 'Hidden')}</span>
                  )}
                </span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </div>
            )
          })}
        </div>
        <p className="hint" style={{ padding: '14px 22px' }}>
          {cat === 'all'
            ? L(
                'ใช้ลูกศรเพื่อเรียงลำดับ แตะคำถามเพื่อแก้ไข',
                'Use the arrows to reorder; tap a FAQ to edit it',
              )
            : L('เลือก "ทั้งหมด" เพื่อเรียงลำดับ', 'Choose "All" to reorder')}
        </p>
      </div>

      {edit && (
        <Modal
          wide
          onClose={() => setEdit(null)}
          label={edit.id ? L('แก้ไขคำถาม', 'Edit FAQ') : L('เพิ่มคำถาม', 'Add FAQ')}
        >
          <h3>{edit.id ? L('แก้ไขคำถาม', 'Edit FAQ') : L('เพิ่มคำถาม', 'Add FAQ')}</h3>
          <p className="s">
            {L(
              'เขียนทั้งภาษาไทยและอังกฤษ ถ้าเว้นอังกฤษไว้ จะใช้ภาษาไทยแทน',
              'Write Thai and English; empty English uses the Thai text',
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <LocTabs tl={tl} onChange={setTl} />
            <label className="field">
              <span>
                {L('คำถาม', 'Question')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={edit.question[tl]}
                autoFocus
                onChange={(e) => patch({ question: { ...edit.question, [tl]: e.target.value } })}
              />
            </label>
            <label className="field">
              <span>
                {L('คำตอบ', 'Answer')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={4}
                value={edit.answer[tl]}
                onChange={(e) => patch({ answer: { ...edit.answer, [tl]: e.target.value } })}
              />
            </label>
            <div className="f2">
              <label className="field">
                <span>{L('หมวด', 'Category')}</span>
                <select
                  className="inp"
                  value={edit.category}
                  onChange={(e) => patch({ category: e.target.value as FaqCat })}
                >
                  {FAQ_CATS.map((k) => (
                    <option key={k} value={k}>
                      {pair(lang, FAQ_CAT_LABEL[k])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{L('ลำดับ (เลขน้อยขึ้นก่อน)', 'Order (lower first)')}</span>
                <input
                  className="inp num"
                  type="number"
                  value={edit.order}
                  onChange={(e) => patch({ order: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={edit.showOnHome}
                onChange={(e) => patch({ showOnHome: e.target.checked })}
              />
              <i />
              <span>{L('แสดงในหน้าแรก', 'Show on the home page')}</span>
            </label>
            <div className="faqpv">
              <p className="lab small muted">
                <Icon name="eye" />
                {L('ตัวอย่างบนเว็บไซต์', 'On the website')} · {tl.toUpperCase()}
              </p>
              <details open>
                <summary>
                  {edit.question[tl] || edit.question.th || L('คำถาม', 'Question')}
                  <Icon name="plus" />
                </summary>
                <p>{edit.answer[tl] || edit.answer.th}</p>
              </details>
            </div>
            <div className="acts">
              {edit.id &&
                (confirmDel ? (
                  <button
                    className="btn red"
                    type="button"
                    disabled={pending}
                    onClick={remove}
                    style={{ marginRight: 'auto' }}
                  >
                    <Icon name="trash" />
                    {L('ยืนยันลบคำถามนี้', 'Confirm delete')}
                  </button>
                ) : (
                  <button
                    className="btn t"
                    type="button"
                    onClick={() => setConfirmDel(true)}
                    style={{ marginRight: 'auto' }}
                  >
                    <Icon name="trash" />
                    {L('ลบ', 'Delete')}
                  </button>
                ))}
              <button className="btn o" type="button" onClick={() => setEdit(null)}>
                {L('ยกเลิก', 'Cancel')}
              </button>
              <button className="btn y" type="submit" disabled={pending}>
                <Icon name="check" />
                {L('บันทึก', 'Save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
