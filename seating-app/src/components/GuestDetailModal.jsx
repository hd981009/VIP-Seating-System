import React, { useState, useEffect } from 'react'

export default function GuestDetailModal({ guest, seatLabel, onClose, onSave, onDelete, onUnseat, onToggleAttending }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(guest)

  useEffect(() => {
    setForm(guest)
    setEditing(false)
  }, [guest])

  if (!guest) return null

  const field = (label, key, placeholder = '') =>
    editing ? (
      <div className="modal-field">
        <label>{label}</label>
        <input
          value={form[key] || ''}
          placeholder={placeholder}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      </div>
    ) : (
      <div className="modal-field">
        <label>{label}</label>
        <div className="modal-value">{guest[key] || '－'}</div>
      </div>
    )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <h2>{editing ? '編輯貴賓資料' : '貴賓詳細資料'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {seatLabel && <div className="seat-label-badge">目前座位：{seatLabel}</div>}

        {field('單位', 'unit')}
        {field('頭銜', 'title')}
        {field('姓名', 'name')}
        {field('飲食習慣 / 禁忌', 'diet', '例：素食、不吃牛')}
        {field('聯絡方式', 'contact')}
        {field('其他備註', 'note', '例：19:00 到、20:30 先離席')}

        <div className="modal-field">
          <label>出席狀態</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={guest.attending}
              onChange={() => onToggleAttending(guest.id)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="modal-actions">
          {editing ? (
            <>
              <button
                className="primary"
                onClick={() => {
                  onSave(form)
                  setEditing(false)
                }}
              >
                儲存
              </button>
              <button onClick={() => setEditing(false)}>取消</button>
            </>
          ) : (
            <>
              <button className="primary" onClick={() => setEditing(true)}>
                編輯
              </button>
              {seatLabel && (
                <button onClick={() => onUnseat(guest.id)}>移出座位</button>
              )}
              <button className="danger" onClick={() => onDelete(guest.id)}>
                刪除此貴賓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
