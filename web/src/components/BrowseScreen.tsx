import { useEffect, useState } from 'react'
import { PageHeader, Spinner } from '@freeappstore/sdk/ui'
import { searchStations, type RadioFilters, type RadioOrder } from '../services/radio'
import { getSomaFMChannels } from '../services/somafm'
import type { RadioStation } from '../types'
import { StationRow } from './StationRow'

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

const SOMA_PREVIEW = 6

export function BrowseScreen() {
  const [name, setName] = useState('')
  const [genre, setGenre] = useState('')
  const [country, setCountry] = useState('')
  const [language, setLanguage] = useState('')
  const [quality, setQuality] = useState('')
  const [order, setOrder] = useState<RadioOrder>('clickcount')
  const [stations, setStations] = useState<RadioStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [soma, setSoma] = useState<RadioStation[]>([])
  const [showAllSoma, setShowAllSoma] = useState(false)

  const filtered = !!(name.trim() || genre || country || language || quality)

  useEffect(() => { getSomaFMChannels().then(setSoma) }, [])

  useEffect(() => {
    let cancelled = false
    const filters: RadioFilters = {
      name: name.trim() || undefined,
      tag: genre || undefined,
      country: country || undefined,
      language: language || undefined,
      bitrateMin: quality ? Number(quality) : undefined,
    }
    const timer = setTimeout(() => {
      setLoading(true)
      setError(false)
      searchStations(filters, order)
        .then(s => { if (!cancelled) setStations(s) })
        .catch(() => { if (!cancelled) { setStations([]); setError(true) } })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [name, genre, country, language, quality, order, retry])

  const clearAll = () => { setName(''); setGenre(''); setCountry(''); setLanguage(''); setQuality(''); setOrder('clickcount') }

  return (
    <>
      <PageHeader title="Radio" description="30,000+ live stations · 237 countries · 620 languages" />

      <div className="mt-4">
        <label htmlFor="station-search" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Station name</label>
        <input
          id="station-search"
          type="search"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. BBC, jazz, lofi"
          className="w-full rounded-full border border-line bg-panel px-4 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>

      <div className="mt-4 space-y-3">
        <ChipGroup label="Sort by" options={ORDERS} value={order} onChange={v => setOrder((v || 'clickcount') as RadioOrder)} required />
        <ChipGroup label="Quality" options={QUALITIES} value={quality} onChange={setQuality} />
        <ChipGroup label="Genre" options={GENRES} value={genre} onChange={setGenre} />
        <ChipGroup label="Country" options={COUNTRIES} value={country} onChange={setCountry} />
        <ChipGroup label="Language" options={LANGUAGES} value={language} onChange={setLanguage} />
        {filtered && (
          <button type="button" onClick={clearAll} className="min-h-11 rounded-lg px-2 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
            Clear all filters
          </button>
        )}
      </div>

      {!filtered && soma.length > 0 && (
        <section className="mt-6" aria-labelledby="soma-heading">
          <h2 id="soma-heading" className="text-lg font-bold text-ink">Ad-free · SomaFM</h2>
          <ul className="mt-1">
            {(showAllSoma ? soma : soma.slice(0, SOMA_PREVIEW)).map(s => <StationRow key={s.id} station={s} />)}
          </ul>
          {soma.length > SOMA_PREVIEW && (
            <button type="button" onClick={() => setShowAllSoma(!showAllSoma)} className="min-h-11 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
              {showAllSoma ? 'Show fewer' : `Show all ${soma.length} SomaFM channels`}
            </button>
          )}
        </section>
      )}

      <section className="mt-6" aria-labelledby="results-heading" aria-busy={loading}>
        <h2 id="results-heading" className="text-lg font-bold text-ink">{filtered ? 'Results' : 'Popular stations'}</h2>
        {loading ? (
          <div className="flex justify-center py-12" role="status" aria-label="Loading stations"><Spinner /></div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-muted" role="alert">
            Couldn't reach the radio directory.{' '}
            <button type="button" onClick={() => setRetry(r => r + 1)} className="text-accent underline">Try again</button>
          </div>
        ) : stations.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">
            No stations match your filters.{' '}
            <button type="button" onClick={clearAll} className="text-accent underline">Clear all filters</button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">{stations.length} stations</p>
            <ul className="mt-1">{stations.map(s => <StationRow key={s.id} station={s} />)}</ul>
          </>
        )}
      </section>
    </>
  )
}

function ChipGroup({ label, options, value, onChange, required }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {options.map(o => {
          const active = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active && !required ? '' : o.value)}
              className={`min-h-9 flex-shrink-0 rounded-lg px-2.5 text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
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
