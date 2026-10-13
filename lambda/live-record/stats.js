const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb')

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'us-west-2' })
)
const TABLE = process.env.STATS_TABLE || 'linturo-stats'
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

function bad(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

function cleanTitle(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

async function ensureItem() {
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          pk: 'site',
          visits: 0,
          days: {},
          mixes: {},
          videos: {},
          titles: {},
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      })
    )
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') throw err
  }
}

async function hitStat({ kind, id, title, newBrowser, seconds: secondsIn }) {
  await ensureItem()
  const now = new Date().toISOString()

  if (kind === 'visit') {
    const day = now.slice(0, 10)
    const names = { '#day': day }
    const values = { ':one': 1, ':now': now }
    let expr = 'ADD visits :one, days.#day :one'
    if (newBrowser === true) expr += ', uniques :one'
    expr += ' SET updatedAt = :now'
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: 'site' },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    )
    return { ok: true }
  }

  if (kind === 'time') {
    let seconds = Math.round(Number(secondsIn) || 0)
    if (!Number.isFinite(seconds) || seconds <= 0) return { ok: true }
    seconds = Math.min(90, seconds)
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: 'site' },
        UpdateExpression: 'ADD timeSec :sec SET updatedAt = :now',
        ExpressionAttributeValues: { ':sec': seconds, ':now': now },
      })
    )
    return { ok: true }
  }

  if (kind !== 'mix' && kind !== 'video') throw bad('Unknown stat')
  const statId = String(id || '')
  if (!ID_RE.test(statId)) throw bad('Invalid id')

  const bucket = kind === 'mix' ? 'mixes' : 'videos'
  const names = {
    '#id': statId,
    '#bucket': bucket,
  }
  const values = { ':one': 1, ':now': now }
  let expr = 'ADD #bucket.#id :one SET updatedAt = :now'
  const clean = cleanTitle(title)
  if (clean) {
    names['#titleKey'] = `${kind}:${statId}`
    values[':title'] = clean
    expr += ', titles.#titleKey = :title'
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk: 'site' },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  )
  return { ok: true }
}

function sumPlays(map) {
  return Object.values(map || {}).reduce((total, n) => total + (Number(n) || 0), 0)
}

function rows(map, titles, kind) {
  return Object.entries(map || {})
    .map(([id, plays]) => ({
      id,
      title: titles?.[`${kind}:${id}`] || id,
      plays: Number(plays) || 0,
    }))
    .sort((a, b) => b.plays - a.plays || a.title.localeCompare(b.title))
}

async function getStats() {
  await ensureItem()
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: 'site' } }))
  const item = res.Item || {}
  const days = Object.entries(item.days || {})
    .map(([date, count]) => ({ date, count: Number(count) || 0 }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)

  const visits = Number(item.visits) || 0
  const timeSec = Number(item.timeSec) || 0
  return {
    visits,
    uniques: Number(item.uniques) || 0,
    timeSec,
    avgTimeSec: visits ? Math.round(timeSec / visits) : 0,
    videoPlays: sumPlays(item.videos),
    mixPlays: sumPlays(item.mixes),
    days,
    mixes: rows(item.mixes, item.titles, 'mix'),
    videos: rows(item.videos, item.titles, 'video'),
    updatedAt: item.updatedAt || null,
  }
}

module.exports = { hitStat, getStats }
