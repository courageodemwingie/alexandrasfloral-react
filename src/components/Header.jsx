
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import logo from '../assets/logo/alexandras_floral_logo.webp'
import './Header.css'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { cartCount } = useCart()

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <Link
        to="/"
        className="header-logo"
        aria-label="Alexandra's Floral home"
        onClick={closeMenu}
      >
        <img
          src={logo}
          alt="Alexandra's Floral"
        />
      </Link>

      <Link
        to="/cart"
        className="header-cart"
        aria-label={`Shopping cart, ${cartCount} items`}
        onClick={closeMenu}
      >
        <svg
          viewBox="0 0 24 24"
          width="23"
          height="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>

        <span className="cart-count">{cartCount}</span>
      </Link>

      <button
        className={`menu-toggle ${menuOpen ? 'is-open' : ''}`}
        type="button"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="site-navigation"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav
        id="site-navigation"
        className={`site-navigation ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <Link to="/" onClick={closeMenu}>HOME</Link>
        <Link to="/shop" onClick={closeMenu}>SHOP</Link>
        <Link to="/journal" onClick={closeMenu}>JOURNAL</Link>
        <Link to="/about" onClick={closeMenu}>ABOUT</Link>
        <Link to="/contact" onClick={closeMenu}>CONTACT US</Link>
      </nav>
    </header>
  )
}

export default Header
