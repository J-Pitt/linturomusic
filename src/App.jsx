import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Hero from './components/Hero'
import About from './components/About'
import Contact from './components/Contact'
import Newsletter from './components/Newsletter'
import Clips from './components/Clips'
import Dub from './components/Dub'
import Mixes from './components/Mixes'
import Zoe from './components/Zoe'
import Promo from './components/Promo'
import { config } from './config'
import Beatport from './components/Beatport'
import FriendsGate from './components/FriendsGate'
import Live from './components/Live'
import Stats from './components/Stats'
import Trap from './components/Trap'
import Login from './components/Login'
import Footer from './components/Footer'
import SiteNav from './components/SiteNav'
import { fetchPublishedLiveVideos } from './lib/liveRecord'
import { recordVisit, watchTimeOnSite } from './lib/siteStats'
import { mergeTrapVideos, trapVideoFromHash } from './lib/trapVideos'
import './App.css'

const BeatsPage = lazy(() => import('./beats/BeatsPage'))

const PROMO_HASHES = new Set(['live-oct-mix', 'brickroom', 'brick-room'])

function PromoHashRedirect() {
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (pathname !== '/') return
    const raw = hash.replace(/^#/, '').trim().toLowerCase()
    if (!PROMO_HASHES.has(raw)) return
    navigate('/promo', { replace: true })
  }, [hash, pathname, navigate])

  return null
}

const LEGACY_DUB_HASHES = {
  'deep-dark-dub': 'deep-dark-dub',
  deepdarkdub: 'deep-dark-dub',
  'deep-dark-wubs': 'deep-dark-wubs',
  deepdarkwubs: 'deep-dark-wubs',
}

function LegacyDubHash() {
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (pathname !== '/') return
    const raw = hash.replace(/^#/, '').trim().toLowerCase()
    const slug = LEGACY_DUB_HASHES[raw]
    if (!slug) return
    navigate(`/dub#${slug}`, { replace: true })
  }, [hash, pathname, navigate])

  return null
}

function TrapHashRedirect() {
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (pathname !== '/') return
    const known = trapVideoFromHash(hash, mergeTrapVideos([]))
    if (known) {
      navigate(`/trap#${known.slug}`, { replace: true })
      return
    }
    const raw = hash.replace(/^#/, '').trim()
    if (!raw) return
    let cancelled = false
    fetchPublishedLiveVideos().then((videos) => {
      if (cancelled) return
      const match = trapVideoFromHash(hash, mergeTrapVideos(videos))
      if (match) navigate(`/trap#${match.slug}`, { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [hash, pathname, navigate])

  return null
}

function AppShell() {
  const pathname = useLocation().pathname.replace(/(.)\/+$/, '$1')
  const hideFooter =
    pathname === '/live' ||
    pathname === '/login' ||
    pathname === '/stats' ||
    pathname === '/beatport' ||
    pathname === '/beats'

  useEffect(() => {
    recordVisit()
    return watchTimeOnSite()
  }, [])

  return (
    <div className="App">
      <PromoHashRedirect />
      <LegacyDubHash />
      <TrapHashRedirect />
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <About />
                <Newsletter />
                <Contact />
              </>
            }
          />
          <Route
            path="/about"
            element={
              <>
                <SiteNav />
                <About />
              </>
            }
          />
          <Route
            path="/contact"
            element={
              <>
                <SiteNav />
                <Contact />
              </>
            }
          />
          <Route path="/clips" element={<Clips />} />
          <Route path="/dub" element={<Dub />} />
          <Route path="/sets" element={<Mixes />} />
          <Route path="/zoe" element={<Zoe />} />
          <Route path="/promo" element={<Promo />} />
          <Route
            path="/halloween-sunset"
            element={
              <Promo
                eyebrow="Live set"
                title="Halloween Sunset"
                subtitle="DJ set · 30 min"
                src={config.VIDEO_FILES.HALLOWEEN_SUNSET}
                poster={config.VIDEO_FILES.HALLOWEEN_SUNSET_POSTER}
              />
            }
          />
          <Route
            path="/beatport"
            element={
              <FriendsGate title="Beatport crate">
                <Beatport />
              </FriendsGate>
            }
          />
          <Route
            path="/beats"
            element={
              <Suspense fallback={<div className="min-h-[100dvh] bg-ink" />}>
                <BeatsPage />
              </Suspense>
            }
          />
          <Route path="/live" element={<Live />} />
          <Route
            path="/trap"
            element={
              <FriendsGate title="Trap">
                <Trap />
              </FriendsGate>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}

export default App
