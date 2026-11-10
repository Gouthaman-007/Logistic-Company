import { randomBytes, createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'

export const accessTokenCookieName = 'haulwise_access_token'
export const accessTokenLifetimeSeconds = 60 * 60 * 24 * 7
export const accessTokenIssuer = 'haulwise-api'
export const accessTokenAudience = 'haulwise-client'

export function assertJwtSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be set to a random secret of at least 32 bytes.')
  }
}

export function createAccessToken(userId, secret) {
  assertJwtSecret(secret)

  const jwtId = randomBytes(32).toString('base64url')
  const token = jwt.sign({}, secret, {
    algorithm: 'HS256',
    audience: accessTokenAudience,
    expiresIn: accessTokenLifetimeSeconds,
    issuer: accessTokenIssuer,
    jwtid: jwtId,
    subject: userId.toString(),
  })

  return { token, jwtId }
}

export function verifyAccessToken(token, secret) {
  assertJwtSecret(secret)

  try {
    const claims = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience: accessTokenAudience,
      issuer: accessTokenIssuer,
    })

    if (
      typeof claims === 'string' ||
      typeof claims.sub !== 'string' ||
      typeof claims.jti !== 'string'
    ) {
      return null
    }

    return { userId: claims.sub, jwtId: claims.jti }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return null
    }

    throw error
  }
}

export function hashJwtId(jwtId) {
  return createHash('sha256').update(jwtId).digest('hex')
}

export function readAccessToken(request) {
  const cookieHeader = request.headers.cookie

  if (!cookieHeader) {
    return null
  }

  const accessTokenCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${accessTokenCookieName}=`))

  if (!accessTokenCookie) {
    return null
  }

  const token = accessTokenCookie.slice(accessTokenCookieName.length + 1)

  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
    ? token
    : null
}

export function setAccessTokenCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const cookie =
    `${accessTokenCookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${accessTokenLifetimeSeconds}${secure}`
  const existingCookies = response.getHeader('Set-Cookie')

  response.setHeader(
    'Set-Cookie',
    existingCookies
      ? [...(Array.isArray(existingCookies) ? existingCookies : [existingCookies]), cookie]
      : cookie,
  )
}

export function clearAccessTokenCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${accessTokenCookieName}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`,
  )
}
