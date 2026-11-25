import type { RadioStation } from '../types'
import { addToHistory } from './library'

export type PlayerState = {
  station: RadioStation | null
  isPlaying: boolean
  isLoading: boolean
  error: boolean
}

type Listener = (state: PlayerState) => void

class StationPlayer {
  private audio = new Audio()
  private listeners: Listener[] = []
  state: PlayerState = { station: null, isPlaying: false, isLoading: false, error: false }

  constructor() {
    this.audio.addEventListener('playing', () => {
      this.set({ isPlaying: true, isLoading: false, error: false })
      this.updateMediaSession()
    })
    this.audio.addEventListener('pause', () => this.set({ isPlaying: false }))
    this.audio.addEventListener('waiting', () => this.set({ isLoading: true }))
    this.audio.addEventListener('error', () => {
      if (this.audio.getAttribute('src')) this.set({ isLoading: false, isPlaying: false, error: true })
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
    this.set({ station, isLoading: true, isPlaying: false, error: false })
    this.audio.src = station.streamUrl
    this.audio.play().catch(() => this.set({ isLoading: false, error: true }))
  }

  togglePlayPause() {
    if (!this.state.station) return
    if (this.audio.paused) this.play(this.state.station) // live stream: reconnect instead of resuming stale buffer
    else this.audio.pause()
  }

  pause() {
    this.audio.pause()
  }

  stop() {
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    this.set({ station: null, isPlaying: false, isLoading: false, error: false })
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
