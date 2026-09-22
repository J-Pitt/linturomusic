import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Hero from './components/Hero'
import About from './components/About'
import Contact from './components/Contact'
import Clips from './components/Clips'
import Mixes from './components/Mixes'
import Zoe from './components/Zoe'
import Beatport from './components/Beatport'
import FriendsGate from './components/FriendsGate'
import Live from './components/Live'
import Login from './components/Login'
import Footer from './components/Footer'
import SiteNav from './components/SiteNav'
import './App.css'

function AppShell() {
  const { pathname } = useLocation()
  const hideFooter =
    pathname === '/live' ||
    pathname === '/login' ||
    pathname === '/beatport'

  return (
    <div className="App">
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <About />
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
