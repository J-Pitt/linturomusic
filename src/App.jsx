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
import Beatport from './components/Beatport'
import FriendsGate from './components/FriendsGate'
import Live from './components/Live'
import Login from './components/Login'
import Footer from './components/Footer'
import SiteNav from './components/SiteNav'
import './App.css'

const BeatsPage = lazy(() => import('./beats/BeatsPage'))

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

function AppShell() {
  const pathname = useLocation().pathname.replace(/(.)\/+$/, '$1')
  const hideFooter =
    pathname === '/live' ||
    pathname === '/login' ||
    pathname === '/beatport' ||
    pathname === '/beats'

  return (
    <div className="App">
      <LegacyDubHash />
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
          <Route path="/login" element={<Login />} />
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
