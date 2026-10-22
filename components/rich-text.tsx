import { Fragment } from 'react'

const TOKEN = /(`[^`]+`|https?:\/\/[^\s)]+)/g

/** Teks deskripsi soal: mempertahankan baris, `kode` inline, dan tautan. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(TOKEN)
  return (
    <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code key={i} className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[13px]">
              {part.slice(1, -1)}
            </code>
          )
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              {part}
            </a>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </div>
  )
}
