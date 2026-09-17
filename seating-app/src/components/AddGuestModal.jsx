import React, { useState } from 'react'

const EMPTY = { unit: '', title: '', name: '', diet: '', contact: '', note: '' }

export default function AddGuestModal({ onClose, onAdd }) {
  const [form, setForm] = useState(EMPTY)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = () => {
    if (!form.name.trim()) {
      alert('請輸入姓名')
      return
    }
    onAdd({ ...form, attending: true })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <h2>新增貴賓</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-field">
          <label>單位</label>
          <input value={form.unit} onChange={set('unit')} />
        </div>
        <div className="modal-field">
          <label>頭銜</label>
          <input value={form.title} onChange={set('title')} />
        </div>
        <div className="modal-field">
          <label>姓名 *</label>
          <input value={form.name} onChange={set('name')} />
        </div>
        <div className="modal-field">
          <label>飲食習慣 / 禁忌</label>
          <input value={form.diet} onChange={set('diet')} />
        </div>
        <div className="modal-field">
          <label>聯絡方式</label>
          <input value={form.contact} onChange={set('contact')} />
        </div>
        <div className="modal-field">
          <label>其他備註</label>
          <input value={form.note} onChange={set('note')} />
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={submit}>新增</button>
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
