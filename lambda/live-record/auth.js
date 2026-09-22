const crypto = require('crypto')

const TOKEN_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function signJwt(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${header}.${body}.${sig}`
}

function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    if (payload.sub !== 'admin') return null
    return payload
  } catch {
    return null
  }
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8')
  const right = Buffer.from(String(b || ''), 'utf8')
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

function loginAdmin({ email, password }) {
  const adminEmail = (
    process.env.ADMIN_EMAIL || 'linturomusic@gmail.com'
  ).trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.LIVE_HOST_KEY || 'linturo'
  const secret = process.env.AUTH_JWT_SECRET || process.env.LIVE_HOST_KEY || 'linturo'

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()
  if (!safeEqual(normalizedEmail, adminEmail)) {
    const err = new Error('Invalid email or password')
    err.statusCode = 401
    throw err
  }
  if (!safeEqual(password, adminPassword)) {
    const err = new Error('Invalid email or password')
    err.statusCode = 401
    throw err
  }

  const now = Math.floor(Date.now() / 1000)
  const accessToken = signJwt(
    {
      sub: 'admin',
      email: normalizedEmail,
      iat: now,
      exp: now + TOKEN_TTL_SEC,
    },
    secret
  )

  return {
    accessToken,
    expiresAt: new Date((now + TOKEN_TTL_SEC) * 1000).toISOString(),
    user: { email: normalizedEmail, role: 'admin' },
  }
}

function assertAuthorized(body) {
  const secret = process.env.AUTH_JWT_SECRET || process.env.LIVE_HOST_KEY || 'linturo'
  const legacyKey = process.env.LIVE_HOST_KEY || 'linturo'

  const token = body?.accessToken || body?.token
  if (token && verifyJwt(token, secret)) return

  if (body?.hostKey && safeEqual(body.hostKey, legacyKey)) return

  const err = new Error('Unauthorized')
  err.statusCode = 401
  throw err
}

module.exports = {
  loginAdmin,
  assertAuthorized,
  verifyJwt,
  TOKEN_TTL_SEC,
}
