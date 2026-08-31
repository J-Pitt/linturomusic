const BASE = 'https://abacus.jasoncameron.dev'
const NAMESPACE = 'linturomusic.com'
const LIKED_KEY = 'linturo-liked'

export const STAT_IDS = [
  'shadows',
  'downAgain',
  'eternity',
  'theLight',
  'proud',
  'theDeepestHouse',
  'recharge',
  'reflections',
  'beginning',
  'cityStreets',
  'longRoad',
]

const LIKE_ADMIN_KEYS = {
  shadows: 'dcd41f51-1691-4a7a-a2a8-af138f17f6c0',
  downAgain: '837c8661-9111-445d-9652-66103b3147f7',
  eternity: '7586363d-3ada-4609-88db-0847da5fd1d8',
  theLight: '92707cc4-4f32-457b-b5f3-1bacdd24cd63',
  proud: '9fd92acf-8b38-4b69-81ae-eed907754a46',
  theDeepestHouse: '6d8bdc53-ad62-480d-b160-1a1bffa381c9',
  recharge: '3b826a65-4c95-433c-81d6-e4a7f10ae5e1',
  reflections: '31209597-7762-499d-ae98-1770afdf1f2c',
  beginning: '34ae616e-a18f-4a0d-a0a1-10ebe70a52b0',
  cityStreets: '2bd07238-ba7a-4a67-9628-cada4806a390',
}

const emptyStats = () =>
  Object.fromEntries(STAT_IDS.map((id) => [id, { plays: 0, likes: 0 }]))

const playedThisVisit = new Set()

async function readCount(key) {
  try {
    const res = await fetch(`${BASE}/get/${NAMESPACE}/${key}`)
    const data = await res.json()
    const value = Number(data?.value)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

async function hitCount(key) {
  const res = await fetch(`${BASE}/hit/${NAMESPACE}/${key}`)
  const data = await res.json()
  const value = Number(data?.value)
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export async function loadStats() {
  const stats = emptyStats()
  const results = await Promise.all(
    STAT_IDS.flatMap((id) => [
      readCount(`${id}_plays`).then((plays) => ({ id, field: 'plays', value: plays })),
      readCount(`${id}_likes`).then((likes) => ({ id, field: 'likes', value: likes })),
    ]),
  )
  results.forEach(({ id, field, value }) => {
    stats[id][field] = value
  })
  return stats
}

export async function recordPlay(id) {
  if (!STAT_IDS.includes(id) || playedThisVisit.has(id)) return null
  playedThisVisit.add(id)
  try {
    const plays = await hitCount(`${id}_plays`)
    return plays
  } catch {
    playedThisVisit.delete(id)
    return null
  }
}

export function loadLikedIds() {
  try {
    if (typeof localStorage === 'undefined') return new Set()
    const raw = localStorage.getItem(LIKED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveLikedIds(ids) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LIKED_KEY, JSON.stringify([...ids]))
}

export async function toggleLike(id, currentlyLiked) {
  if (!STAT_IDS.includes(id)) return { liked: currentlyLiked, likes: null }

  const liked = loadLikedIds()
  if (currentlyLiked) {
    liked.delete(id)
    saveLikedIds(liked)
    try {
      const adminKey = LIKE_ADMIN_KEYS[id]
      const res = await fetch(
        `${BASE}/update/${NAMESPACE}/${id}_likes?value=-1`,
        { method: 'POST', headers: { Authorization: `Bearer ${adminKey}` } },
      )
      const data = await res.json()
      const likes = Number(data?.value)
      return { liked: false, likes: Number.isFinite(likes) ? Math.max(0, likes) : null }
    } catch {
      return { liked: false, likes: null }
    }
  }

  liked.add(id)
  saveLikedIds(liked)
  try {
    const likes = await hitCount(`${id}_likes`)
    return { liked: true, likes }
  } catch {
    liked.delete(id)
    saveLikedIds(liked)
    return { liked: false, likes: null }
  }
}

export function formatCount(n) {
  const value = Number(n) || 0
  if (value < 1000) return String(value)
  if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${Math.round(value / 1000)}k`
}
