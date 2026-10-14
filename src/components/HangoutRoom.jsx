import { useCallback, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { createHandshakeStream, HANGOUT_PEER_ID, LIVE_PEER_OPTIONS } from '../lib/liveConfig'
import { fetchLivePresence } from '../lib/liveRecord'
import {
  isValidDisplayName,
  liveClientId,
  makeChatMessage,
  normalizeDisplayName,
  parseLivePayload,
} from '../lib/liveChat'
import LiveAudienceGrid from './LiveAudienceGrid'
import LiveChat from './LiveChat'

function isPermissionDenied(err) {
  const name = err?.name || ''
  return name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError'
}

function openPeer(id) {
  const peer = id ? new Peer(id, LIVE_PEER_OPTIONS) : new Peer(LIVE_PEER_OPTIONS)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      peer.destroy()
      reject(new Error('Could not reach the room. Try again.'))
    }, 12000)
    const onOpen = (openedId) => {
      clearTimeout(timer)
      peer.off('error', onError)
      resolve({ peer, id: openedId })
    }
    const onError = (err) => {
      clearTimeout(timer)
      peer.off('open', onOpen)
      try {
        peer.destroy()
      } catch {
        /* ignore */
      }
      reject(err)
    }
    peer.on('open', onOpen)
    peer.on('error', onError)
  })
}

