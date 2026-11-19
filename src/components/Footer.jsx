import { Link } from "react-router-dom";
import logo from "../assets/logo/alexandras_floral_logo.webp";
import "./Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src={logo} alt="Alexandra's Floral" />
          </Link>

          <div className="footer-socials" aria-label="Social media">
            <span className="footer-social-icon" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.4L1.8 2h6.4l4.5 6.8L18.9 2Zm-1.1 17.9h1.7L7.3 4H5.5l12.3 15.9Z" />
              </svg>
            </span>

            <span className="footer-social-icon" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.8" r="1" className="social-fill" />
              </svg>
            </span>

            <span className="footer-social-icon" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.2H7.7V13h2.7v8h3.1Z" />
              </svg>
            </span>

            <span className="footer-social-icon" aria-label="TikTok">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.6 7.2c-1.5-.1-2.8-1-3.5-2.3-.3-.5-.4-1.1-.5-1.7h-3.2v13.1c0 1.5-1.2 2.7-2.7 2.7S7 17.8 7 16.3s1.2-2.7 2.7-2.7c.3 0 .6 0 .9.1v-3.3c-.3 0-.6-.1-.9-.1-3.3 0-5.9 2.7-5.9 5.9s2.7 5.9 5.9 5.9 5.9-2.7 5.9-5.9V9.5c1.2.9 2.7 1.4 4.2 1.4V7.7c-.1-.1-.2-.4-.2-.5Z" />
              </svg>
            </span>
          </div>
        </div>

        <div className="footer-column">
          <h3>EXPLORE</h3>
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/bridal-lookbook">Bridal Lookbook</Link>
          <Link to="/journal">Journal</Link>
        </div>

        <div className="footer-column">
          <h3>INFORMATION</h3>
          <Link to="/about">About Us</Link>
          <Link to="/faq">FAQs</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="footer-column footer-contact">
          <h3>GET IN TOUCH</h3>
          <a href="mailto:info@alexandrasfloral.com">
            info@alexandrasfloral.com
          </a>

          <div className="footer-locations">
            <span>OUR LOCATIONS</span>
            <p>Ibadan · Lagos · Abuja</p>
          </div>
        </div>
      </div>

      
<div className="footer-bottom">
  <p>
    <span>© {currentYear} Alexandra's Floral.</span>
    <span>All rights reserved.</span>
  </p>
</div>

    </footer>
  );
}

export default Footer;
