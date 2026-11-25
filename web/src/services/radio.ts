import type { RadioStation } from '../types'

const BASE = 'https://de1.api.radio-browser.info/json'

interface RawRadioStation {
  stationuuid: string
  name: string
  url_resolved?: string
  url: string
  tags?: string
  country?: string
  language?: string
  bitrate?: number
  codec?: string
  favicon?: string
  homepage?: string
  votes?: number
  clickcount?: number
  state?: string
}

export type RadioOrder = 'clickcount' | 'votes' | 'clicktrend' | 'changetimestamp' | 'random'

export type RadioFilters = {
  name?: string
  tag?: string
  country?: string
  language?: string
  bitrateMin?: number
}

export async function searchStations(filters: RadioFilters, order: RadioOrder = 'clickcount', limit = 60): Promise<RadioStation[]> {
  const params = new URLSearchParams()
  if (filters.name) params.set('name', filters.name)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.country) params.set('country', filters.country)
  if (filters.language) params.set('language', filters.language)
  if (filters.bitrateMin) params.set('bitrateMin', String(filters.bitrateMin))
  params.set('limit', String(limit))
  params.set('order', order)
  params.set('reverse', String(order !== 'random'))
  params.set('hidebroken', 'true')
  const res = await fetch(`${BASE}/stations/search?${params}`)
  if (!res.ok) throw new Error(`Radio directory returned ${res.status}`)
  const data = await res.json() as RawRadioStation[]
  return data.map(mapStation)
}

function mapStation(station: RawRadioStation): RadioStation {
  return {
    id: `radio-${station.stationuuid}`,
    name: station.name,
    streamUrl: station.url_resolved || station.url,
    altStreamUrl: station.url_resolved && station.url !== station.url_resolved ? station.url : undefined,
    genre: station.tags,
    country: station.country,
    language: station.language,
    bitrate: station.bitrate || undefined,
    codec: station.codec || undefined,
    favicon: station.favicon || undefined,
    homepage: station.homepage || undefined,
    votes: station.votes || 0,
    clickcount: station.clickcount || 0,
    state: station.state || undefined,
    tags: station.tags || undefined,
  }
}
