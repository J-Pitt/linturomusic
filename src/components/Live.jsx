import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Peer from 'peerjs'
import {
  ArrowLeftIcon,
  MicrophoneIcon,
  SignalIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  VideoCameraIcon,
  StopIcon,
} from '@heroicons/react/24/outline'
import { DEFAULT_EFFECTS, LIVE_HOST_KEY, LIVE_PEER_ID, LIVE_PEER_OPTIONS, createHandshakeStream } from '../lib/liveConfig'
import { drawPsychedelicFrame, fitCanvasToVideo } from '../lib/liveEffects'
import { createLiveRecorder, publishLiveVideo, uploadRecordingBlob } from '../lib/liveRecord'
import {
  defaultGuestName,
  makeChatMessage,
  parseLivePayload,
  saveGuestName,
} from '../lib/liveChat'
import LiveChat from './LiveChat'

const fieldClass =
  'w-full accent-paper h-1.5 bg-hairline rounded-full appearance-none cursor-pointer'

const BUILTIN_CAM_RE = /facetime|built-?in|macbook|integrated|default|iphone|continuity/i
const USB_CAM_RE = /usb|logitech|elgato|capture|cam link|obsbot|insta360|brio|c920|c922|c930|external|hd webcam|webcam/i

function isExternalCamera(device) {
  const label = device?.label || ''
  if (!label) return false
  if (BUILTIN_CAM_RE.test(label)) return false
  return USB_CAM_RE.test(label) || !/face|built/i.test(label)
}

function cameraLabel(device, index) {
  const label = device.label || `Camera ${index + 1}`
  if (!device.label) return label
  if (isExternalCamera(device)) return `${label} · USB`
  return label
}

function pickPreferredCamera(videoDevices, prevId) {
  if (prevId && videoDevices.some((d) => d.deviceId === prevId)) return prevId
  const usb = videoDevices.find((d) => isExternalCamera(d))
  return usb?.deviceId || videoDevices[0]?.deviceId || ''
}

