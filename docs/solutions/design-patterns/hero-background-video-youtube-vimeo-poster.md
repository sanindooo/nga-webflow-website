---
title: "Hero background video pattern: YouTube + Vimeo via CMS URL, with poster fade on play"
date: "2026-06-03"
category: "design-patterns"
module: "heroBackgroundVideo"
component: "frontend_stimulus"
problem_type: "design_pattern"
severity: "medium"
status: "active"
resolved_in: "v1.1.10"
applies_when:
  - "Building a hero section with a looping background video sourced from a CMS URL field"
  - "The CMS author may paste either a YouTube or a Vimeo URL"
  - "No interactive controls are wanted — purely ambient background"
  - "Need to hide initial iframe chrome / first-frame flicker behind an existing hero image"
tags:
  - hero-video
  - youtube-embed
  - vimeo-embed
  - background-video
  - poster-fade
  - postmessage
  - webflow-custom-code
  - cms-video-link
  - oembed
---

# Hero background video pattern: YouTube + Vimeo via CMS URL, with poster fade on play

## Context

A Webflow CMS-driven Works page wanted a looping background video in the hero, with the CMS author supplying a YouTube or Vimeo URL via a `VideoLink` (oEmbed) field. The video should autoplay, loop, be silent, show no controls, and fill the hero area as `object-fit: cover`. The existing hero image should serve as a poster, fading out only when the video actually starts playing — both as a UX nicety and to hide YouTube's brief player-chrome flash on init.

Constraints that shaped the design:

- **YouTube cannot be made fully chrome-free in background mode.** Even with `controls=0&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1`, YouTube's player briefly flashes its center tap-controls (rewind 10 / pause / forward 10) during player init AND on every loop restart. This is documented user-frustration on YouTube forums going back years — no library (Plyr, lite-youtube-embed, the YouTube IFrame API) can suppress these flashes because they happen inside YouTube's player init before any wrapper can intercept.
- **Vimeo's `background=1` parameter is purpose-built for this use case** — zero chrome at any point, no init flash, no loop flash, no postMessage gymnastics needed. The recommended client guidance is: upload the video to Vimeo (unlisted is fine), paste that URL into the CMS field.
- The pattern must support both platforms (some clients will paste a YouTube URL despite the guidance), so the module gracefully handles both.

## Guidance

### Module pattern

`src/utils/heroBackgroundVideo.ts` follows the project's standard single-bundle module pattern — exported function, called once from `src/index.ts` inside `Webflow.push`, no module-level state, selector-presence guard at the top.

```ts
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
      playlist: source.id, // required for loop=1 to actually loop on YouTube
      controls: '0',
      showinfo: '0',
      modestbranding: '1',
      rel: '0',
      iv_load_policy: '3',
      playsinline: '1',
      disablekb: '1',
      enablejsapi: '1', // required for the postMessage state handshake
    })
    return `https://www.youtube-nocookie.com/embed/${source.id}?${params}`
  }

  const params = new URLSearchParams({
    background: '1', // Vimeo's magic param — handles autoplay, loop, mute, no chrome
    autoplay: '1',
    loop: '1',
    muted: '1',
    controls: '0',
  })
  if (source.hash) params.set('h', source.hash) // unlisted Vimeo URLs
  return `https://player.vimeo.com/video/${source.id}?${params}`
}
```

### Webflow markup contract

```html
<div class="hero-video" data-hero-video="{{ Hero Video URL }}">
  <img
    class="hero-video_poster"
    src="{{ Hero Image URL }}"
    alt=""
    aria-hidden="true">
  <iframe src="" title="Hero background video"></iframe>
</div>
```

The script reads `data-hero-video`, parses the URL, builds the embed URL, sets `iframe.src`. The poster `<img>` is bound to the existing hero image CMS field — no new asset upload required.

### Poster fade via raw postMessage (no SDK)

Both platforms support raw `postMessage` for state events — no need to load Plyr (~50KB), the YouTube IFrame API (~30KB), or the Vimeo Player SDK (~25KB). Listen for the platform's `play`/`playing` event, add an `is-video-ready` class to the wrapper, CSS fades the poster.

```ts
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
      if (data.info?.playerState === 1) { // YT.PlayerState.PLAYING
        clearInterval(poll)
        window.removeEventListener('message', onMessage)
        onPlaying()
      }
    } catch { /* ignore non-JSON */ }
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
    } catch { /* ignore non-JSON */ }
  }
  window.addEventListener('message', onMessage)
}
```

### YouTube needs a 1500ms settle delay; Vimeo fades immediately

After the `play` event fires on YouTube, the player briefly flashes its center tap controls while the UI settles. Hold the poster for an extra ~1.5s after `play` to absorb it. Vimeo's `background=1` is genuinely clean — fade immediately.

```ts
const settleDelay = source.platform === 'youtube' ? 1500 : 0
const fadePoster = () => window.setTimeout(onReady, settleDelay)

