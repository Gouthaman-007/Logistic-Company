import { createHash, randomBytes } from 'node:crypto'

export const sessionCookieName = 'haulwise_session'
export const sessionLifetimeSeconds = 60 * 60 * 24 * 7

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function readSessionToken(request) {
  const cookieHeader = request.headers.cookie

  if (!cookieHeader) {
    return null
  }

  const sessionCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${sessionCookieName}=`))

  if (!sessionCookie) {
    return null
  }

  const token = sessionCookie.slice(sessionCookieName.length + 1)

  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}

export function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${sessionLifetimeSeconds}${secure}`,
  )
}

export function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`,
  )
}
