import type { RadioStation } from '../types'

interface SomaChannel {
  id: string
  title: string
  genre?: string
  xlimage?: string
  largeimage?: string
  image?: string
  listeners?: number
}

interface SomaResponse {
  channels?: SomaChannel[]
}

export async function getSomaFMChannels(): Promise<RadioStation[]> {
  try {
    const res = await fetch('https://somafm.com/channels.json')
    const data = await res.json() as SomaResponse
    return (data.channels ?? []).map((channel) => {
      const id = channel.id
      return {
        // SomaFM describes its channels as commercial-free: https://somafm.com/support/
        adFree: true,
        id: `soma-${id}`,
        source: 'SomaFM',
        name: channel.title,
        // SomaFM's direct 128k MP3 stream (its .pls playlists point at the same servers).
        streamUrl: `https://ice2.somafm.com/${id}-128-mp3`,
        genre: channel.genre,
        country: 'The United States Of America',
        countryCode: 'US',
        favicon: channel.xlimage || channel.largeimage || channel.image,
        clickcount: channel.listeners || 0,
        tags: channel.genre,
        codec: 'MP3',
        bitrate: 128,
      }
    })
  } catch {
    return []
  }
}
