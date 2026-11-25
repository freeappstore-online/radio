import type { RadioStation } from '../types'

// Device-local library: favorites, blocked stations and play history.
const FAVORITES_KEY = 'radio-favorites'
const BLOCKED_KEY = 'radio-blocked'
const HISTORY_KEY = 'radio-history'
const HISTORY_MAX = 50

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ===== Favorites =====

export function getFavorites(): RadioStation[] {
  return read<RadioStation[]>(FAVORITES_KEY, [])
}

export function isFavorite(id: string): boolean {
  return getFavorites().some(s => s.id === id)
}

export function toggleFavorite(station: RadioStation): boolean {
  unblock(station.id)
  const favs = getFavorites()
  const idx = favs.findIndex(s => s.id === station.id)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.unshift(station)
  write(FAVORITES_KEY, favs)
  return idx < 0
}

// ===== Blocked =====

export function getBlocked(): RadioStation[] {
  return read<RadioStation[]>(BLOCKED_KEY, [])
}

export function isBlocked(id: string): boolean {
  return getBlocked().some(s => s.id === id)
}

export function block(station: RadioStation): void {
  write(FAVORITES_KEY, getFavorites().filter(s => s.id !== station.id))
  write(BLOCKED_KEY, [station, ...getBlocked().filter(s => s.id !== station.id)])
}

export function unblock(id: string): void {
  const blocked = getBlocked()
  const next = blocked.filter(s => s.id !== id)
  if (next.length !== blocked.length) write(BLOCKED_KEY, next)
}

// ===== History =====

export type HistoryEntry = { station: RadioStation; playedAt: string }

export function getHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(HISTORY_KEY, [])
}

export function addToHistory(station: RadioStation) {
  const next = getHistory().filter(h => h.station.id !== station.id)
  next.unshift({ station, playedAt: new Date().toISOString() })
  write(HISTORY_KEY, next.slice(0, HISTORY_MAX))
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}
