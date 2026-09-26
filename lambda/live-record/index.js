const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})
const BUCKET = process.env.LIVE_BUCKET || 'linturomusic'
const HOST_KEY = process.env.LIVE_HOST_KEY || 'linturo'
const MANIFEST_KEY = 'live-videos.json'
const PRESENCE_KEY = 'live-presence.json'
const PUBLIC_BASE = `https://${BUCKET}.s3.us-west-2.amazonaws.com`

const responseHeaders = {
  'Content-Type': 'application/json',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: responseHeaders,
    body: JSON.stringify(body),
  }
}

const { loginAdmin, assertAuthorized } = require('./auth')
const {
  subscribe,
  unsubscribe,
  announce,
  notifyLive,
  stopPhone,
} = require('./newsletter')

function slugify(title) {
  return String(title || 'live-set')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'live-set'
}

async function readManifest() {
  try {
    const out = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: MANIFEST_KEY })
    )
    const text = await out.Body.transformToString()
    const data = JSON.parse(text)
    return Array.isArray(data?.videos) ? data : { videos: [] }
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      return { videos: [] }
    }
    throw err
  }
}

async function writeManifest(manifest) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: MANIFEST_KEY,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=60',
    })
  )
}

function header(event, name) {
  const headers = event.headers || {}
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name)
  return found ? headers[found] : ''
}

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: responseHeaders, body: '' }
  }

  try {
    const contentType = String(header(event, 'content-type'))
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString()
        : event.body || ''
      const params = new URLSearchParams(raw)
      const msg = String(params.get('Body') || '').trim().toUpperCase()
      if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(msg)) {
        await stopPhone(params.get('From'))
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<Response></Response>',
      }
    }

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {}
    const action = body.action

    if (action === 'subscribe') {
      return json(200, await subscribe(body))
    }

    if (action === 'unsubscribe') {
      return json(200, await unsubscribe(body))
    }

    if (action === 'login') {
      const session = loginAdmin({
        email: body.email,
        password: body.password,
      })
      return json(200, session)
    }

    if (action === 'presign') {
      assertAuthorized(body)
      const id = body.id || `live-${Date.now()}`
      const ext = body.ext === 'mp4' ? 'mp4' : 'webm'
      const contentType = ext === 'mp4' ? 'video/mp4' : 'video/webm'
      const key = `live-recordings/${id}.${ext}`
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      })
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 30 })
      return json(200, {
        id,
        key,
        uploadUrl,
        contentType,
        publicUrl: `${PUBLIC_BASE}/${key}`,
      })
    }

    if (action === 'publish') {
      assertAuthorized(body)
      const { id, key, title, subtitle } = body
      if (!id || !key || !title) {
        return json(400, { error: 'id, key, and title are required' })
      }
      if (!String(key).startsWith('live-recordings/')) {
        return json(400, { error: 'Invalid recording key' })
      }

      const manifest = await readManifest()
      const entry = {
        id: `live-${id}`,
        slug: slugify(title),
        title: String(title).slice(0, 80),
        subtitle: String(subtitle || 'Live recording').slice(0, 120),
        src: `${PUBLIC_BASE}/${key}`,
        publishedAt: new Date().toISOString(),
      }

      manifest.videos = [
        entry,
        ...manifest.videos.filter((v) => v.id !== entry.id && v.src !== entry.src),
      ].slice(0, 24)

      await writeManifest(manifest)
      return json(200, { ok: true, video: entry, videos: manifest.videos })
    }

    if (action === 'presence-set') {
      assertAuthorized(body)
      const live = Boolean(body.live)
      const peerId = live ? String(body.peerId || '').slice(0, 64) : ''
      if (live && !peerId) {
        return json(400, { error: 'peerId required when live' })
      }
      const presence = {
        live,
        peerId: live ? peerId : '',
        updatedAt: new Date().toISOString(),
      }
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: PRESENCE_KEY,
          Body: JSON.stringify(presence),
          ContentType: 'application/json',
          CacheControl: 'public, max-age=5',
        })
      )
      return json(200, { ok: true, presence })
    }

    if (action === 'announce') {
      assertAuthorized(body)
      return json(200, await announce(body))
    }

    if (action === 'notify-live') {
      assertAuthorized(body)
      return json(200, await notifyLive())
    }

    if (action === 'list') {
      const manifest = await readManifest()
      return json(200, manifest)
    }

    return json(400, { error: 'Unknown action' })
  } catch (err) {
    console.error(err)
    return json(err.statusCode || 500, { error: err.message || 'Server error' })
  }
}
