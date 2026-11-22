import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import "./AdminLayout.css";
import floralLogo from "../../assets/logo/alexandras_floral_logo.webp";

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const navigation = [
    { label: "Overview", path: "/admin", icon: "⌂", end: true },
    { label: "Products", path: "/admin/products", icon: "✿" },
    { label: "Orders", path: "/admin/orders", icon: "▤" },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src={floralLogo} alt="Alexandra's Floral" />
          <small>ADMINISTRATION</small>
        </div>

        <nav className="admin-sidebar-nav">
          <p className="admin-nav-heading">WORKSPACE</p>

          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
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

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            <span>↗</span> Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            
            <p>Store management</p>
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
