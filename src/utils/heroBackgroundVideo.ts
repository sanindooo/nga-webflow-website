/**
 * Hero Background Video — reads a YouTube or Vimeo URL from
 * `[data-hero-video]` on a wrapper, builds the correct background-style
 * embed URL, points the child iframe at it, and (if a poster exists on
 * the same wrapper) keeps the poster visible until the video is actually
 * playing — then fades it out. This hides YouTube's brief chrome flash
 * on load and any letterbox / first-frame ugliness.
 *
 * Markup contract:
 *   <div class="hero-video" data-hero-video="{{ CMS URL }}">
 *     <img class="hero-video_poster" src="..." />   <- optional but recommended
 *     <iframe src="" allow="..." title="..."></iframe>
 *   </div>
 *
 * When playback begins, the wrapper gets `is-video-ready` — CSS fades the
 * poster out from there.
 */

type VideoSource =
  | { platform: 'youtube'; id: string }
  | { platform: 'vimeo'; id: string; hash?: string }

const parseVideoUrl = (url: string): VideoSource | null => {
  const trimmed = url.trim()
  if (!trimmed) return null

  const youtube = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
  if (youtube) return { platform: 'youtube', id: youtube[1] }

  const vimeo = trimmed.match(
    /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/,
  )
  if (vimeo) return { platform: 'vimeo', id: vimeo[1], hash: vimeo[2] }

  return null
}

const buildEmbedUrl = (source: VideoSource): string => {
  if (source.platform === 'youtube') {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      loop: '1',
      playlist: source.id,
      controls: '0',
      showinfo: '0',
      modestbranding: '1',
      rel: '0',
      iv_load_policy: '3',
      playsinline: '1',
      disablekb: '1',
      enablejsapi: '1',
    })
    return `https://www.youtube-nocookie.com/embed/${source.id}?${params}`
  }

  const params = new URLSearchParams({
    background: '1',
    autoplay: '1',
    loop: '1',
    muted: '1',
    controls: '0',
  })
  if (source.hash) params.set('h', source.hash)
  return `https://player.vimeo.com/video/${source.id}?${params}`
}

const allowAttrFor = (platform: VideoSource['platform']): string =>
  platform === 'youtube' ? 'autoplay; encrypted-media' : 'autoplay; fullscreen'

const markReady = (container: HTMLElement) => container.classList.add('is-video-ready')

const watchYouTubePlayback = (iframe: HTMLIFrameElement, onPlaying: () => void) => {
  const poll = setInterval(() => {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: iframe.id }),
      '*',
    )
  }, 500)

  const onMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string' || !event.data.includes('"info"')) return
    try {
      const data = JSON.parse(event.data) as { info?: { playerState?: number } }
      // YT.PlayerState.PLAYING === 1
      if (data.info?.playerState === 1) {
        clearInterval(poll)
        window.removeEventListener('message', onMessage)
        onPlaying()
      }
    } catch {
      // ignore non-JSON messages
    }
  }
  window.addEventListener('message', onMessage)
}

const watchVimeoPlayback = (iframe: HTMLIFrameElement, onPlaying: () => void) => {
  const subscribe = () =>
    iframe.contentWindow?.postMessage(
      JSON.stringify({ method: 'addEventListener', value: 'play' }),
      '*',
    )

  iframe.addEventListener('load', subscribe)
  subscribe()

  const onMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string') return
    try {
      const data = JSON.parse(event.data) as { event?: string }
      if (data.event === 'play') {
        window.removeEventListener('message', onMessage)
        onPlaying()
      }
    } catch {
      // ignore non-JSON messages
    }
  }
  window.addEventListener('message', onMessage)
}

export const heroBackgroundVideo = () => {
  const containers = document.querySelectorAll<HTMLElement>('[data-hero-video]')
  if (!containers.length) return

  containers.forEach((container, index) => {
    const url = container.getAttribute('data-hero-video')
    if (!url) return

    const source = parseVideoUrl(url)
    if (!source) return

    const iframe = container.querySelector<HTMLIFrameElement>('iframe')
    if (!iframe) return

    if (!iframe.id) iframe.id = `hero-video-${index}`
    iframe.setAttribute('allow', allowAttrFor(source.platform))
    iframe.setAttribute('title', iframe.getAttribute('title') || 'Hero background video')
    iframe.src = buildEmbedUrl(source)

    const onReady = () => markReady(container)
    // YouTube briefly flashes its center-tap controls (rewind / pause /
    // forward) after the `play` event while the player UI settles, even
    // with controls=0. Hold the poster for an extra beat to absorb it.
    // Vimeo's background mode is clean — fade immediately on play.
    const settleDelay = source.platform === 'youtube' ? 1500 : 0
    const fadePoster = () => window.setTimeout(onReady, settleDelay)

    if (source.platform === 'youtube') watchYouTubePlayback(iframe, fadePoster)
    else watchVimeoPlayback(iframe, fadePoster)

    // Safety net — if the postMessage handshake never lands (ad blocker,
    // CSP, etc.), reveal the video after 4s so it's never permanently hidden.
    window.setTimeout(onReady, 4000)
  })
}
