import { createContext, useContext, useRef, type ReactNode } from 'react'
import { player, type PlayerState } from './services/player'
import { usePlayer } from './hooks'
import type { RadioStation } from './types'

type AudioPlayer = PlayerState & {
  audio: React.RefObject<HTMLAudioElement>
  play: (station: RadioStation) => void
  pause: () => void
  stop: () => void
  toggle: () => void
  setVolume: (volume: number) => void
}

const AudioContext = createContext<AudioPlayer | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const audio = useRef(player.element)
  const state = usePlayer()
  return <AudioContext.Provider value={{ ...state, audio, play: station => player.play(station), pause: () => player.pause(), stop: () => player.stop(), toggle: () => player.togglePlayPause(), setVolume: volume => player.setVolume(volume) }}>{children}</AudioContext.Provider>
}

export function useAudioPlayer() {
  const value = useContext(AudioContext)
  if (!value) throw new Error('useAudioPlayer requires AudioProvider')
  return value
}