function EffectSlider({ label, value, onChange, min = 0, max = 1, step = 0.01 }) {
  return (
    <label className="block space-y-1.5">
      <div className="flex justify-between text-xs text-mute">
        <span>{label}</span>
        <span className="tabular-nums text-paper/70">{Math.round(value * 100)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={fieldClass}
      />
    </label>
  )
}

export default function Live() {
  const [mode, setMode] = useState('viewer') // viewer | host
  const [hostKeyInput, setHostKeyInput] = useState('')
  const [hostError, setHostError] = useState('')
  const [status, setStatus] = useState('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [devices, setDevices] = useState({ video: [], audio: [] })
  const [videoDeviceId, setVideoDeviceId] = useState('')
  const [audioDeviceId, setAudioDeviceId] = useState('')
  const [effects, setEffects] = useState(DEFAULT_EFFECTS)
  const [muted, setMuted] = useState(true)
  const [needsGesture, setNeedsGesture] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [review, setReview] = useState(null) // { url, blob, id }
  const [reviewTitle, setReviewTitle] = useState('')
  const [publishState, setPublishState] = useState('idle') // idle | uploading | publishing | done | error
  const [publishDetail, setPublishDetail] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [chatMessages, setChatMessages] = useState([])
  const [chatName, setChatName] = useState(() =>
    typeof window !== 'undefined' ? defaultGuestName() : 'Guest'
  )
  const [chatConnected, setChatConnected] = useState(false)
  const hostKeyRef = useRef('')

  const viewerVideoRef = useRef(null)
  const previewVideoRef = useRef(null)
  const canvasRef = useRef(null)
  const localStreamRef = useRef(null)
  const outboundStreamRef = useRef(null)
  const peerRef = useRef(null)
  const callsRef = useRef(new Map())
  const dataConnsRef = useRef(new Map())
  const viewerDataConnRef = useRef(null)
  const chatHistoryRef = useRef([])
  const rafRef = useRef(0)
  const effectsRef = useRef(effects)
  const startTimeRef = useRef(0)
  const recorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const viewerSessionRef = useRef(0)
  const handshakeRef = useRef(null)
  const hadRemoteStreamRef = useRef(false)
  const reconnectTimerRef = useRef(null)

  useEffect(() => {
    effectsRef.current = effects
  }, [effects])

  const stopTracks = (stream) => {
    stream?.getTracks?.().forEach((t) => t.stop())
  }

  const refreshDevices = useCallback(async ({ preferNewUsb = false } = {}) => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return
      const list = await navigator.mediaDevices.enumerateDevices()
      const video = list.filter((d) => d.kind === 'videoinput')
      const audio = list.filter((d) => d.kind === 'audioinput')
      setDevices({ video, audio })

      setAudioDeviceId((prev) => {
        if (prev && audio.some((d) => d.deviceId === prev)) return prev
        const xdj =
          audio.find((d) => /xdj|pioneer|az|dj|usb|line/i.test(d.label)) ||
          audio.find((d) => !/macbook|built-in|default|communications/i.test(d.label))
        return xdj?.deviceId || audio[0]?.deviceId || ''
      })
      setVideoDeviceId((prev) => {
        if (!preferNewUsb && prev && video.some((d) => d.deviceId === prev)) return prev
        if (preferNewUsb) {
          const external = video.filter((d) => isExternalCamera(d))
          const newlyPreferred = external.find((d) => d.deviceId !== prev)
          if (newlyPreferred) return newlyPreferred.deviceId
        }
        return pickPreferredCamera(video, preferNewUsb ? '' : prev)
      })
    } catch (err) {
      console.error(err)
    }
  }, [])

  const requestDeviceAccess = useCallback(async () => {
    // Permission prompt so USB camera labels appear in the list
    const warm = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })
    warm.getTracks().forEach((t) => t.stop())
    await refreshDevices({ preferNewUsb: true })
  }, [refreshDevices])

  useEffect(() => {
    if (mode !== 'host') return undefined
    refreshDevices()
    const onDeviceChange = () => {
      refreshDevices({ preferNewUsb: true })
    }
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
    }
  }, [mode, refreshDevices])

  const applyCameraStream = useCallback(async (deviceId) => {
    if (!deviceId) throw new Error('No camera selected')

    const videoConstraints = {
      deviceId: { exact: deviceId },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    }

    let videoOnly
    try {
      videoOnly = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      })
    } catch {
      // Fall back if exact id fails (some USB cams renegotiate slowly)
      videoOnly = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { ideal: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
    }

    const newTrack = videoOnly.getVideoTracks()[0]
    const local = localStreamRef.current
    if (local) {
      local.getVideoTracks().forEach((t) => {
        local.removeTrack(t)
        t.stop()
      })
      local.addTrack(newTrack)
    } else {
      localStreamRef.current = new MediaStream([newTrack])
    }

    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = localStreamRef.current
      await previewVideoRef.current.play().catch(() => {})
    }

    return newTrack
  }, [])

  const openCameraPreview = useCallback(async () => {
    try {
      setStatus('connecting')
      setStatusDetail('Opening camera…')
      await requestDeviceAccess()
      const id =
        videoDeviceId ||
        pickPreferredCamera(
          (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'),
          ''
        )
      if (!id) throw new Error('No camera found — plug in the USB cam and hit Refresh.')
      setVideoDeviceId(id)
      await applyCameraStream(id)
      startEffectLoop()
      setStatus('preview')
      setStatusDetail('USB / laptop camera preview. Pick the right cam, then Go live.')
    } catch (err) {
      console.error(err)
      setStatus('error')
      setStatusDetail(err?.message || 'Could not open camera')
    }
  }, [applyCameraStream, requestDeviceAccess, videoDeviceId])

  const onCameraChange = async (deviceId) => {
    setVideoDeviceId(deviceId)
    if (status !== 'live' && status !== 'preview' && status !== 'connecting') return
    try {
      setStatusDetail('Switching camera…')
      await applyCameraStream(deviceId)
      setStatusDetail(
        status === 'live'
          ? 'Camera switched — viewers see the USB feed.'
          : 'Preview updated.'
      )
    } catch (err) {
      console.error(err)
      setStatusDetail(err?.message || 'Could not switch camera')
    }
  }
  const teardownBroadcast = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
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
    setViewerCount(0)
    setChatMessages([])
    chatHistoryRef.current = []
    setChatConnected(false)
    peerRef.current?.destroy()
    peerRef.current = null
    stopTracks(localStreamRef.current)
    stopTracks(outboundStreamRef.current)
    localStreamRef.current = null
    outboundStreamRef.current = null
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null
  }, [])

  const teardownViewer = useCallback(() => {
    clearTimeout(reconnectTimerRef.current)
    viewerSessionRef.current += 1
    callsRef.current.forEach((call) => {
      try {
        call.close()
      } catch {
        /* ignore */
      }
    })
    callsRef.current.clear()
    try {
      viewerDataConnRef.current?.close()
    } catch {
      /* ignore */
    }
    viewerDataConnRef.current = null
    setChatConnected(false)
    peerRef.current?.destroy()
    peerRef.current = null
    handshakeRef.current?.dispose?.()
    handshakeRef.current = null
    hadRemoteStreamRef.current = false
    if (viewerVideoRef.current) viewerVideoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    return () => {
      teardownBroadcast()
      teardownViewer()
    }
  }, [teardownBroadcast, teardownViewer])

  const unlockHost = (e) => {
    e.preventDefault()
    if (hostKeyInput.trim() !== LIVE_HOST_KEY) {
      setHostError('Wrong key')
      return
    }
    setHostError('')
    hostKeyRef.current = hostKeyInput.trim()
    try {
      sessionStorage.setItem('linturo-live-host-key', hostKeyInput.trim())
    } catch {
      /* ignore */
    }
    setMode('host')
    setStatus('idle')
    setStatusDetail('Plug in your USB camera, pick it in the list, then Go live.')
    refreshDevices({ preferNewUsb: true })
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('linturo-live-host-key')
      if (saved) hostKeyRef.current = saved
    } catch {
      /* ignore */
    }
  }, [])

  const appendChat = useCallback((msg) => {
    if (!msg?.id) return
    setChatMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
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

  const syncViewerCount = useCallback(() => {
    const count = callsRef.current.size
    setViewerCount(count)
    broadcastData({ type: 'viewers', count })
  }, [broadcastData])

  const sendHostChat = (text) => {
    const msg = makeChatMessage({ name: 'linturo', text, role: 'host' })
    if (!msg.text) return
    appendChat(msg)
    broadcastData(msg)
  }

  const sendViewerChat = (text) => {
    const msg = makeChatMessage({ name: chatName, text, role: 'viewer' })
    if (!msg.text) return
    appendChat(msg)
    try {
      viewerDataConnRef.current?.send(JSON.stringify(msg))
    } catch {
      /* ignore */
    }
  }

  const clearReview = () => {
    if (review?.url) URL.revokeObjectURL(review.url)
    setReview(null)
    setReviewTitle('')
    setPublishState('idle')
    setPublishDetail('')
    setUploadProgress(0)
  }

  const startRecording = () => {
    const stream = outboundStreamRef.current
    if (!stream || status !== 'live') {
      setStatusDetail('Go live before recording.')
      return
    }
    try {
      const rec = createLiveRecorder(stream)
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      setRecordSeconds(0)
      clearInterval(recordTimerRef.current)
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1)
      }, 1000)
      setStatusDetail('Recording the live feed (with FX).')
    } catch (err) {
      console.error(err)
      setStatusDetail(err?.message || 'Could not start recording')
    }
  }

  const stopRecording = async () => {
    const rec = recorderRef.current
    clearInterval(recordTimerRef.current)
    setRecording(false)
    if (!rec) return
    try {
      const blob = await rec.stop()
      recorderRef.current = null
      if (!blob.size) {
        setStatusDetail('Recording was empty.')
        return
      }
      const id = `set-${Date.now()}`
      const url = URL.createObjectURL(blob)
      const mins = Math.floor(recordSeconds / 60)
      const stamp = new Date().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      setReviewTitle(`Live ${stamp}`)
      setReview({ url, blob, id, duration: recordSeconds, mins })
      setPublishState('idle')
      setPublishDetail('Watch the take, then add it to Videos or discard.')
      setStatusDetail('Recording stopped — review below.')
    } catch (err) {
      console.error(err)
      setStatusDetail(err?.message || 'Could not finish recording')
    }
  }

  const publishRecording = async () => {
    if (!review?.blob) return
    const hostKey = hostKeyRef.current || LIVE_HOST_KEY
    setPublishState('uploading')
    setPublishDetail('Uploading to S3…')
    setUploadProgress(0)
    try {
      const { key } = await uploadRecordingBlob(review.blob, {
        hostKey,
        id: review.id,
        onProgress: setUploadProgress,
      })
      setPublishState('publishing')
      setPublishDetail('Saving to Videos…')
      await publishLiveVideo({
        hostKey,
        id: review.id,
        key,
        title: reviewTitle.trim() || 'Live set',
        subtitle: 'Live recording',
      })
      setPublishState('done')
      setPublishDetail('Added to Videos on the home page.')
    } catch (err) {
      console.error(err)
      setPublishState('error')
      setPublishDetail(err?.message || 'Publish failed')
    }
  }

  const formatRecTime = (s) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, '0')}`
  }

  const startEffectLoop = () => {
    startTimeRef.current = performance.now()
    const tick = () => {
      const video = previewVideoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2) {
        fitCanvasToVideo(canvas, video)
        const ctx = canvas.getContext('2d', { alpha: false })
        if (ctx) {
          const t = (performance.now() - startTimeRef.current) / 1000
          drawPsychedelicFrame(ctx, video, effectsRef.current, t)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }

  const goLive = async () => {
    callsRef.current.forEach((call) => {
      try {
        call.close()
      } catch {
        /* ignore */
      }
    })
    callsRef.current.clear()
    peerRef.current?.destroy()
    peerRef.current = null
    stopTracks(outboundStreamRef.current)
    outboundStreamRef.current = null

    setStatus('connecting')
    setStatusDetail('Requesting camera + audio…')

    try {
      await requestDeviceAccess()

      const camId =
        videoDeviceId ||
        pickPreferredCamera(
          (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'),
          ''
        )
      if (!camId) throw new Error('No camera found — connect the USB camera and Refresh.')
      setVideoDeviceId(camId)

      // Prefer the selected USB/external camera exactly
      await applyCameraStream(camId)

      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 2,
      }
      if (audioDeviceId) {
        audioConstraints.deviceId = { exact: audioDeviceId }
      }

      let audioStream
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: audioConstraints,
        })
      } catch {
        audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            ...audioConstraints,
            deviceId: audioDeviceId ? { ideal: audioDeviceId } : undefined,
          },
        })
      }

      const audioTrack = audioStream.getAudioTracks()[0]
      const local = localStreamRef.current
      if (local && audioTrack) {
        local.getAudioTracks().forEach((t) => {
          local.removeTrack(t)
          t.stop()
        })
        local.addTrack(audioTrack)
      }

      await refreshDevices()

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = localStreamRef.current
        await previewVideoRef.current.play().catch(() => {})
      }

      await new Promise((resolve) => {
        const v = previewVideoRef.current
        if (!v) return resolve()
        if (v.videoWidth) return resolve()
        v.onloadedmetadata = () => resolve()
        setTimeout(resolve, 1500)
      })

      const canvas = canvasRef.current
      if (!canvas) throw new Error('Missing canvas')
      fitCanvasToVideo(canvas, previewVideoRef.current)
      startEffectLoop()

      const canvasStream = canvas.captureStream(30)
      const videoTrack = canvasStream.getVideoTracks()[0]
      const outbound = new MediaStream(
        [videoTrack, localStreamRef.current?.getAudioTracks()[0]].filter(Boolean)
      )
      outboundStreamRef.current = outbound

      setStatusDetail('Opening live room…')
      const peer = new Peer(LIVE_PEER_ID, LIVE_PEER_OPTIONS)
      peerRef.current = peer

      await new Promise((resolve, reject) => {
        peer.on('open', resolve)
        peer.on('error', (err) => {
          if (err?.type === 'unavailable-id') {
            reject(new Error('Live room is busy — stop the other host session first.'))
          } else {
            reject(err)
          }
        })
      })

      peer.on('call', (call) => {
        const stream = outboundStreamRef.current
        if (!stream) {
          call.close()
          return
        }
        call.answer(stream)
        callsRef.current.set(call.peer, call)
        syncViewerCount()
        call.on('close', () => {
          callsRef.current.delete(call.peer)
          syncViewerCount()
        })
        call.on('error', () => {
          callsRef.current.delete(call.peer)
          syncViewerCount()
        })
      })

      peer.on('connection', (conn) => {
        dataConnsRef.current.set(conn.peer, conn)
        conn.on('open', () => {
          setChatConnected(true)
          try {
            conn.send(
              JSON.stringify({
                type: 'history',
                messages: chatHistoryRef.current.slice(-40),
              })
            )
            conn.send(JSON.stringify({ type: 'viewers', count: callsRef.current.size }))
          } catch {
            /* ignore */
          }
        })
        conn.on('data', (raw) => {
          const msg = parseLivePayload(raw)
          if (!msg) return
          if (msg.type === 'chat') {
            appendChat(msg)
            broadcastData(msg)
          }
        })
        conn.on('close', () => {
          dataConnsRef.current.delete(conn.peer)
          if (dataConnsRef.current.size === 0) setChatConnected(false)
        })
        conn.on('error', () => {
          dataConnsRef.current.delete(conn.peer)
        })
      })

      peer.on('disconnected', () => {
        setStatusDetail('Signal disconnected — reconnecting…')
        peer.reconnect()
      })

      setStatus('live')
      setStatusDetail('You are live. Switch USB camera anytime from the list.')
      setChatConnected(true)
    } catch (err) {
      console.error(err)
      teardownBroadcast()
      setStatus('error')
      setStatusDetail(err?.message || 'Could not start broadcast')
    }
  }

  const endLive = async () => {
    if (recording) {
      await stopRecording()
    }
    teardownBroadcast()
    setStatus('idle')
    setStatusDetail('Broadcast ended.')
  }

  const connectAsViewer = useCallback(async () => {
    teardownViewer()
    const session = viewerSessionRef.current
    setStatus('connecting')
    setStatusDetail('Looking for the live set…')
    setNeedsGesture(false)

    const stillCurrent = () => session === viewerSessionRef.current

    const scheduleReconnect = () => {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => {
        connectAsViewer()
      }, 4000)
    }

    try {
      const peer = new Peer(LIVE_PEER_OPTIONS)
      if (!stillCurrent()) {
        peer.destroy()
        return
      }
      peerRef.current = peer

      await new Promise((resolve, reject) => {
        const onOpen = (id) => {
          peer.off('open', onOpen)
          peer.off('error', onError)
          resolve(id)
        }
        const onError = (err) => {
          peer.off('open', onOpen)
          peer.off('error', onError)
          reject(err)
        }
        peer.on('open', onOpen)
        peer.on('error', onError)
      })

      if (!stillCurrent()) return

      const handshake = createHandshakeStream()
      handshakeRef.current = handshake

      // Resume audio context on mobile after user gesture if needed later;
      // handshake keeps the PeerJS call from being an empty MediaStream.
      try {
        const tracks = handshake.stream.getAudioTracks()
        tracks.forEach((t) => {
          t.enabled = true
        })
      } catch {
        /* ignore */
      }

      const call = peer.call(LIVE_PEER_ID, handshake.stream)
      if (!call) throw new Error('Could not reach host')

      callsRef.current.set('host', call)

      const dataConn = peer.connect(LIVE_PEER_ID, { reliable: true })
      viewerDataConnRef.current = dataConn
      dataConn.on('open', () => {
        if (!stillCurrent()) return
        setChatConnected(true)
      })
      dataConn.on('data', (raw) => {
        if (!stillCurrent()) return
        const msg = parseLivePayload(raw)
        if (!msg) return
        if (msg.type === 'viewers') setViewerCount(msg.count)
        if (msg.type === 'chat') appendChat(msg)
        if (msg.type === 'history') {
          msg.messages.forEach((m) => appendChat(m))
        }
      })
      dataConn.on('close', () => {
        if (!stillCurrent()) return
        setChatConnected(false)
      })
      dataConn.on('error', () => {
        if (!stillCurrent()) return
        setChatConnected(false)
      })

      const timeout = setTimeout(() => {
        if (!stillCurrent()) return
        setStatus('offline')
        setStatusDetail('linturo is not live right now.')
        scheduleReconnect()
      }, 15000)

      call.on('stream', async (remote) => {
        if (!stillCurrent()) return
        clearTimeout(timeout)
        hadRemoteStreamRef.current = true
        const el = viewerVideoRef.current
        if (!el) return
        el.srcObject = remote
        el.muted = true
        el.setAttribute('playsinline', '')
        el.playsInline = true
        setMuted(true)
        try {
          await el.play()
          setStatus('live')
          setStatusDetail('Connected')
          setNeedsGesture(true)
        } catch {
          setStatus('live')
          setNeedsGesture(true)
          setStatusDetail('Tap to start audio')
        }
      })

      call.on('close', () => {
        if (!stillCurrent()) return
        clearTimeout(timeout)
        const wasLive = hadRemoteStreamRef.current
        hadRemoteStreamRef.current = false
        if (viewerVideoRef.current) viewerVideoRef.current.srcObject = null
        setStatus('offline')
        setStatusDetail(
          wasLive ? 'Stream ended — reconnecting…' : 'Could not connect — retrying…'
        )
        scheduleReconnect()
      })

      call.on('error', () => {
        if (!stillCurrent()) return
        clearTimeout(timeout)
        setStatus('offline')
        setStatusDetail('Connection issue — retrying…')
        scheduleReconnect()
      })

      peer.on('error', (err) => {
        if (!stillCurrent()) return
        if (err?.type === 'peer-unavailable') {
          clearTimeout(timeout)
          setStatus('offline')
          setStatusDetail('linturo is not live right now.')
          scheduleReconnect()
        }
      })
    } catch (err) {
      console.error(err)
      if (!stillCurrent()) return
      setStatus('offline')
      setStatusDetail('linturo is not live right now.')
      scheduleReconnect()
    }
  }, [teardownViewer, appendChat])

  useEffect(() => {
    if (mode !== 'viewer') {
      clearTimeout(reconnectTimerRef.current)
      return undefined
    }
    connectAsViewer()
    return () => {
      clearTimeout(reconnectTimerRef.current)
      teardownViewer()
    }
    // Only (re)connect when entering viewer mode — avoid StrictMode churn loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const unmuteViewer = async () => {
    const el = viewerVideoRef.current
    if (!el) return
    el.muted = false
    setMuted(false)
    setNeedsGesture(false)
    try {
      await el.play()
    } catch {
      /* ignore */
    }
  }

  const setEffect = (key, value) => {
    setEffects((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-paper flex flex-col">
      <header className="relative z-40 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 border-b border-hairline">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-paper transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="hidden xs:inline sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-2">
          <SignalIcon
            className={`h-4 w-4 ${status === 'live' ? 'text-paper animate-pulse' : 'text-mute'}`}
          />
          <h1 className="text-sm sm:text-base font-medium tracking-wide uppercase">Live</h1>
        </div>
        <div className="text-xs text-mute tabular-nums min-w-[5.5rem] text-right">
          {status === 'live' || viewerCount > 0
            ? `${viewerCount} watching`
            : status}
        </div>
      </header>

      {mode === 'viewer' ? (
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="relative flex-1 bg-black flex items-center justify-center min-h-[40dvh]">
            <video
              ref={viewerVideoRef}
              className="w-full h-full max-h-[70dvh] object-contain bg-black"
              playsInline
              autoPlay
              muted={muted}
            />
            {status !== 'live' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center pointer-events-none">
                <p className="text-sm sm:text-base text-mute">{statusDetail || 'Connecting…'}</p>
                {status === 'offline' && (
                  <button
                    type="button"
                    onClick={connectAsViewer}
                    className="pointer-events-auto mt-2 px-4 py-2 border border-hairline text-sm text-paper hover:border-paper transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {(needsGesture || muted) && status === 'live' && (
              <button
                type="button"
                onClick={unmuteViewer}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 bg-paper text-ink text-sm font-medium"
              >
                {muted ? (
                  <SpeakerXMarkIcon className="h-5 w-5" />
                ) : (
                  <SpeakerWaveIcon className="h-5 w-5" />
                )}
                Tap for sound
              </button>
            )}
          </div>
          <div className="px-4 sm:px-6 py-3 border-t border-hairline">
            <LiveChat
              messages={chatMessages}
              onSend={sendViewerChat}
              name={chatName}
              onNameChange={(n) => setChatName(saveGuestName(n))}
              disabled={status !== 'live' || !chatConnected}
              placeholder="Chat with the room…"
            />
          </div>
          <div className="px-4 sm:px-6 py-3 border-t border-hairline flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs sm:text-sm text-mute">Watch the set in your browser.</p>
            <button
              type="button"
              onClick={() => {
                teardownViewer()
                setMode('gate')
                setStatus('idle')
                setStatusDetail('')
                setChatMessages([])
              }}
              className="text-xs uppercase tracking-[0.2em] text-mute hover:text-paper transition-colors self-start sm:self-auto"
            >
              Host controls
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'gate' ? (
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <form
            onSubmit={unlockHost}
            className="w-full max-w-sm border border-hairline p-6 space-y-4"
          >
            <h2 className="text-lg font-medium">Host unlock</h2>
            <p className="text-sm text-mute">
              Broadcast from this browser with your camera and XDJ-AZ as the audio input.
            </p>
            <input
              type="password"
              value={hostKeyInput}
              onChange={(e) => setHostKeyInput(e.target.value)}
              placeholder="Host key"
              className="w-full px-3 py-2.5 border border-hairline bg-black text-paper text-sm focus:outline-none focus:border-paper"
              autoComplete="current-password"
            />
            {hostError ? <p className="text-sm text-mute">{hostError}</p> : null}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-paper text-ink text-sm font-medium"
              >
                Enter
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('viewer')
                }}
                className="px-4 py-2.5 border border-hairline text-sm text-mute hover:text-paper"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {mode === 'host' ? (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="relative flex-1 bg-black min-h-[42dvh] lg:min-h-0 flex items-center justify-center">
            <video
              ref={previewVideoRef}
              className="absolute opacity-0 pointer-events-none w-px h-px"
              playsInline
              muted
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className="w-full h-full max-h-[70dvh] lg:max-h-none object-contain"
            />
            {status !== 'live' && status !== 'preview' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-mute px-6 text-center">{statusDetail}</p>
              </div>
            )}
          </div>

          <aside className="w-full lg:w-[22rem] xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-hairline overflow-y-auto max-h-[58dvh] lg:max-h-none">
            <div className="p-4 sm:p-5 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-mute mb-2">Master</p>
                <p className="text-sm text-mute">{statusDetail}</p>
              </div>

              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-2 text-xs text-mute">
                    <VideoCameraIcon className="h-4 w-4" />
                    Camera (USB / laptop)
                  </span>
                  <select
                    value={videoDeviceId}
                    onChange={(e) => onCameraChange(e.target.value)}
                    className="w-full px-3 py-2 border border-hairline bg-black text-paper text-sm"
                  >
                    {devices.video.length === 0 ? (
                      <option value="">Enable camera to list devices</option>
                    ) : (
                      devices.video.map((d, i) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {cameraLabel(d, i)}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[11px] text-mute leading-relaxed">
                    Plug in your USB camera, then Refresh — external cams are marked USB and
                    preferred automatically. You can switch cameras while live.
                  </p>
                </label>

                <label className="block space-y-1.5">
                  <span className="flex items-center gap-2 text-xs text-mute">
                    <MicrophoneIcon className="h-4 w-4" />
                    Audio (XDJ-AZ)
                  </span>
                  <select
                    value={audioDeviceId}
                    onChange={(e) => setAudioDeviceId(e.target.value)}
                    className="w-full px-3 py-2 border border-hairline bg-black text-paper text-sm"
                    disabled={status === 'live'}
                  >
                    {devices.audio.length === 0 ? (
                      <option value="">Allow mic to list devices</option>
                    ) : (
                      devices.audio.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || 'Audio input'}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[11px] text-mute leading-relaxed">
                    Choose the XDJ-AZ (or USB audio). Processing is off so the mixer master stays
                    clean.
                  </p>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {status === 'live' ? (
                  <button
                    type="button"
                    onClick={endLive}
                    className="flex-1 min-w-[8rem] px-4 py-2.5 border border-paper text-paper text-sm font-medium hover:bg-paper hover:text-ink transition-colors"
                  >
                    End live
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={openCameraPreview}
                      disabled={status === 'connecting'}
                      className="px-4 py-2.5 border border-hairline text-sm text-mute hover:text-paper disabled:opacity-50"
                    >
                      Open camera
                    </button>
                    <button
                      type="button"
                      onClick={goLive}
                      disabled={status === 'connecting'}
                      className="flex-1 min-w-[8rem] px-4 py-2.5 bg-paper text-ink text-sm font-medium disabled:opacity-50"
                    >
                      {status === 'connecting' ? 'Starting…' : 'Go live'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await requestDeviceAccess()
                      setStatusDetail('Device list refreshed. Pick your USB camera.')
                    } catch (err) {
                      setStatusDetail(err?.message || 'Permission needed to list cameras')
                    }
                  }}
                  className="px-3 py-2.5 border border-hairline text-xs text-mute hover:text-paper"
                >
                  Refresh
                </button>
              </div>

              {status === 'live' && (
                <div className="space-y-3 pt-2 border-t border-hairline">
                  <p className="text-xs uppercase tracking-[0.24em] text-mute">Record</p>
                  <div className="flex gap-2 items-center">
                    {recording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-paper text-paper text-sm font-medium"
                      >
                        <StopIcon className="h-4 w-4" />
                        Stop · {formatRecTime(recordSeconds)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-paper text-ink text-sm font-medium"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                        Record set
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-mute leading-relaxed">
                    Captures the live feed with FX + XDJ audio. After you stop, review and choose
                    whether to add it to Videos.
                  </p>
                </div>
              )}

              {review && (
                <div className="space-y-3 pt-2 border-t border-hairline">
                  <p className="text-xs uppercase tracking-[0.24em] text-mute">Review take</p>
                  <video
                    src={review.url}
                    controls
                    playsInline
                    className="w-full aspect-video bg-black border border-hairline"
                  />
                  <label className="block space-y-1.5">
                    <span className="text-xs text-mute">Title for Videos</span>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-hairline bg-black text-paper text-sm"
                      disabled={publishState === 'uploading' || publishState === 'publishing'}
                    />
                  </label>
                  {publishState === 'uploading' && (
                    <div className="h-1 bg-hairline">
                      <div
                        className="h-full bg-paper transition-all"
                        style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-mute">{publishDetail}</p>
                  <div className="flex flex-wrap gap-2">
                    {publishState !== 'done' && (
                      <button
                        type="button"
                        onClick={publishRecording}
                        disabled={
                          publishState === 'uploading' ||
                          publishState === 'publishing' ||
                          !reviewTitle.trim()
                        }
                        className="flex-1 min-w-[8rem] px-4 py-2.5 bg-paper text-ink text-sm font-medium disabled:opacity-50"
                      >
                        {publishState === 'uploading' || publishState === 'publishing'
                          ? 'Publishing…'
                          : 'Add to Videos'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearReview}
                      className="px-4 py-2.5 border border-hairline text-sm text-mute hover:text-paper"
                    >
                      {publishState === 'done' ? 'Done' : 'Discard'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-hairline">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-mute">Room</p>
                  <p className="text-xs text-mute tabular-nums">{viewerCount} watching</p>
                </div>
                <LiveChat
                  messages={chatMessages}
                  onSend={sendHostChat}
                  name="linturo"
                  nameReadOnly
                  disabled={status !== 'live'}
                  compact
                  placeholder="Reply to the room…"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-hairline">
                <p className="text-xs uppercase tracking-[0.24em] text-mute">Psychedelic FX</p>
                <EffectSlider
                  label="Master intensity"
                  value={effects.intensity}
                  onChange={(v) => setEffect('intensity', v)}
                />
                <EffectSlider
                  label="Hue drift"
                  value={effects.hueSpeed}
                  onChange={(v) => setEffect('hueSpeed', v)}
                />
                <EffectSlider
                  label="RGB split"
                  value={effects.rgbSplit}
                  onChange={(v) => setEffect('rgbSplit', v)}
                />
                <EffectSlider
                  label="Trails"
                  value={effects.trails}
                  onChange={(v) => setEffect('trails', v)}
                />
                <EffectSlider
                  label="Warp slices"
                  value={effects.warp}
                  onChange={(v) => setEffect('warp', v)}
                />
                <EffectSlider
                  label="Swirl"
                  value={effects.swirl ?? 0}
                  onChange={(v) => setEffect('swirl', v)}
                />
                <EffectSlider
                  label="Ripple"
                  value={effects.ripple ?? 0}
                  onChange={(v) => setEffect('ripple', v)}
                />
                <EffectSlider
                  label="Barrel / fish-eye"
                  value={effects.barrel ?? 0}
                  onChange={(v) => setEffect('barrel', v)}
                />
                <EffectSlider
                  label="Tunnel zoom"
                  value={effects.tunnel ?? 0}
                  onChange={(v) => setEffect('tunnel', v)}
                />
                <EffectSlider
                  label="Pixelate"
                  value={effects.pixelate ?? 0}
                  onChange={(v) => setEffect('pixelate', v)}
                />
                <EffectSlider
                  label="Glitch"
                  value={effects.glitch}
                  onChange={(v) => setEffect('glitch', v)}
                />
                <EffectSlider
                  label="Pulse"
                  value={effects.pulse}
                  onChange={(v) => setEffect('pulse', v)}
                />
                <EffectSlider
                  label="Mirror / kaleidoscope"
                  value={effects.mirror}
                  onChange={(v) => setEffect('mirror', v)}
                />
                <button
                  type="button"
                  onClick={() => setEffects(DEFAULT_EFFECTS)}
                  className="text-xs text-mute hover:text-paper"
                >
                  Reset FX
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  endLive()
                  setMode('viewer')
                }}
                className="text-xs text-mute hover:text-paper"
              >
                Back to viewer
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
