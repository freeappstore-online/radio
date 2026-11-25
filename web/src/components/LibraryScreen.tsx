import { useState } from 'react'
import { EmptyState, PageHeader } from '@freeappstore/sdk/ui'
import { clearHistory, getBlocked, getFavorites, getHistory, unblock } from '../services/library'
import { StationRow } from './StationRow'

export function LibraryScreen() {
  const [, setVersion] = useState(0)
  const refresh = () => setVersion(v => v + 1)
  const favorites = getFavorites()
  const history = getHistory()
  const blocked = getBlocked()

  return (
    <>
      <PageHeader title="Library" description="Saved on this device." />

      <section className="mt-6" aria-labelledby="fav-heading">
        <h2 id="fav-heading" className="text-lg font-bold text-ink">Favorites ({favorites.length})</h2>
        {favorites.length === 0 ? (
          <EmptyState message="Tap the heart on any station to save it here." />
        ) : (
          <ul className="mt-1">{favorites.map(s => <StationRow key={s.id} station={s} onChange={refresh} />)}</ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="history-heading">
        <div className="flex items-center justify-between">
          <h2 id="history-heading" className="text-lg font-bold text-ink">Recently played</h2>
          {history.length > 0 && (
            <button type="button" onClick={() => { clearHistory(); refresh() }} className="min-h-11 px-2 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
              Clear history
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <EmptyState message="Stations you play will appear here." />
        ) : (
          <ul className="mt-1">{history.map(h => <StationRow key={h.station.id} station={h.station} onChange={refresh} />)}</ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="blocked-heading">
        <h2 id="blocked-heading" className="text-lg font-bold text-ink">Blocked ({blocked.length})</h2>
        {blocked.length === 0 ? (
          <EmptyState message="Blocked stations are hidden from every list." />
        ) : (
          <ul className="mt-1">
            {blocked.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-b-0">
                <span className="truncate text-sm text-ink">{s.name}</span>
                <button type="button" onClick={() => { unblock(s.id); refresh() }} className="min-h-11 rounded-lg px-3 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
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
