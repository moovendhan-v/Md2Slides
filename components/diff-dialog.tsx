'use client'

import { useMemo } from 'react'
import { X, GitCommit, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { computeLineDiff } from '@/lib/diff'

export function DiffDialog({
  open,
  path,
  repoFullName,
  oldContent,
  newContent,
  committing,
  onCancel,
  onConfirm,
}: {
  open: boolean
  path: string
  repoFullName: string
  oldContent: string
  newContent: string
  committing: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const diff = useMemo(() => (open ? computeLineDiff(oldContent, newContent) : []), [open, oldContent, newContent])
  const added = useMemo(() => diff.filter((d) => d.type === 'add').length, [diff])
  const removed = useMemo(() => diff.filter((d) => d.type === 'remove').length, [diff])
  const hasChanges = added > 0 || removed > 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl animate-in zoom-in-95">
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-5 bg-card/60">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">Review changes before committing</h2>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{repoFullName}/{path}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-xs font-semibold text-emerald-500">+{added}</span>
            <span className="font-mono text-xs font-semibold text-red-500">-{removed}</span>
            <Button variant="ghost" size="icon" onClick={onCancel} className="size-8">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-card/30 p-4 font-mono text-xs leading-relaxed">
          {!hasChanges ? (
            <p className="text-muted-foreground">No changes since the last sync.</p>
          ) : (
            diff.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === 'add'
                    ? 'whitespace-pre-wrap bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : line.type === 'remove'
                      ? 'whitespace-pre-wrap bg-red-500/10 text-red-500'
                      : 'whitespace-pre-wrap text-muted-foreground'
                }
              >
                <span className="mr-2 inline-block w-3 select-none">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                {line.text || ' '}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={committing}>
            Cancel
          </Button>
          <Button size="sm" className="gap-1.5 font-semibold" onClick={onConfirm} disabled={committing || !hasChanges}>
            {committing ? <RefreshCw className="size-3.5 animate-spin" /> : <GitCommit className="size-3.5" />}
            {committing ? 'Committing...' : 'Commit to GitHub'}
          </Button>
        </div>
      </div>
    </div>
  )
}
