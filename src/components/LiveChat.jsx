import { useEffect, useRef, useState } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

export default function LiveChat({
  messages,
  onSend,
  name,
  onNameChange,
  disabled = false,
  compact = false,
  placeholder = 'Say something…',
  nameReadOnly = false,
}) {
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    onSend?.(text)
    setDraft('')
  }

  return (
    <div className={`flex flex-col min-h-0 ${compact ? 'h-56' : 'h-64 sm:h-72'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-[0.24em] text-mute">Chat</p>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange?.(e.target.value)}
          maxLength={24}
          readOnly={nameReadOnly}
          className={`w-28 sm:w-32 px-2 py-1 border border-hairline bg-black text-paper text-[11px] focus:outline-none focus:border-paper ${
            nameReadOnly ? 'opacity-70' : ''
          }`}
          aria-label="Display name"
          placeholder="Name"
        />
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto border border-hairline bg-black/60 px-2.5 py-2 space-y-2"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-mute py-6 text-center">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-xs leading-snug">
              <span
                className={
                  m.role === 'host' ? 'text-paper font-medium' : 'text-mute'
                }
              >
                {m.role === 'host' ? 'linturo' : m.name}
              </span>
              <span className="text-mute"> · </span>
              <span className="text-paper/90 break-words">{m.text}</span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          maxLength={280}
          placeholder={disabled ? 'Connect to chat…' : placeholder}
          className="flex-1 min-w-0 px-3 py-2 border border-hairline bg-black text-paper text-sm focus:outline-none focus:border-paper disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="shrink-0 px-3 py-2 border border-hairline text-paper hover:border-paper disabled:opacity-40"
          aria-label="Send"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
