import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/index'
import RegisterPage from './pages/register'
import LoginPage from './pages/login'
import DashboardPage from './pages/dashboard'
import DemoPage from './pages/demo'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </Router>
  )
}

export default App
