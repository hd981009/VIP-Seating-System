import React, { useState } from 'react'

export default function AddTableModal({ onClose, onAdd, defaultName }) {
  const [capacity, setCapacity] = useState(12)
  const [name, setName] = useState(defaultName)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <h2>新增桌次</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-field">
          <label>桌次名稱</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="modal-field">
          <label>座位數</label>
          <div className="capacity-options">
            {[8, 10, 12, 16].map((c) => (
              <button
                key={c}
                className={capacity === c ? 'active' : ''}
                onClick={() => setCapacity(c)}
              >
                {c} 人
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="primary"
            onClick={() => {
              onAdd({ name: name.trim() || defaultName, capacity })
              onClose()
            }}
          >
            新增
          </button>
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
