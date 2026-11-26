import type { RadioStation } from '../types'

const FALLBACK_SERVER = 'de1.api.radio-browser.info'

interface RawRadioStation {
  stationuuid: string
  name: string
  url_resolved?: string
  url: string
  tags?: string
  country?: string
  countrycode?: string
  language?: string
  bitrate?: number
  codec?: string
  favicon?: string
  homepage?: string
  votes?: number
  clickcount?: number
  state?: string
  hls?: number
}

export type RadioOrder = 'clickcount' | 'votes' | 'clicktrend' | 'changetimestamp' | 'random'

export type RadioFilters = {
  name?: string
  tag?: string
  country?: string
  language?: string
  bitrateMin?: number
}

// Radio Browser asks clients to discover its mirrors rather than hardcode one.
let servers: Promise<string[]> | undefined
function getServers(): Promise<string[]> {
  servers ??= fetch('https://all.api.radio-browser.info/json/servers')
    .then(r => r.json() as Promise<{ name: string }[]>)
    .then(list => {
      const names = [...new Set(list.map(s => s.name))].sort(() => Math.random() - 0.5)
      return names.length ? names : [FALLBACK_SERVER]
    })
    .catch(() => [FALLBACK_SERVER])
  return servers
}

/** GET a Radio Browser path, trying each mirror in turn. */
async function api<T>(path: string): Promise<T> {
  let lastError: unknown
  for (const server of await getServers()) {
    try {
      const res = await fetch(`https://${server}/json/${path}`)
      if (!res.ok) throw new Error(`Radio directory returned ${res.status}`)
      return await res.json() as T
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

export const PAGE_SIZE = 60

export async function searchStations(filters: RadioFilters, order: RadioOrder = 'clickcount', offset = 0): Promise<RadioStation[]> {
  const params = new URLSearchParams()
  if (filters.name) params.set('name', filters.name)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.country) params.set('country', filters.country)
  if (filters.language) params.set('language', filters.language)
  if (filters.bitrateMin) params.set('bitrateMin', String(filters.bitrateMin))
  params.set('limit', String(PAGE_SIZE))
  params.set('offset', String(offset))
  params.set('order', order)
  params.set('reverse', String(order !== 'random'))
  params.set('hidebroken', 'true')
  const data = await api<RawRadioStation[]>(`stations/search?${params}`)
  return data.map(mapStation)
}

/** Tell Radio Browser a station was played; it uses this for its popularity ranking. */
export function countClick(station: RadioStation) {
  if (!station.id.startsWith('radio-')) return
  api(`url/${encodeURIComponent(station.id.slice('radio-'.length))}`).catch(() => {})
}

function mapStation(station: RawRadioStation): RadioStation {
  return {
    id: `radio-${station.stationuuid}`,
    name: station.name.trim(),
    streamUrl: station.url_resolved || station.url,
    altStreamUrl: station.url_resolved && station.url !== station.url_resolved ? station.url : undefined,
    genre: station.tags,
    country: station.country,
    countryCode: station.countrycode || undefined,
    language: station.language,
    bitrate: station.bitrate || undefined,
    codec: station.codec || undefined,
    favicon: station.favicon || undefined,
    homepage: station.homepage || undefined,
    votes: station.votes || 0,
    clickcount: station.clickcount || 0,
    state: station.state || undefined,
    tags: station.tags || undefined,
    hls: station.hls === 1 || undefined,
  }
}
