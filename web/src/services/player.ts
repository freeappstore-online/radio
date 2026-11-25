import type { RadioStation } from '../types'
import { addToHistory } from './library'
import { clearUnavailable, markUnavailable, offersHttps, streamCandidates } from './availability'
import { countClick } from './radio'

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
// A playing stream that buffers this long, or ends, is reconnected once before giving up.
const STALL_TIMEOUT_MS = 15_000

class StationPlayer {
  private audio = new Audio()
  private listeners: Listener[] = []
  private candidates: string[] = []
  private attempt = 0
  private reconnected = false
  private timer: ReturnType<typeof setTimeout> | undefined
  state: PlayerState = { station: null, isPlaying: false, isLoading: false, error: null, volume: 1 }

  constructor() {
    this.audio.addEventListener('playing', () => {
      clearTimeout(this.timer)
      if (this.state.station) clearUnavailable(this.state.station.id)
      this.set({ isPlaying: true, isLoading: false, error: null })
      this.updateMediaSession()
    })
    this.audio.addEventListener('volumechange', () => this.set({ volume: this.audio.volume }))
    this.audio.addEventListener('pause', () => this.set({ isPlaying: false }))
    this.audio.addEventListener('waiting', () => {
      if (!this.state.isPlaying) return
      this.set({ isLoading: true })
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.reconnect(), STALL_TIMEOUT_MS)
    })
    this.audio.addEventListener('ended', () => this.reconnect())
    this.audio.addEventListener('error', () => {
      if (this.audio.getAttribute('src')) this.tryNext()
    })

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume())
      navigator.mediaSession.setActionHandler('pause', () => this.pause())
      navigator.mediaSession.setActionHandler('stop', () => this.stop())
    }
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
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = !this.state.station ? 'none' : this.state.isPlaying ? 'playing' : 'paused'
    }
    this.listeners.forEach(fn => fn(this.state))
  }

  play(station: RadioStation) {
    addToHistory(station)
    countClick(station)
    this.reconnected = false
    this.connect(station)
  }

  private connect(station: RadioStation) {
    this.candidates = streamCandidates(station)
    this.attempt = -1
    this.set({ station, isLoading: true, isPlaying: false, error: null })
    this.tryNext()
  }

  /** A live stream that ended or stalled: start it again once, then report it unavailable. */
  private reconnect() {
    const station = this.state.station
    if (!station) return
    if (this.reconnected) { this.fail(station); return }
    this.reconnected = true
    this.connect(station)
  }

  private tryNext() {
    clearTimeout(this.timer)
    const station = this.state.station
    if (!station) return
    this.attempt += 1
    const url = this.candidates[this.attempt]
    if (!url) { this.fail(station); return }
    const attempt = this.attempt
    this.timer = setTimeout(() => { if (this.attempt === attempt && !this.state.isPlaying) this.tryNext() }, CONNECT_TIMEOUT_MS)
    this.audio.src = url
    this.audio.play().catch((e: unknown) => {
      // NotAllowedError (autoplay policy) is not a stream fault: leave it paused for the user to retry.
      if (e instanceof DOMException && e.name === 'NotAllowedError') this.cancel()
      // Other failures arrive as the audio 'error' event, which moves on to the next URL.
    })
  }

  private fail(station: RadioStation) {
    this.cancel()
    // Hide it from lists for a while, unless the failure is just this device being offline.
    if (navigator.onLine) markUnavailable(station.id)
    this.set({ error: offersHttps(station) ? 'unavailable' : 'insecure' })
  }

  /** Stop any connection attempt or playback, keeping the station selected. */
  private cancel() {
    clearTimeout(this.timer)
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    this.set({ isPlaying: false, isLoading: false })
  }

  /** Whether a click on play/pause would stop rather than start. */
  get isActive() {
    return this.state.isPlaying || this.state.isLoading
  }

  togglePlayPause() {
    if (this.isActive) this.pause()
    else this.resume()
  }

  /** Start the selected station again; a live stream reconnects rather than resuming a stale buffer. */
  resume() {
    if (this.state.station && !this.isActive) this.play(this.state.station)
  }

  pause() {
    if (this.state.isLoading) this.cancel()
    else this.audio.pause()
  }

  stop() {
    this.cancel()
    this.set({ station: null, error: null })
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.state.station) return
    const art = this.state.station.favicon?.replace(/^http:\/\//, 'https://')
    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.state.station.name,
      artist: this.state.station.source ?? this.state.station.country ?? '',
      artwork: art ? [{ src: art, sizes: '256x256' }] : [],
    })
  }
}

export const player = new StationPlayer()
