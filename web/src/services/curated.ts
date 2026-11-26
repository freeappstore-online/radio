import type { RadioStation } from '../types'
import list from '../data/curated-stations.json'

// Hand-picked stations with verified https streams (public broadcasters, listener-supported and
// independent stations). Re-check data/curated-stations.json when streams move.

type CuratedEntry = {
  id: string
  name: string
  streamUrl: string
  homepage?: string
  favicon?: string
  genre?: string
  country?: string
  countryCode?: string
  language?: string
  codec?: string
  bitrate?: number
  source?: string
}

export const CURATED: RadioStation[] = (list as CuratedEntry[]).map(s => ({
  id: `curated-${s.id}`,
  name: s.name,
  streamUrl: s.streamUrl,
  homepage: s.homepage,
  favicon: s.favicon,
  genre: s.genre,
  tags: s.genre,
  country: s.country,
  countryCode: s.countryCode,
  language: s.language,
  codec: s.codec === 'HLS' ? undefined : s.codec,
  hls: s.codec === 'HLS' || undefined,
  bitrate: s.bitrate,
  source: s.source,
}))

/** Round-robin across networks so a short preview shows a mix rather than one network's channels. */
export function interleaveBySource(stations: RadioStation[]): RadioStation[] {
  const groups = new Map<string, RadioStation[]>()
  for (const s of stations) {
    const key = s.source ?? s.id
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  const queues = [...groups.values()]
  const out: RadioStation[] = []
  for (let i = 0; out.length < stations.length; i++) {
    for (const q of queues) if (q[i]) out.push(q[i])
  }
  return out
}

/** Hand-picked stations whose name, network or tags match the search and genre. */
export function matchCurated(stations: RadioStation[], name: string, genre: string): RadioStation[] {
  const q = name.trim().toLowerCase()
  const g = genre.toLowerCase()
  return stations.filter(s => {
    const tags = (s.tags ?? '').toLowerCase()
    const matchesName = !q || s.name.toLowerCase().includes(q) || (s.source ?? '').toLowerCase().includes(q) || tags.includes(q)
    const matchesGenre = !g || tags.split(',').some(t => t.trim() === g || t.trim().includes(g))
    return matchesName && matchesGenre
  })
}
