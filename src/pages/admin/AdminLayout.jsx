
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import "./AdminLayout.css";
import floralLogo from "../../assets/logo/alexandras_floral_logo.webp";

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      setMenuOpen(false);
      navigate("/admin/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const navigation = [
    { label: "Overview", path: "/admin", icon: "⌂", end: true },
    { label: "Products", path: "/admin/products", icon: "✿" },
    { label: "Orders", path: "/admin/orders", icon: "▤" },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile drawer backdrop */}
      {menuOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar / mobile navigation drawer */}
      <aside
        id="admin-navigation"
        className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Admin navigation"
      >
        <div className="admin-sidebar-brand">
          <img src={floralLogo} alt="Alexandra's Floral" />
          <small>ADMINISTRATION</small>

          <button
            type="button"
            className="admin-sidebar-close"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <p className="admin-nav-heading">WORKSPACE</p>

          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {(admin?.email || "A").charAt(0).toUpperCase()}
            </div>

            <div className="admin-user-details">
              <strong>Administrator</strong>
              <span>{admin?.email || "Admin account"}</span>
            </div>
          </div>

          <div className="admin-account-actions">
            <a
              href="/"
              className="admin-mobile-store-link"
              onClick={closeMenu}
            >
              View storefront ↗
            </a>

            <button
              type="button"
              className="admin-logout-button"
              onClick={handleLogout}
            >
              <span>↗</span> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button
              type="button"
              className="admin-menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-controls="admin-navigation"
            >
              <span />
              <span />
              <span />
            </button>

            <a href="/" className="admin-mobile-brand">
              <img src={floralLogo} alt="Alexandra's Floral" />
            </a>

            <p className="admin-desktop-heading">Store management</p>
          </div>

          <a href="/" className="admin-store-link">
            View storefront ↗
          </a>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
