import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Spinner } from '@freeappstore/sdk/ui'
import { PAGE_SIZE, searchStations, type RadioFilters, type RadioOrder } from '../services/radio'
import { filterPlayable, isReachable, knownUnplayable } from '../services/availability'
import { getSomaFMChannels } from '../services/somafm'
import { CURATED, interleaveBySource, matchCurated } from '../services/curated'
import type { RadioStation } from '../types'
import { StationRow } from './StationRow'
import { isBlocked, useLibraryVersion } from '../services/library'

const GENRES = [
  ['pop', '🎤'], ['rock', '🎸'], ['news', '📰'], ['classical', '🎼'], ['dance', '💃'], ['talk', '🎙️'],
  ['oldies', '📻'], ['jazz', '🎷'], ['christian', '✝️'], ['electronic', '🎧'], ['country', '🤠'],
  ['folk', '🪕'], ['metal', '🤘'], ['soul', '💜'], ['indie', '🎵'], ['ambient', '🌊'], ['sports', '⚽'],
  ['blues', '🎸'], ['funk', '🪩'], ['hiphop', '🎤'], ['reggae', '🌴'], ['punk', '⚡'], ['latin', '💃'],
  ['80s', '🕺'], ['90s', '📼'], ['70s', '🌈'], ['60s', '☮️'],
].map(([value, icon]) => ({ value, label: `${icon} ${value}` }))

const COUNTRIES = [
  ['The United States Of America', 'USA', '🇺🇸'], ['Germany', 'Germany', '🇩🇪'], ['The Russian Federation', 'Russia', '🇷🇺'],
  ['France', 'France', '🇫🇷'], ['Mexico', 'Mexico', '🇲🇽'], ['Greece', 'Greece', '🇬🇷'],
  ['The United Kingdom Of Great Britain And Northern Ireland', 'UK', '🇬🇧'], ['Australia', 'Australia', '🇦🇺'],
  ['China', 'China', '🇨🇳'], ['Italy', 'Italy', '🇮🇹'], ['Canada', 'Canada', '🇨🇦'], ['Brazil', 'Brazil', '🇧🇷'],
  ['Spain', 'Spain', '🇪🇸'], ['The Netherlands', 'Netherlands', '🇳🇱'], ['India', 'India', '🇮🇳'], ['Poland', 'Poland', '🇵🇱'],
  ['Argentina', 'Argentina', '🇦🇷'], ['Japan', 'Japan', '🇯🇵'], ['The Republic Of Korea', 'S. Korea', '🇰🇷'], ['Colombia', 'Colombia', '🇨🇴'],
].map(([value, label, flag]) => ({ value, label: `${flag} ${label}` }))

const LANGUAGES = [
  ['english', '🇬🇧'], ['spanish', '🇪🇸'], ['german', '🇩🇪'], ['french', '🇫🇷'], ['russian', '🇷🇺'], ['italian', '🇮🇹'],
  ['portuguese', '🇧🇷'], ['chinese', '🇨🇳'], ['japanese', '🇯🇵'], ['arabic', '🇸🇦'], ['dutch', '🇳🇱'], ['polish', '🇵🇱'],
  ['greek', '🇬🇷'], ['turkish', '🇹🇷'], ['korean', '🇰🇷'], ['hindi', '🇮🇳'],
].map(([value, flag]) => ({ value, label: `${flag} ${value.charAt(0).toUpperCase()}${value.slice(1)}` }))

const ORDERS: { value: RadioOrder; label: string }[] = [
  { value: 'clickcount', label: 'Popular' },
  { value: 'votes', label: 'Top voted' },
  { value: 'clicktrend', label: 'Trending' },
  { value: 'changetimestamp', label: 'New' },
  { value: 'random', label: 'Random' },
]

const QUALITIES = [
  { value: '128', label: '128+ kbps' },
  { value: '192', label: '192+ kbps' },
  { value: '320', label: '320 kbps (HD)' },
]

const PICKS_PREVIEW = 8

const LINK = 'inline-flex min-h-11 items-center px-1 text-accent underline focus-visible:outline-2 focus-visible:outline-accent'

/** Filters live in the URL query so they survive visiting another screen and coming back. */
function initialParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) ?? ''
}

