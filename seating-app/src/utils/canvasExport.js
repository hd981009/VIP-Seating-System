import { colorForUnit } from './colors'

// 將單一桌次手繪成 Canvas 並下載為 PNG
export function exportTableAsImage(table, guestsById, showTitles) {
  const size = 900
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 背景
  ctx.fillStyle = '#FFFDF8'
  ctx.fillRect(0, 0, size, size)

  const center = size / 2
  const tableRadius = 190
  const seatRadius = 46
  const orbit = tableRadius + seatRadius + 34

  // 桌面
  ctx.beginPath()
  ctx.arc(center, center, tableRadius, 0, Math.PI * 2)
  ctx.fillStyle = '#7A1F2B'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = '#D4A94C'
  ctx.stroke()

  // 桌名
  ctx.fillStyle = '#F6E7B0'
  ctx.font = 'bold 40px "Noto Sans TC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(table.name, center, center - 14)
  ctx.font = '22px "Noto Sans TC", sans-serif'
  const occupied = table.seats.filter(Boolean).length
  ctx.fillText(`${occupied} / ${table.capacity} 人`, center, center + 26)

  // 座位
  const n = table.capacity
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const x = center + orbit * Math.cos(angle)
    const y = center + orbit * Math.sin(angle)
    const guestId = table.seats[i]
    const guest = guestId ? guestsById.get(guestId) : null

    ctx.beginPath()
    ctx.arc(x, y, seatRadius, 0, Math.PI * 2)
    ctx.fillStyle = guest ? colorForUnit(guest.unit) : '#F0EDE6'
    ctx.fill()

    const hasDiet = guest && guest.diet
    ctx.lineWidth = hasDiet ? 5 : 2
    ctx.strokeStyle = hasDiet ? '#E08A2E' : '#B8AF9E'
    ctx.stroke()

    if (guest && guest.attending === false) {
      ctx.fillStyle = 'rgba(120,120,120,0.55)'
      ctx.beginPath()
      ctx.arc(x, y, seatRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#2B2118'
    ctx.font = 'bold 15px "Noto Sans TC", sans-serif'
    if (guest) {
      const nameLines = wrapText(ctx, guest.name, seatRadius * 1.7)
      let ty = y - (showTitles && guest.title ? 8 : 0)
      nameLines.forEach((line, idx) => {
        ctx.fillText(line, x, ty + idx * 17)
      })
      if (showTitles && guest.title) {
        ctx.font = '12px "Noto Sans TC", sans-serif'
        ctx.fillText(guest.title, x, y + 18)
      }
    } else {
      ctx.font = '13px "Noto Sans TC", sans-serif'
      ctx.fillStyle = '#8A8272'
      ctx.fillText(`${i + 1}`, x, y)
    }
  }

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${table.name}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return ['']
  if (ctx.measureText(text).width <= maxWidth) return [text]
  // 中文逐字換行
  const lines = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}
