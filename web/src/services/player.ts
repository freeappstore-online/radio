import type { RadioStation } from '../types'
import { addToHistory } from './library'

/** 'insecure': the station only streams over http://, which an https page may not load. */
export type PlayerError = 'unavailable' | 'insecure'

export type PlayerState = {
  station: RadioStation | null
  isPlaying: boolean
  isLoading: boolean
  error: PlayerError | null
  volume: number
}

type Listener = (state: PlayerState) => void

// A stream that has not started by then is treated as dead and the next URL is tried.
const CONNECT_TIMEOUT_MS = 12_000

/** The station's URLs, upgraded to https (the app is served over https and its CSP allows only https media). */
function streamCandidates(station: RadioStation): string[] {
  const urls = [station.streamUrl, station.altStreamUrl].filter((u): u is string => !!u)
  return [...new Set(urls.map(u => u.replace(/^http:\/\//i, 'https://')))]
}

class StationPlayer {
  private audio = new Audio()
  private listeners: Listener[] = []
  private candidates: string[] = []
  private attempt = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  state: PlayerState = { station: null, isPlaying: false, isLoading: false, error: null, volume: 1 }

  constructor() {
    this.audio.addEventListener('playing', () => {
      clearTimeout(this.timer)
      this.set({ isPlaying: true, isLoading: false, error: null })
      this.updateMediaSession()
    })
    this.audio.addEventListener('volumechange', () => this.set({ volume: this.audio.volume }))
    this.audio.addEventListener('pause', () => this.set({ isPlaying: false }))
    this.audio.addEventListener('waiting', () => this.set({ isLoading: true }))
    this.audio.addEventListener('error', () => {
      if (this.audio.getAttribute('src')) this.tryNext()
    })

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause())
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause())
      navigator.mediaSession.setActionHandler('stop', () => this.stop())
    }

    // Space toggles playback unless focus is on a control that uses it.
    document.addEventListener('keydown', (e) => {
      if (e.key !== ' ' || !this.state.station) return
      if (e.target !== document.body) return
      e.preventDefault()
      this.togglePlayPause()
    })
  }

  get element() { return this.audio }

  setVolume(volume: number) { this.audio.volume = Math.max(0, Math.min(1, volume)) }

  subscribe(fn: Listener) {
    this.listeners.push(fn)
    return () => { this.listeners = this.listeners.filter(l => l !== fn) }
  }

  private set(patch: Partial<PlayerState>) {
    // A new object so useSyncExternalStore sees the change.
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(fn => fn(this.state))
  }

  play(station: RadioStation) {
    addToHistory(station)
    this.candidates = streamCandidates(station)
    this.attempt = -1
    this.set({ station, isLoading: true, isPlaying: false, error: null })
    this.tryNext()
  }

  private tryNext() {
    clearTimeout(this.timer)
    const station = this.state.station
    if (!station) return
    this.attempt += 1
    const url = this.candidates[this.attempt]
    if (!url) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      const insecureOnly = !/^https:/i.test(station.streamUrl) && !/^https:/i.test(station.altStreamUrl ?? '')
      this.set({ isLoading: false, isPlaying: false, error: insecureOnly ? 'insecure' : 'unavailable' })
      return
    }
    const attempt = this.attempt
    this.timer = setTimeout(() => { if (this.attempt === attempt && !this.state.isPlaying) this.tryNext() }, CONNECT_TIMEOUT_MS)
    this.audio.src = url
    this.audio.play().catch((e: unknown) => {
      // NotAllowedError (autoplay policy) is not a stream fault: leave it paused for the user to retry.
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        clearTimeout(this.timer)
        this.set({ isLoading: false })
      }
      // Other failures arrive as the audio 'error' event, which moves on to the next URL.
    })
  }

  togglePlayPause() {
    if (!this.state.station) return
    if (this.audio.paused) this.play(this.state.station) // live stream: reconnect instead of resuming a stale buffer
    else this.audio.pause()
  }

  pause() {
    this.audio.pause()
  }

  stop() {
    clearTimeout(this.timer)
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    this.set({ station: null, isPlaying: false, isLoading: false, error: null })
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.state.station) return
    const art = this.state.station.favicon?.replace(/^http:\/\//, 'https://')
    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.state.station.name,
      artist: this.state.station.country ?? '',
      artwork: art ? [{ src: art, sizes: '256x256' }] : [],
    })
  }
}

export const player = new StationPlayer()
