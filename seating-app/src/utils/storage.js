const KEY = 'yearend-banquet-seating-v1'

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('無法儲存至 localStorage', e)
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.warn('無法讀取 localStorage', e)
    return null
  }
}

export function clearState() {
  localStorage.removeItem(KEY)
}
