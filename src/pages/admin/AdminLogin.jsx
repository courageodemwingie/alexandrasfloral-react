import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import "./AdminLogin.css";
import logo from "../../assets/logo/alexandras_floral_logo.webp";

export default function AdminLogin() {
  const { login, isAuthenticated, loading } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="admin-login-loading">Checking session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link to="/" className="admin-login-brand">
          <img src={logo} alt="Alexandra's Floral" />
        </Link>

        <p className="admin-login-eyebrow">ADMINISTRATION</p>
        <h1>Welcome</h1>
        <p className="admin-login-description">Sign in to manage your store.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            required
          />

          <label htmlFor="admin-password">Password</label>
          <div className="admin-password-wrapper">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="admin-password-toggle"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <Link to="/admin/forgot-password" className="admin-forgot-password">
            Forgot your password?
          </Link>

          {error && (
            <p className="admin-login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="admin-login-submit"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <Link to="/" className="admin-back-to-store">
          Return to storefront
        </Link>
      </section>
    </main>
  );
}
