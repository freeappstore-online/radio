import { useEffect } from 'react'
import { Loader2, Pause, Play, Square } from 'lucide-react'
import { player } from '../services/player'
import { usePlayer } from '../hooks'
import { Artwork } from './Artwork'

const BUTTON = 'flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const INTERACTIVE = 'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"]'

export function PlayerBar() {
  const ps = usePlayer()
  const hasStation = !!ps.station

  // Space toggles playback unless focus is on something that uses Space itself.
  useEffect(() => {
    if (!hasStation) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return
      e.preventDefault()
      player.togglePlayPause()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hasStation])

  // Keep focused rows clear of the fixed bar when tabbing (scroll-padding in index.css keys off this).
  useEffect(() => {
    if (!hasStation) return
    document.documentElement.dataset.player = ''
    return () => { delete document.documentElement.dataset.player }
  }, [hasStation])

  if (!ps.station) return null
  const active = ps.isPlaying || ps.isLoading

  const status = ps.error === 'insecure'
    ? 'This station only streams over insecure HTTP, which browsers block here.'
    : ps.error ? 'Stream unavailable. Try another station.' : ps.isLoading ? 'Connecting…' : ps.isPlaying ? 'Live' : 'Paused'

  return (
    <section aria-label="Now playing" className="fixed inset-x-0 bottom-16 z-40 sm:bottom-0 border-t border-line bg-panel-glass backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 sm:px-8">
        <Artwork src={ps.station.favicon} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{ps.station.name}</div>
          <div className={`text-xs ${ps.error ? 'text-danger' : 'truncate text-muted'}`} role="status">
            {status}
            {ps.error === 'insecure' && ps.station.homepage && (
              <>
                {' '}
                <a href={ps.station.homepage} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  Listen on the station's site
                </a>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className={`${BUTTON} bg-accent text-paper`}
          aria-label={active ? 'Pause' : 'Play'}
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
