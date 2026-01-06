import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <h1 className="auth-title">💪 Protein Tracker</h1>

        <form onSubmit={handleAuth} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="password" className="auth-label">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
            />
          </div>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          {message && (
            <div className="auth-message">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="auth-toggle">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="auth-toggle-btn"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
