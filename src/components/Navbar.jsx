import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav>
      <Link to="/" className="nav-brand">
        <h2>WorkFlow Pro</h2>
      </Link>

      <div className="nav-links">
        <a href="/#features">Features</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#about">About</a>
      </div>

      <div className="nav-buttons">
        <Link to="/login" className="nav-button nav-login">
          Login
        </Link>

        <Link to="/login" className="nav-button nav-get-started">
          Get Started
        </Link>
      </div>
    </nav>
  )
}

export default Navbar