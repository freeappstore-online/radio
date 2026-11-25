import { Loader2, Pause, Play, Square } from 'lucide-react'
import { player } from '../services/player'
import { usePlayer } from '../hooks'
import { Artwork } from './Artwork'

const BUTTON = 'flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function PlayerBar() {
  const ps = usePlayer()
  if (!ps.station) return null

  const status = ps.error ? 'Stream unavailable. Try another station.' : ps.isLoading ? 'Connecting…' : ps.isPlaying ? 'Live' : 'Paused'

  return (
    <section aria-label="Now playing" className="sticky bottom-0 z-40 border-t border-line bg-panel-glass backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 sm:px-8">
        <Artwork src={ps.station.favicon} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{ps.station.name}</div>
          <div className={`truncate text-xs ${ps.error ? 'text-danger' : 'text-muted'}`} role="status">{status}</div>
        </div>
        <button
          type="button"
          className={`${BUTTON} bg-accent text-paper`}
          aria-label={ps.isPlaying ? 'Pause' : 'Play'}
          onClick={() => player.togglePlayPause()}
        >
          {ps.isLoading ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : ps.isPlaying ? <Pause aria-hidden className="h-5 w-5" /> : <Play aria-hidden className="h-5 w-5" />}
        </button>
        <button type="button" className={`${BUTTON} text-muted hover:text-ink`} aria-label="Stop" onClick={() => player.stop()}>
          <Square aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
