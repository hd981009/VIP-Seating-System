import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TableCard from './components/TableCard'
import GuestDetailModal from './components/GuestDetailModal'
import AddGuestModal from './components/AddGuestModal'
import AddTableModal from './components/AddTableModal'
import { parseGuestExcel, exportSeatingToExcel } from './utils/excelIO'
import { exportTableAsImage } from './utils/canvasExport'
import { makeId } from './utils/id'
import { saveState, loadState, clearState } from './utils/storage'

const DEFAULT_CAPACITY = 12

function emptyTable(index, capacity = DEFAULT_CAPACITY) {
  return {
    id: makeId('table'),
    name: `主桌${index}`,
    capacity,
    seats: Array(capacity).fill(null),
  }
}

export default function App() {
  const saved = loadState()

  const [guests, setGuests] = useState(saved?.guests || [])
  const [tables, setTables] = useState(saved?.tables || [emptyTable(1)])
  const [showTitles, setShowTitles] = useState(saved?.showTitles ?? true)
  const [zoom, setZoom] = useState(1)

  const [detailGuestId, setDetailGuestId] = useState(null)
  const [addGuestOpen, setAddGuestOpen] = useState(false)
  const [addTableOpen, setAddTableOpen] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    saveState({ guests, tables, showTitles })
  }, [guests, tables, showTitles])

  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const detailGuest = detailGuestId ? guestsById.get(detailGuestId) || null : null
  const seatedGuestIds = useMemo(
    () => new Set(tables.flatMap((t) => t.seats.filter(Boolean))),
    [tables]
  )

  const seatLabelFor = useCallback(
    (guestId) => {
      for (const t of tables) {
        const idx = t.seats.indexOf(guestId)
        if (idx !== -1) return `${t.name} · 第 ${idx + 1} 位`
      }
      return null
    },
    [tables]
  )

  // ---------- 匯入 / 新增 貴賓 ----------
  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = await parseGuestExcel(file)
      if (parsed.length === 0) {
        alert('沒有解析到任何賓客資料，請確認欄位名稱（單位/頭銜/姓名/飲食習慣/聯絡方式/備註）')
        return
      }
      setGuests((prev) => [...prev, ...parsed.map((g) => ({ ...g, id: makeId('guest') }))])
    } catch (err) {
      console.error(err)
      alert('匯入失敗，請確認檔案格式是否正確')
    }
  }

  const handleAddGuest = (form) => {
    setGuests((prev) => [...prev, { ...form, id: makeId('guest') }])
  }

  // ---------- 出席狀態 ----------
  const toggleAttending = (guestId) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, attending: !g.attending } : g))
    )
  }

  // ---------- 座位拖拉 ----------
  const dragPayload = useRef(null)

  const onDragStartGuest = (e, guest) => {
    dragPayload.current = { type: 'guest', guestId: guest.id }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragStartSeat = (e, tableId, seatIndex, guestId) => {
    dragPayload.current = { type: 'seat', tableId, seatIndex, guestId }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragStartTable = (e, tableId) => {
    // 只有從桌名區塊拖拉才觸發整桌交換；避免點擊座位時誤觸
    dragPayload.current = { type: 'table', tableId }
    e.dataTransfer.effectAllowed = 'move'
  }

  const removeGuestFromAllSeats = (tablesState, guestId) =>
    tablesState.map((t) => ({
      ...t,
      seats: t.seats.map((g) => (g === guestId ? null : g)),
    }))

  const onDropOnSeat = (e, targetTableId, targetSeatIndex) => {
    e.preventDefault()
    e.stopPropagation()
    const payload = dragPayload.current
    dragPayload.current = null
    if (!payload) return

    setTables((prev) => {
      let next = prev.map((t) => ({ ...t, seats: [...t.seats] }))
      const targetTable = next.find((t) => t.id === targetTableId)
      if (!targetTable) return prev
      const targetOccupant = targetTable.seats[targetSeatIndex]

      if (payload.type === 'guest') {
        // 從待排清單拖入：先清除該賓客原有座位（保險），再放入目標
        next = removeGuestFromAllSeats(next, payload.guestId)
        const tt = next.find((t) => t.id === targetTableId)
        // 若目標座位已有人，該人退回待排清單
        tt.seats[targetSeatIndex] = payload.guestId
        return next
      }

      if (payload.type === 'seat') {
        const fromTable = next.find((t) => t.id === payload.tableId)
        if (!fromTable) return prev
        if (fromTable.id === targetTable.id && payload.seatIndex === targetSeatIndex) {
          return prev // 同一格，不動作
        }
        // 交換兩個座位的人（其中一邊可能是空位）
        const movingGuest = fromTable.seats[payload.seatIndex]
        fromTable.seats[payload.seatIndex] = targetOccupant
        targetTable.seats[targetSeatIndex] = movingGuest
        return next
      }

      return prev
    })
  }

  const onDropOnTable = (e, targetTableId) => {
    e.preventDefault()
    e.stopPropagation()
    const payload = dragPayload.current
    dragPayload.current = null
    if (!payload || payload.type !== 'table') return
    if (payload.tableId === targetTableId) return

    setTables((prev) => {
      const next = prev.map((t) => ({ ...t }))
      const a = next.find((t) => t.id === payload.tableId)
      const b = next.find((t) => t.id === targetTableId)
      if (!a || !b) return prev
      // 整桌交換：座位安排（含容量）互換，桌名維持不動
      const tmpSeats = a.seats
      const tmpCapacity = a.capacity
      a.seats = b.seats
      a.capacity = b.capacity
      b.seats = tmpSeats
      b.capacity = tmpCapacity
      return next
    })
  }

  const onDropToPool = (e) => {
    e.preventDefault()
    const payload = dragPayload.current
    dragPayload.current = null
    if (!payload) return
    if (payload.type === 'seat') {
      setTables((prev) =>
        prev.map((t) =>
          t.id === payload.tableId
            ? {
                ...t,
                seats: t.seats.map((g, idx) => (idx === payload.seatIndex ? null : g)),
              }
            : t
        )
      )
    }
  }

  // ---------- 桌次管理 ----------
  const handleAddTable = ({ name, capacity }) => {
    setTables((prev) => [
      ...prev,
      { id: makeId('table'), name, capacity, seats: Array(capacity).fill(null) },
    ])
  }

  const handleDeleteTable = (tableId) => {
    if (!window.confirm('確定要刪除這一桌嗎？桌上賓客將回到待排清單。')) return
    setTables((prev) => prev.filter((t) => t.id !== tableId))
  }

  const handleRenameTable = (table) => {
    const name = window.prompt('輸入新的桌次名稱', table.name)
    if (!name) return
    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, name } : t)))
  }

  // ---------- 詳細資料 Modal ----------
  const handleGuestContextMenu = (guest) => setDetailGuestId(guest.id)

  const handleSaveGuest = (form) => {
    setGuests((prev) => prev.map((g) => (g.id === form.id ? { ...form } : g)))
  }

  const handleDeleteGuest = (guestId) => {
    if (!window.confirm('確定要刪除這位貴賓嗎？此動作無法復原。')) return
    setTables((prev) => removeGuestFromAllSeats(prev, guestId))
    setGuests((prev) => prev.filter((g) => g.id !== guestId))
    setDetailGuestId(null)
  }

  const handleUnseat = (guestId) => {
    setTables((prev) => removeGuestFromAllSeats(prev, guestId))
  }

  // ---------- 匯出 / 重置 ----------
  const handleExportProject = () => {
    const data = JSON.stringify({ guests, tables, showTitles }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '尾牙排位專案.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportProjectClick = () => projectInputRef.current?.click()
  const projectInputRef = useRef(null)
  const handleImportProjectFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.guests && data.tables) {
          setGuests(data.guests)
          setTables(data.tables)
          if (typeof data.showTitles === 'boolean') setShowTitles(data.showTitles)
        } else {
          alert('專案檔格式不正確')
        }
      } catch (err) {
        alert('無法讀取此專案檔')
      }
    }
    reader.readAsText(file)
  }

  const handleExportExcel = () => exportSeatingToExcel(guests, tables)

  const handleExportTableImage = (table) => exportTableAsImage(table, guestsById, showTitles)

  const handleReset = () => {
    if (!window.confirm('確定要重置所有座位安排嗎？賓客名單不會被刪除，只會全部退回待排清單。')) {
      return
    }
    setTables((prev) => prev.map((t) => ({ ...t, seats: Array(t.capacity).fill(null) })))
  }

  const handleClearAll = () => {
    if (!window.confirm('這會清除所有賓客與桌次資料，確定要全部清空嗎？')) return
    clearState()
    setGuests([])
    setTables([emptyTable(1)])
  }

  return (
    <div className="app">
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
      <input
        type="file"
        ref={projectInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportProjectFile}
      />

      <Sidebar
        guests={guests}
        seatedGuestIds={seatedGuestIds}
        onImportClick={handleImportClick}
        onAddGuestClick={() => setAddGuestOpen(true)}
        onExportProject={handleExportProject}
        onExportExcel={handleExportExcel}
        onReset={handleReset}
        onDragStartGuest={onDragStartGuest}
        onDropToPool={onDropToPool}
        onGuestContextMenu={handleGuestContextMenu}
        onToggleAttending={toggleAttending}
        showTitles={showTitles}
        onToggleShowTitles={() => setShowTitles((s) => !s)}
      />

      <main className="canvas-area">
        <div className="canvas-top-bar">
          <button className="primary" onClick={() => setAddTableOpen(true)}>
            ➕ 新增桌次
          </button>
          <button onClick={handleImportProjectClick}>📂 匯入專案</button>
          <button className="danger-outline" onClick={handleClearAll}>
            清空全部資料
          </button>
          <div className="spacer" />
          <span className="stat">
            共 {tables.length} 桌・已排 {seatedGuestIds.size} 人・待排{' '}
            {guests.length - seatedGuestIds.size} 人
          </span>
        </div>

        <div className="canvas-scroll">
          <div
            className="tables-grid"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            {tables.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                guestsById={guestsById}
                showTitles={showTitles}
                onDropOnSeat={onDropOnSeat}
                onDragStartSeat={onDragStartSeat}
                onDropOnTable={onDropOnTable}
                onDragStartTable={onDragStartTable}
                onSeatContextMenu={handleGuestContextMenu}
                onExportImage={handleExportTableImage}
                onDeleteTable={handleDeleteTable}
                onRename={handleRenameTable}
              />
            ))}
          </div>
        </div>

        <div className="zoom-control">
          <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}>－</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}>＋</button>
        </div>
      </main>

      {detailGuest && (
        <GuestDetailModal
          guest={detailGuest}
          seatLabel={seatLabelFor(detailGuest.id)}
          onClose={() => setDetailGuestId(null)}
          onSave={handleSaveGuest}
          onDelete={handleDeleteGuest}
          onUnseat={handleUnseat}
          onToggleAttending={toggleAttending}
        />
      )}

      {addGuestOpen && (
        <AddGuestModal onClose={() => setAddGuestOpen(false)} onAdd={handleAddGuest} />
      )}

      {addTableOpen && (
        <AddTableModal
          defaultName={`主桌${tables.length + 1}`}
          onClose={() => setAddTableOpen(false)}
          onAdd={handleAddTable}
        />
      )}
    </div>
  )
}
