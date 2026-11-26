import { useRef, useState } from 'react'
import { Ban, Heart, Info, Pause, Play } from 'lucide-react'
import type { RadioStation } from '../types'
import { player } from '../services/player'
import { block, isBlocked, isFavorite, toggleFavorite, useLibraryVersion } from '../services/library'
import { addUserTag, getUserTags, removeUserTag } from '../services/usertags'
import { usePlayer } from '../hooks'
import { Artwork } from './Artwork'

const ICON_BUTTON = 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper-deep hover:text-ink focus-visible:outline-2 focus-visible:outline-accent'

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Regional-indicator emoji for an ISO 3166-1 alpha-2 code, e.g. "FR" → 🇫🇷. */
function flag(code?: string): string {
  if (!code || !/^[a-z]{2}$/i.test(code)) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1a5 + c.charCodeAt(0)))
}

/** Move focus to the play button of the neighbouring row, since this row is about to disappear. */
function focusNeighbour(li: HTMLLIElement | null) {
  const next = (li?.nextElementSibling ?? li?.previousElementSibling)?.querySelector<HTMLButtonElement>('button')
  const heading = li?.closest('section')?.querySelector<HTMLElement>('h2')
  requestAnimationFrame(() => (next?.isConnected ? next : heading)?.focus())
}

export function StationRow({ station }: { station: RadioStation }) {
  const ps = usePlayer()
  useLibraryVersion()
  const fav = isFavorite(station.id)
  const blocked = isBlocked(station.id)
  const rowRef = useRef<HTMLLIElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [userTags, setUserTags] = useState(() => getUserTags(station.id))
  const [newTag, setNewTag] = useState('')

  if (blocked) return null

  const current = ps.station?.id === station.id
  const active = current && (ps.isPlaying || ps.isLoading)
  const tags = station.tags?.split(',').map(t => t.trim()).filter(t => t.length > 0 && t.length < 25) ?? []
  const countryFlag = flag(station.countryCode)
  const meta = [
    station.source,
    station.bitrate ? `${station.bitrate} kbps ${station.codec ?? ''}`.trim() : '',
    station.votes ? `${formatCount(station.votes)} votes` : '',
  ].filter(Boolean).join(' · ')

  const addTag = (e: React.FormEvent) => {
    e.preventDefault()
    const tag = newTag.trim().toLowerCase()
    if (!tag) return
    addUserTag(station.id, tag)
    setUserTags(getUserTags(station.id))
    setNewTag('')
  }

  return (
    <li ref={rowRef} className="border-b border-line last:border-b-0">
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          onClick={() => (current ? player.togglePlayPause() : player.play(station))}
          aria-label={`${active ? 'Pause' : 'Play'} ${station.name}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-paper-deep focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="relative">
            <Artwork src={station.favicon} size={48} />
            <span aria-hidden className="absolute inset-0 flex items-center justify-center rounded-lg bg-scrim text-white opacity-0 hover:opacity-100">
              {active ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className={`flex items-center gap-1.5 truncate text-base font-semibold ${current ? 'text-accent' : 'text-ink'}`}>
              <span className="truncate">{station.name}</span>
              {station.adFree === true && (
                <span className="flex-shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent-deep">AD-FREE</span>
              )}
            </span>
            {(meta || station.country) && (
              <span className="mt-0.5 block truncate text-xs text-muted">
                {/* Phones show just the flag (named for screen readers); wider screens show flag and name. */}
                {countryFlag ? (
                  <>
                    <span title={station.country}>{countryFlag}</span>
                    {station.country && <span className="sr-only sm:not-sr-only"> {station.country}</span>}
                  </>
                ) : station.country}
                {(countryFlag || station.country) && meta ? ' · ' : ''}
                {meta}
              </span>
            )}
          </span>
        </button>

        <button type="button" className={ICON_BUTTON} aria-expanded={expanded} aria-label={`Details for ${station.name}`} onClick={() => setExpanded(!expanded)}>
          <Info aria-hidden className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          aria-pressed={fav}
          aria-label={`Favorite ${station.name}`}
          onClick={() => toggleFavorite(station)}
        >
          <Heart aria-hidden className={`h-[18px] w-[18px] ${fav ? 'text-danger' : ''}`} fill={fav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {expanded && (
        <div className="mb-3 space-y-3 rounded-xl border border-line bg-panel p-3 text-xs">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {station.country && <Detail label="Country" value={station.country} />}
            {station.state && <Detail label="State" value={station.state} />}
            {station.language && <Detail label="Language" value={station.language} />}
            {station.codec && <Detail label="Codec" value={station.codec} />}
            {station.bitrate && <Detail label="Bitrate" value={`${station.bitrate} kbps`} />}
            {!!station.clickcount && <Detail label="Listeners" value={formatCount(station.clickcount)} />}
            {!!station.votes && <Detail label="Votes" value={formatCount(station.votes)} />}
          </dl>

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Station tags">
              {tags.slice(0, 15).map(t => <li key={t} className="rounded bg-paper-deep px-1.5 py-0.5 text-muted">{t}</li>)}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-1">
            {userTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-accent-deep">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  className="-my-3 inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-accent"
                  onClick={() => { removeUserTag(station.id, tag); setUserTags(getUserTags(station.id)) }}
                >
                  &times;
                </button>
              </span>
            ))}
            <form onSubmit={addTag} className="inline-flex items-center gap-1">
              <label className="sr-only" htmlFor={`tag-${station.id}`}>Add your own tag</label>
              <input
                id={`tag-${station.id}`}
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add tag, e.g. ad-free"
                className="min-h-11 w-40 max-w-full rounded-full border border-line bg-paper px-3 text-ink focus-visible:outline-2 focus-visible:outline-accent"
              />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-x-4">
            {station.homepage && (
              <a href={station.homepage} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
                Station website
              </a>
            )}
            <button
              type="button"
              aria-label={`Block ${station.name}`}
              onClick={() => {
                if (current) player.stop()
                focusNeighbour(rowRef.current)
                block(station)
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Ban aria-hidden className="h-4 w-4" /> Block station
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline text-muted">{label}: </dt>
      <dd className="inline text-ink">{value}</dd>
    </div>
  )
}
