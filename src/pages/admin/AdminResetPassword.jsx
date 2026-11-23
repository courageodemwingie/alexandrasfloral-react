
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetAdminPassword } from '../../services/api.js'
import './AdminLogin.css'
import logo from "../../assets/logo/alexandras_floral_logo.webp";

export default function AdminResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('This password reset link is invalid or missing.')
      return
    }

    if (password.length < 12) {
      setError('Your password must contain at least 12 characters.')
      return
    }

    if (password.length > 1024) {
      setError('Your password is too long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await resetAdminPassword(token, password)
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(
        err.message || 'Unable to reset your password. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link to="/" className="admin-login-brand">
  <img src={logo} alt="Alexandra's Floral" />
</Link>

        <p className="admin-login-eyebrow">ADMINISTRATION</p>

        {!success ? (
          <>
            <h1>Reset Password</h1>

            <p className="admin-login-description">
              Create a new password for your administrator account.
            </p>

            {!token && (
              <p className="admin-login-error" role="alert">
                This password reset link is invalid or missing. Please
                request a new one.
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <label htmlFor="new-password">New password</label>

              <div className="admin-password-wrapper">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                  disabled={!token}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-password-toggle"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <label htmlFor="confirm-password">
                Confirm new password
              </label>

              <div className="admin-password-wrapper">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                  disabled={!token}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="admin-password-toggle"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <p className="admin-login-description">
                Your password must contain at least 12 characters.
              </p>

              {error && (
                <p className="admin-login-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="admin-login-submit"
                disabled={submitting || !token}
              >
                {submitting ? 'Resetting password...' : 'Reset password'}
              </button>
            </form>
          </>
        ) : (
          <div className="admin-login-success" role="status">
            <h2>Password reset successful</h2>
            <p>
              Your administrator password has been changed. You can
              now sign in using your new password.
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
