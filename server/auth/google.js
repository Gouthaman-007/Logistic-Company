import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'

export const googleStateCookieName = 'haulwise_google_oauth'
export const googleStateLifetimeSeconds = 10 * 60
const googleAuthorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth'
const googleTokenEndpoint = 'https://oauth2.googleapis.com/token'

export function isGoogleOAuthConfigured(config) {
  return Boolean(
    config.clientId &&
      config.clientSecret &&
      config.callbackUrl &&
      config.successRedirectUrl,
  )
}

export function createGoogleOAuthState() {
  const state = randomBytes(32).toString('base64url')
  const nonce = randomBytes(32).toString('base64url')
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  return { state, nonce, codeVerifier, codeChallenge }
}

function isSafeToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function encodeGoogleOAuthState(state) {
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

export function readGoogleOAuthState(request) {
  const cookieHeader = request.headers.cookie

  if (!cookieHeader) {
    return null
  }

  const stateCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${googleStateCookieName}=`))

  if (!stateCookie) {
    return null
  }

  try {
    const state = JSON.parse(
      Buffer.from(
        stateCookie.slice(googleStateCookieName.length + 1),
        'base64url',
      ).toString('utf8'),
    )

    if (
      !isSafeToken(state.state) ||
      !isSafeToken(state.nonce) ||
      !isSafeToken(state.codeVerifier)
    ) {
      return null
    }

    return state
  } catch {
    return null
  }
}

export function matchesGoogleOAuthState(expected, received) {
  if (!isSafeToken(expected) || !isSafeToken(received)) {
    return false
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}

export function createGoogleAuthorizationUrl(config, state) {
  const authorizationUrl = new URL(googleAuthorizationEndpoint)
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    code_challenge: state.codeChallenge,
    code_challenge_method: 'S256',
    nonce: state.nonce,
    prompt: 'select_account',
    redirect_uri: config.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state: state.state,
  }).toString()

  return authorizationUrl.toString()
}

export function setGoogleOAuthStateCookie(response, state) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${googleStateCookieName}=${encodeGoogleOAuthState(state)}; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=${googleStateLifetimeSeconds}${secure}`,
  )
}

export function clearGoogleOAuthStateCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const cookie =
    `${googleStateCookieName}=; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=0${secure}`
  const existingCookies = response.getHeader('Set-Cookie')

  response.setHeader(
    'Set-Cookie',
    existingCookies
      ? [...(Array.isArray(existingCookies) ? existingCookies : [existingCookies]), cookie]
      : cookie,
  )
}

export async function exchangeGoogleCode({
  code,
  codeVerifier,
  config,
  fetchImplementation = fetch,
}) {
  const response = await fetchImplementation(googleTokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: config.callbackUrl,
    }),
  })

  if (!response.ok) {
    throw new Error('Google rejected the authorization code.')
  }

  const tokenResponse = await response.json()

  if (typeof tokenResponse.id_token !== 'string') {
    throw new Error('Google did not return an ID token.')
  }

  return tokenResponse.id_token
}

export async function verifyGoogleIdentity({ idToken, nonce, clientId }) {
  const client = new OAuth2Client(clientId)
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  })
  const payload = ticket.getPayload()

  if (
    !payload ||
    payload.email_verified !== true ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    !matchesGoogleOAuthState(nonce, payload.nonce)
  ) {
    throw new Error('Google ID token claims are invalid.')
  }

  return {
    googleSubject: payload.sub,
    email: payload.email,
    displayName: payload.name || payload.email,
  }
}
