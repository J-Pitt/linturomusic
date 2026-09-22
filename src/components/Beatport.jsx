import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import SiteNav from './SiteNav'

const EXTENSION_HREF = '/downloads/linturo-beatport-playlist.zip'
const EXTENSION_VERSION = '1.2.1'

const STEPS = [
  {
    title: 'Download the zip',
    body: 'Grab the Chrome extension from this page. It is a small folder, not an app from the Chrome Web Store.',
  },
  {
    title: 'Unzip it',
    body: 'You should get a folder named linturo-beatport-playlist with a manifest.json file inside.',
  },
  {
    title: 'Load it in Chrome',
    body: 'Open chrome://extensions, turn on Developer mode (top right), click Load unpacked, and choose that folder.',
  },
  {
    title: 'Open Beatport',
    body: 'Log in, then go to a chart, Top 100, genre, release, playlist, or search results page with tracks.',
  },
  {
    title: 'Add the whole page',
    body: 'Click the extension icon. Pick an existing playlist or create one, then hit Add tracks. If the list is still loading, tap Refresh tracks first.',
  },
]

const NOTES = [
  {
    title: 'Pin it in the toolbar',
    body: 'If you do not see it, open Chrome’s puzzle menu, pin Beatport Add Page to Playlist, then click it on a Beatport tab.',
  },
  {
    title: 'One page at a time',
    body: 'It grabs tracks already on the page plus Beatport’s list data. Scroll if needed, then Refresh tracks so the modal is complete.',
  },
  {
    title: 'Your crate, your account',
    body: 'Playlists are created on the Beatport account you are logged into. Share this page so friends can install their own copy.',
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
            Built for crate digging with friends — no store listing, just a zip you load in Chrome.
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
                  <p className="text-xs text-mute mt-0.5">12 tracks found on this page</p>
                </div>
                <span className="text-mute text-lg leading-none">×</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mute mb-2">Playlist</p>
                  <div className="border border-hairline px-3 py-2.5 text-sm text-paper">
                    linturo · september crate
                  </div>
                </div>
                <div className="space-y-1">
                  {['Peak time teal', 'Warehouse pulse', 'Afters haze'].map((track, i) => (
                    <div
                      key={track}
                      className="flex items-center justify-between border border-hairline px-3 py-2 text-sm"
                    >
                      <span className="text-paper">{track}</span>
                      <span className="text-mute text-xs">{124 + i} BPM</span>
                    </div>
                  ))}
                  <p className="text-xs text-mute pt-1">+ 9 more on this page</p>
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
                Chrome will warn that this is an unpacked developer extension. That is expected —
                it is not on the store. Keep it enabled and you are good.
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

          <div className="mt-14 grid sm:grid-cols-3 gap-px bg-hairline border border-hairline">
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
