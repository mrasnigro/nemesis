/**
 * Draws what the audience sees onto one canvas: the shared screen full size with the presenter's
 * camera in a corner, or the camera alone. The recorder reads the canvas, so starting or stopping a
 * screen share never restarts the recording (the old studio only ever recorded the camera, so
 * viewers never saw a shared screen).
 */

export const OUTPUT_WIDTH = 1280
export const OUTPUT_HEIGHT = 720
const FPS = 24
const CAMERA_PIP_WIDTH = 0.22

function makeVideo() {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  return video
}

/**
 * Calls `tick` on an interval that keeps running when the presenter switches to the window they are
 * sharing. Browsers slow timers (and stop animation frames) in background tabs, which would freeze
 * the picture; a worker's timer is not slowed that way.
 */
function createTicker(tick, intervalMs) {
  let worker = null
  let timer = null
  const fallback = () => {
    if (worker) {
      worker.terminate()
      worker = null
    }
    if (!timer) timer = setInterval(tick, intervalMs)
  }
  try {
    const source = 'let t;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}'
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
    worker = new Worker(url)
    URL.revokeObjectURL(url)
    worker.onmessage = tick
    worker.onerror = fallback
    worker.postMessage(intervalMs)
  } catch {
    fallback()
  }
  return {
    stop() {
      if (worker) {
        worker.postMessage(0)
        worker.terminate()
        worker = null
      }
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
  }
}

/** Largest rectangle of the video's aspect ratio that fits inside the box, centred. */
export function containRect(videoWidth, videoHeight, boxWidth, boxHeight) {
  if (!videoWidth || !videoHeight) return null
  const scale = Math.min(boxWidth / videoWidth, boxHeight / videoHeight)
  const width = videoWidth * scale
  const height = videoHeight * scale
  return { x: (boxWidth - width) / 2, y: (boxHeight - height) / 2, width, height }
}

export function createCompositor() {
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_WIDTH
  canvas.height = OUTPUT_HEIGHT
  const context = canvas.getContext('2d', { alpha: false })

  const camera = makeVideo()
  const screen = makeVideo()
  let hasCamera = false
  let hasScreen = false

  function draw() {
    context.fillStyle = '#000'
    context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)

    if (hasScreen) {
      const rect = containRect(screen.videoWidth, screen.videoHeight, OUTPUT_WIDTH, OUTPUT_HEIGHT)
      if (rect) context.drawImage(screen, rect.x, rect.y, rect.width, rect.height)
      const pipWidth = OUTPUT_WIDTH * CAMERA_PIP_WIDTH
      const pip = hasCamera ? containRect(camera.videoWidth, camera.videoHeight, pipWidth, pipWidth) : null
      if (pip) {
        const x = OUTPUT_WIDTH - pip.width - 24
        const y = OUTPUT_HEIGHT - pip.height - 24
        context.fillStyle = '#fff'
        context.fillRect(x - 3, y - 3, pip.width + 6, pip.height + 6)
        context.drawImage(camera, x, y, pip.width, pip.height)
      }
    } else if (hasCamera) {
      const rect = containRect(camera.videoWidth, camera.videoHeight, OUTPUT_WIDTH, OUTPUT_HEIGHT)
      if (rect) context.drawImage(camera, rect.x, rect.y, rect.width, rect.height)
    }
  }

  const ticker = createTicker(draw, 1000 / FPS)
  const videoStream = canvas.captureStream(FPS)

  function attach(video, stream) {
    video.srcObject = stream
    if (stream) video.play().catch(() => {})
  }

  return {
    /** The picture the audience gets, as a stream (video only; the caller adds the microphone). */
    videoTrack: videoStream.getVideoTracks()[0],
    setCamera(stream) {
      hasCamera = Boolean(stream)
      attach(camera, stream)
    },
    setScreen(stream) {
      hasScreen = Boolean(stream)
      attach(screen, stream)
    },
    destroy() {
      ticker.stop()
      camera.srcObject = null
      screen.srcObject = null
      videoStream.getTracks().forEach((track) => track.stop())
    },
  }
}
