import React, { useState, useMemo } from 'react'
import GuestCard from './GuestCard'
import { colorForUnit } from '../utils/colors'

export default function Sidebar({
  guests,
  seatedGuestIds,
  onImportClick,
  onAddGuestClick,
  onExportProject,
  onExportExcel,
  onReset,
  onDragStartGuest,
  onDropToPool,
  onGuestContextMenu,
  onToggleAttending,
  showTitles,
  onToggleShowTitles,
}) {
  const [tab, setTab] = useState('pending') // pending | attendance
  const [keyword, setKeyword] = useState('')

  const pendingGuests = useMemo(
    () => guests.filter((g) => !seatedGuestIds.has(g.id)),
    [guests, seatedGuestIds]
  )

  const filtered = useMemo(() => {
    const list = tab === 'pending' ? pendingGuests : guests
    if (!keyword.trim()) return list
    const k = keyword.trim().toLowerCase()
    return list.filter(
      (g) => g.name.toLowerCase().includes(k) || (g.unit || '').toLowerCase().includes(k)
    )
  }, [tab, pendingGuests, guests, keyword])

  return (
    <aside
      className="sidebar"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropToPool}
    >
      <div className="sidebar-header">
        <h1>尾牙主桌排位系統</h1>
        <div className="toolbar-buttons">
          <button onClick={onImportClick}>📥 匯入 Excel</button>
          <button onClick={onAddGuestClick}>➕ 新增貴賓</button>
        </div>
        <div className="toolbar-buttons">
          <button onClick={onExportProject}>💾 匯出專案</button>
          <button onClick={onExportExcel}>📊 匯出 Excel</button>
        </div>
        <div className="toolbar-buttons">
          <button className="danger" onClick={onReset}>🔄 重置排位</button>
          <button onClick={onToggleShowTitles}>
            {showTitles ? '🙈 隱藏頭銜' : '👁 顯示頭銜'}
          </button>
        </div>
      </div>

      <div className="sidebar-tabs">
        <button
          className={tab === 'pending' ? 'active' : ''}
          onClick={() => setTab('pending')}
        >
          待排入座 ({pendingGuests.length})
        </button>
        <button
          className={tab === 'attendance' ? 'active' : ''}
          onClick={() => setTab('attendance')}
        >
          出席狀態管理
        </button>
      </div>

      <input
        className="search-box"
        placeholder="搜尋姓名或單位..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <div className="sidebar-list">
        {tab === 'pending' &&
          filtered.map((g) => (
            <GuestCard
              key={g.id}
              guest={g}
              onDragStart={(e) => onDragStartGuest(e, g)}
              onContextMenu={(e) => {
                e.preventDefault()
                onGuestContextMenu(g)
              }}
            />
          ))}

        {tab === 'attendance' &&
          filtered.map((g) => (
            <div
              key={g.id}
              className="attendance-row"
              style={{ background: colorForUnit(g.unit) }}
              onContextMenu={(e) => {
                e.preventDefault()
                onGuestContextMenu(g)
              }}
            >
              <div className="attendance-info">
                <div className="guest-card-name">{g.name}</div>
                <div className="guest-card-title">{g.title}</div>
                {seatedGuestIds.has(g.id) && (
                  <div className="seated-flag">已入座</div>
                )}
              </div>
              <label className="switch" title="出席 / 不出席">
                <input
                  type="checkbox"
                  checked={g.attending}
                  onChange={() => onToggleAttending(g.id)}
                />
                <span className="slider" />
              </label>
            </div>
          ))}

        {filtered.length === 0 && (
          <div className="empty-hint">
            {tab === 'pending' ? '目前沒有待排入座的貴賓' : '尚無資料，請先匯入'}
          </div>
        )}
      </div>
    </aside>
  )
}
