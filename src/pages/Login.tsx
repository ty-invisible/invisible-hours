import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-header rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">IH</span>
          </div>
          <span className="text-xl font-semibold text-text">Invisible Hours</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isSignUp ? 'Create Account' : 'Sign In'}</h2>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <label className="block mb-3">
            <span className="text-sm text-muted mb-1 block">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              required
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-muted mb-1 block">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              required
              minLength={6}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-header text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Loading…' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-muted mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
              className="text-accent hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
