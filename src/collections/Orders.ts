import type { CollectionConfig } from 'payload'

import { adminOnly, bookingEditors, hiddenFromGuide } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { prepareOrder } from '../hooks/orders'
import { GROUPS } from './groups'

export const ORDER_STATUSES = [
  'pending_payment',
  'pending_review',
  'paid',
  'packed',
  'shipped',
  'picked_up',
  'cancelled',
  'refunded',
  'expired',
] as const

const money = (name: string, label: { th: string; en: string }) => ({
  name,
  label,
  type: 'number' as const,
  defaultValue: 0,
  admin: { readOnly: true },
})

// Gear shop orders from the website checkout. Customers pay the full amount on the same pay page
// as bookings; the items' stock is reserved while the order waits for payment (see hooks/orders).
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: { th: 'คำสั่งซื้อ', en: 'Order' },
    plural: { th: 'คำสั่งซื้อ', en: 'Orders' },
  },
  admin: {
    useAsTitle: 'code',
    group: GROUPS.shop,
    hidden: hiddenFromGuide,
    defaultColumns: ['code', 'customer', 'delivery', 'status', 'total', 'createdAt'],
    listSearchableFields: ['code', 'trackingNo'],
  },
  access: {
    read: bookingEditors,
    update: bookingEditors,
    create: bookingEditors,
    delete: adminOnly,
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [prepareOrder],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: [
    {
      name: 'code',
      label: { th: 'เลขคำสั่งซื้อ', en: 'Order code' },
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: { th: 'ออกให้อัตโนมัติ เช่น DP-ORD-2611-0001', en: 'Automatic, e.g. DP-ORD-2611-0001' },
      },
    },
    {
      name: 'status',
      label: { th: 'สถานะ', en: 'Status' },
      type: 'select',
      required: true,
      defaultValue: 'pending_payment',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: { th: 'รอชำระเงิน', en: 'Pending payment' }, value: 'pending_payment' },
        { label: { th: 'รอตรวจสลิป', en: 'Pending review' }, value: 'pending_review' },
        { label: { th: 'ชำระแล้ว', en: 'Paid' }, value: 'paid' },
        { label: { th: 'แพ็กแล้ว', en: 'Packed' }, value: 'packed' },
        { label: { th: 'จัดส่งแล้ว', en: 'Shipped' }, value: 'shipped' },
        { label: { th: 'รับที่ร้านแล้ว', en: 'Picked up' }, value: 'picked_up' },
        { label: { th: 'ยกเลิก', en: 'Cancelled' }, value: 'cancelled' },
        { label: { th: 'คืนเงินแล้ว', en: 'Refunded' }, value: 'refunded' },
        { label: { th: 'หมดเวลา', en: 'Expired' }, value: 'expired' },
      ],
    },
    {
      name: 'holdExpiresAt',
      label: { th: 'หมดเวลาจองสินค้า', en: 'Hold expires at' },
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      // Secret part of the customer's pay link, like Bookings `payToken`
      name: 'payToken',
      type: 'text',
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      // Set once the items have been taken off the variants' stock (on payment), so a later
      // cancel puts back exactly what was taken
      name: 'stockDeducted',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', readOnly: true },
      label: { th: 'ตัดสต็อกแล้ว', en: 'Stock deducted' },
    },
    {
      name: 'customer',
      label: { th: 'ลูกค้า', en: 'Customer' },
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'items',
      label: { th: 'รายการสินค้า', en: 'Items' },
      type: 'array',
      minRows: 1,
      labels: { singular: { th: 'สินค้า', en: 'Item' }, plural: { th: 'รายการสินค้า', en: 'Items' } },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'variant',
              label: { th: 'ตัวเลือกสินค้า', en: 'Variant' },
              type: 'relationship',
              relationTo: 'product-variants',
              required: true,
            },
            // Snapshots, so the order reads the same after the product changes
            { name: 'title', label: { th: 'ชื่อสินค้า', en: 'Title' }, type: 'text', required: true },
            { name: 'size', label: { th: 'ไซซ์', en: 'Size' }, type: 'text' },
            { name: 'sku', label: 'SKU', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'unitPrice',
              label: { th: 'ราคาต่อชิ้น', en: 'Unit price' },
              type: 'number',
              required: true,
              min: 0,
            },
            { name: 'qty', label: { th: 'จำนวน', en: 'Qty' }, type: 'number', required: true, min: 1 },
            money('lineTotal', { th: 'รวม', en: 'Line total' }),
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'delivery',
          label: { th: 'การรับสินค้า', en: 'Delivery' },
          type: 'select',
          required: true,
          defaultValue: 'pickup',
          options: [
            { label: { th: 'รับที่ร้าน', en: 'Pick up at shop' }, value: 'pickup' },
            { label: { th: 'ส่งไปรษณีย์', en: 'Ship by post' }, value: 'ship' },
          ],
        },
        {
          name: 'trackingNo',
          label: { th: 'เลขพัสดุ', en: 'Tracking number' },
          type: 'text',
        },
      ],
    },
    {
      name: 'address',
      label: { th: 'ที่อยู่จัดส่ง', en: 'Shipping address' },
      type: 'group',
      admin: { condition: (data) => data?.delivery === 'ship' },
      fields: [
        { name: 'line', label: { th: 'ที่อยู่', en: 'Address' }, type: 'textarea' },
        {
          type: 'row',
          fields: [
            { name: 'district', label: { th: 'อำเภอ/เขต', en: 'District' }, type: 'text' },
            { name: 'province', label: { th: 'จังหวัด', en: 'Province' }, type: 'text' },
            { name: 'postcode', label: { th: 'รหัสไปรษณีย์', en: 'Postcode' }, type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        money('subtotal', { th: 'ค่าสินค้า (บาท)', en: 'Subtotal (THB)' }),
        {
          name: 'shippingFee',
          label: { th: 'ค่าส่ง (บาท)', en: 'Shipping (THB)' },
          type: 'number',
          defaultValue: 0,
          min: 0,
        },
        money('total', { th: 'ยอดรวม (บาท)', en: 'Total (THB)' }),
      ],
    },
    {
      name: 'timeline',
      label: { th: 'ไทม์ไลน์', en: 'Timeline' },
      type: 'array',
      labels: {
        singular: { th: 'เหตุการณ์', en: 'Event' },
        plural: { th: 'ไทม์ไลน์', en: 'Timeline' },
      },
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'at',
              label: { th: 'เวลา', en: 'At' },
              type: 'date',
              required: true,
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
            { name: 'event', label: { th: 'เหตุการณ์', en: 'Event' }, type: 'text', required: true },
            { name: 'by', label: { th: 'โดย', en: 'By' }, type: 'relationship', relationTo: 'users' },
          ],
        },
        { name: 'note', label: { th: 'หมายเหตุ', en: 'Note' }, type: 'text' },
      ],
    },
  ],
}
