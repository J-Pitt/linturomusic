import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
import {
  DEFAULT_EFFECTS,
  LIVE_PEER_OPTIONS,
  createHandshakeStream,
  makeHostPeerId,
} from '../lib/liveConfig'
import { VIDEO_PRESETS, drawPsychedelicFrame, fitCanvasToVideo } from '../lib/liveEffects'
import {
  createLiveRecorder,
  fetchLivePresence,
  publishLiveVideo,
  setLivePresence,
  uploadRecordingBlob,
} from '../lib/liveRecord'
import {
  defaultGuestName,
  isLiveBan,
  isValidDisplayName,
  liveClientId,
  makeChatMessage,
  normalizeDisplayName,
  parseLivePayload,
  saveGuestName,
} from '../lib/liveChat'
import LiveAudienceGrid from './LiveAudienceGrid'
import LiveChat from './LiveChat'
import LiveRecordingReview from './LiveRecordingReview'
import { ListAnnounce } from './Newsletter'
import { useAuth } from '../context/AuthContext'
import { notifyLiveList } from '../lib/newsletter'

const fieldClass =
  'w-full accent-paper h-1.5 bg-hairline rounded-full appearance-none cursor-pointer'

const BUILTIN_CAM_RE = /facetime|built-?in|macbook|integrated|default|iphone|continuity/i
const USB_CAM_RE = /usb|logitech|elgato|capture|cam link|obsbot|insta360|brio|c920|c922|c930|external|hd webcam|webcam/i

