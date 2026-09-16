import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Hero from './components/Hero'
import About from './components/About'
import Contact from './components/Contact'
import Clips from './components/Clips'
import Zoe from './components/Zoe'
import Footer from './components/Footer'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <main>
          <Routes>
            <Route path="/" element={
              <>
                <Hero />
                <About />
                <Contact />
              </>
            } />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/clips" element={<Clips />} />
            <Route path="/zoe" element={<Zoe />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
