import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { adminOnly, bookingEditors, bookingReaders } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { revalidateDeleted, revalidateDoc } from '../lib/revalidate'
import { GROUPS } from './groups'

const idOf = (v: unknown) =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: number }).id : (v as number | null)

// "Similan Liveaboard 4D3N · 2026-11-14": the title shown in lists and relationship pickers
const setTitle: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const kind = data.kind ?? originalDoc?.kind
  const collection = kind === 'course' ? 'courses' : 'trips'
  const relId = idOf(
    kind === 'course' ? (data.course ?? originalDoc?.course) : (data.trip ?? originalDoc?.trip),
  )
  const start = data.startDate ?? originalDoc?.startDate
  let name = ''
  if (relId) {
    try {
      const rel = await req.payload.findByID({
        collection,
        id: relId,
        depth: 0,
        draft: true,
        locale: 'th',
        req,
      })
      name = rel.title
    } catch {
      // Related trip/course missing; keep the date only
    }
  }
  const date = start ? new Date(start).toISOString().slice(0, 10) : ''
  return { ...data, title: [name, date].filter(Boolean).join(' · ') }
}

export const Departures: CollectionConfig = {
  slug: 'departures',
  labels: {
    singular: { th: 'รอบออกเดินทาง', en: 'Departure' },
    plural: { th: 'รอบออกเดินทาง', en: 'Departures' },
  },
  admin: {
    useAsTitle: 'title',
    group: GROUPS.bookings,
    defaultColumns: ['title', 'startDate', 'seatsBooked', 'capacity', 'status'],
    listSearchableFields: ['title', 'boat'],
  },
  access: {
    read: bookingReaders,
    update: bookingEditors,
    create: adminOnly,
    delete: adminOnly,
  },
  defaultSort: 'startDate',
  hooks: {
    beforeChange: [setTitle],
    afterChange: [revalidateDoc, auditAfterChange],
    afterDelete: [revalidateDeleted, auditAfterDelete],
  },
  fields: [
    {
      name: 'title',
      label: { th: 'ชื่อรอบ', en: 'Title' },
      type: 'text',
      admin: {
        readOnly: true,
        description: {
          th: 'ตั้งให้อัตโนมัติจากชื่อทริป/คอร์สและวันที่',
          en: 'Set automatically from the trip/course name and date',
        },
      },
    },
    {
      name: 'kind',
      label: { th: 'เป็นรอบของ', en: 'Departure for' },
      type: 'radio',
      required: true,
      defaultValue: 'trip',
      options: [
        { label: { th: 'ทริป', en: 'Trip' }, value: 'trip' },
        { label: { th: 'คอร์สเรียน', en: 'Course' }, value: 'course' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'trip',
      label: { th: 'ทริป', en: 'Trip' },
      type: 'relationship',
      relationTo: 'trips',
      index: true,
      admin: { condition: (data) => data?.kind !== 'course' },
      validate: (value: unknown, { data }: { data: { kind?: string } }) =>
        data?.kind === 'course' || value ? true : 'เลือกทริป (Choose a trip)',
    },
    {
      name: 'course',
      label: { th: 'คอร์สเรียน', en: 'Course' },
      type: 'relationship',
      relationTo: 'courses',
      index: true,
      admin: { condition: (data) => data?.kind === 'course' },
      validate: (value: unknown, { data }: { data: { kind?: string } }) =>
        data?.kind !== 'course' || value ? true : 'เลือกคอร์ส (Choose a course)',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          label: { th: 'วันเริ่ม', en: 'Start date' },
          type: 'date',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
        },
        {
          name: 'endDate',
          label: { th: 'วันสิ้นสุด', en: 'End date' },
          type: 'date',
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'capacity',
          label: { th: 'จำนวนที่นั่ง', en: 'Capacity' },
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 12,
        },
        {
          name: 'seatsHeld',
          label: { th: 'ที่นั่งถูกกันไว้ (รอชำระ)', en: 'Seats on hold' },
          type: 'number',
          defaultValue: 0,
          admin: { readOnly: true },
        },
        {
          name: 'seatsBooked',
          label: { th: 'ที่นั่งจองแล้ว', en: 'Seats booked' },
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: {
              th: 'นับอัตโนมัติจากการจองที่ชำระมัดจำ/ชำระครบ/จบทริปแล้ว',
              en: 'Counted from bookings that are deposit paid, paid or completed',
            },
          },
        },
      ],
    },
    {
      name: 'boat',
      label: { th: 'เรือ', en: 'Boat' },
      type: 'text',
    },
    {
      name: 'status',
      label: { th: 'สถานะ', en: 'Status' },
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: { th: 'เปิดรับจอง', en: 'Open' }, value: 'open' },
        { label: { th: 'เต็ม', en: 'Full' }, value: 'full' },
        { label: { th: 'ปิดรับจอง', en: 'Closed' }, value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'manifestLink',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/ManifestLink#ManifestLink' },
      },
    },
    {
      name: 'notes',
      label: { th: 'บันทึก', en: 'Notes' },
      type: 'textarea',
    },
  ],
}
