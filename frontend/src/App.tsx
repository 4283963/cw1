import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ACControl from './pages/ACControl'
import VehicleFinder from './pages/VehicleFinder'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ac" element={<ACControl />} />
        <Route path="/finder" element={<VehicleFinder />} />
      </Routes>
    </Layout>
  )
}

export default App