if (source.platform === 'youtube') watchYouTubePlayback(iframe, fadePoster)
else watchVimeoPlayback(iframe, fadePoster)

// Safety net — if the postMessage handshake never lands (ad blockers,
// CSP, restrictive corporate proxies), reveal the video after 4s so
// the poster never sticks permanently.
window.setTimeout(onReady, 4000)
```

### Cover-fill CSS

Iframes don't support `object-fit`, so use the viewport-cover trick:

```html
<style>
  .hero-video {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
    background: #000; /* fallback so initial frame is never a white flash */
  }
  .hero-video_poster {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 2;
    opacity: 1;
    transition: opacity 0.6s ease;
  }
  .hero-video.is-video-ready .hero-video_poster {
    opacity: 0;
  }
  .hero-video iframe {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100vw;
    height: 56.25vw;        /* 16:9 of viewport width */
    min-height: 100%;
    min-width: 177.78vh;    /* 16:9 of viewport height */
    transform: translate(-50%, -50%) scale(1.05); /* small overscan to clip YT chrome bleed */
    border: 0;
    z-index: 1;
  }
</style>
```

## Why This Matters

- **No SDK = ~3KB of JS instead of ~50KB.** Plyr / Vimeo Player SDK / YouTube IFrame API all wrap the same underlying iframe — for an autoplay-no-controls hero use case, the wrapper adds no value over raw postMessage.
- **The poster pattern is the cleanest way to hide YouTube's unavoidable chrome flashes.** Even with every chrome-hiding param, YouTube flashes briefly. The poster covers the flash; the postMessage handshake fades it out only when actual playback begins.
- **Platform-detect-by-URL keeps the CMS contract simple.** The author pastes a URL, the system figures out the platform. No platform-selector field, no per-platform config.

## When to Apply

- **Apply when** a hero or page-decorative video needs to be CMS-controllable, ambient, looping, silent, and either-platform-tolerant.
- **Do not apply when** the video is interactive (user clicks play, scrubs, fullscreens) — for that, Plyr (~50KB) is the right tool and the unified API + custom chrome is worth the size.
- **Strongly prefer Vimeo for the hero use case.** Recommend it to the client up front. The whole YouTube branch of this module exists to gracefully handle the case where the client pastes a YouTube URL despite the recommendation — not to make YouTube as good as Vimeo, because it can't be.
- **For zero compromises**, self-host the video as an MP4 and use a `<video>` tag instead of an iframe: no third-party JS, no postMessage, no chrome ever, true `object-fit: cover`, built-in `poster` attribute. Trade-off is CMS field type (needs a `File` field or a `Link` to an external CDN) and the client supplying an MP4 instead of a streaming URL.

## Examples

CMS author workflow (Vimeo, recommended):

1. Upload video to Vimeo, set to Unlisted
2. Copy the share URL: `https://vimeo.com/123456789`
3. Paste into the `Hero Video` field in the Works CMS entry
4. The site auto-detects platform, builds the right embed, fades the hero image when playback begins — no further author action

CMS author workflow (YouTube, fallback):

1. Same flow, but paste a YouTube URL
2. Brief chrome flashes on init and on every loop are unavoidable — the poster fade masks the worst of it but the loop flash remains visible
3. Consider switching to Vimeo if the flash is unacceptable

## Related Issues

- [`docs/solutions/integration-issues/animated-gif-compression-webflow-4mb-cap.md`](../integration-issues/animated-gif-compression-webflow-4mb-cap.md) — Sibling "background media in Webflow" doc. GIF-vs-video tradeoff context: for very short loops where compression keeps you under Webflow's 4MB asset cap, an animated GIF avoids iframe entirely.
- [`docs/solutions/conventions/gsap-scrollsmoother-module-conventions.md`](../conventions/gsap-scrollsmoother-module-conventions.md) — Module pattern this file follows (selector-presence guard, `Webflow.push` registration, no readyState polling, no module-level state). (auto memory — `feedback_bundle_no_coordination.md` reinforces: single-bundle architecture needs zero coordination primitives.)
- [`docs/reference/webflow-ids.md`](../../reference/webflow-ids.md) — Records the `hero-video` CMS field slug on the Works collection (`73566d0387e06329698356231ce151ee`).
