import React from 'react'
import { colorForUnit } from '../utils/colors'

export default function GuestCard({ guest, onDragStart, onContextMenu, draggable = true }) {
  return (
    <div
      className="guest-card"
      style={{ background: colorForUnit(guest.unit) }}
      draggable={draggable}
      onDragStart={onDragStart}
      onContextMenu={onContextMenu}
      title="拖拉可安排座位・右鍵查看詳細資料"
    >
      <div className="guest-card-name">{guest.name}</div>
      {guest.title && <div className="guest-card-title">{guest.title}</div>}
      {guest.diet && <span className="diet-dot" title={`飲食習慣：${guest.diet}`} />}
    </div>
  )
}
