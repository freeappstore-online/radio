export interface RadioStation {
  id: string
  name: string
  streamUrl: string
  /** The station's listed URL when it differs from the resolved streamUrl. */
  altStreamUrl?: string
  genre?: string
  country?: string
  language?: string
  bitrate?: number
  codec?: string
  favicon?: string
  homepage?: string
  votes?: number
  clickcount?: number
  state?: string
  tags?: string
  /** The stream is HLS (an .m3u8 playlist). */
  hls?: boolean
  /** The network a hand-picked station belongs to, e.g. Radio France. */
  source?: string
}
