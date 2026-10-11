/** Sets that belong on /trap instead of the homepage Videos list. */
export const TRAP_VIDEOS = [
  {
    id: 'live-set-1791730231272',
    slug: 'live-oct-11-10-50-am',
    title: 'Live Oct 11, 10:50 AM',
    subtitle: 'Live recording',
    src: 'https://linturomusic.s3.us-west-2.amazonaws.com/live-recordings/set-1791730231272.webm',
    publishedAt: '2026-10-11T15:38:44.017Z',
  },
]

export function isTrapPageVideo(video) {
  if (!video) return false
  if (video.page === 'trap') return true
  return TRAP_VIDEOS.some((item) => item.id === video.id || item.slug === video.slug)
}

export function trapVideoFromHash(hash, list) {
  const raw = (hash || '').replace(/^#/, '').trim().toLowerCase()
  if (!raw) return null
  return (
    list.find(
      (video) =>
        video.slug === raw ||
        String(video.id).toLowerCase() === raw ||
        video.title.toLowerCase().replace(/\s+/g, '-') === raw
    ) || null
  )
}

/** Homepage-excluded sets, then any later recordings published with page "trap". */
export function mergeTrapVideos(published) {
  const extra = (published || []).filter((video) => video.page === 'trap')
  const seen = new Set(TRAP_VIDEOS.map((video) => video.id))
  const srcs = new Set(TRAP_VIDEOS.map((video) => video.src))
  return [
    ...TRAP_VIDEOS,
    ...extra.filter((video) => !seen.has(video.id) && !srcs.has(video.src)),
  ]
}
