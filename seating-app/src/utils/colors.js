// 依「單位」自動分配柔和底色，同一單位永遠拿到同一顏色
const PALETTE = [
  '#FDE2E2', '#FDEBD3', '#FCF3CF', '#E4F5D8', '#D6F0EE',
  '#DCEBFC', '#E3DEFB', '#F6DDEE', '#E8E2D8', '#D9F0FA',
  '#F0E0D6', '#DEE9E0',
]

const cache = new Map()

export function colorForUnit(unit) {
  const key = (unit || '未分類').trim() || '未分類'
  if (cache.has(key)) return cache.get(key)
  const color = PALETTE[cache.size % PALETTE.length]
  cache.set(key, color)
  return color
}

export function resetColorCache() {
  cache.clear()
}