export default function HangoutRoom({ name, onLeave, onWatchSet, onHostControls, onPresence }) {
  const [status, setStatus] = useState('joining')
  const [detail, setDetail] = useState('Joining the room…')
  const [messages, setMessages] = useState([])
  const [viewerList, setViewerList] = useState([])
  const [audienceStreams, setAudienceStreams] = useState({})
  const [hubStream, setHubStream] = useState(null)
  const [hubInfo, setHubInfo] = useState({ name: '', camera: false })
  const [role, setRole] = useState('')
  const [myPeerId, setMyPeerId] = useState('')
  const [localStream, setLocalStream] = useState(null)
  const [camOn, setCamOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [needsSound, setNeedsSound] = useState(true)
  const [audioKick, setAudioKick] = useState(0)
  const [setIsLive, setSetIsLive] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const nameRef = useRef(name)
  const onPresenceRef = useRef(onPresence)
  const roleRef = useRef('')
  const peerRef = useRef(null)
  const callsRef = useRef(new Map())
  const dataConnsRef = useRef(new Map())
  const viewerDataConnRef = useRef(null)
  const viewersMapRef = useRef(new Map())
  const chatHistoryRef = useRef([])
  const handshakeRef = useRef(null)
  const localMediaRef = useRef(null)
  const camOnRef = useRef(false)
  const micOnRef = useRef(false)
  const mediaTokenRef = useRef(0)
  const leftRef = useRef(false)
  const retryRef = useRef(null)
  const guestPingRef = useRef(null)

  useEffect(() => {
    nameRef.current = name
  }, [name])

  useEffect(() => {
    onPresenceRef.current = onPresence
  }, [onPresence])

  const report = useCallback((info) => {
    onPresenceRef.current?.(info)
  }, [])

  const stopTracks = (stream) => {
    stream?.getTracks?.().forEach((track) => track.stop())
  }

  const appendChat = useCallback((msg) => {
    if (!msg?.id) return
    setMessages((prev) => {
      if (prev.some((item) => item.id === msg.id)) return prev
      const next = [...prev, msg].slice(-200)
      chatHistoryRef.current = next
      return next
    })
  }, [])

  const broadcastData = useCallback((payload) => {
    const raw = JSON.stringify(payload)
    dataConnsRef.current.forEach((conn) => {
      try {
        if (conn.open) conn.send(raw)
      } catch {
        /* ignore */
      }
    })
  }, [])

  const publishRoster = useCallback(() => {
    const viewers = Array.from(viewersMapRef.current.values())
      .map(({ peerId, name: viewerName, camera }) => ({
        peerId,
        name: viewerName,
        camera: !!camera,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    setViewerList(viewers)
    broadcastData({ type: 'viewer-list', viewers })
    const count = viewers.length + 1
    report({ connected: true, count })
  }, [broadcastData, report])

  const upsertViewer = useCallback(
    (peerId, viewerName, camera, clientId) => {
      const clean = normalizeDisplayName(viewerName)
      if (!peerId || !isValidDisplayName(clean)) return
      const prev = viewersMapRef.current.get(peerId)
      const nextCamera = typeof camera === 'boolean' ? camera : !!prev?.camera
      viewersMapRef.current.set(peerId, {
        peerId,
        name: clean,
        camera: nextCamera,
        clientId: clientId || prev?.clientId || '',
        lastSeen: Date.now(),
      })
      if (!prev || prev.name !== clean || !!prev.camera !== nextCamera) publishRoster()
    },
    [publishRoster]
  )

  const removeViewer = useCallback(
    (peerId) => {
      if (!peerId) return
      viewersMapRef.current.delete(peerId)
      try {
        callsRef.current.get(peerId)?.close?.()
      } catch {
        /* ignore */
      }
      callsRef.current.delete(peerId)
      dataConnsRef.current.delete(peerId)
      setAudienceStreams((prev) => {
        if (!prev[peerId]) return prev
        const next = { ...prev }
        delete next[peerId]
        return next
      })
      publishRoster()
    },
    [publishRoster]
  )

  const sendHostInfo = useCallback(() => {
    broadcastData({
      type: 'host',
      name: nameRef.current,
      camera: camOnRef.current,
    })
  }, [broadcastData])

  const currentOutboundStream = useCallback(() => {
    const handshake = handshakeRef.current?.stream || null
    const local = localMediaRef.current
    if (!local) return handshake
    const video =
      (camOnRef.current ? local.getVideoTracks()[0] : null) || handshake?.getVideoTracks?.()[0]
    const audio = local.getAudioTracks()[0] || handshake?.getAudioTracks?.()[0]
    const tracks = [video, audio].filter(Boolean)
    return tracks.length ? new MediaStream(tracks) : handshake
  }, [])

  const pushOutboundTracks = useCallback(async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const stream = currentOutboundStream()
      if (!stream) return
      const tasks = []
      let pending = 0
      callsRef.current.forEach((call) => {
        const pc = call?.peerConnection
        if (!pc?.getSenders) {
          pending += 1
          return
        }
        const senders = pc.getSenders()
        for (const track of stream.getTracks()) {
          const sender = senders.find((item) => item.track?.kind === track.kind)
          if (!sender) continue
          tasks.push(sender.replaceTrack(track).catch(() => {}))
        }
      })
      await Promise.all(tasks)
      if (!pending) return
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }, [currentOutboundStream])

  const rememberStream = useCallback((peerId, stream) => {
    if (!peerId || !stream) return
    setAudienceStreams((prev) => (prev[peerId] === stream ? prev : { ...prev, [peerId]: stream }))
  }, [])

  const forgetStream = useCallback((peerId) => {
    setAudienceStreams((prev) => {
      if (!prev[peerId]) return prev
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }, [])

  const attachCall = useCallback(
    (call) => {
      if (!call?.peer) return
      const peerId = call.peer
      const prev = callsRef.current.get(peerId)
      if (prev && prev !== call) {
        try {
          prev.close()
        } catch {
          /* ignore */
        }
      }
      callsRef.current.set(peerId, call)
      call.on('stream', (remote) => {
        if (peerId === HANGOUT_PEER_ID) setHubStream(remote)
        else rememberStream(peerId, remote)
      })
      call.on('close', () => {
        if (callsRef.current.get(peerId) === call) callsRef.current.delete(peerId)
        if (peerId === HANGOUT_PEER_ID) setHubStream(null)
        else forgetStream(peerId)
      })
      call.on('error', () => {
        if (callsRef.current.get(peerId) === call) callsRef.current.delete(peerId)
      })
    },
    [forgetStream, rememberStream]
  )

  const destroySession = useCallback(() => {
    clearTimeout(retryRef.current)
    clearInterval(guestPingRef.current)
    guestPingRef.current = null
    callsRef.current.forEach((call) => {
      try {
        call.close()
      } catch {
        /* ignore */
      }
    })
    callsRef.current.clear()
    dataConnsRef.current.forEach((conn) => {
      try {
        conn.close()
      } catch {
        /* ignore */
      }
    })
    dataConnsRef.current.clear()
    try {
      viewerDataConnRef.current?.close()
    } catch {
      /* ignore */
    }
    viewerDataConnRef.current = null
    viewersMapRef.current.clear()
    try {
      peerRef.current?.destroy()
    } catch {
      /* ignore */
    }
    peerRef.current = null
    handshakeRef.current?.dispose?.()
    handshakeRef.current = null
    mediaTokenRef.current += 1
    stopTracks(localMediaRef.current)
    localMediaRef.current = null
  }, [])

  useEffect(() => {
    leftRef.current = false
    let generation = 0

    const still = (gen) => gen === generation && !leftRef.current

    const scheduleRetry = (gen) => {
      clearTimeout(retryRef.current)
      retryRef.current = setTimeout(() => {
        if (!still(gen)) return
        generation += 1
        run(generation)
      }, 1500)
    }

    const welcomed = new Set()
    const announceHub = (conn, withHistory) => {
      try {
        conn.send(
          JSON.stringify({
            type: 'host',
            name: nameRef.current,
            camera: camOnRef.current,
          })
        )
        if (withHistory) {
          conn.send(
            JSON.stringify({
              type: 'history',
              messages: chatHistoryRef.current.slice(-40),
            })
          )
        }
        const viewers = Array.from(viewersMapRef.current.values()).map(
          ({ peerId, name: viewerName, camera }) => ({
            peerId,
            name: viewerName,
            camera: !!camera,
          })
        )
        conn.send(JSON.stringify({ type: 'viewer-list', viewers }))
      } catch {
        /* ignore */
      }
    }

    const bindHub = (peer, gen) => {
      roleRef.current = 'hub'
      setRole('hub')
      peer.on('call', (call) => {
        if (!still(gen)) return
        const stream = currentOutboundStream()
        if (!stream) {
          try {
            call.close()
          } catch {
            /* ignore */
          }
          return
        }
        call.answer(stream)
        attachCall(call)
      })
      peer.on('connection', (conn) => {
        if (!still(gen)) return
        dataConnsRef.current.set(conn.peer, conn)
        conn.on('open', () => announceHub(conn, true))
        conn.on('data', (raw) => {
          const msg = parseLivePayload(raw)
          if (!msg) return
          if (msg.type === 'hello') {
            upsertViewer(conn.peer, msg.name, msg.camera, msg.clientId)
            const first = !welcomed.has(conn.peer)
            welcomed.add(conn.peer)
            announceHub(conn, first)
            return
          }
          if (msg.type === 'camera') {
            const entry = viewersMapRef.current.get(conn.peer)
            if (entry && !!entry.camera !== !!msg.on) {
              entry.camera = !!msg.on
              publishRoster()
            }
            return
          }
          if (msg.type === 'ping') {
            const entry = viewersMapRef.current.get(conn.peer)
            if (entry) entry.lastSeen = Date.now()
            return
          }
          if (msg.type === 'chat') {
            const rosterName = viewersMapRef.current.get(conn.peer)?.name
            const stamped = rosterName ? { ...msg, name: rosterName } : msg
            appendChat(stamped)
            broadcastData(stamped)
          }
        })
        conn.on('close', () => {
          welcomed.delete(conn.peer)
          removeViewer(conn.peer)
        })
        conn.on('error', () => removeViewer(conn.peer))
      })
      peer.on('disconnected', () => {
        if (!still(gen)) return
        try {
          peer.reconnect()
        } catch {
          scheduleRetry(gen)
        }
      })
    }

    const bindGuest = (peer, conn, gen) => {
      roleRef.current = 'guest'
      setRole('guest')
      viewerDataConnRef.current = conn
      const sendHello = () => {
        try {
          conn.send(
            JSON.stringify({
              type: 'hello',
              name: nameRef.current,
              camera: camOnRef.current,
              clientId: liveClientId(),
            })
          )
        } catch {
          /* ignore */
        }
      }
      clearInterval(guestPingRef.current)
      guestPingRef.current = setInterval(() => {
        if (!still(gen) || !conn.open) return
        try {
          conn.send(JSON.stringify({ type: 'ping' }))
          sendHello()
        } catch {
          /* ignore */
        }
      }, 15000)

      conn.on('data', (raw) => {
        if (!still(gen)) return
        const msg = parseLivePayload(raw)
        if (!msg) return
        if (msg.type === 'host') setHubInfo({ name: msg.name, camera: msg.camera })
        if (msg.type === 'viewer-list') {
          setViewerList(msg.viewers)
          report({ connected: true, count: msg.viewers.length + 1 })
        }
        if (msg.type === 'chat') appendChat(msg)
        if (msg.type === 'history') msg.messages.forEach((item) => appendChat(item))
      })
      conn.on('close', () => {
        clearInterval(guestPingRef.current)
        if (!still(gen)) return
        setDetail('Connection dropped — rejoining…')
        report({ connected: false })
        scheduleRetry(gen)
      })
      sendHello()

      peer.on('call', (incoming) => {
        if (!still(gen)) return
        if (incoming.peer === HANGOUT_PEER_ID) {
          try {
            incoming.close()
          } catch {
            /* ignore */
          }
          return
        }
        const outbound = currentOutboundStream()
        if (!outbound) {
          try {
            incoming.close()
          } catch {
            /* ignore */
          }
          return
        }
        incoming.answer(outbound)
        attachCall(incoming)
      })

      const call = peer.call(HANGOUT_PEER_ID, currentOutboundStream())
      if (call) {
        callsRef.current.set(HANGOUT_PEER_ID, call)
        attachCall(call)
      }
    }

    const waitForConn = (peer, conn) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { type: 'timeout' })), 7000)
        const onOpen = () => {
          clearTimeout(timer)
          peer.off('error', onPeerError)
          resolve()
        }
        const onConnError = (err) => {
          clearTimeout(timer)
          peer.off('error', onPeerError)
          reject(err)
        }
        const onPeerError = (err) => {
          if (err?.type === 'peer-unavailable') onConnError(err)
        }
        conn.on('open', onOpen)
        conn.on('error', onConnError)
        peer.on('error', onPeerError)
      })

    async function run(gen) {
      if (!still(gen)) return
      destroySession()
      if (!still(gen)) return
      setStatus('joining')
      setDetail('Joining the room…')
      camOnRef.current = false
      micOnRef.current = false
      setCamOn(false)
      setMicOn(false)
      setLocalStream(null)
      setHubStream(null)
      setHubInfo({ name: '', camera: false })
      setAudienceStreams({})
      setViewerList([])
      report({ connected: false })

      handshakeRef.current = createHandshakeStream()

      try {
        const guest = await openPeer()
        if (!still(gen)) {
          guest.peer.destroy()
          return
        }
        const conn = guest.peer.connect(HANGOUT_PEER_ID, { reliable: true })
        try {
          await waitForConn(guest.peer, conn)
        } catch (err) {
          try {
            guest.peer.destroy()
          } catch {
            /* ignore */
          }
          const vacant = err?.type === 'peer-unavailable' || err?.type === 'timeout'
          if (!vacant) throw err
          if (!still(gen)) return
          let hub
          try {
            hub = await openPeer(HANGOUT_PEER_ID)
          } catch (claimErr) {
            if (claimErr?.type !== 'unavailable-id') throw claimErr
            if (!still(gen)) return
            scheduleRetry(gen)
            return
          }
          if (!still(gen)) {
            hub.peer.destroy()
            return
          }
          peerRef.current = hub.peer
          setMyPeerId(hub.id)
          bindHub(hub.peer, gen)
          setStatus('in')
          setDetail('You are in the room. Camera and mic stay off until you turn them on.')
          publishRoster()
          return
        }

        if (!still(gen)) {
          guest.peer.destroy()
          return
        }
        peerRef.current = guest.peer
        setMyPeerId(guest.id)
        bindGuest(guest.peer, conn, gen)
        setStatus('in')
        setDetail('You are in the room. Camera and mic stay off until you turn them on.')
        report({ connected: true, count: 1 })
      } catch (err) {
        console.error(err)
        if (!still(gen)) return
        destroySession()
        setStatus('error')
        setDetail(err?.message || 'Could not join the room.')
        report({ connected: false, error: err?.message || 'Could not join the room.' })
      }
    }

    generation += 1
    run(generation)

    return () => {
      leftRef.current = true
      generation += 1
      clearTimeout(retryRef.current)
      destroySession()
    }
  }, [
    appendChat,
    attachCall,
    broadcastData,
    currentOutboundStream,
    destroySession,
    publishRoster,
    removeViewer,
    report,
    upsertViewer,
    attempt,
  ])

  useEffect(() => {
    if (status !== 'in' || role !== 'guest') return undefined
    const peer = peerRef.current
    const myId = peer?.id
    if (!peer || !myId) return undefined

    const dial = () => {
      const stream = currentOutboundStream()
      if (!stream) return
      const others = viewerList.filter(
        (viewer) => viewer.peerId && viewer.peerId !== myId && viewer.peerId !== HANGOUT_PEER_ID
      )
      const otherIds = new Set(others.map((viewer) => viewer.peerId))
      for (const [id, call] of [...callsRef.current.entries()]) {
        if (id === HANGOUT_PEER_ID) continue
        if (otherIds.has(id)) continue
        try {
          call.close()
        } catch {
          /* ignore */
        }
        callsRef.current.delete(id)
        forgetStream(id)
      }
      for (const other of others) {
        if (callsRef.current.has(other.peerId)) continue
        if (myId > other.peerId) continue
        try {
          const call = peer.call(other.peerId, currentOutboundStream() || stream)
          if (!call) continue
          attachCall(call)
        } catch {
          callsRef.current.delete(other.peerId)
        }
      }
    }

    dial()
    const timer = setInterval(dial, 2500)
    return () => clearInterval(timer)
  }, [status, role, viewerList, currentOutboundStream, attachCall, forgetStream])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const presence = await fetchLivePresence()
      if (!cancelled) setSetIsLive(!!presence.live)
    }
    tick()
    const timer = setInterval(tick, 20000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const ensureLocalMedia = async () => {
    if (localMediaRef.current) return localMediaRef.current
    const token = mediaTokenRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    })
    if (token !== mediaTokenRef.current) {
      stream.getTracks().forEach((track) => track.stop())
      return null
    }
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micOnRef.current
    })
    stream.getVideoTracks().forEach((track) => {
      track.enabled = camOnRef.current
    })
    localMediaRef.current = stream
    setLocalStream(stream)
    return stream
  }

  const toggleCamera = async () => {
    if (mediaBusy || status !== 'in') return
    setMediaBusy(true)
    setMediaError('')
    const next = !camOnRef.current
    try {
      if (next) {
        const stream = await ensureLocalMedia()
        if (!stream) return
        stream.getVideoTracks().forEach((track) => {
          track.enabled = true
        })
      } else {
        localMediaRef.current?.getVideoTracks?.().forEach((track) => {
          track.enabled = false
        })
      }
      camOnRef.current = next
      setCamOn(next)
      await pushOutboundTracks()
      if (roleRef.current === 'hub') sendHostInfo()
      else {
        try {
          viewerDataConnRef.current?.send(JSON.stringify({ type: 'camera', on: next }))
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error(err)
      camOnRef.current = false
      setCamOn(false)
      setMediaError(
        isPermissionDenied(err)
          ? 'Camera permission was blocked. Allow the camera, then try again.'
          : err?.message || 'Could not start the camera.'
      )
    } finally {
      setMediaBusy(false)
    }
  }

  const toggleMic = async () => {
    if (mediaBusy || status !== 'in') return
    setMediaBusy(true)
    setMediaError('')
    const next = !micOnRef.current
    try {
      if (next) {
        const stream = await ensureLocalMedia()
        if (!stream) return
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true
        })
      } else {
        localMediaRef.current?.getAudioTracks?.().forEach((track) => {
          track.enabled = false
        })
      }
      micOnRef.current = next
      setMicOn(next)
      await pushOutboundTracks()
    } catch (err) {
      console.error(err)
      micOnRef.current = false
      setMicOn(false)
      setMediaError(
        isPermissionDenied(err)
          ? 'Microphone permission was blocked. Allow the mic, then try again.'
          : err?.message || 'Could not start the microphone.'
      )
    } finally {
      setMediaBusy(false)
    }
  }

  const sendChat = (text) => {
    const msg = makeChatMessage({ name: nameRef.current, text, role: 'viewer' })
    if (!msg.text) return
    appendChat(msg)
    if (roleRef.current === 'hub') broadcastData(msg)
    else {
      try {
        viewerDataConnRef.current?.send(JSON.stringify(msg))
      } catch {
        /* ignore */
      }
    }
  }

  const tiles = [
    {
      key: 'local',
      label: `${name || 'You'} (You)`,
      stream: localStream,
      isLocal: true,
      cameraOn: camOn,
    },
  ]
  if (role === 'guest' && (hubInfo.name || hubStream)) {
    tiles.push({
      key: 'hub',
      label: hubInfo.name || 'In the room',
      stream: hubStream,
      isLocal: false,
      cameraOn: hubInfo.camera,
    })
  }
  for (const viewer of viewerList) {
    if (viewer.peerId === myPeerId) continue
    tiles.push({
      key: viewer.peerId,
      label: viewer.name,
      stream: audienceStreams[viewer.peerId] || null,
      isLocal: false,
      cameraOn: !!viewer.camera,
    })
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {status === 'in' ? (
          <LiveAudienceGrid tiles={tiles} audioKick={audioKick} stage />
        ) : (
          <div className="flex-1 min-h-[40dvh] flex items-center justify-center px-6 text-center">
            <div className="max-w-sm space-y-3">
              <p className="text-sm text-mute">{detail}</p>
              {status === 'error' ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatus('joining')
                    setDetail('Joining the room…')
                    setAttempt((n) => n + 1)
                  }}
                  className="px-4 py-2.5 bg-paper text-ink text-sm font-medium"
                >
                  Retry
                </button>
              ) : (
                <p className="text-xs text-mute">Connecting…</p>
              )}
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 py-2.5 border-t border-hairline flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleCamera}
            disabled={mediaBusy || status !== 'in'}
            className={`px-3 py-2 border text-xs uppercase tracking-[0.16em] disabled:opacity-40 ${
              camOn ? 'border-paper bg-paper text-ink' : 'border-hairline text-mute hover:text-paper'
            }`}
          >
            {camOn ? 'Camera on' : 'Camera off'}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            disabled={mediaBusy || status !== 'in'}
            className={`px-3 py-2 border text-xs uppercase tracking-[0.16em] disabled:opacity-40 ${
              micOn ? 'border-paper bg-paper text-ink' : 'border-hairline text-mute hover:text-paper'
            }`}
          >
            {micOn ? 'Mic on' : 'Mic off'}
          </button>
          {needsSound && status === 'in' ? (
            <button
              type="button"
              onClick={() => {
                setNeedsSound(false)
                setAudioKick((n) => n + 1)
              }}
              className="px-3 py-2 border border-paper text-paper text-xs uppercase tracking-[0.16em]"
            >
              Tap for sound
            </button>
          ) : null}
          {mediaError ? (
            <p className="w-full text-xs text-paper/80">{mediaError}</p>
          ) : (
            <p className="w-full text-[11px] text-mute">{detail}</p>
          )}
        </div>
        <div className="px-4 sm:px-6 py-3 border-t border-hairline flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm text-mute">
            Everyone in the room can see you when your camera is on, and hear you when your mic is on.
          </p>
          <div className="flex items-center gap-4 self-start sm:self-auto">
            <button
              type="button"
              onClick={onLeave}
              className="text-xs uppercase tracking-[0.2em] text-mute hover:text-paper transition-colors"
            >
              Leave
            </button>
            <button
              type="button"
              onClick={onHostControls}
              className="text-xs uppercase tracking-[0.2em] text-mute hover:text-paper transition-colors"
            >
              Host controls
            </button>
          </div>
        </div>
      </div>

      <aside className="w-full lg:w-[22rem] xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-hairline flex flex-col min-h-[24rem] lg:min-h-0">
        <div className="p-4 sm:p-5 flex-1 flex flex-col min-h-0 gap-3">
          {setIsLive ? (
            <button
              type="button"
              onClick={onWatchSet}
              className="w-full px-3 py-2.5 border border-paper text-paper text-xs uppercase tracking-[0.16em] hover:bg-paper hover:text-ink"
            >
              A set is live — watch it
            </button>
          ) : null}
          <LiveChat
            fill
            messages={messages}
            onSend={sendChat}
            name={name}
            nameReadOnly
            disabled={status !== 'in'}
            placeholder="Chat with the room…"
          />
        </div>
      </aside>
    </div>
  )
}
