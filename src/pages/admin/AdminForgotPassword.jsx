
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestAdminPasswordReset } from '../../services/api.js'
import './AdminLogin.css'
import logo from '../../assets/logo/alexandras_floral_logo.webp'

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await requestAdminPasswordReset(email.trim())
      setSuccess(true)
    } catch (err) {
      setError(
        err.message || 'Unable to process your request. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link to="/" className="admin-login-brand">
         <img
  src={logo}
  alt="Alexandra's Floral"
/>
        </Link>

        <p className="admin-login-eyebrow">ADMINISTRATION</p>
        <h1>Forgot Password?</h1>

        {!success ? (
          <>
            <p className="admin-login-description">
              Enter the email address associated with your administrator
              account. If an eligible account exists, we'll send you a
              password reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your admin email"
                autoComplete="email"
                required
              />

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
                {submitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <div className="admin-login-success" role="status">
            <h2>Check your email</h2>
            <p>
              If an eligible administrator account exists for that email
              address, a password reset link will be sent shortly.
            </p>
          </div>
        )}

        <Link to="/admin/login" className="admin-back-to-store">
          Back to sign in
        </Link>
      </section>
    </main>
  )
}
