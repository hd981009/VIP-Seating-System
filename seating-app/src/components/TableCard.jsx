import React from 'react'
import { colorForUnit } from '../utils/colors'

export default function TableCard({
  table,
  guestsById,
  showTitles,
  onDropOnSeat,
  onDragStartSeat,
  onDropOnTable,
  onDragStartTable,
  onSeatContextMenu,
  onExportImage,
  onDeleteTable,
  onRename,
}) {
  const occupied = table.seats.filter(Boolean).length
  const size = 340
  const center = size / 2
  const tableRadius = 78
  const seatSize = 58
  const orbit = tableRadius + seatSize / 2 + 26

  return (
    <div className="table-card">
      <div
        className="table-header"
        draggable
        onDragStart={(e) => onDragStartTable(e, table.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropOnTable(e, table.id)}
        title="拖拉可與其他桌交換座位安排"
      >
        <span
          className="table-name"
          onDoubleClick={() => onRename(table)}
          title="雙擊可重新命名"
        >
          {table.name}
        </span>
        <span className="table-count">
          {occupied} / {table.capacity}
        </span>
        <div className="table-header-actions">
          <button title="匯出此桌圖片" onClick={() => onExportImage(table)}>🖼</button>
          <button title="刪除此桌" onClick={() => onDeleteTable(table.id)}>🗑</button>
        </div>
      </div>

      <div
        className="table-round"
        style={{ width: size, height: size }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropOnTable(e, table.id)}
      >
        <div
          className="table-surface"
          style={{
            width: tableRadius * 2,
            height: tableRadius * 2,
            left: center - tableRadius,
            top: center - tableRadius,
          }}
        >
          <span>{table.name}</span>
        </div>

        {table.seats.map((guestId, idx) => {
          const angle = (idx / table.capacity) * Math.PI * 2 - Math.PI / 2
          const x = center + orbit * Math.cos(angle) - seatSize / 2
          const y = center + orbit * Math.sin(angle) - seatSize / 2
          const guest = guestId ? guestsById.get(guestId) : null
          const hasDiet = guest && guest.diet
          const isAbsent = guest && guest.attending === false

          return (
            <div
              key={idx}
              className={`seat ${guest ? 'occupied' : 'empty'} ${hasDiet ? 'diet' : ''} ${
                isAbsent ? 'absent' : ''
              }`}
              style={{
                width: seatSize,
                height: seatSize,
                left: x,
                top: y,
                background: guest ? colorForUnit(guest.unit) : undefined,
              }}
              draggable={!!guest}
              onDragStart={(e) => guest && onDragStartSeat(e, table.id, idx, guest.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropOnSeat(e, table.id, idx)}
              onContextMenu={(e) => {
                if (!guest) return
                e.preventDefault()
                e.stopPropagation()
                onSeatContextMenu(guest)
              }}
              title={guest ? `${guest.name} ${guest.title || ''}` : `座位 ${idx + 1}`}
            >
              {guest ? (
                <>
                  <div className="seat-name">{guest.name}</div>
                  {showTitles && guest.title && (
                    <div className="seat-title">{guest.title}</div>
                  )}
                </>
              ) : (
                <div className="seat-index">{idx + 1}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
