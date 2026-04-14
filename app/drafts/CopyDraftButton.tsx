'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyDraftButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-all"
      style={{
        background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${copied ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}`,
        color: copied ? '#34d399' : '#71717a',
      }}
    >
      {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
