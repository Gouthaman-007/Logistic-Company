import { useEffect, useState } from 'react'

function AuthScreen({ onAuthenticated, initialError = '' }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const isRegistering = mode === 'register'

  useEffect(() => {
    let isActive = true

    async function loadProviders() {
      try {
        const response = await fetch('/api/auth/providers')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Could not load sign-in providers.')
        }

        if (isActive) {
          setGoogleEnabled(result.data.google)
        }
      } catch (requestError) {
        if (isActive) {
          setError(
            requestError.message || 'Could not connect to the authentication API.',
          )
        }
      }
    }

    loadProviders()

    return () => {
      isActive = false
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `/api/auth/${isRegistering ? 'register' : 'login'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        },
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Could not authenticate.')
      }

      onAuthenticated(result.data)
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to the authentication API.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="brand auth-brand" href="#overview" aria-label="Haulwise home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>haulwise</span>
        </a>
        <p className="auth-eyebrow">LOGISTICS OPERATIONS</p>
        <h1 id="auth-title">
          {isRegistering ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="auth-description">
          {isRegistering
            ? 'Set up an account to access your shipment dashboard.'
            : 'Sign in to continue to your shipment dashboard.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="auth-username">Username</label>
          <input
            autoComplete="username"
            autoFocus
            id="auth-username"
            maxLength={32}
            minLength={3}
            onChange={(event) => setUsername(event.target.value)}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
            placeholder="Your username"
            required
            value={username}
          />
          <label htmlFor="auth-password">Password</label>
          <input
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            id="auth-password"
            maxLength={128}
            minLength={isRegistering ? 12 : undefined}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegistering ? 'At least 12 characters' : 'Your password'}
            required
            type="password"
            value={password}
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? 'Please wait…'
              : isRegistering
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <a className="google-sign-in" href="/api/auth/google">
              <svg aria-hidden="true" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.05 46.98 31.9 46.98 24.55Z" />
                <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
              Continue with Google
            </a>
          </>
        )}

        <p className="auth-mode-switch">
          {isRegistering ? 'Already have an account?' : 'New to Haulwise?'}{' '}
          <button
            onClick={() => {
              setMode(isRegistering ? 'login' : 'register')
              setError('')
            }}
            type="button"
          >
            {isRegistering ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </section>
    </main>
  )
}

export default AuthScreen
