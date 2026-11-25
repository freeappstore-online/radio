import { useState } from 'react'
import { Radio } from 'lucide-react'

export function Artwork({ src, size }: { src?: string; size: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper-deep ring-1 ring-line"
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <Radio aria-hidden className="h-5 w-5 text-muted" strokeWidth={2} />
      )}
    </div>
  )
}
