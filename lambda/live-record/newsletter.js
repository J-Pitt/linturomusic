const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb')
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2')

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'us-west-2' })
)
const ses = new SESv2Client({ region: process.env.AWS_REGION || 'us-west-2' })
const TABLE = process.env.LIST_TABLE || 'linturo-list'
const FROM = process.env.SES_FROM || 'linturo@linturomusic.com'
const SITE = 'https://linturomusic.com'

function bad(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

function normalizeEmail(raw) {
  const email = String(raw || '').trim().toLowerCase()
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null
  return email
}

function normalizePhone(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

async function put(pk, kind, value) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk, kind, value, createdAt: new Date().toISOString() },
    })
  )
}

async function remove(pk) {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { pk } }))
}

async function allOf(kind) {
  const out = []
  let start
  do {
    const res = await ddb.send(
      new ScanCommand({ TableName: TABLE, ExclusiveStartKey: start })
    )
    for (const item of res.Items || []) {
      if (item.kind === kind && item.value) out.push(item.value)
    }
    start = res.LastEvaluatedKey
  } while (start)
  return out
}

async function subscribe({ email, phone, company }) {
  if (company) return { ok: true, email: false, phone: false }
  const cleanEmail = email ? normalizeEmail(email) : null
  const cleanPhone = phone ? normalizePhone(phone) : null
  if (email && !cleanEmail) throw bad('Enter a valid email.')
  if (phone && !cleanPhone) throw bad('Enter a valid mobile number.')
  if (!cleanEmail && !cleanPhone) throw bad('Add an email, a mobile number, or both.')
  if (cleanEmail) await put(`email:${cleanEmail}`, 'email', cleanEmail)
  if (cleanPhone) await put(`phone:${cleanPhone}`, 'phone', cleanPhone)
  return { ok: true, email: Boolean(cleanEmail), phone: Boolean(cleanPhone) }
}

async function unsubscribe({ email, phone }) {
  const cleanEmail = email ? normalizeEmail(email) : null
  const cleanPhone = phone ? normalizePhone(phone) : null
  if (!cleanEmail && !cleanPhone) throw bad('Enter the email or number to remove.')
  if (cleanEmail) await remove(`email:${cleanEmail}`)
  if (cleanPhone) await remove(`phone:${cleanPhone}`)
  return { ok: true }
}

async function sendOne(to, subject, text) {
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' } },
        },
      },
    })
  )
}

async function announce({ kind, title, url }) {
  const cleanKind = kind === 'video' ? 'video' : kind === 'set' ? 'set' : null
  const cleanTitle = String(title || '').trim().slice(0, 80)
  const link = String(url || '').trim()
  if (!cleanKind || !cleanTitle) throw bad('Choose a set or video and give it a title.')
  let parsed
  try {
    parsed = new URL(link)
  } catch {
    throw bad('The link needs to start with https://')
  }
  if (parsed.protocol !== 'https:') throw bad('The link needs to start with https://')

  const label = cleanKind === 'video' ? 'New video' : 'New set'
  const subject = `${label}: ${cleanTitle}`
  const text = [
    'linturo',
    '',
    `${label}: ${cleanTitle}`,
    link,
    '',
    `Leave this list: ${SITE}/#list`,
  ].join('\n')

  const emails = await allOf('email')
  let sent = 0
  let firstError = null
  for (const to of emails) {
    try {
      await sendOne(to, subject, text)
      sent += 1
    } catch (err) {
      if (!firstError) firstError = err.message || 'Email did not send.'
    }
  }
  if (emails.length && sent === 0) {
    const err = new Error(firstError || 'Email did not send.')
    err.statusCode = 502
    throw err
  }
  return { ok: true, sent, total: emails.length, error: firstError }
}

function smsReady() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
  )
}

async function notifyLive() {
  const phones = await allOf('phone')
  if (!smsReady()) {
    return { ok: true, texted: 0, total: phones.length, smsReady: false }
  }
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  const body = `linturo is live. ${SITE}/live\nReply STOP to opt out.`
  let texted = 0
  let error = null
  for (const to of phones) {
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, From: from, Body: body }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || `Text failed (${res.status})`)
      }
      texted += 1
    } catch (err) {
      if (!error) error = err.message || 'Text did not send.'
    }
  }
  return { ok: true, texted, total: phones.length, smsReady: true, error }
}

async function stopPhone(from) {
  const phone = normalizePhone(from)
  if (phone) await remove(`phone:${phone}`)
}

module.exports = { subscribe, unsubscribe, announce, notifyLive, stopPhone }
