import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import SiteNav from './SiteNav'

const EXTENSION_HREF = '/downloads/linturo-beatport-playlist.zip'
const EXTENSION_VERSION = '1.6.0'

const STEPS = [
  {
    title: 'Download the zip',
    body: 'Use the button on this page. This is an unpacked folder, not a Chrome Web Store listing.',
  },
  {
    title: 'Unzip it',
    body: 'You need the folder, not the zip. On a Mac, double-click it. On Windows, right-click the zip in File Explorer and choose Extract All. Inside you should see linturo-beatport-playlist with manifest.json. If an older copy is already loaded, remove it first.',
  },
  {
    title: 'Load unpacked',
    body: 'Chrome: open chrome://extensions. Edge: open edge://extensions. Turn on Developer mode (top right), click Load unpacked, and choose that unzipped folder — the one that contains manifest.json, not the zip file.',
  },
  {
    title: 'Add a Beatport page',
    body: 'Log in to Beatport, open a chart, Top 100, genre, release, playlist, or search page, then click the extension icon. Pick or create a playlist and click Add tracks. If the list is still loading, tap Refresh tracks first.',
  },
  {
    title: 'Or crate from names / a folder',
    body: 'Paste track names (one per line, Artist - Title preferred) or choose a folder of songs, set how many similar tracks you want (1–250), click Find similar, then add them to a Beatport playlist.',
  },
]

const NOTES = [
  {
    title: 'Windows',
    body: 'Use Chrome or Edge. After Extract All, Load unpacked must point at the folder with manifest.json — if Windows nested another folder, go one level in. Stay logged in to Beatport in that same browser. Firefox will not work.',
  },
  {
    title: 'Pin it in the toolbar',
    body: 'If you do not see the icon, open the puzzle menu in Chrome or Edge, pin Beatport Add Page to Playlist, then click it on a Beatport tab.',
  },
  {
    title: 'Similar is catalog-based',
    body: 'It does not listen to the audio. It uses pasted names, file names, and tags, then Beatport’s catalog (genre, BPM, artist, related). Seeds it cannot identify stay listed. The extension uses your existing Beatport session and does not store your password.',
  },
  {
    title: 'Your crate, your account',
    body: 'Playlists are created on the Beatport account you are logged into. Chrome will warn that this is a developer extension — keep it enabled.',
  },
]

const Beatport = () => {
  const navigate = useNavigate()

  return (
    <section className="min-h-screen bg-ink pb-16">
      <SiteNav />

      <div className="px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-paper transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Home
        </button>

        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-3">Friends · Chrome</p>
          <h1 className="text-2xl sm:text-3xl font-medium text-paper mb-3">Beatport crate</h1>
          <p className="text-sm sm:text-base text-mute max-w-xl leading-relaxed mb-8">
            Dump every track on a Beatport chart, genre, or search page into one of your playlists.
            Or paste track names / pick a folder of songs, choose how many similar tracks to pull from
            Beatport, and add them to a playlist. No store listing — just a zip you load in Chrome or
            Edge on a Mac or Windows PC.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-12">
            <a
              href={EXTENSION_HREF}
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-paper text-ink text-sm font-medium hover:bg-white transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download Chrome extension
            </a>
            <span className="text-xs text-mute">
              v{EXTENSION_VERSION} · unpacked zip · Chrome / Edge
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="border border-hairline bg-black/30">
              <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
                <div>
                  <p className="text-sm text-paper">Add page to playlist</p>
                  <p className="text-xs text-mute mt-0.5">50 tracks found on this page</p>
                </div>
                <span className="text-mute text-lg leading-none">×</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mute mb-2">Playlist</p>
                  <div className="border border-hairline px-3 py-2.5 text-sm text-paper">
                    linturo · deep house
                  </div>
                </div>
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="flex items-center justify-between border border-hairline px-3 py-2 text-sm"
                    >
                      <span className="text-paper">track {n}</span>
                    </div>
                  ))}
                  <p className="text-xs text-mute pt-1">+ 45 more on this page</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-paper text-ink text-sm font-medium py-2.5 text-center">
                    Add tracks
                  </div>
                  <div className="border border-hairline px-3 py-2.5 text-xs text-mute">
                    Refresh
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-paper mb-2">How to use it</h2>
              <p className="text-sm text-mute leading-relaxed mb-6">
                Chrome and Edge will warn that this is an unpacked developer extension. That is
                expected — it is not on the store. Keep it enabled. Same zip on Mac and Windows.
              </p>
              <ol className="space-y-5">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="shrink-0 w-7 text-xs text-mute tabular-nums pt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-sm text-paper mb-1">{step.title}</h3>
                      <p className="text-sm text-mute leading-relaxed">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-hairline border border-hairline">
            {NOTES.map((item) => (
              <div key={item.title} className="bg-ink p-5">
                <h3 className="text-sm text-paper mb-2">{item.title}</h3>
                <p className="text-sm text-mute leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Beatport
