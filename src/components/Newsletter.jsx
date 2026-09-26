import { useState } from 'react'
import { announceList, subscribeList, unsubscribeList } from '../lib/newsletter'

const fieldClass =
  'w-full px-3 sm:px-4 py-2.5 border border-hairline bg-black text-paper placeholder:text-mute/50 focus:outline-none focus:border-paper transition-colors text-sm'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [leaving, setLeaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setNote('')
    setError('')
    try {
      if (leaving) {
        await unsubscribeList({ email, phone })
        setNote("You're off the list.")
      } else {
        const result = await subscribeList({ email, phone, company })
        if (result.email && result.phone) {
          setNote("You're on both lists. Email for new sets and videos. A text only when the stream starts.")
        } else if (result.phone) {
          setNote("You'll get a text when linturo goes live.")
        } else {
          setNote("You'll get an email for new sets and videos.")
        }
      }
      setEmail('')
      setPhone('')
    } catch (err) {
      setError(err?.message || 'Could not update the list.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="list" className="py-16 sm:py-20 bg-ink border-t border-hairline scroll-mt-4">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.28em] text-mute mb-4">List</p>
        <h2 className="text-2xl sm:text-3xl font-medium text-paper mb-3">
          {leaving ? 'Leave the list' : 'Hear it first'}
        </h2>
        <p className="text-sm sm:text-base text-mute max-w-xl mb-8">
          {leaving
            ? 'Use the same email or number you signed up with.'
            : 'Email is for a new set or video. A text goes out only when the stream starts.'}
        </p>
        <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
          <label className="block">
            <span className="block text-sm text-mute mb-2">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@email.com"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="block text-sm text-mute mb-2">Mobile, for live only</span>
            <span className="block text-xs text-mute/80 mb-2">Reply STOP to opt out.</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              placeholder="(555) 555-5555"
              className={fieldClass}
            />
          </label>
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2.5 bg-paper text-ink text-sm font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : leaving ? 'Remove me' : 'Join'}
          </button>
          {note ? <p className="text-sm text-paper">{note}</p> : null}
          {error ? <p className="text-sm text-mute">{error}</p> : null}
        </form>
        <button
          type="button"
          onClick={() => {
            setLeaving((value) => !value)
            setNote('')
            setError('')
          }}
          className="mt-6 text-xs uppercase tracking-[0.16em] text-mute hover:text-paper"
        >
          {leaving ? 'Join instead' : 'Leave the list'}
        </button>
      </div>
    </section>
  )
}

export function ListAnnounce({ accessToken }) {
  const [kind, setKind] = useState('set')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('https://linturomusic.com/sets')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function pickKind(next) {
    setKind(next)
    setUrl(next === 'video' ? 'https://linturomusic.com/#videos' : 'https://linturomusic.com/sets')
  }

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setNote('')
    setError('')
    try {
      const result = await announceList({ accessToken, kind, title, url })
      setNote(
        result.total
          ? `Emailed ${result.sent} of ${result.total}.`
          : 'No email addresses on the list yet.'
      )
      setTitle('')
    } catch (err) {
      setError(err?.message || 'The email did not send.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border border-hairline p-4">
      <p className="text-[10px] tracking-[0.18em] text-mute uppercase">Email the list</p>
      <p className="text-xs text-mute leading-relaxed">
        Sets and videos go by email. Texts send on their own when you go live.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => pickKind('set')}
          className={`border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase ${
            kind === 'set' ? 'border-paper text-paper' : 'border-hairline text-mute'
          }`}
        >
          Set
        </button>
        <button
          type="button"
          onClick={() => pickKind('video')}
          className={`border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase ${
            kind === 'video' ? 'border-paper text-paper' : 'border-hairline text-mute'
          }`}
        >
          Video
        </button>
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={kind === 'video' ? 'Video title' : 'Set title'}
        className={fieldClass}
      />
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://"
        className={fieldClass}
      />
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="px-4 py-2.5 border border-paper text-paper text-sm disabled:opacity-40"
      >
        {busy ? 'Sending…' : 'Send email'}
      </button>
      {note ? <p className="text-sm text-paper">{note}</p> : null}
      {error ? <p className="text-sm text-mute">{error}</p> : null}
    </form>
  )
}