export function BrowseScreen() {
  const [name, setName] = useState(() => initialParam('q'))
  const [genre, setGenre] = useState(() => initialParam('genre'))
  const [country, setCountry] = useState(() => initialParam('country'))
  const [language, setLanguage] = useState(() => initialParam('lang'))
  const [quality, setQuality] = useState(() => initialParam('quality'))
  const [adFreeOnly, setAdFreeOnly] = useState(() => initialParam('adfree') === '1')
  const [order, setOrder] = useState<RadioOrder>(() => (ORDERS.find(o => o.value === initialParam('sort'))?.value ?? 'clickcount'))
  useLibraryVersion()
  const resultsHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (name) params.set('q', name)
    if (genre) params.set('genre', genre)
    if (country) params.set('country', country)
    if (language) params.set('lang', language)
    if (quality) params.set('quality', quality)
    if (order !== 'clickcount') params.set('sort', order)
    if (adFreeOnly) params.set('adfree', '1')
    const query = params.toString()
    if (window.location.pathname === '/' && window.location.search !== (query ? `?${query}` : '')) {
      window.history.replaceState(window.history.state, '', query ? `/?${query}` : '/')
    }
  }, [name, genre, country, language, quality, order, adFreeOnly])
  const [stations, setStations] = useState<RadioStation[]>([])
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [curated, setCurated] = useState<RadioStation[]>([])
  const [soma, setSoma] = useState<RadioStation[]>([])
  const [somaLoading, setSomaLoading] = useState(true)
  const [showAllPicks, setShowAllPicks] = useState(false)

  const filtered = !!(name.trim() || genre || country || language || quality || adFreeOnly)
  // Ad-free is answered locally from SomaFM, the only source verified ad-free.
  const localOnly = adFreeOnly
  // Filters kept behind the Filters button; the panel starts open if one of them is already set.
  const hiddenActive = [order !== 'clickcount', quality, country, language, adFreeOnly].filter(Boolean).length
  const [showFilters, setShowFilters] = useState(hiddenActive > 0)

  // Hand-picked stations: the curated list plus SomaFM's channels, minus any this browser can't play.
  useEffect(() => {
    filterPlayable(CURATED).then(setCurated)
    getSomaFMChannels().then(filterPlayable).then(setSoma).finally(() => setSomaLoading(false))
  }, [])
  const picks = useMemo(() => interleaveBySource([...soma, ...curated]), [curated, soma])

  // The curated list has no country, language or bitrate index, so it only joins name and genre searches.
  const pickMatches = !country && !language && !quality && !localOnly ? matchCurated(picks, name, genre) : []

  const filters = useMemo<RadioFilters>(() => ({
    name: name.trim() || undefined,
    tag: genre || undefined,
    country: country || undefined,
    language: language || undefined,
    bitrateMin: quality ? Number(quality) : undefined,
  }), [name, genre, country, language, quality])

  // Bumped on every new search; a page that arrives for an older search is dropped.
  const generation = useRef(0)

  /**
   * Fetch one page and append the stations this browser can play. http-only stations are
   * shown straight away and dropped if their https check fails, so the list isn't held up.
   */
  const loadPage = useCallback(async (offset: number, gen: number) => {
    const page = await searchStations(filters, order, offset)
    if (gen !== generation.current) return
    const candidates = page.filter(s => !knownUnplayable(s))
    setStations(prev => {
      const seen = new Set(prev.map(s => s.id))
      return [...prev, ...candidates.filter(s => !seen.has(s.id))]
    })
    setNextOffset(offset + page.length)
    setHasMore(page.length === PAGE_SIZE)
    for (const s of candidates) {
      isReachable(s).then(ok => {
        if (!ok && gen === generation.current) setStations(prev => prev.filter(x => x.id !== s.id))
      })
    }
  }, [filters, order])

  useEffect(() => {
    const gen = ++generation.current
    const timer = setTimeout(() => {
      setLoading(true)
      setError(false)
      setStations([])
      setHasMore(false)
      loadPage(0, gen)
        .catch(() => { if (gen === generation.current) setError(true) })
        .finally(() => { if (gen === generation.current) setLoading(false) })
    }, 300)
    return () => clearTimeout(timer)
  }, [loadPage, retry])

  const matches = (s: RadioStation) =>
    (!name.trim() || s.name.toLowerCase().includes(name.trim().toLowerCase())) &&
    (!genre || (s.tags ?? s.genre ?? '').toLowerCase().includes(genre.toLowerCase())) &&
    (!country || s.country?.toLowerCase() === country.toLowerCase()) &&
    (!language || (s.language ?? '').toLowerCase().includes(language.toLowerCase())) &&
    (!quality || (s.bitrate ?? 0) >= Number(quality))
  const visible = (localOnly ? soma.filter(s => s.adFree === true && matches(s)) : stations).filter(s => !isBlocked(s.id))
  const busy = localOnly ? somaLoading : loading

  const loadMore = () => {
    const gen = generation.current
    setLoadingMore(true)
    loadPage(nextOffset, gen)
      .catch(() => { if (gen === generation.current) setError(true) })
      .finally(() => { if (gen === generation.current) setLoadingMore(false) })
  }

  const clearAll = () => {
    setName(''); setGenre(''); setCountry(''); setLanguage(''); setQuality(''); setOrder('clickcount')
    setAdFreeOnly(false)
    document.getElementById('station-search')?.focus() // the button that was clicked disappears
  }

  return (
    <>
      <h1 className="sr-only">Radio</h1>

      <div className="flex gap-2">
        <label htmlFor="station-search" className="sr-only">Station name</label>
        <input
          id="station-search"
          type="search"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Search stations, e.g. BBC, lofi"
          className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-panel px-4 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
        />
        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls="more-filters"
          onClick={() => setShowFilters(v => !v)}
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${hiddenActive ? 'bg-accent text-paper' : 'border border-line bg-panel text-ink'}`}
        >
          Filters{hiddenActive ? ` (${hiddenActive})` : ''}
        </button>
      </div>

      <ChipGroup label="Genre" options={GENRES} value={genre} onChange={setGenre} scroll />

      {showFilters && (
        <div id="more-filters" className="mt-2 space-y-3 rounded-xl border border-line p-3">
          <button type="button" aria-pressed={adFreeOnly} onClick={() => setAdFreeOnly(v => !v)} className={`min-h-11 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${adFreeOnly ? 'bg-accent font-semibold text-paper' : 'bg-paper-deep text-ink'}`}>Ad-free</button>
          <ChipGroup label="Sort by" options={ORDERS} value={order} onChange={v => setOrder((v || 'clickcount') as RadioOrder)} required />
          <ChipGroup label="Quality" options={QUALITIES} value={quality} onChange={setQuality} />
          <ChipGroup label="Country" options={COUNTRIES} value={country} onChange={setCountry} />
          <ChipGroup label="Language" options={LANGUAGES} value={language} onChange={setLanguage} />
        </div>
      )}

      {filtered && (
        <button type="button" onClick={clearAll} className="min-h-11 rounded-lg px-2 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
          Clear all filters
        </button>
      )}

      {pickMatches.length > 0 && (
        <section className="mt-4" aria-labelledby="picks-heading">
          <h2 id="picks-heading" tabIndex={-1} className="text-lg font-bold text-ink">{filtered ? 'Hand-picked matches' : 'Hand-picked'}</h2>
          <ul className="mt-1">
            {(showAllPicks ? pickMatches : pickMatches.slice(0, PICKS_PREVIEW)).map(s => <StationRow key={s.id} station={s} />)}
          </ul>
          {pickMatches.length > PICKS_PREVIEW && (
            <button type="button" aria-expanded={showAllPicks} onClick={() => setShowAllPicks(!showAllPicks)} className="min-h-11 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
              {showAllPicks ? 'Show fewer' : `Show all ${pickMatches.length} hand-picked stations`}
            </button>
          )}
        </section>
      )}

      <section className="mt-6" aria-labelledby="results-heading" aria-busy={busy}>
        <h2 id="results-heading" ref={resultsHeading} tabIndex={-1} className="text-lg font-bold text-ink">
          {filtered ? 'Results' : `${ORDERS.find(o => o.value === order)?.label ?? 'Popular'} stations`}
        </h2>
        {busy ? (
          <div className="flex justify-center py-12" role="status" aria-label="Loading stations"><Spinner /></div>
        ) : error && !localOnly ? (
          <div className="py-12 text-center text-sm text-muted" role="alert">
            Couldn't reach the radio directory.{' '}
            <button type="button" onClick={() => { setRetry(r => r + 1); resultsHeading.current?.focus() }} className={LINK}>Try again</button>
          </div>
        ) : visible.length === 0 && (localOnly || !hasMore) ? (
          <div className="py-12 text-center text-sm text-muted">
            No stations match your filters.{' '}
            <button type="button" onClick={clearAll} className={LINK}>Clear all filters</button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted" aria-live="polite">{visible.length} stations{hasMore && !localOnly ? ' so far' : ''}</p>
            <ul className="mt-1">{visible.map(s => <StationRow key={s.id} station={s} />)}</ul>
            {hasMore && !localOnly && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="min-h-11 rounded-full border border-line bg-panel px-5 text-sm font-semibold text-ink hover:bg-paper-deep focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more stations'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}

function ChipGroup({ label, options, value, onChange, required, scroll }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  /** One horizontally scrolling row with no visible label, to keep it compact. */
  scroll?: boolean
}) {
  return (
    <div role="group" aria-label={label} className={scroll ? 'mt-3' : undefined}>
      {!scroll && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>}
      <div className={`flex gap-2 pb-1 ${scroll ? '-mx-1 overflow-x-auto px-1 [scrollbar-width:none]' : 'flex-wrap'}`}>
        {options.map(o => {
          const active = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active && !required ? '' : o.value)}
              className={`min-h-11 shrink-0 rounded-lg px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                active ? 'bg-accent font-semibold text-paper' : 'bg-paper-deep text-muted hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
