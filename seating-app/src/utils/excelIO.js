import * as XLSX from 'xlsx'

// 讀取 Excel 檔，回傳解析後的賓客陣列
// 支援欄位名稱：單位 / 頭銜 / 姓名 / 飲食習慣 / 聯絡方式 / 備註 / 其他備註
export function parseGuestExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const pick = (row, names) => {
          for (const n of names) {
            if (row[n] !== undefined && row[n] !== null && row[n] !== '') return String(row[n]).trim()
          }
          return ''
        }

        const guests = rows
          .map((row) => ({
            unit: pick(row, ['單位', '公司', '部門']),
            title: pick(row, ['頭銜', '職稱']),
            name: pick(row, ['姓名', '名字']),
            diet: pick(row, ['飲食習慣', '飲食禁忌', '飲食']),
            contact: pick(row, ['聯絡方式', '電話', '手機']),
            note: pick(row, ['其他備註', '備註', '備注']),
            attending: true,
          }))
          .filter((g) => g.name) // 姓名為必要欄位

        resolve(guests)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// 匯出目前排位結果為 Excel（含已排位 + 未排位兩個工作表）
export function exportSeatingToExcel(guests, tables, filename = '尾牙排位表.xlsx') {
  const guestMap = new Map(guests.map((g) => [g.id, g]))
  const seatedRows = []
  tables.forEach((t) => {
    t.seats.forEach((gid, idx) => {
      if (!gid) return
      const g = guestMap.get(gid)
      if (!g) return
      seatedRows.push({
        桌次: t.name,
        座位號: idx + 1,
        單位: g.unit,
        頭銜: g.title,
        姓名: g.name,
        飲食習慣: g.diet,
        聯絡方式: g.contact,
        備註: g.note,
        出席狀態: g.attending ? '出席' : '不出席',
      })
    })
  })

  const seatedIds = new Set(tables.flatMap((t) => t.seats.filter(Boolean)))
  const unseatedRows = guests
    .filter((g) => !seatedIds.has(g.id))
    .map((g) => ({
      單位: g.unit,
      頭銜: g.title,
      姓名: g.name,
      飲食習慣: g.diet,
      聯絡方式: g.contact,
      備註: g.note,
      出席狀態: g.attending ? '出席' : '不出席',
    }))

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(seatedRows)
  const ws2 = XLSX.utils.json_to_sheet(unseatedRows)
  XLSX.utils.book_append_sheet(wb, ws1, '已排位')
  XLSX.utils.book_append_sheet(wb, ws2, '未排位')
  XLSX.writeFile(wb, filename)
}
