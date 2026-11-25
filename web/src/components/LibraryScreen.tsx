import { useRef, useState } from 'react'
import { EmptyState, PageHeader, useToast } from '@freeappstore/sdk/ui'
import { clearHistory, getBlocked, getFavorites, getHistory, unblock, useLibraryVersion } from '../services/library'
import { StationRow } from './StationRow'

export function LibraryScreen() {
  useLibraryVersion()
  const toast = useToast()
  const historyHeading = useRef<HTMLHeadingElement>(null)
  const blockedHeading = useRef<HTMLHeadingElement>(null)
  const [query, setQuery] = useState('')
  const favorites = getFavorites()
  const matches = favorites.filter(s => s.name.toLowerCase().includes(query.trim().toLowerCase()))
  const history = getHistory()
  const blocked = getBlocked()

  return (
    <>
      <PageHeader title="Library" description="Saved on this device." />

      <section className="mt-6" aria-labelledby="fav-heading">
        <h2 id="fav-heading" tabIndex={-1} className="text-lg font-bold text-ink">Favorites ({favorites.length})</h2>
        <label className="mt-3 block text-sm font-semibold" htmlFor="favorite-search">Search favorites</label>
        <input id="favorite-search" type="search" value={query} onChange={e => setQuery(e.target.value)} className="mt-1 min-h-11 w-full max-w-full rounded-lg border border-line bg-panel px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-accent" />
        {favorites.length === 0 ? (
          <EmptyState message="Tap the heart on any station to save it here." />
        ) : (
          matches.length === 0 ? <EmptyState message="No favorites match your search." /> : <ul className="mt-1">{matches.map(s => <StationRow key={s.id} station={s} />)}</ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="history-heading">
        <div className="flex items-center justify-between">
          <h2 id="history-heading" ref={historyHeading} tabIndex={-1} className="text-lg font-bold text-ink">Recently played</h2>
          {history.length > 0 && (
            <button type="button" onClick={() => { clearHistory(); historyHeading.current?.focus(); toast.show('History cleared') }} className="min-h-11 px-2 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
              Clear history
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <EmptyState message="Stations you play will appear here." />
        ) : (
          <ul className="mt-1">{history.map(h => <StationRow key={h.station.id} station={h.station} />)}</ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="blocked-heading">
        <h2 id="blocked-heading" ref={blockedHeading} tabIndex={-1} className="text-lg font-bold text-ink">Blocked ({blocked.length})</h2>
        {blocked.length === 0 ? (
          <EmptyState message="Blocked stations are hidden from every list." />
        ) : (
          <ul className="mt-1">
            {blocked.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-b-0">
                <span className="truncate text-sm text-ink">{s.name}</span>
                <button type="button" onClick={() => { unblock(s.id); blockedHeading.current?.focus(); toast.show(`${s.name} unblocked`) }} className="min-h-11 rounded-lg px-3 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
