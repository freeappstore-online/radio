import { useSyncExternalStore } from 'react'
import { player, type PlayerState } from './services/player'

export function usePlayer(): PlayerState {
  return useSyncExternalStore(cb => player.subscribe(cb), () => player.state)
}
