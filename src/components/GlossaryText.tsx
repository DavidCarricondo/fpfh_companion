/**
 * Texto con términos del glosario tocables (spec §7 GlossaryTerm, F1.21).
 */
import * as Popover from '@radix-ui/react-popover'
import { Link } from 'react-router'
import { glossary } from '../content'
import { buildTermIndex, splitGlossaryText } from '../engine/glossary'
import { formatPages } from './format'

const index = buildTermIndex(glossary)

export function GlossaryText({ text }: { text: string }) {
  return (
    <>
      {splitGlossaryText(text).map((seg, i) =>
        'text' in seg ? <span key={i}>{seg.text}</span> : <GlossaryTerm key={i} name={seg.term} />,
      )}
    </>
  )
}

export function GlossaryTerm({ name }: { name: string }) {
  const term = index.get(name.toLowerCase())
  if (!term) return <span>{name}</span>
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline cursor-help font-medium text-sky-300 underline decoration-dotted underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200 shadow-xl"
        >
          <p className="mb-1 font-semibold text-slate-100">
            {term.term} <span className="font-normal text-slate-400">· {formatPages(term.page)}</span>
          </p>
          <p>{term.explanation}</p>
          <Link to={`/glossary#${term.id}`} className="mt-2 inline-block text-sky-400 underline">
            Ver en el glosario
          </Link>
          <Popover.Arrow className="fill-slate-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
