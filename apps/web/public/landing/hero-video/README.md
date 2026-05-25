# Landing hero video assets

Drop cinematic hero loops here. Per clip:

- `<name>.mp4` — H.264, ~1080p, silent, < ~6s loop, target < 4 MB
- `<name>.webm` — VP9/AV1 equivalent (optional, smaller payload)
- `<name>-poster.jpg` — first-frame still (optional)

After dropping files, register them in `CLIPS` at
`apps/web/src/components/landing/hero-video.tsx`. Arrows + dots appear
automatically when `CLIPS.length > 1`. Keyboard: ←/→ cycle.
