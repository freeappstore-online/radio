import type { RadioStation } from '../types'

// Decides which stations this browser can actually play, so lists only show playable ones.

const FAILED_KEY = 'radio-unavailable'
const FAILED_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PROBE_TIMEOUT_MS = 4_000

/** The station's URLs, upgraded to https (the app is served over https and its CSP allows only https media). */
export function streamCandidates(station: RadioStation): string[] {
  const urls = [station.streamUrl, station.altStreamUrl].filter((u): u is string => !!u)
  return [...new Set(urls.map(u => u.replace(/^http:\/\//i, 'https://')))]
}

export function offersHttps(station: RadioStation): boolean {
  return [station.streamUrl, station.altStreamUrl].some(u => u && /^https:/i.test(u))
}

const CODEC_TYPES: Record<string, string> = {
  'MP3': 'audio/mpeg',
  'AAC': 'audio/aac',
  'AAC+': 'audio/aac',
  'OGG': 'audio/ogg',
  'FLAC': 'audio/flac',
  'MP4': 'audio/mp4',
}

let probeAudio: HTMLAudioElement | undefined
function canPlay(type: string): boolean {
  probeAudio ??= new Audio()
  return probeAudio.canPlayType(type) !== ''
}

/** False when the listed format is one this browser cannot decode. Unknown formats get the benefit of the doubt. */
export function isDecodable(station: RadioStation): boolean {
  if (station.hls) return canPlay('application/vnd.apple.mpegurl') || canPlay('application/x-mpegURL')
  const codec = station.codec?.toUpperCase()
  if (!codec || codec === 'UNKNOWN') return true
  if (codec.includes('H.264') || codec === 'FLV') return false // video, or Flash
  const type = CODEC_TYPES[codec]
  return type ? canPlay(type) : true
}

// ===== Stations that failed to play here =====

function readFailed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(FAILED_KEY) || '{}') } catch { return {} }
}

export function markUnavailable(id: string) {
  const failed = readFailed()
  const now = Date.now()
  for (const [k, t] of Object.entries(failed)) if (now - t > FAILED_TTL_MS) delete failed[k]
  failed[id] = now
  localStorage.setItem(FAILED_KEY, JSON.stringify(failed))
}

export function clearUnavailable(id: string) {
  const failed = readFailed()
  if (id in failed) { delete failed[id]; localStorage.setItem(FAILED_KEY, JSON.stringify(failed)) }
}

function recentlyFailed(id: string): boolean {
  const t = readFailed()[id]
  return t !== undefined && Date.now() - t < FAILED_TTL_MS
}

// ===== https probe for http-only stations =====

const probes = new Map<string, Promise<boolean>>()

/** Whether any https form of the station's URLs answers. An opaque no-cors response is enough: it proves TLS and HTTP work. */
function probeHttps(station: RadioStation): Promise<boolean> {
  let result = probes.get(station.id)
  if (!result) {
    result = Promise.any(streamCandidates(station).map(async url => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
      try {
        await fetch(url, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' })
      } finally {
        clearTimeout(timer)
        ctrl.abort() // stop downloading the stream body
      }
    })).then(() => true, () => false)
    probes.set(station.id, result)
  }
  return result
}

/** Stations ruled out without a network check: a format this browser can't decode, or a recent failure here. */
export function knownUnplayable(station: RadioStation): boolean {
  return !isDecodable(station) || recentlyFailed(station.id)
}

/** Resolves false when an http-only station has no working https form. */
export function isReachable(station: RadioStation): Promise<boolean> {
  return offersHttps(station) ? Promise.resolve(true) : probeHttps(station)
}

/** The stations, in order, minus those this browser can't play. */
export async function filterPlayable(stations: RadioStation[]): Promise<RadioStation[]> {
  const candidates = stations.filter(s => !knownUnplayable(s))
  const reachable = await Promise.all(candidates.map(isReachable))
  return candidates.filter((_, i) => reachable[i])
}
