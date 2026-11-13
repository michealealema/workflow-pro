import Register from './pages/Register'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'

import Navbar from './components/Navbar'
import FeatureCard from './components/FeatureCard'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Profile from './pages/profile'
import Dashboard from './pages/Dashboard'

function Home() {
  const features = [
    {
      title: 'Task Management',
      description:
        'Create, organize, and track tasks so your team knows what to do next.',
      icon: '📋',
    },
    {
      title: 'Team Collaboration',
      description:
        'Keep your team aligned and make it easier to work toward shared goals.',
      icon: '👥',
    },
    {
      title: 'Project Dashboard',
      description:
        'See project status and progress at a glance, all in one place.',
      icon: '📊',
    },
  ]

  return (
    <div className="home-page">
      <Navbar />

      <main className="hero">
        <span className="hero-label">
          Built for modern teams
        </span>

        <h1>
          Manage your work.
          <br />
          Build better teams.
        </h1>

        <p>
          WorkFlow Pro helps teams organize projects, manage tasks,
          and work together efficiently.
        </p>

        <div className="hero-actions">
          <Link to="/login" className="hero-button">
            Get Started
          </Link>
        </div>

        <p className="hero-note">
          Organize your projects. Track your progress. Keep moving forward.
        </p>
      </main>

      <section id="features" className="features">
        <span className="section-label">FEATURES</span>

        <h2>Everything your team needs</h2>

        <p className="section-description">
          Simple tools to help you stay organized and make progress.
        </p>

        <div className="feature-grid">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>
      </section>

      <section className="home-cta">
        <h2>Ready to organize your work?</h2>

        <p>
          Get started with WorkFlow Pro and bring your projects into focus.
        </p>

        <Link to="/login" className="hero-button">
          Get Started
        </Link>
      </section>

      <footer className="home-footer">
        <Link to="/" className="footer-brand">
          WorkFlow Pro
        </Link>

        <p>Plan better. Work smarter. Make progress.</p>

        <span>
          © {new Date().getFullYear()} WorkFlow Pro
        </span>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App