function LiveViewerList({ viewers, onKick }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-mute">Watching</p>
        <p className="text-[11px] text-mute tabular-nums">{viewers.length}</p>
      </div>
      {viewers.length === 0 ? (
        <p className="text-xs text-mute">No viewers yet.</p>
      ) : (
        <ul className="border border-hairline bg-black/60 px-2.5 py-2 space-y-1 max-h-28 overflow-y-auto">
          {viewers.map((v) => (
            <li key={v.peerId} className="flex items-center justify-between gap-2 text-xs text-paper/90">
              <span className="truncate">
                {v.name}
                {v.camera ? <span className="text-mute"> · cam</span> : null}
              </span>
              {onKick ? (
                <button
                  type="button"
                  onClick={() => onKick(v.peerId)}
                  className="shrink-0 uppercase tracking-[0.14em] text-[10px] text-mute hover:text-paper"
                >
                  Kick
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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

/** DJ input: processing off. Applied with applyConstraints when a track is already live. */
const MUSIC_AUDIO = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

function isPermissionDenied(err) {
  const name = err?.name || ''
  return name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError'
}

function liveKindTrack(stream, kind) {
  const tracks = kind === 'audio' ? stream?.getAudioTracks?.() : stream?.getVideoTracks?.()
  return tracks?.find((track) => track.readyState === 'live') || null
}

function permissionDeniedError() {
  return new Error('Microphone permission was blocked. Allow the mic, then try again.')
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
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, accessToken, logout } = useAuth()
  const [mode, setMode] = useState('viewer') // viewer | host | gate
  const [status, setStatus] = useState('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [viewerList, setViewerList] = useState([])
  const [devices, setDevices] = useState({ video: [], audio: [] })
  const [videoDeviceId, setVideoDeviceId] = useState('')
  const [audioDeviceId, setAudioDeviceId] = useState('')
  const [effects, setEffects] = useState(DEFAULT_EFFECTS)
  const [presetId, setPresetId] = useState('')
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
    typeof window !== 'undefined' ? defaultGuestName() : ''
  )
  const [joinNameError, setJoinNameError] = useState('')
  const [chatConnected, setChatConnected] = useState(false)
  const [viewerWantsJoin, setViewerWantsJoin] = useState(false)
  const [roomLocked, setRoomLocked] = useState(false)
  const [removedViewers, setRemovedViewers] = useState([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [audioBroadcasting, setAudioBroadcasting] = useState(false)
  const [inputGain, setInputGain] = useState(1.4)
  const [audienceStreams, setAudienceStreams] = useState({})
  const [myPeerId, setMyPeerId] = useState('')
  const [localStream, setLocalStream] = useState(null)
  const [camOn, setCamOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [audioKick, setAudioKick] = useState(0)
  const accessTokenRef = useRef('')

  const viewerVideoRef = useRef(null)
  const previewVideoRef = useRef(null)
  const canvasRef = useRef(null)
  const localStreamRef = useRef(null)
  const outboundStreamRef = useRef(null)
  const peerRef = useRef(null)
  const callsRef = useRef(new Map())
  const dataConnsRef = useRef(new Map())
  const viewersMapRef = useRef(new Map())
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
  const presenceTimerRef = useRef(null)
  const viewerPruneTimerRef = useRef(null)
  const viewerPingTimerRef = useRef(null)
  const hostPeerIdRef = useRef('')
  const roomLockedRef = useRef(false)
  const viewerLockedRef = useRef(false)
  const viewerKickedRef = useRef(false)
  const bannedNamesRef = useRef([])
  const bannedClientIdsRef = useRef([])
  const audioMeterRef = useRef(null)
  const audioMeterRafRef = useRef(0)
  const inputGainRef = useRef(1.4)
  const gainNodeRef = useRef(null)
  const chatNameRef = useRef(chatName)
  const localMediaRef = useRef(null)
  const camOnRef = useRef(false)
  const micOnRef = useRef(false)
  const viewerHostIdRef = useRef('')
  const mediaTokenRef = useRef(0)
  /** Granted mic stream. Reused so Allow does not schedule another getUserMedia. */
  const audioStreamRef = useRef(null)
  const gumTailRef = useRef(Promise.resolve())
  const gumDepthRef = useRef(0)
  const capturingRef = useRef(false)
  const startingRef = useRef(false)

  useEffect(() => {
    effectsRef.current = effects
  }, [effects])

  useEffect(() => {
    chatNameRef.current = chatName
  }, [chatName])

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    inputGainRef.current = inputGain
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = inputGain
    }
  }, [inputGain])

  const stopTracks = (stream) => {
    stream?.getTracks?.().forEach((t) => t.stop())
  }

  const stopBroadcastAudio = useCallback(() => {
    cancelAnimationFrame(audioMeterRafRef.current)
    audioMeterRafRef.current = 0
    gainNodeRef.current = null
    try {
      audioMeterRef.current?.rawTracks?.forEach((t) => t.stop())
    } catch {
      /* ignore */
    }
    try {
      audioMeterRef.current?.ctx?.close?.()
    } catch {
      /* ignore */
    }
    audioMeterRef.current = null
    setAudioLevel(0)
    setAudioBroadcasting(false)
  }, [])

  /** Meter via Web Audio; broadcast the raw XDJ/mic track (WebRTC-safe on phones). */
  const setupBroadcastAudio = useCallback(
    async (rawTrack) => {
      stopBroadcastAudio()
      if (!rawTrack || rawTrack.readyState !== 'live') {
        setAudioBroadcasting(false)
        return null
      }

      rawTrack.enabled = true
      try {
        rawTrack.contentHint = 'music'
      } catch {
        /* ignore */
      }

      // Clone ONLY for metering — never send createMediaStreamDestination tracks over
      // WebRTC (those often arrive silent on mobile).
      let meterClone = null
      try {
        meterClone = rawTrack.clone()
      } catch {
        meterClone = null
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      try {
        await ctx.resume()
      } catch {
        /* ignore */
      }

      // Never feed the outbound raw track into Web Audio — that can mute WebRTC.
      if (meterClone) {
        const source = ctx.createMediaStreamSource(new MediaStream([meterClone]))
        const gain = ctx.createGain()
        gain.gain.value = inputGainRef.current
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.5
        source.connect(gain)
        gain.connect(analyser)

        gainNodeRef.current = gain
        audioMeterRef.current = {
          ctx,
          analyser,
          rawTracks: [meterClone],
        }

        const freq = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          analyser.getByteFrequencyData(freq)
          let sum = 0
          for (let i = 0; i < freq.length; i += 1) sum += freq[i]
          const avg = sum / (freq.length * 255)
          const boosted = avg * (0.8 + inputGainRef.current * 0.6)
          setAudioLevel(Math.min(1, boosted * 2.2))
          setAudioBroadcasting(rawTrack.readyState === 'live' && rawTrack.enabled)
          audioMeterRafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } else {
        try {
          ctx.close()
        } catch {
          /* ignore */
        }
        audioMeterRef.current = { rawTracks: [] }
        setAudioLevel(0)
      }

      setAudioBroadcasting(true)
      return rawTrack
    },
    [stopBroadcastAudio]
  )

  const refreshDevices = useCallback(async ({ preferNewUsb = false } = {}) => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return { audioId: '', videoId: '' }
      const list = await navigator.mediaDevices.enumerateDevices()
      const video = list.filter((d) => d.kind === 'videoinput')
      const audio = list.filter((d) => d.kind === 'audioinput')
      setDevices({ video, audio })

      let nextAudio = ''
      let nextVideo = ''
      setAudioDeviceId((prev) => {
        if (prev && audio.some((d) => d.deviceId === prev)) nextAudio = prev
        else {
          const xdj =
            audio.find((d) => /xdj|pioneer|az|dj|usb|line/i.test(d.label)) ||
            audio.find((d) => !/macbook|built-in|default|communications/i.test(d.label))
          nextAudio = xdj?.deviceId || audio[0]?.deviceId || ''
        }
        return nextAudio
      })
      setVideoDeviceId((prev) => {
        if (prev && video.some((d) => d.deviceId === prev)) {
          if (!preferNewUsb || video.some((d) => d.deviceId === prev && isExternalCamera(d))) {
            nextVideo = prev
            return prev
          }
        }
        if (preferNewUsb) {
          const external = video.filter((d) => isExternalCamera(d))
          const newlyPreferred = external[0]
          if (newlyPreferred) {
            nextVideo = newlyPreferred.deviceId
            return nextVideo
          }
        }
        nextVideo = pickPreferredCamera(video, preferNewUsb ? '' : prev)
        return nextVideo
      })
      return { audioId: nextAudio, videoId: nextVideo }
    } catch (err) {
      console.error(err)
      return { audioId: '', videoId: '' }
    }
  }, [])

  /**
   * Serialize getUserMedia. A second caller waits, then reuses a live track
   * instead of opening another permission prompt.
   */
  const runGum = useCallback((request) => {
    gumDepthRef.current += 1
    capturingRef.current = true
    const run = gumTailRef.current.then(request, request)
    gumTailRef.current = run.then(
      () => {},
      () => {}
    )
    return run.finally(() => {
      gumDepthRef.current = Math.max(0, gumDepthRef.current - 1)
      if (gumDepthRef.current === 0) capturingRef.current = false
    })
  }, [])

  const labelsUnlocked = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      return list.some(
        (d) => d.label && (d.kind === 'audioinput' || d.kind === 'videoinput')
      )
    } catch {
      return false
    }
  }, [])

  const tuneGrantedAudio = async (track, deviceId) => {
    const currentId = track.getSettings?.().deviceId || ''
    try {
      if (deviceId && currentId && currentId !== deviceId) {
        await track.applyConstraints({ ...MUSIC_AUDIO, deviceId: { exact: deviceId } })
      } else {
        await track.applyConstraints(MUSIC_AUDIO)
      }
    } catch {
      try {
        await track.applyConstraints(MUSIC_AUDIO)
      } catch {
        /* Keep the granted track. Another getUserMedia would re-prompt. */
      }
    }
    try {
      await track.applyConstraints({ channelCount: 2 })
    } catch {
      /* Mono inputs stay mono. Do not open a new capture for this. */
    }
    track.enabled = true
    try {
      track.contentHint = 'music'
    } catch {
      /* ignore */
    }
    return track
  }

  const storeGrantedStream = (stream) => {
    if (!stream) return
    const audioTrack = liveKindTrack(stream, 'audio')
    const videoTrack = liveKindTrack(stream, 'video')
    if (audioTrack) {
      audioStreamRef.current = new MediaStream([audioTrack])
      audioTrack.enabled = true
      try {
        audioTrack.contentHint = 'music'
      } catch {
        /* ignore */
      }
    }
    if (videoTrack && !liveKindTrack(localStreamRef.current, 'video')) {
      const local = localStreamRef.current || new MediaStream()
      if (!local.getVideoTracks().some((t) => t.id === videoTrack.id)) local.addTrack(videoTrack)
      localStreamRef.current = local
    }
  }

  useEffect(() => {
    if (location.state?.openHost && isAuthenticated) {
      setMode('host')
      setStatus('idle')
      setStatusDetail('Plug in your USB camera, pick it in the list, then Go live.')
      refreshDevices({ preferNewUsb: true })
      navigate('/live', { replace: true, state: {} })
    }
  }, [location.state?.openHost, isAuthenticated, navigate, refreshDevices])

  const requestDeviceAccess = useCallback(async () => {
    // Listing devices must not stop a granted stream and request it again.
    if (
      liveKindTrack(audioStreamRef.current, 'audio') ||
      liveKindTrack(localStreamRef.current, 'video') ||
      (await labelsUnlocked())
    ) {
      return refreshDevices({ preferNewUsb: true })
    }

    try {
      const warm = await runGum(async () => {
        if (
          liveKindTrack(audioStreamRef.current, 'audio') ||
          liveKindTrack(localStreamRef.current, 'video')
        ) {
          return null
        }
        return navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
      })
      // Allow resolved: keep the tracks. Do not call getUserMedia again here.
      storeGrantedStream(warm)
    } catch (err) {
      if (isPermissionDenied(err)) throw permissionDeniedError()
      throw err
    }
    return refreshDevices({ preferNewUsb: true })
  }, [labelsUnlocked, refreshDevices, runGum])

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

    const already = liveKindTrack(localStreamRef.current, 'video')
    const alreadyId = already?.getSettings?.().deviceId || ''
    if (already && (!alreadyId || alreadyId === deviceId)) {
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = localStreamRef.current
        await previewVideoRef.current.play().catch(() => {})
      }
      return already
    }

    let videoOnly
    try {
      videoOnly = await runGum(async () => {
        const again = liveKindTrack(localStreamRef.current, 'video')
        const againId = again?.getSettings?.().deviceId || ''
        if (again && (!againId || againId === deviceId)) return null
        // Video only — never re-request the microphone from the camera path.
        return navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: { ideal: deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
        })
      })
    } catch (err) {
      if (isPermissionDenied(err)) throw permissionDeniedError()
      throw err
    }

    if (!videoOnly) {
      const again = liveKindTrack(localStreamRef.current, 'video')
      if (!again) throw new Error('Could not open camera')
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = localStreamRef.current
        await previewVideoRef.current.play().catch(() => {})
      }
      return again
    }

    const granted = videoOnly.getVideoTracks()[0]
    if (
      granted &&
      deviceId &&
      granted.getSettings?.().deviceId &&
      granted.getSettings().deviceId !== deviceId
    ) {
      try {
        await granted.applyConstraints({
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        })
      } catch {
        /* Keep this camera. A second getUserMedia would prompt again. */
      }
    }

    const newTrack = videoOnly.getVideoTracks()[0]
    if (!newTrack) throw new Error('Could not open camera')
    const local = localStreamRef.current
    if (local) {
      local.getVideoTracks().forEach((t) => {
        if (t.id === newTrack.id) return
        local.removeTrack(t)
        t.stop()
      })
      if (!local.getVideoTracks().some((t) => t.id === newTrack.id)) local.addTrack(newTrack)
    } else {
      localStreamRef.current = new MediaStream([newTrack])
    }

    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = localStreamRef.current
      await previewVideoRef.current.play().catch(() => {})
    }

    return newTrack
  }, [runGum])

  /** One mic capture per intentional start. A live track is reused, never re-requested. */
  const acquireBroadcastAudio = useCallback(async (deviceId) => {
    const existing = liveKindTrack(audioStreamRef.current, 'audio')
    if (existing) {
      await tuneGrantedAudio(existing, deviceId)
      return existing
    }

    let stream
    try {
      stream = await runGum(async () => {
        const again = liveKindTrack(audioStreamRef.current, 'audio')
        if (again) return audioStreamRef.current
        return navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            ...MUSIC_AUDIO,
            ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
          },
        })
      })
    } catch (err) {
      const granted = liveKindTrack(audioStreamRef.current, 'audio')
      if (granted) return granted
      if (isPermissionDenied(err)) throw permissionDeniedError()
      throw err
    }

    const track = liveKindTrack(stream, 'audio')
    if (!track) throw new Error('No audio input — pick the XDJ-AZ and try again.')
    if (audioStreamRef.current !== stream) audioStreamRef.current = stream
    track.enabled = true
    try {
      track.contentHint = 'music'
    } catch {
      /* ignore */
    }
    return track
  }, [runGum])

  const openCameraPreview = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    try {
      setStatus('connecting')
      setStatusDetail('Opening camera…')
      const listed = await requestDeviceAccess()
      const id =
        listed?.videoId ||
        videoDeviceId ||
        pickPreferredCamera(
          (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'),
          ''
        )
      if (!id) throw new Error('No camera found — plug in the USB cam and hit Refresh.')
      setVideoDeviceId(id)
      const liveVideo = liveKindTrack(localStreamRef.current, 'video')
      const liveVideoId = liveVideo?.getSettings?.().deviceId || ''
      if (liveVideo && (!liveVideoId || liveVideoId === id)) {
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = localStreamRef.current
          await previewVideoRef.current.play().catch(() => {})
        }
      } else {
        await applyCameraStream(id)
      }
      startEffectLoop()
      setStatus('preview')
      setStatusDetail('USB / laptop camera preview. Pick the right cam, then Go live.')
    } catch (err) {
      console.error(err)
      setStatus('error')
      setStatusDetail(err?.message || 'Could not open camera')
    } finally {
      startingRef.current = false
    }
  }, [applyCameraStream, requestDeviceAccess, videoDeviceId])

  const onCameraChange = async (deviceId) => {
    setVideoDeviceId(deviceId)
    if (startingRef.current || capturingRef.current) return
    if (status !== 'live' && status !== 'preview' && status !== 'connecting') return
    const liveVideo = liveKindTrack(localStreamRef.current, 'video')
    if (liveVideo && liveVideo.getSettings?.().deviceId === deviceId) return
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
    clearInterval(presenceTimerRef.current)
    clearInterval(viewerPruneTimerRef.current)
    presenceTimerRef.current = null
    viewerPruneTimerRef.current = null
    const token = accessTokenRef.current
    if (token) setLivePresence({ accessToken: token, live: false }).catch(() => {})
    hostPeerIdRef.current = ''
    roomLockedRef.current = false
    setRoomLocked(false)
    bannedNamesRef.current = []
    bannedClientIdsRef.current = []
    setRemovedViewers([])
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
    viewersMapRef.current.clear()
    setViewerCount(0)
    setViewerList([])
    setAudienceStreams({})
    setChatMessages([])
    chatHistoryRef.current = []
    setChatConnected(false)
    peerRef.current?.destroy()
    peerRef.current = null
    stopTracks(localStreamRef.current)
    stopTracks(outboundStreamRef.current)
    stopTracks(audioStreamRef.current)
    localStreamRef.current = null
    outboundStreamRef.current = null
    audioStreamRef.current = null
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null
    stopBroadcastAudio()
  }, [stopBroadcastAudio])

  const teardownViewer = useCallback(() => {
    clearTimeout(reconnectTimerRef.current)
    clearInterval(viewerPingTimerRef.current)
    viewerPingTimerRef.current = null
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
    setViewerCount(0)
    setViewerList([])
    setAudienceStreams({})
    setMyPeerId('')
    mediaTokenRef.current += 1
    camOnRef.current = false
    micOnRef.current = false
    setCamOn(false)
    setMicOn(false)
    setMediaBusy(false)
    setMediaError('')
    viewerHostIdRef.current = ''
    stopTracks(localMediaRef.current)
    localMediaRef.current = null
    setLocalStream(null)
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

  useEffect(() => {
    if (mode === 'host' && !isAuthenticated) {
      setMode('gate')
      teardownBroadcast()
    }
  }, [mode, isAuthenticated, teardownBroadcast])

  const enterHostMode = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/live' }, openHost: true } })
      return
    }
    setMode('host')
    setStatus('idle')
    setStatusDetail('Plug in your USB camera, pick it in the list, then Go live.')
    refreshDevices({ preferNewUsb: true })
  }

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

  const publishViewerRoster = useCallback(() => {
    const viewers = Array.from(viewersMapRef.current.values())
      .map(({ peerId, name, camera }) => ({ peerId, name, camera: !!camera }))
      .sort((a, b) => a.name.localeCompare(b.name))
    setViewerList(viewers)
    setViewerCount(viewers.length)
    broadcastData({ type: 'viewer-list', viewers })
    broadcastData({ type: 'viewers', count: viewers.length })
  }, [broadcastData])

  const removeViewer = useCallback(
    (peerId) => {
      if (!peerId) return
      const hadViewer = viewersMapRef.current.delete(peerId)
      const hadCall = callsRef.current.has(peerId)
      const hadConn = dataConnsRef.current.has(peerId)
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
      if (hadViewer || hadCall || hadConn) publishViewerRoster()
    },
    [publishViewerRoster]
  )

  const upsertViewer = useCallback(
    (peerId, name, camera, clientId) => {
      const clean = normalizeDisplayName(name)
      if (!peerId || !isValidDisplayName(clean)) return
      const prev = viewersMapRef.current.get(peerId)
      const nextCamera = typeof camera === 'boolean' ? camera : !!prev?.camera
      const nextClientId = clientId || prev?.clientId || ''
      viewersMapRef.current.set(peerId, {
        peerId,
        name: clean,
        camera: nextCamera,
        clientId: nextClientId,
        lastSeen: Date.now(),
      })
      if (!prev || prev.name !== clean || !!prev.camera !== nextCamera) publishViewerRoster()
    },
    [publishViewerRoster]
  )

  const dropViewerConnection = useCallback(
    (peerId) => {
      const conn = dataConnsRef.current.get(peerId)
      try {
        if (conn?.open) conn.send(JSON.stringify({ type: 'kicked' }))
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          callsRef.current.get(peerId)?.close()
        } catch {
          /* ignore */
        }
        try {
          conn?.close()
        } catch {
          /* ignore */
        }
        removeViewer(peerId)
      }, 200)
    },
    [removeViewer]
  )

  const kickViewer = useCallback(
    (peerId) => {
      const entry = viewersMapRef.current.get(peerId)
      if (!entry) return
      const nameKey = entry.name.toLowerCase()
      if (!bannedNamesRef.current.includes(nameKey)) {
        bannedNamesRef.current = [...bannedNamesRef.current, nameKey]
      }
      if (entry.clientId && !bannedClientIdsRef.current.includes(entry.clientId)) {
        bannedClientIdsRef.current = [...bannedClientIdsRef.current, entry.clientId]
      }
      setRemovedViewers((prev) =>
        prev.some((viewer) => viewer.name.toLowerCase() === nameKey)
          ? prev
          : [...prev, { name: entry.name }]
      )
      dropViewerConnection(peerId)
      setStatusDetail(`${entry.name} was removed for this set.`)
    },
    [dropViewerConnection]
  )

  const pruneViewers = useCallback(() => {
    let changed = false
    for (const peerId of [...viewersMapRef.current.keys()]) {
      const conn = dataConnsRef.current.get(peerId)
      if (conn?.open) {
        const entry = viewersMapRef.current.get(peerId)
        if (entry) entry.lastSeen = Date.now()
        continue
      }
      viewersMapRef.current.delete(peerId)
      try {
        callsRef.current.get(peerId)?.close?.()
      } catch {
        /* ignore */
      }
      callsRef.current.delete(peerId)
      dataConnsRef.current.delete(peerId)
      changed = true
    }
    for (const [peerId, conn] of [...dataConnsRef.current.entries()]) {
      if (!conn?.open) {
        dataConnsRef.current.delete(peerId)
        if (viewersMapRef.current.delete(peerId)) changed = true
        callsRef.current.delete(peerId)
      }
    }
    for (const [peerId, call] of [...callsRef.current.entries()]) {
      if (call?.open === false) {
        callsRef.current.delete(peerId)
        changed = true
      }
    }
    if (changed) publishViewerRoster()
  }, [publishViewerRoster])

  const sendHostChat = (text) => {
    const msg = makeChatMessage({ name: 'linturo', text, role: 'host' })
    if (!msg.text) return
    appendChat(msg)
    broadcastData(msg)
  }

  const sendViewerChat = (text) => {
    const msg = makeChatMessage({ name: chatNameRef.current, text, role: 'viewer' })
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

  const publishRecording = async (blobOverride) => {
    const blob = blobOverride || review?.blob
    if (!blob) return
    const token = accessTokenRef.current
    if (!token) {
      setPublishState('error')
      setPublishDetail('Sign in again to publish.')
      return
    }
    setPublishState('uploading')
    setPublishDetail('Uploading to S3…')
    setUploadProgress(0)
    try {
      const { key } = await uploadRecordingBlob(blob, {
        accessToken: token,
        id: review.id,
        onProgress: setUploadProgress,
      })
      setPublishState('publishing')
      setPublishDetail('Saving to Videos…')
      await publishLiveVideo({
        accessToken: token,
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
    if (startingRef.current) return
    startingRef.current = true
    roomLockedRef.current = false
    setRoomLocked(false)
    bannedNamesRef.current = []
    bannedClientIdsRef.current = []
    setRemovedViewers([])
    callsRef.current.forEach((call) => {
      try {
        call.close()
      } catch {
        /* ignore */
      }
    })
    callsRef.current.clear()
    dataConnsRef.current.clear()
    viewersMapRef.current.clear()
    setViewerList([])
    setViewerCount(0)
    setAudienceStreams({})
    clearInterval(viewerPruneTimerRef.current)
    peerRef.current?.destroy()
    peerRef.current = null
    // Drop the canvas track only. Stopping the mic here makes the next getUserMedia prompt again.
    outboundStreamRef.current?.getVideoTracks?.().forEach((track) => track.stop())
    outboundStreamRef.current = null

    setStatus('connecting')
    setStatusDetail('Requesting camera + audio…')

    try {
      const listed = await requestDeviceAccess()

      const camId =
        listed?.videoId ||
        videoDeviceId ||
        pickPreferredCamera(
          (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'),
          ''
        )
      if (!camId) throw new Error('No camera found — connect the USB camera and Refresh.')
      setVideoDeviceId(camId)

      const liveVideo = liveKindTrack(localStreamRef.current, 'video')
      const liveVideoId = liveVideo?.getSettings?.().deviceId || ''
      if (!liveVideo) {
        await applyCameraStream(camId)
      } else if (liveVideoId && liveVideoId !== camId) {
        try {
          await liveVideo.applyConstraints({
            deviceId: { exact: camId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          })
        } catch {
          /* Keep the camera from the grant. Switching is an explicit dropdown change. */
        }
      }

      const audioId = listed?.audioId || audioDeviceId
      if (audioId) setAudioDeviceId(audioId)
      // Reuses the track from requestDeviceAccess. Does not call getUserMedia when that track is live.
      const audioTrack = await acquireBroadcastAudio(audioId)

      const local = localStreamRef.current
      if (local) {
        local.getAudioTracks().forEach((t) => {
          local.removeTrack(t)
          // don't stop yet — setupBroadcastAudio owns the raw track lifecycle
        })
      }

      const broadcastAudio = await setupBroadcastAudio(audioTrack)
      if (!broadcastAudio) throw new Error('Could not open audio input for broadcast.')

      if (local) local.addTrack(audioTrack)

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
      if (videoTrack) {
        videoTrack.enabled = true
        try {
          videoTrack.contentHint = 'motion'
        } catch {
          /* ignore */
        }
      }
      const outbound = new MediaStream([videoTrack, broadcastAudio].filter(Boolean))
      outboundStreamRef.current = outbound

      setStatusDetail('Opening live room…')
      const peerId = makeHostPeerId()
      hostPeerIdRef.current = peerId
      const peer = new Peer(peerId, LIVE_PEER_OPTIONS)
      peerRef.current = peer

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Signaling timed out — check network and try again.'))
        }, 15000)
        peer.on('open', (id) => {
          clearTimeout(timer)
          resolve(id)
        })
        peer.on('error', (err) => {
          clearTimeout(timer)
          if (err?.type === 'unavailable-id') {
            reject(new Error('Could not claim live room — try Go live again.'))
          } else if (err?.type === 'network' || /fetch|network/i.test(String(err?.message || err))) {
            reject(new Error('Could not reach live signaling server. Retry Go live.'))
          } else {
            reject(new Error(err?.message || String(err) || 'Live peer error'))
          }
        })
      })

      const token = accessTokenRef.current
      if (!token) throw new Error('Sign in to go live.')
      try {
        await setLivePresence({ accessToken: token, live: true, peerId })
        notifyLiveList({ accessToken: token }).catch(() => {})
        clearInterval(presenceTimerRef.current)
        presenceTimerRef.current = setInterval(() => {
          setLivePresence({ accessToken: token, live: true, peerId }).catch(() => {})
        }, 20000)
      } catch (presenceErr) {
        console.error('presence publish failed', presenceErr)
        setStatusDetail(
          'Live room is up, but presence sync failed — viewers may need a moment / retry Join.'
        )
      }

      const alreadyInRoom = (peerId) =>
        viewersMapRef.current.has(peerId) ||
        dataConnsRef.current.has(peerId) ||
        callsRef.current.has(peerId)

      const refuseNewcomer = (peerId) =>
        roomLockedRef.current && !alreadyInRoom(peerId)

      peer.on('call', (call) => {
        if (refuseNewcomer(call.peer)) {
          call.close()
          return
        }
        const stream = outboundStreamRef.current
        if (!stream?.getTracks?.().length) {
          call.close()
          return
        }
        // Do NOT clone WebRTC tracks — cloned canvas/audio tracks often go silent on mobile.
        stream.getAudioTracks().forEach((t) => {
          t.enabled = true
        })
        call.answer(stream)
        callsRef.current.set(call.peer, call)
        call.on('stream', (remote) => {
          if (remote) {
            setAudienceStreams((prev) =>
              prev[call.peer] === remote ? prev : { ...prev, [call.peer]: remote }
            )
          }
        })
        call.on('close', () => {
          callsRef.current.delete(call.peer)
          setAudienceStreams((prev) => {
            if (!prev[call.peer]) return prev
            const next = { ...prev }
            delete next[call.peer]
            return next
          })
          // Drop from roster if their data channel is also gone
          const conn = dataConnsRef.current.get(call.peer)
          if (!conn?.open) removeViewer(call.peer)
        })
        call.on('error', () => {
          callsRef.current.delete(call.peer)
          const conn = dataConnsRef.current.get(call.peer)
          if (!conn?.open) removeViewer(call.peer)
        })
      })

      peer.on('connection', (conn) => {
        if (refuseNewcomer(conn.peer)) {
          conn.on('open', () => {
            try {
              conn.send(JSON.stringify({ type: 'locked' }))
            } catch {
              /* ignore */
            }
            conn.close()
          })
          return
        }
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
            const viewers = Array.from(viewersMapRef.current.values()).map(
              ({ peerId, name, camera }) => ({ peerId, name, camera: !!camera })
            )
            conn.send(JSON.stringify({ type: 'viewer-list', viewers }))
            conn.send(JSON.stringify({ type: 'viewers', count: viewers.length }))
          } catch {
            /* ignore */
          }
        })
        conn.on('data', (raw) => {
          const msg = parseLivePayload(raw)
          if (!msg) return
          if (msg.type === 'hello') {
            const banned = isLiveBan(
              msg.name,
              msg.clientId,
              bannedNamesRef.current,
              bannedClientIdsRef.current
            )
            const clientBanned = msg.clientId && bannedClientIdsRef.current.includes(msg.clientId)
            const alreadyHere = viewersMapRef.current.has(conn.peer)
            if (clientBanned || (banned && !alreadyHere)) {
              dropViewerConnection(conn.peer)
              return
            }
            upsertViewer(conn.peer, msg.name, msg.camera, msg.clientId)
            return
          }
          if (msg.type === 'camera') {
            const entry = viewersMapRef.current.get(conn.peer)
            if (entry && !!entry.camera !== !!msg.on) {
              entry.camera = !!msg.on
              publishViewerRoster()
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
          removeViewer(conn.peer)
          if (dataConnsRef.current.size === 0) setChatConnected(false)
        })
        conn.on('error', () => {
          removeViewer(conn.peer)
        })
      })

      clearInterval(viewerPruneTimerRef.current)
      viewerPruneTimerRef.current = setInterval(() => {
        pruneViewers()
      }, 4000)

      peer.on('disconnected', () => {
        setStatusDetail('Signal disconnected — reconnecting…')
        peer.reconnect()
      })

      setStatus('live')
      setStatusDetail('You are live. Meter moving = XDJ is reaching the host. Viewers: tap Tap for sound if silent.')
      setChatConnected(true)
      publishViewerRoster()
    } catch (err) {
      console.error(err)
      teardownBroadcast()
      setStatus('error')
      setStatusDetail(err?.message || 'Could not start broadcast')
    } finally {
      startingRef.current = false
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

  const upsertAudienceStream = useCallback((peerId, stream) => {
    if (!peerId || !stream) return
    setAudienceStreams((prev) => (prev[peerId] === stream ? prev : { ...prev, [peerId]: stream }))
  }, [])

  const removeAudienceStream = useCallback((peerId) => {
    if (!peerId) return
    setAudienceStreams((prev) => {
      if (!prev[peerId]) return prev
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }, [])

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
          const sender = senders.find((s) => s.track?.kind === track.kind)
          if (!sender) continue
          tasks.push(sender.replaceTrack(track).catch(() => {}))
        }
      })
      await Promise.all(tasks)
      if (!pending) return
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }, [currentOutboundStream])

  const attachMeshCall = useCallback(
    (call) => {
      if (!call?.peer || call.peer === viewerHostIdRef.current) return
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
      call.on('stream', (remote) => upsertAudienceStream(peerId, remote))
      call.on('close', () => {
        if (callsRef.current.get(peerId) === call) callsRef.current.delete(peerId)
        removeAudienceStream(peerId)
      })
      call.on('error', () => {
        if (callsRef.current.get(peerId) === call) callsRef.current.delete(peerId)
      })
    },
    [upsertAudienceStream, removeAudienceStream]
  )

  const connectAsViewer = useCallback(async () => {
    const name = normalizeDisplayName(chatNameRef.current)
    if (!isValidDisplayName(name)) {
      setJoinNameError('Enter a username (at least 2 characters) to join.')
      setStatus('idle')
      setStatusDetail('Choose a username, then join.')
      return
    }
    setJoinNameError('')
    saveGuestName(name)
    setChatName(name)

    teardownViewer()
    viewerLockedRef.current = false
    viewerKickedRef.current = false
    const session = viewerSessionRef.current
    setStatus('connecting')
    setStatusDetail('Looking for the live set…')
    setNeedsGesture(false)
    setChatMessages([])
    setViewerList([])
    setViewerCount(0)

    const stillCurrent = () => session === viewerSessionRef.current

    const scheduleReconnect = () => {
      if (viewerLockedRef.current || viewerKickedRef.current) return
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => {
        if (viewerWantsJoin) connectAsViewer()
      }, 5000)
    }

    const sendHello = (conn) => {
      try {
        conn.send(
          JSON.stringify({
            type: 'hello',
            name: chatNameRef.current,
            camera: camOnRef.current,
            clientId: liveClientId(),
          })
        )
      } catch {
        /* ignore */
      }
    }

    try {
      const presence = await fetchLivePresence()
      if (!stillCurrent()) return
      if (!presence.live || !presence.peerId) {
        setStatus('offline')
        setStatusDetail('linturo is not live right now.')
        scheduleReconnect()
        return
      }
      viewerHostIdRef.current = presence.peerId

      const peer = new Peer(LIVE_PEER_OPTIONS)
      if (!stillCurrent()) {
        peer.destroy()
        return
      }
      peerRef.current = peer

      const openedId = await new Promise((resolve, reject) => {
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
      setMyPeerId(openedId || peer.id || '')

      const handshake = createHandshakeStream()
      handshakeRef.current = handshake

      peer.on('call', (incoming) => {
        if (!stillCurrent()) return
        if (incoming.peer === viewerHostIdRef.current) {
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
        attachMeshCall(incoming)
      })

      // Data channel first — confirms host is reachable
      const dataConn = peer.connect(presence.peerId, { reliable: true })
      viewerDataConnRef.current = dataConn

      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Chat channel timeout')), 10000)
        dataConn.on('open', () => {
          clearTimeout(t)
          resolve()
        })
        dataConn.on('error', (err) => {
          clearTimeout(t)
          reject(err)
        })
        peer.on('error', (err) => {
          if (err?.type === 'peer-unavailable') {
            clearTimeout(t)
            reject(err)
          }
        })
      })

      if (!stillCurrent()) return
      setChatConnected(true)
      sendHello(dataConn)

      clearInterval(viewerPingTimerRef.current)
      viewerPingTimerRef.current = setInterval(() => {
        if (!stillCurrent()) return
        try {
          if (viewerDataConnRef.current?.open) {
            viewerDataConnRef.current.send(JSON.stringify({ type: 'ping' }))
            sendHello(viewerDataConnRef.current)
          }
        } catch {
          /* ignore */
        }
      }, 15000)

      dataConn.on('data', (raw) => {
        if (!stillCurrent()) return
        const msg = parseLivePayload(raw)
        if (!msg) return
        if (msg.type === 'viewer-list') {
          setViewerList(msg.viewers)
          setViewerCount(msg.viewers.length)
        }
        if (msg.type === 'viewers') setViewerCount(msg.count)
        if (msg.type === 'chat') appendChat(msg)
        if (msg.type === 'history') msg.messages.forEach((m) => appendChat(m))
        if (msg.type === 'locked') {
          viewerLockedRef.current = true
          clearTimeout(reconnectTimerRef.current)
          setViewerWantsJoin(false)
          setStatus('offline')
          setStatusDetail('This set is locked.')
        }
        if (msg.type === 'kicked') {
          viewerKickedRef.current = true
          clearTimeout(reconnectTimerRef.current)
          setViewerWantsJoin(false)
          teardownViewer()
          setStatus('offline')
          setStatusDetail('The host removed you from this set.')
        }
      })
      dataConn.on('close', () => {
        if (!stillCurrent()) return
        setChatConnected(false)
        setViewerCount(0)
        setViewerList([])
      })

      const call = peer.call(presence.peerId, handshake.stream)
      if (!call) throw new Error('Could not reach host')
      callsRef.current.set('host', call)

      const timeout = setTimeout(() => {
        if (!stillCurrent()) return
        setStatus('offline')
        setStatusDetail('Connected to room but no video yet — retrying…')
        scheduleReconnect()
      }, 20000)

      call.on('stream', async (remote) => {
        if (!stillCurrent()) return
        const tracks = remote?.getTracks?.() || []
        if (!tracks.length) return
        clearTimeout(timeout)
        hadRemoteStreamRef.current = true

        const audioTracks = remote.getAudioTracks?.() || []
        audioTracks.forEach((t) => {
          t.enabled = true
        })

        const el = viewerVideoRef.current
        if (!el) return
        el.srcObject = remote
        el.setAttribute('playsinline', '')
        el.setAttribute('webkit-playsinline', '')
        el.playsInline = true

        // Try unmuted first — Join tap counts as a gesture on many phones
        el.volume = 1
        el.removeAttribute('muted')
        el.muted = false
        setMuted(false)
        try {
          await el.play()
          setStatus('live')
          setAudioKick((n) => n + 1)
          setStatusDetail(
            audioTracks.length ? 'Connected' : 'Connected — no audio track from host'
          )
          setNeedsGesture(false)
        } catch {
          el.muted = true
          el.setAttribute('muted', '')
          setMuted(true)
          try {
            await el.play()
          } catch {
            /* ignore */
          }
          setStatus('live')
          setNeedsGesture(true)
          setStatusDetail('Tap for sound')
        }
      })

      call.on('close', () => {
        if (!stillCurrent()) return
        clearTimeout(timeout)
        setTimeout(() => {
          if (!stillCurrent() || viewerLockedRef.current || viewerKickedRef.current) return
          const wasLive = hadRemoteStreamRef.current
          hadRemoteStreamRef.current = false
          if (viewerVideoRef.current) viewerVideoRef.current.srcObject = null
          setViewerCount(0)
          setViewerList([])
          setChatConnected(false)
          setStatus('offline')
          setStatusDetail(
            wasLive ? 'Connection dropped — retrying…' : 'Could not start video — retrying…'
          )
          scheduleReconnect()
        }, 700)
      })

      call.on('error', () => {
        if (!stillCurrent()) return
        clearTimeout(timeout)
        setTimeout(() => {
          if (!stillCurrent() || viewerLockedRef.current || viewerKickedRef.current) return
          setViewerCount(0)
          setViewerList([])
          setStatus('offline')
          setStatusDetail('Connection issue — retrying…')
          scheduleReconnect()
        }, 700)
      })
    } catch (err) {
      console.error(err)
      if (!stillCurrent()) return
      setViewerCount(0)
      setViewerList([])
      setStatus('offline')
      setStatusDetail(
        err?.type === 'peer-unavailable'
          ? 'linturo is not live right now.'
          : 'Could not connect — retrying…'
      )
      scheduleReconnect()
    }
  }, [teardownViewer, appendChat, viewerWantsJoin, currentOutboundStream, attachMeshCall])

  useEffect(() => {
    if (mode !== 'viewer') {
      clearTimeout(reconnectTimerRef.current)
      setViewerWantsJoin(false)
      return undefined
    }
    // Wait for explicit tap on phones — autoplay + WebRTC need a gesture
    setStatus('idle')
    setStatusDetail('Tap Join live when the set is going.')
    return () => {
      clearTimeout(reconnectTimerRef.current)
      teardownViewer()
    }
  }, [mode, teardownViewer])

  useEffect(() => {
    if (mode !== 'viewer' || status !== 'live') return undefined
    const peer = peerRef.current
    const myId = peer?.id
    if (!peer || !myId) return undefined

    const dial = () => {
      const stream = currentOutboundStream()
      if (!stream) return
      const hostId = viewerHostIdRef.current
      const others = viewerList.filter(
        (viewer) => viewer.peerId && viewer.peerId !== myId && viewer.peerId !== hostId
      )
      const otherIds = new Set(others.map((viewer) => viewer.peerId))

      for (const [id, call] of [...callsRef.current.entries()]) {
        if (id === 'host') continue
        if (otherIds.has(id)) continue
        try {
          call.close()
        } catch {
          /* ignore */
        }
        callsRef.current.delete(id)
        removeAudienceStream(id)
      }

      for (const other of others) {
        if (callsRef.current.has(other.peerId)) continue
        if (myId > other.peerId) continue
        try {
          const call = peer.call(other.peerId, currentOutboundStream() || stream)
          if (!call) continue
          attachMeshCall(call)
        } catch {
          callsRef.current.delete(other.peerId)
        }
      }
    }

    dial()
    const timer = setInterval(dial, 2500)
    return () => clearInterval(timer)
  }, [mode, status, viewerList, currentOutboundStream, attachMeshCall, removeAudienceStream])

  const unmuteViewer = async () => {
    const el = viewerVideoRef.current
    if (!el) return
    const remote = el.srcObject
    remote?.getAudioTracks?.()?.forEach((t) => {
      t.enabled = true
    })
    el.volume = 1
    el.removeAttribute('muted')
    el.muted = false
    setMuted(false)
    setNeedsGesture(false)
    setAudioKick((n) => n + 1)
    try {
      await el.play()
      setStatusDetail('Sound on')
    } catch (err) {
      console.error(err)
      setStatusDetail('Could not unmute — check phone silent switch')
      setNeedsGesture(true)
    }
  }

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

  const sendCameraFlag = (on) => {
    try {
      viewerDataConnRef.current?.send(JSON.stringify({ type: 'camera', on }))
    } catch {
      /* ignore */
    }
  }

  const toggleCamera = async () => {
    if (mediaBusy) return
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
      sendCameraFlag(next)
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
    if (mediaBusy) return
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

  const setEffect = (key, value) => {
    setPresetId('')
    setEffects((prev) => ({ ...prev, [key]: value }))
  }

  const applyPreset = (id) => {
    const preset = VIDEO_PRESETS.find((p) => p.id === id)
    if (!preset) return
    setPresetId(id)
    setEffects({ ...preset.effects })
  }

  const audienceTiles = []
  if (mode === 'viewer' && status === 'live') {
    audienceTiles.push({
      key: 'local',
      label: `${chatName || 'You'} (You)`,
      stream: localStream,
      isLocal: true,
      cameraOn: camOn,
    })
  }
  if ((mode === 'viewer' || mode === 'host') && status === 'live') {
    for (const viewer of viewerList) {
      if (mode === 'viewer' && viewer.peerId === myPeerId) continue
      audienceTiles.push({
        key: viewer.peerId,
        label: viewer.name,
        stream: audienceStreams[viewer.peerId] || null,
        isLocal: false,
        cameraOn: !!viewer.camera,
      })
    }
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
          {status === 'live' ? `${viewerCount} watching` : status}
        </div>
      </header>

      {mode === 'viewer' ? (
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="relative flex-1 bg-black flex items-center justify-center min-h-[40dvh]">
            <video
              ref={viewerVideoRef}
              className="w-full h-full max-h-[52dvh] object-contain bg-black"
              playsInline
              autoPlay
              muted={muted}
            />
            {status !== 'live' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm sm:text-base text-mute pointer-events-none">
                  {statusDetail || 'Ready when you are.'}
                </p>
                {status === 'connecting' ? (
                  <p className="text-xs text-mute pointer-events-none">Connecting…</p>
                ) : (
                  <div className="w-full max-w-xs space-y-3">
                    <label className="block text-left space-y-1.5">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-mute">
                        Username
                      </span>
                      <input
                        type="text"
                        value={chatName}
                        onChange={(e) => {
                          setChatName(normalizeDisplayName(e.target.value))
                          setJoinNameError('')
                        }}
                        maxLength={24}
                        placeholder="Pick a name"
                        className="w-full px-3 py-2.5 border border-hairline bg-black text-paper text-sm focus:outline-none focus:border-paper"
                        autoComplete="nickname"
                      />
                    </label>
                    {joinNameError ? (
                      <p className="text-xs text-paper/80">{joinNameError}</p>
                    ) : (
                      <p className="text-[11px] text-mute">Required to join — others will see it.</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isValidDisplayName(chatName)) {
                          setJoinNameError('Enter a username (at least 2 characters) to join.')
                          return
                        }
                        setViewerWantsJoin(true)
                        connectAsViewer()
                      }}
                      className="w-full px-5 py-3 bg-paper text-ink text-sm font-medium disabled:opacity-40"
                      disabled={!isValidDisplayName(chatName)}
                    >
                      {status === 'offline' ? 'Retry join' : 'Join live'}
                    </button>
                  </div>
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
          {status === 'live' && (
            <>
              <LiveAudienceGrid tiles={audienceTiles} audioKick={audioKick} />
              <div className="px-4 sm:px-6 py-2.5 border-t border-hairline flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCamera}
                  disabled={mediaBusy}
                  className={`px-3 py-2 border text-xs uppercase tracking-[0.16em] disabled:opacity-40 ${
                    camOn
                      ? 'border-paper bg-paper text-ink'
                      : 'border-hairline text-mute hover:text-paper'
                  }`}
                >
                  {camOn ? 'Camera on' : 'Camera off'}
                </button>
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={mediaBusy}
                  className={`px-3 py-2 border text-xs uppercase tracking-[0.16em] disabled:opacity-40 ${
                    micOn
                      ? 'border-paper bg-paper text-ink'
                      : 'border-hairline text-mute hover:text-paper'
                  }`}
                >
                  {micOn ? 'Mic on' : 'Mic off'}
                </button>
                {mediaError ? (
                  <p className="w-full text-xs text-paper/80">{mediaError}</p>
                ) : (
                  <p className="w-full text-[11px] text-mute">
                    Camera and mic stay off until you turn them on. Your mic is heard in the room,
                    not in the recording.
                  </p>
                )}
              </div>
            </>
          )}
          <div className="px-4 sm:px-6 py-3 border-t border-hairline space-y-3">
            <LiveChat
              messages={chatMessages}
              onSend={sendViewerChat}
              name={chatName}
              onNameChange={(n) => setChatName(saveGuestName(n))}
              nameReadOnly={status === 'live'}
              disabled={status !== 'live' || !chatConnected}
              placeholder="Chat with the room…"
            />
          </div>
          <div className="px-4 sm:px-6 py-3 border-t border-hairline flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs sm:text-sm text-mute">
              The set stays on top. Everyone else is in the grid below.
            </p>
            <button
              type="button"
              onClick={() => {
                setViewerWantsJoin(false)
                teardownViewer()
                setStatus('idle')
                setStatusDetail('')
                setChatMessages([])
                setViewerList([])
                setViewerCount(0)
                if (!isAuthenticated) {
                  navigate('/login', {
                    state: { from: { pathname: '/live' }, openHost: true },
                  })
                  return
                }
                setMode('gate')
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
          <div className="w-full max-w-sm border border-hairline p-6 space-y-4">
            <h2 className="text-lg font-medium">Host controls</h2>
            <p className="text-sm text-mute leading-relaxed">
              Broadcast from this browser with your camera and XDJ-AZ as the audio input.
            </p>
            {isAuthenticated ? (
              <p className="text-xs text-mute">
                Signed in as <span className="text-paper">{user?.email}</span>
              </p>
            ) : (
              <p className="text-xs text-mute">Sign in to unlock the broadcast panel.</p>
            )}
            <div className="flex flex-col gap-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={enterHostMode}
                  className="w-full px-4 py-2.5 bg-paper text-ink text-sm font-medium"
                >
                  Open broadcast panel
                </button>
              ) : (
                <Link
                  to="/login"
                  state={{ from: { pathname: '/live' }, openHost: true }}
                  className="w-full px-4 py-2.5 bg-paper text-ink text-sm font-medium text-center"
                >
                  Sign in
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMode('viewer')}
                className="w-full px-4 py-2.5 border border-hairline text-sm text-mute hover:text-paper"
              >
                Back to viewer
              </button>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setMode('viewer')
                  }}
                  className="w-full px-4 py-2.5 text-xs uppercase tracking-[0.2em] text-mute hover:text-paper"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'host' ? (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="relative flex-1 bg-black min-h-[36dvh] lg:min-h-0 flex items-center justify-center">
              <video
                ref={previewVideoRef}
                className="absolute opacity-0 pointer-events-none w-px h-px"
                playsInline
                muted
                autoPlay
              />
              <canvas
                ref={canvasRef}
                className="w-full h-full max-h-[52dvh] lg:max-h-none object-contain"
              />
              {status !== 'live' && status !== 'preview' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-sm text-mute px-6 text-center">{statusDetail}</p>
                </div>
              )}
            </div>
            {status === 'live' && (
              <LiveAudienceGrid tiles={audienceTiles} audioKick={audioKick} />
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
                    Choose the XDJ-AZ master/USB out. Echo cancel and AGC are off.
                  </p>
                  <div className="space-y-2 pt-1">
                    <label className="block space-y-1.5">
                      <div className="flex justify-between text-[11px] text-mute">
                        <span>Meter gain</span>
                        <span className="tabular-nums text-paper/70">
                          {Math.round(inputGain * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2.5}
                        step={0.05}
                        value={inputGain}
                        onChange={(e) => setInputGain(Number(e.target.value))}
                        className={fieldClass}
                      />
                    </label>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-mute">Input level</span>
                      <span
                        className={
                          audioBroadcasting && audioLevel > 0.03
                            ? 'text-paper'
                            : 'text-mute'
                        }
                      >
                        {!audioBroadcasting
                          ? status === 'live'
                            ? 'No audio track'
                            : 'Go live to meter'
                          : audioLevel > 0.03
                            ? 'Signal in'
                            : 'Silent — raise gain / XDJ master'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-hairline overflow-hidden border border-hairline">
                      <div
                        className={`h-full transition-[width] duration-75 ${
                          audioLevel > 0.85 ? 'bg-paper' : 'bg-mute'
                        }`}
                        style={{ width: `${Math.max(2, Math.round(audioLevel * 100))}%` }}
                      />
                    </div>
                  </div>
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

              {isAuthenticated && accessToken ? (
                <ListAnnounce accessToken={accessToken} />
              ) : null}

              {status === 'live' && (
                <div className="space-y-3 pt-2 border-t border-hairline">
                  <p className="text-xs uppercase tracking-[0.24em] text-mute">Room</p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !roomLockedRef.current
                      roomLockedRef.current = next
                      setRoomLocked(next)
                      setStatusDetail(
                        next
                          ? 'Room locked. People already in stay. No one new can join.'
                          : 'Room unlocked. New viewers can join.'
                      )
                    }}
                    className={`w-full px-4 py-2.5 border text-sm font-medium ${
                      roomLocked
                        ? 'border-paper bg-paper text-ink'
                        : 'border-hairline text-paper hover:border-paper'
                    }`}
                  >
                    {roomLocked ? 'Unlock room' : 'Lock room'}
                  </button>
                  <p className="text-[11px] text-mute leading-relaxed">
                    {roomLocked
                      ? 'Locked. Viewers already connected stay. New joins are refused.'
                      : 'Open. Anyone can join the set.'}
                  </p>
                </div>
              )}

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
                <LiveRecordingReview
                  review={review}
                  reviewTitle={reviewTitle}
                  onTitleChange={setReviewTitle}
                  publishState={publishState}
                  publishDetail={publishDetail}
                  uploadProgress={uploadProgress}
                  onPublish={publishRecording}
                  onDiscard={clearReview}
                />
              )}

              <div className="space-y-3 pt-2 border-t border-hairline">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-mute">Room</p>
                  <p className="text-xs text-mute tabular-nums">{viewerCount} watching</p>
                </div>
                <LiveViewerList viewers={viewerList} onKick={status === 'live' ? kickViewer : undefined} />
                {removedViewers.length > 0 && (
                  <p className="text-[11px] text-mute leading-relaxed">
                    Removed this set: {removedViewers.map((viewer) => viewer.name).join(', ')}. They
                    stay out until you end the stream.
                  </p>
                )}
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
                <div className="grid grid-cols-3 gap-1.5">
                  {VIDEO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={`px-2 py-1.5 text-[11px] border transition-colors ${
                        presetId === preset.id
                          ? 'border-paper bg-paper text-ink'
                          : 'border-hairline text-mute hover:text-paper hover:border-paper'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
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
                  onClick={() => {
                    setPresetId('')
                    setEffects(DEFAULT_EFFECTS)
                  }}
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
